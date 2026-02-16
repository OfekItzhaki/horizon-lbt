const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const config = require('./config/config');
const logger = require('./utils/logger');

// Handlers
const { handleStart, handleLanguageSelection } = require('./handlers/startHandler');
const { handleLessonComplete, handleLessonCommand } = require('./handlers/lessonHandler');
const { handleVoiceMessage } = require('./handlers/assessmentHandler');
const { handleProgress } = require('./handlers/progressHandler');
const { handleChangeLanguage, handleLanguageChangeCallback } = require('./handlers/settingsHandler');

// Services
const { sendLesson } = require('./handlers/lessonHandler');
const reportService = require('./services/reportService');
const firebaseService = require('./services/firebaseService');

// MCP Server
const { startMcpServer } = require('./mcp/assessmentMcp');

/**
 * Initialize Telegraf bot
 */
const bot = new Telegraf(config.telegram.botToken);

/**
 * Register command handlers
 */
bot.command('start', handleStart);
bot.command('lesson', handleLessonCommand);
bot.command('progress', handleProgress);
bot.command('change', handleChangeLanguage);

/**
 * Register callback query handlers
 */
bot.action(/^lang_(.+)$/, async (ctx) => {
  const languageCode = ctx.match[1];
  
  // Check if this is a language change or initial selection
  const userId = ctx.from.id.toString();
  const userResult = await firebaseService.getUser(userId);
  
  if (userResult.success) {
    // Existing user - language change
    await handleLanguageChangeCallback(ctx, languageCode);
  } else {
    // New user - initial selection
    await handleLanguageSelection(ctx, languageCode);
  }
});

bot.action(/^lesson_complete_(\d+)$/, handleLessonComplete);

bot.action('action_lesson', async (ctx) => {
  await ctx.answerCbQuery();
  await handleLessonCommand(ctx);
});

bot.action('action_change', async (ctx) => {
  await ctx.answerCbQuery();
  await handleChangeLanguage(ctx);
});

/**
 * Register message handlers
 */
bot.on('voice', handleVoiceMessage);

// Fallback handler for text messages
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  
  // Ignore if it's a command (starts with /)
  if (text.startsWith('/')) {
    return;
  }
  
  // Show available commands in Hebrew and English
  await ctx.reply(
    `שלום! 👋 הנה הפקודות הזמינות:\n\n` +
    `/start - התחל מחדש או בחר שפה\n` +
    `/lesson - קבל את השיעור הנוכחי\n` +
    `/progress - ראה את ההתקדמות שלך\n` +
    `/change - החלף שפת לימוד\n\n` +
    `───────────────\n\n` +
    `Hello! 👋 Here are the available commands:\n\n` +
    `/start - Start over or select language\n` +
    `/lesson - Get your current lesson\n` +
    `/progress - View your progress\n` +
    `/change - Change learning language\n\n` +
    `💡 Tip: Send a voice message after completing a lesson to get feedback!`
  );
});

/**
 * Daily lesson cron job
 * Runs every day and sends lessons to users at their configured time
 */
let dailyLessonJob = null;

function scheduleDailyLessons() {
  // Run every hour to check for users who need lessons
  dailyLessonJob = cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running daily lesson check');
      
      const db = firebaseService.getFirestore();
      const usersSnapshot = await db.collection('users').get();
      
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      usersSnapshot.forEach(async (doc) => {
        const user = doc.data();
        
        if (!user.settings || !user.settings.notificationEnabled) {
          return;
        }
        
        const lessonTime = user.settings.lessonTime || '09:00';
        const [lessonHour, lessonMinute] = lessonTime.split(':').map(Number);
        
        // Check if it's time for this user's lesson (within the current hour)
        if (lessonHour === currentHour && currentMinute < 15) {
          const currentDay = user.lessonDay || 1;
          await sendLesson(bot, user.telegramId, user.targetLanguage, currentDay);
          logger.info('Daily lesson sent', { userId: user.telegramId, lessonDay: currentDay });
        }
      });
      
    } catch (error) {
      logger.error('Daily lesson cron job failed', { error: error.message });
    }
  });
  
  logger.info('Daily lesson cron job scheduled');
}

/**
 * Weekly report cron job
 * Runs every Sunday at 20:00
 */
let weeklyReportJob = null;

function scheduleWeeklyReports() {
  // Run every Sunday at 20:00
  weeklyReportJob = cron.schedule('0 20 * * 0', async () => {
    try {
      logger.info('Generating weekly report');
      
      const reportResult = await reportService.generateWeeklyReport();
      
      if (reportResult.success) {
        await bot.telegram.sendMessage(config.telegram.adminId, reportResult.data);
        logger.info('Weekly report sent to admin');
      } else {
        logger.error('Failed to generate weekly report', { error: reportResult.error });
      }
      
    } catch (error) {
      logger.error('Weekly report cron job failed', { error: error.message });
    }
  });
  
  logger.info('Weekly report cron job scheduled (Sunday 20:00)');
}

/**
 * Start the bot
 */
async function startBot() {
  try {
    logger.info('Starting Language Learning Bot', { nodeEnv: config.nodeEnv });
    
    // Start MCP server
    await startMcpServer(config.mcp.port, config.mcp.host);
    
    // Schedule cron jobs
    scheduleDailyLessons();
    scheduleWeeklyReports();
    
    // Start bot based on environment
    if (config.nodeEnv === 'production' && config.telegram.webhookPath) {
      // Webhook mode for production
      logger.info('Starting bot in webhook mode');
      await bot.launch({
        webhook: {
          domain: config.telegram.webhookPath,
          port: process.env.PORT || 3000
        }
      });
    } else {
      // Polling mode for development
      logger.info('Starting bot in polling mode');
      await bot.launch();
    }
    
    logger.info('Bot started successfully');
    
  } catch (error) {
    logger.error('Failed to start bot', { error: error.message });
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  try {
    logger.info('Shutting down bot gracefully');
    
    // Stop cron jobs
    if (dailyLessonJob) {
      dailyLessonJob.stop();
      logger.info('Daily lesson cron job stopped');
    }
    
    if (weeklyReportJob) {
      weeklyReportJob.stop();
      logger.info('Weekly report cron job stopped');
    }
    
    // Stop bot
    bot.stop('SIGTERM');
    logger.info('Bot stopped');
    
    // Give time for in-flight requests to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logger.info('Shutdown complete');
    process.exit(0);
    
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

// Handle shutdown signals
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  shutdown();
});

// Start the bot
startBot();

module.exports = { bot, startBot, shutdown };
