const { createClient } = require('@deepgram/sdk');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Transcribe audio using Deepgram API
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

    if (!config.deepgram || !config.deepgram.apiKey) {
      logger.warn('Deepgram API key not configured, falling back to Groq');
      return {
        success: false,
        error: 'Deepgram not configured',
        code: 'ERR_NOT_CONFIGURED'
      };
    }

    // Map language codes to Deepgram language codes
    const languageMap = {
      en: 'en',
      es: 'es',
      fr: 'fr',
      de: 'de'
    };

    const deepgramLanguage = languageMap[language] || 'en';

    // Initialize Deepgram client
    const deepgram = createClient(config.deepgram.apiKey);

    // Transcribe audio
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2',
        language: deepgramLanguage,
        smart_format: true,
        punctuate: true
      }
    );

    if (error) {
      throw error;
    }

    const transcript = result.results.channels[0].alternatives[0].transcript;

    if (!transcript || transcript.trim().length === 0) {
      return {
        success: false,
        error: 'No speech detected in audio',
        code: 'ERR_NO_SPEECH'
      };
    }

    logger.info('Audio transcribed successfully with Deepgram', { 
      language: deepgramLanguage,
      transcriptLength: transcript.length
    });

    return {
      success: true,
      data: transcript
    };
  } catch (error) {
    logger.error('Failed to transcribe audio with Deepgram', { error: error.message });
    return {
      success: false,
      error: 'Audio transcription failed',
      code: 'ERR_TRANSCRIPTION_FAILED'
    };
  }
}

module.exports = {
  transcribeAudio
};
