const Joi = require('joi');
const openaiService = require('./openaiService');
const firebaseService = require('./firebaseService');
const logger = require('../utils/logger');
const { validate } = require('../utils/validator');

/**
 * Assessment parameters validation schema
 */
const assessmentParamsSchema = Joi.object({
  userId: Joi.string().required(),
  lessonDay: Joi.number().integer().min(1).required(),
  targetLanguage: Joi.string().valid('en', 'es', 'fr', 'de').required(),
  audioBuffer: Joi.binary().required(),
  lessonWords: Joi.array().items(Joi.object({
    word: Joi.string().required(),
    translation: Joi.string().required(),
    example: Joi.string().required()
  })).min(1).required(),
  expectedAnswer: Joi.string().required(),
  nativeLanguage: Joi.string().default('he')
});

/**
 * Parse LLM grading response
 * @param {string} llmResponse - Raw LLM response text
 * @returns {{score: number, feedback: string, strengths: string[], weakAreas: string[]}}
 */
function parseGradingResponse(llmResponse) {
  try {
    // Extract SCORE
    const scoreMatch = llmResponse.match(/SCORE:\s*(\d+)\/100/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

    // Extract FEEDBACK
    const feedbackMatch = llmResponse.match(/FEEDBACK:\s*(.+?)(?=\n|STRENGTHS:|WEAK_AREAS:|$)/is);
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : 'No feedback available';

    // Extract STRENGTHS
    const strengthsMatch = llmResponse.match(/STRENGTHS:\s*(.+?)(?=\n|WEAK_AREAS:|$)/is);
    const strengthsStr = strengthsMatch ? strengthsMatch[1].trim() : '';
    const strengths = strengthsStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Extract WEAK_AREAS
    const weakAreasMatch = llmResponse.match(/WEAK_AREAS:\s*(.+?)$/is);
    const weakAreasStr = weakAreasMatch ? weakAreasMatch[1].trim() : '';
    const weakAreas = weakAreasStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (!scoreMatch) {
      logger.warn('Failed to parse score from LLM response');
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      feedback,
      strengths,
      weakAreas
    };
  } catch (error) {
    logger.error('Failed to parse grading response', { error: error.message });
    return {
      score: 0,
      feedback: 'Unable to process assessment. Please try again.',
      strengths: [],
      weakAreas: ['Assessment parsing error']
    };
  }
}

/**
 * Calculate user streak based on assessment history
 * @param {string} userId - User ID
 * @param {Date} newAssessmentDate - Date of new assessment
 * @returns {Promise<number>} New streak value
 */
async function calculateStreak(userId, newAssessmentDate) {
  try {
    const assessmentsResult = await firebaseService.getUserAssessments(userId, 100);
    
    if (!assessmentsResult.success || assessmentsResult.data.length === 0) {
      return 1; // First assessment
    }

    const assessments = assessmentsResult.data;
    
    // Get unique dates (YYYY-MM-DD format)
    const uniqueDates = new Set();
    assessments.forEach(assessment => {
      const date = new Date(assessment.timestamp.toDate ? assessment.timestamp.toDate() : assessment.timestamp);
      const dateStr = date.toISOString().split('T')[0];
      uniqueDates.add(dateStr);
    });

    // Add new assessment date
    const newDateStr = newAssessmentDate.toISOString().split('T')[0];
    uniqueDates.add(newDateStr);

    // Sort dates in descending order
    const sortedDates = Array.from(uniqueDates).sort().reverse();

    // Calculate streak
    let streak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const currentDate = new Date(sortedDates[i]);
      const nextDate = new Date(sortedDates[i + 1]);
      
      const diffTime = currentDate - nextDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    logger.error('Failed to calculate streak', { userId, error: error.message });
    return 1;
  }
}

/**
 * Assess voice recording
 * @param {Object} params - Assessment parameters
 * @returns {Promise<{success: boolean, data?: Object, error?: string, code?: string}>}
 */
async function assessVoice(params) {
  try {
    // Validate inputs
    const validation = validate(params, assessmentParamsSchema);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        code: 'ERR_INVALID_INPUT'
      };
    }

    const validatedParams = validation.value;

    // Step 1: Transcribe audio
    const transcriptionResult = await openaiService.transcribeAudio(
      validatedParams.audioBuffer,
      validatedParams.targetLanguage
    );

    if (!transcriptionResult.success) {
      return transcriptionResult;
    }

    const transcript = transcriptionResult.data;

    // Step 2: Grade transcript
    const gradingResult = await openaiService.gradeTranscript({
      transcript,
      targetLanguage: validatedParams.targetLanguage,
      nativeLanguage: validatedParams.nativeLanguage,
      lessonWords: validatedParams.lessonWords,
      expectedAnswer: validatedParams.expectedAnswer
    });

    if (!gradingResult.success) {
      return gradingResult;
    }

    // Step 3: Parse grading response
    const { score, feedback, strengths, weakAreas } = parseGradingResponse(gradingResult.data);

    // Step 4: Store assessment
    const assessmentData = {
      userId: validatedParams.userId,
      lessonDay: validatedParams.lessonDay,
      targetLanguage: validatedParams.targetLanguage,
      score,
      transcript,
      expectedAnswer: validatedParams.expectedAnswer,
      feedback,
      strengths,
      weakAreas,
      timestamp: new Date()
    };

    const storeResult = await firebaseService.storeAssessment(assessmentData);

    if (!storeResult.success) {
      return storeResult;
    }

    const assessmentId = storeResult.data;

    // Step 5: Update user statistics
    const assessmentsResult = await firebaseService.getUserAssessments(validatedParams.userId);
    
    if (assessmentsResult.success) {
      const allAssessments = assessmentsResult.data;
      const avgScore = allAssessments.reduce((sum, a) => sum + a.score, 0) / allAssessments.length;
      
      const streak = await calculateStreak(validatedParams.userId, new Date());

      await firebaseService.updateUserStats(validatedParams.userId, {
        avgScore: Math.round(avgScore * 10) / 10,
        streak
      });
    }

    logger.info('Assessment completed successfully', {
      userId: validatedParams.userId,
      assessmentId,
      score
    });

    return {
      success: true,
      data: {
        assessmentId,
        score,
        transcript,
        feedback,
        strengths,
        weakAreas
      }
    };
  } catch (error) {
    logger.error('Assessment failed', { error: error.message });
    return {
      success: false,
      error: 'Assessment processing failed',
      code: 'ERR_GRADING_FAILED'
    };
  }
}

module.exports = {
  assessVoice,
  parseGradingResponse,
  calculateStreak
};
