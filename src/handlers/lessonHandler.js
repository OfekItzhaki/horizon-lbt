const { Markup } = require('telegraf');
const firebaseService = require('../services/firebaseService');
const lessonService = require('../services/lessonService');
const logger = require('../utils/logger');

/**
 * Send lesson to user
 * @param {Object} bot - Telegraf bot instance
 * @param {string} userId - Telegram user ID
 * @param {string} languageCode - Target language
 * @param {number} lessonDay - Current lesson day
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendLesson(bot, userId, languageCode, lessonDay) {
  try {
    const lessonResult = lessonService.getLesson(languageCode, lessonDay);

    if (!lessonResult.success) {
      await bot.telegram.sendMessage(
        userId,
        `Sorry, lesson ${lessonDay} is not available yet. Stay tuned! 📚`
      );
      return { success: false, error: lessonResult.error };
    }

    const lesson = lessonResult.data;
    const formattedLesson = lessonService.formatLesson(lesson, lessonDay, lesson.languageFlag);

    await bot.telegram.sendMessage(
      userId,
      formattedLesson,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Mark Complete', `lesson_complete_${lessonDay}`)]
      ])
    );

    logger.info('Lesson sent successfully', { userId, lessonDay, languageCode });

    return { success: true };
  } catch (error) {
    logger.error('Failed to send lesson', { userId, lessonDay, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Handle lesson completion callback
 * @param {Context} ctx - Telegraf context
 * @returns {Promise<void>}
 */
async function handleLessonComplete(ctx) {
  try {
    const userId = ctx.from.id.toString();
    
    // Extract lesson day from callback data
    const callbackData = ctx.callbackQuery.data;
    const lessonDay = parseInt(callbackData.split('_')[2], 10);

    logger.info('User completed lesson', { userId, lessonDay });

    // Get user data
    const userResult = await firebaseService.getUser(userId);

    if (!userResult.success) {
      await ctx.answerCbQuery('User data not found. Please use /start first.');
      return;
    }

    const user = userResult.data;

    // Increment totalLessons
    const updateResult = await firebaseService.updateUserStats(userId, {
      totalLessons: (user.totalLessons || 0) + 1,
      lessonDay: lessonDay + 1
    });

    if (!updateResult.success) {
      await ctx.answerCbQuery('Failed to save progress. Please try again.');
      return;
    }

    await ctx.answerCbQuery('✅ Lesson completed!');

    // Get lesson for quiz prompt
    const lessonResult = lessonService.getLesson(user.targetLanguage, lessonDay);
    
    const quizPrompt = lessonResult.success && lessonResult.data.quizPrompt
      ? lessonResult.data.quizPrompt
      : 'Practice speaking using the words from this lesson';

    // Prompt for voice recording
    await ctx.reply(
      `🎉 Great job completing the lesson!\n\n` +
      `Now let's practice your speaking:\n\n` +
      `🎤 ${quizPrompt}\n\n` +
      `Send me a voice message with your answer, and I'll give you feedback!`
    );

  } catch (error) {
    logger.error('Error in handleLessonComplete', { error: error.message });
    await ctx.answerCbQuery('Something went wrong. Please try again.');
  }
}

/**
 * Handle /lesson command - send current lesson
 * @param {Context} ctx - Telegraf context
 * @returns {Promise<void>}
 */
async function handleLessonCommand(ctx) {
  try {
    const userId = ctx.from.id.toString();

    const userResult = await firebaseService.getUser(userId);

    if (!userResult.success) {
      await ctx.reply('Please use /start first to select your language.');
      return;
    }

    const user = userResult.data;
    const currentDay = user.lessonDay || 1;

    // Get lesson
    const lessonResult = lessonService.getLesson(user.targetLanguage, currentDay);

    if (!lessonResult.success) {
      await ctx.reply(`Sorry, lesson ${currentDay} is not available yet. Stay tuned! 📚`);
      return;
    }

    const lesson = lessonResult.data;
    const formattedLesson = lessonService.formatLesson(
      lesson, 
      currentDay, 
      lesson.languageFlag,
      user.nativeLanguage || 'he'
    );

    await ctx.reply(
      formattedLesson,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Mark Complete', `lesson_complete_${currentDay}`)]
      ])
    );

    logger.info('Lesson sent successfully', { userId, lessonDay: currentDay, languageCode: user.targetLanguage });

  } catch (error) {
    logger.error('Error in handleLessonCommand', { error: error.message });
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

module.exports = {
  sendLesson,
  handleLessonComplete,
  handleLessonCommand
};
