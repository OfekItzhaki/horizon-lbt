const languages = require('../config/languages');
const logger = require('../utils/logger');

/**
 * Get lesson content for a specific language and day
 * @param {string} languageCode - Target language code (en, es, fr, de)
 * @param {number} lessonDay - Lesson day number
 * @returns {{success: boolean, data?: Object, error?: string, code?: string}}
 */
function getLesson(languageCode, lessonDay) {
  try {
    // Validate language code
    if (!languages[languageCode]) {
      logger.warn('Invalid language code requested', { languageCode });
      return {
        success: false,
        error: `Language '${languageCode}' is not supported`,
        code: 'ERR_INVALID_INPUT'
      };
    }

    const language = languages[languageCode];
    
    // Validate lesson day
    if (!language.lessons[lessonDay]) {
      logger.warn('Lesson not found', { languageCode, lessonDay });
      return {
        success: false,
        error: `Lesson ${lessonDay} not available for ${language.name}`,
        code: 'ERR_LESSON_NOT_FOUND'
      };
    }

    const lesson = language.lessons[lessonDay];
    
    // Validate lesson structure
    if (!lesson.words || lesson.words.length !== 5) {
      logger.error('Invalid lesson structure', { languageCode, lessonDay });
      return {
        success: false,
        error: 'Lesson content is malformed',
        code: 'ERR_LESSON_NOT_FOUND'
      };
    }

    return {
      success: true,
      data: {
        ...lesson,
        languageName: language.name,
        languageFlag: language.flag,
        nativeLanguage: language.nativeLanguage
      }
    };
  } catch (error) {
    logger.error('Failed to get lesson', { languageCode, lessonDay, error: error.message });
    return {
      success: false,
      error: 'Failed to retrieve lesson',
      code: 'ERR_LESSON_NOT_FOUND'
    };
  }
}

/**
 * Format lesson for Telegram message display
 * @param {Object} lesson - Lesson object
 * @param {number} lessonDay - Lesson day number
 * @param {string} languageFlag - Language flag emoji
 * @returns {string} Formatted lesson message
 */
function formatLesson(lesson, lessonDay, languageFlag = '📚') {
  let message = `${languageFlag} Day ${lessonDay} - ${lesson.title}\n\n`;
  
  lesson.words.forEach((item, index) => {
    message += `${index + 1}. ${item.word} (${item.translation})\n`;
    message += `   Example: ${item.example}\n\n`;
  });
  
  message += `📝 Practice: ${lesson.quizPrompt}`;
  
  return message;
}

/**
 * Get all available languages
 * @returns {Array<{code: string, name: string, flag: string}>}
 */
function getAvailableLanguages() {
  return Object.keys(languages).map(code => ({
    code,
    name: languages[code].name,
    flag: languages[code].flag
  }));
}

module.exports = {
  getLesson,
  formatLesson,
  getAvailableLanguages
};
