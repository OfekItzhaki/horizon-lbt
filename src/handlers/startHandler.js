const { Markup } = require('telegraf');
const firebaseService = require('../services/firebaseService');
const lessonService = require('../services/lessonService');
const logger = require('../utils/logger');

/**
 * Handle /start command
 * @param {Context} ctx - Telegraf context
 * @returns {Promise<void>}
 */
async function handleStart(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const userName = ctx.from.first_name || ctx.from.username || 'User';

    logger.debug('User started bot', { userId, userName });

    // Check if user already exists
    const userResult = await firebaseService.getUser(userId);
    
    if (userResult.success) {
      // Existing user - show welcome in Hebrew
      const langName = userResult.data.targetLanguage.toUpperCase();
      await ctx.reply(
        `ברוך שובך, ${userName}! 👋\n\n` +
        `אתה לומד כרגע ${langName}.\n\n` +
        `השתמש ב-/lesson כדי להמשיך, או ב-/change כדי להחליף שפה.\n\n` +
        `───────────────\n` +
        `Welcome back, ${userName}! 👋\n\n` +
        `You're currently learning ${langName}.\n\n` +
        `Use /lesson to continue, or /change to switch languages.`
      );
      return;
    }

    // New user - show language selection
    await showLanguageSelection(ctx, userName);
  } catch (error) {
    logger.error('Error in handleStart', { error: error.message });
    await ctx.reply('Sorry, something went wrong. Please try again.');
  }
}

/**
 * Show language selection keyboard
 * @param {Context} ctx - Telegraf context
 * @param {string} userName - User's name
 * @returns {Promise<void>}
 */
async function showLanguageSelection(ctx, userName = 'there') {
  const languages = lessonService.getAvailableLanguages();
  
  // Create inline keyboard with 2 buttons per row
  const keyboard = [];
  for (let i = 0; i < languages.length; i += 2) {
    const row = [
      Markup.button.callback(
        `${languages[i].flag} ${languages[i].name}`,
        `lang_${languages[i].code}`
      )
    ];
    
    if (i + 1 < languages.length) {
      row.push(
        Markup.button.callback(
          `${languages[i + 1].flag} ${languages[i + 1].name}`,
          `lang_${languages[i + 1].code}`
        )
      );
    }
    
    keyboard.push(row);
  }

  await ctx.reply(
    `Welcome, ${userName}! 🎉\n\n` +
    `I'm your language learning assistant. Pick your target language to get started:`,
    Markup.inlineKeyboard(keyboard)
  );
}

/**
 * Handle language selection callback
 * @param {Context} ctx - Telegraf context
 * @param {string} languageCode - Selected language code
 * @returns {Promise<void>}
 */
async function handleLanguageSelection(ctx, languageCode) {
  try {
    const userId = ctx.from.id.toString();
    const userName = ctx.from.first_name || ctx.from.username || 'User';

    logger.info('User selected language', { userId, languageCode });

    // Create user record
    const userData = {
      telegramId: userId,
      name: userName,
      targetLanguage: languageCode,
      nativeLanguage: 'he',
      lessonDay: 1,
      createdAt: new Date(),
      streak: 0,
      totalLessons: 0,
      avgScore: 0,
      settings: {
        lessonTime: '09:00',
        notificationEnabled: true
      }
    };

    const upsertResult = await firebaseService.upsertUser(userData);

    if (!upsertResult.success) {
      await ctx.answerCbQuery('Failed to save your selection. Please try again.');
      return;
    }

    // Get Day 1 lesson
    const lessonResult = lessonService.getLesson(languageCode, 1);

    if (!lessonResult.success) {
      await ctx.answerCbQuery('Language selected!');
      await ctx.reply('Great! Your language has been set, but lessons are not yet available.');
      return;
    }

    const lesson = lessonResult.data;
    const formattedLesson = lessonService.formatLesson(lesson, 1, lesson.languageFlag);

    await ctx.answerCbQuery(`${lesson.languageFlag} ${lesson.languageName} selected!`);
    
    await ctx.reply(
      `Perfect! You're now learning ${lesson.languageName} ${lesson.languageFlag}\n\n` +
      `Let's start with your first lesson:`
    );

    // Send Day 1 lesson with completion button
    await ctx.reply(
      formattedLesson,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Mark Complete', 'lesson_complete_1')]
      ])
    );

  } catch (error) {
    logger.error('Error in handleLanguageSelection', { error: error.message });
    await ctx.answerCbQuery('Something went wrong. Please try again.');
  }
}

module.exports = {
  handleStart,
  handleLanguageSelection,
  showLanguageSelection
};
