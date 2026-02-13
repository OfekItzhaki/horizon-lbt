const { Markup } = require('telegraf');
const firebaseService = require('../services/firebaseService');
const logger = require('../utils/logger');

/**
 * Handle /progress command
 * @param {Context} ctx - Telegraf context
 * @returns {Promise<void>}
 */
async function handleProgress(ctx) {
  try {
    const userId = ctx.from.id.toString();

    // Get user data
    const userResult = await firebaseService.getUser(userId);

    if (!userResult.success) {
      await ctx.reply('Please use /start first to select your language.');
      return;
    }

    const user = userResult.data;

    // Get user assessments for weak areas
    const assessmentsResult = await firebaseService.getUserAssessments(userId, 10);
    
    let weakAreasSet = new Set();
    if (assessmentsResult.success && assessmentsResult.data.length > 0) {
      assessmentsResult.data.forEach(assessment => {
        if (assessment.weakAreas) {
          assessment.weakAreas.forEach(area => weakAreasSet.add(area));
        }
      });
    }

    const weakAreas = Array.from(weakAreasSet);

    // Format progress message
    let message = `📊 Your Progress\n\n`;
    
    message += `🔥 Streak: ${user.streak || 0} days\n`;
    message += `📈 Average Score: ${user.avgScore || 0}/100\n`;
    message += `📚 Lessons Completed: ${user.totalLessons || 0}\n`;
    message += `🌍 Learning: ${user.targetLanguage.toUpperCase()}\n\n`;
    
    if (weakAreas.length > 0) {
      message += `⚠️ Focus Areas:\n`;
      weakAreas.slice(0, 5).forEach(area => {
        message += `  • ${area}\n`;
      });
    } else {
      message += `✨ No weak areas identified yet. Keep practicing!\n`;
    }

    // Add action buttons
    await ctx.reply(
      message,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('📚 Next Lesson', 'action_lesson'),
          Markup.button.callback('🔄 Change Language', 'action_change')
        ]
      ])
    );

  } catch (error) {
    logger.error('Error in handleProgress', { error: error.message });
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

module.exports = {
  handleProgress
};
