const OpenAI = require('openai');
const FormData = require('form-data');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Initialize AI client (supports both OpenAI and Groq)
 */
const useGroq = config.openai.useGroq || false;
const apiKey = useGroq ? config.openai.groqApiKey : config.openai.apiKey;

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: useGroq ? 'https://api.groq.com/openai/v1' : undefined
});

/**
 * Retry an async function once after a delay
 * @param {Function} fn - Async function to retry
 * @param {number} delay - Delay in ms before retry
 * @returns {Promise<any>} Result of the function
 */
async function retryOnce(fn, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    logger.warn('OpenAI API call failed, retrying once', { error: error.message });
    await new Promise(resolve => setTimeout(resolve, delay));
    return await fn();
  }
}

/**
 * Transcribe audio using Whisper API
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} language - Target language code (en, es, fr, de)
 * @returns {Promise<{success: boolean, data?: string, error?: string, code?: string}>}
 */
async function transcribeAudio(audioBuffer, language) {
  try {
    if (!audioBuffer || audioBuffer.length === 0) {
      return {
        success: false,
        error: 'Audio buffer is empty',
        code: 'ERR_INVALID_INPUT'
      };
    }

    // Map language codes to Whisper language codes
    const languageMap = {
      en: 'en',
      es: 'es',
      fr: 'fr',
      de: 'de'
    };

    const whisperLanguage = languageMap[language] || 'en';

    const transcription = await retryOnce(async () => {
      // Use Groq's Whisper (free) if available, otherwise OpenAI
      if (useGroq && config.openai.groqApiKey) {
        const groqClient = new OpenAI({
          apiKey: config.openai.groqApiKey,
          baseURL: 'https://api.groq.com/openai/v1'
        });
        
        // Create a File-like object from the buffer
        const file = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });
        
        return await groqClient.audio.transcriptions.create({
          file: file,
          model: 'whisper-large-v3',
          language: whisperLanguage
        });
      } else {
        // Fallback to OpenAI
        const openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
        const file = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });
        
        return await openaiClient.audio.transcriptions.create({
          file: file,
          model: 'whisper-1',
          language: whisperLanguage
        });
      }
    });

    logger.info('Audio transcribed successfully', { 
      language: whisperLanguage,
      transcriptLength: transcription.text.length
    });

    return {
      success: true,
      data: transcription.text
    };
  } catch (error) {
    logger.error('Failed to transcribe audio', { error: error.message });
    return {
      success: false,
      error: 'Audio transcription failed',
      code: 'ERR_TRANSCRIPTION_FAILED'
    };
  }
}

/**
 * Grade transcript using LLM
 * @param {Object} params - Grading parameters
 * @param {string} params.transcript - Transcribed text
 * @param {string} params.targetLanguage - Target language
 * @param {string} params.nativeLanguage - Native language
 * @param {Array} params.lessonWords - Lesson vocabulary
 * @param {string} params.expectedAnswer - Expected response
 * @returns {Promise<{success: boolean, data?: string, error?: string, code?: string}>}
 */
async function gradeTranscript(params) {
  try {
    const { transcript, targetLanguage, nativeLanguage, lessonWords, expectedAnswer } = params;

    // Build lesson words string
    const wordsString = lessonWords.map(w => w.word).join(', ');

    // Language names for prompt
    const languageNames = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      he: 'Hebrew'
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;
    const nativeLangName = languageNames[nativeLanguage] || nativeLanguage;

    // Build the exact prompt template from requirements
    const prompt = `You are an expert teacher for ${nativeLangName} speakers learning ${targetLangName}.
Grade this beginner-level response:

TRANSCRIPT: ${transcript}
LESSON WORDS: ${wordsString}
EXPECTED: ${expectedAnswer}

Score 0-100 using rubric:
- Pronunciation: 25 points
- Grammar: 25 points
- Vocabulary: 20 points
- Fluency: 20 points
- Comprehension: 10 points

RESPOND ONLY with:
SCORE: X/100
FEEDBACK: [1-2 sentences of actionable advice]
STRENGTHS: [comma-separated list]
WEAK_AREAS: [comma-separated list]`;

    const completion = await retryOnce(async () => {
      // Use Groq's llama model (free) or OpenAI's GPT-4
      const model = useGroq ? 'llama-3.3-70b-versatile' : 'gpt-4';
      
      return await client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: 'You are an expert language teacher providing assessment feedback.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
    });

    const llmResponse = completion.choices[0].message.content;

    logger.info('Transcript graded successfully', {
      targetLanguage,
      transcriptLength: transcript.length
    });

    return {
      success: true,
      data: llmResponse
    };
  } catch (error) {
    logger.error('Failed to grade transcript', { error: error.message });
    return {
      success: false,
      error: 'Grading failed',
      code: 'ERR_GRADING_FAILED'
    };
  }
}

module.exports = {
  transcribeAudio,
  gradeTranscript
};
