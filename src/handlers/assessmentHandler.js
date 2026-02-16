const axios = require('axios');
const firebaseService = require('../services/firebaseService');
const assessmentService = require('../services/assessmentService');
const lessonService = require('../services/lessonService');
const logger = require('../utils/logger');

/**
 * Handle voice message from user
 * @param {Context} ctx - Telegraf context
 * @returns {Promise<void>}
 */
async function handleVoiceMessage(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const voice = ctx.message.voice;

    logger.debug('Received voice message', { userId, fileId: voice.file_id });

    // Send processing message
    const processingMsg = await ctx.reply('🎧 Processing your voice message...');

    // Get user data
    const userResult = await firebaseService.getUser(userId);

    if (!userResult.success) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        null,
        'Please use /start first to select your language.'
      );
      return;
    }

    const user = userResult.data;
    const currentLessonDay = Math.max(1, (user.lessonDay || 1) - 1);

    // Get lesson content for expected answer
    const lessonResult = lessonService.getLesson(user.targetLanguage, currentLessonDay);

    if (!lessonResult.success) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        null,
        'Could not find lesson content. Please try /lesson first.'
      );
      return;
    }

    const lesson = lessonResult.data;

    // Download audio file from Telegram
    const fileLink = await ctx.telegram.getFileLink(voice.file_id);
    const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    const audioBuffer = Buffer.from(response.data);

    logger.debug('Audio downloaded', { userId, size: audioBuffer.length });

    // Assess voice
    const assessmentResult = await assessmentService.assessVoice({
      userId,
      lessonDay: currentLessonDay,
      targetLanguage: user.targetLanguage,
      nativeLanguage: user.nativeLanguage || 'he',
      audioBuffer,
      lessonWords: lesson.words,
      expectedAnswer: lesson.quizPrompt
    });

    if (!assessmentResult.success) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        null,
        '❌ Assessment temporarily unavailable. Please try again later.'
      );
      logger.error('Assessment failed', { userId, error: assessmentResult.error });
      return;
    }

    // Format and send result
    const formattedResult = formatAssessmentResult(assessmentResult.data);
    
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      formattedResult
    );

  } catch (error) {
    logger.error('Error in handleVoiceMessage', { error: error.message });
    await ctx.reply('❌ Sorry, something went wrong processing your voice message. Please try again.');
  }
}

/**
 * Format assessment result for display
 * @param {Object} assessment - Assessment result object
 * @returns {string} Formatted message
 */
function formatAssessmentResult(assessment) {
  let message = '🎯 Assessment Complete!\n\n';
  
  // Show what was heard
  message += `🎤 What I heard:\n"${assessment.transcript}"\n\n`;
  
  message += `📊 Score: ${assessment.score}/100\n\n`;
  
  message += `💬 Feedback:\n${assessment.feedback}\n\n`;
  
  if (assessment.strengths && assessment.strengths.length > 0) {
    message += `✅ Strengths:\n`;
    assessment.strengths.forEach(strength => {
      message += `  • ${strength}\n`;
    });
    message += '\n';
  }
  
  if (assessment.weakAreas && assessment.weakAreas.length > 0) {
    message += `⚠️ Areas to improve:\n`;
    assessment.weakAreas.forEach(area => {
      message += `  • ${area}\n`;
    });
    message += '\n';
  }
  
  message += `Keep practicing! 🚀\n\n`;
  message += `Use /progress to see your stats or /lesson for the next lesson.`;
  
  return message;
}

module.exports = {
  handleVoiceMessage,
  formatAssessmentResult
};
