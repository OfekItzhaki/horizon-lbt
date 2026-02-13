const firebaseService = require('../services/firebaseService');
const { showLanguageSelection } = require('./startHandler');
const logger = require('../utils/logger');

/**
 * Handle /change command
 * @param {Context} ctx - Telegraf context
 * @returns {Promise<void>}
 */
async function handleChangeLanguage(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const userName = ctx.from.first_name || ctx.from.username || 'there';

    logger.info('User requested language change', { userId });

    // Show language selection
    await showLanguageSelection(ctx, userName);

  } catch (error) {
    logger.error('Error in handleChangeLanguage', { error: error.message });
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Handle language change callback (when user selects new language)
 * @param {Context} ctx - Telegraf context
 * @param {string} newLanguageCode - New language code
 * @returns {Promise<void>}
 */
async function handleLanguageChangeCallback(ctx, newLanguageCode) {
  try {
    const userId = ctx.from.id.toString();

    logger.info('User changing language', { userId, newLanguage: newLanguageCode });

    // Update user's language and reset lesson day
    const updateResult = await firebaseService.updateUserStats(userId, {
      targetLanguage: newLanguageCode,
      lessonDay: 1
    });

    if (!updateResult.success) {
      await ctx.answerCbQuery('Failed to update language. Please try again.');
      return;
    }

    await ctx.answerCbQuery('Language updated!');
    await ctx.reply(
      `✅ Language changed successfully!\n\n` +
      `Your progress has been reset to Day 1.\n\n` +
      `Use /lesson to start your first lesson.`
    );

  } catch (error) {
    logger.error('Error in handleLanguageChangeCallback', { error: error.message });
    await ctx.answerCbQuery('Something went wrong. Please try again.');
  }
}

module.exports = {
  handleChangeLanguage,
  handleLanguageChangeCallback
};
