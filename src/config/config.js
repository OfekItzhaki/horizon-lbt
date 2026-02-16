const dotenv = require('dotenv');
const Joi = require('joi');

// Load environment variables
dotenv.config();

/**
 * Configuration schema for environment variables
 */
const configSchema = Joi.object({
  TELEGRAM_BOT_TOKEN: Joi.string().required(),
  OPENAI_API_KEY: Joi.string().required(),
  GROQ_API_KEY: Joi.string().optional(),
  USE_GROQ: Joi.boolean().default(false),
  DEEPGRAM_API_KEY: Joi.string().optional(),
  USE_DEEPGRAM: Joi.boolean().default(false),
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),
  FIREBASE_PRIVATE_KEY_ID: Joi.string().optional(),
  FIREBASE_CLIENT_ID: Joi.string().optional(),
  ANTHROPIC_API_KEY: Joi.string().optional(),
  MCP_SERVER_PORT: Joi.number().integer().min(1).max(65535).default(3001),
  MCP_SERVER_HOST: Joi.string().default('localhost'),
  NODE_ENV: Joi.string().valid('development', 'production').default('development'),
  BOT_WEBHOOK_PATH: Joi.string().optional(),
  ADMIN_TELEGRAM_ID: Joi.string().required()
}).unknown(true);

/**
 * Validate and parse environment variables
 * @returns {Object} Validated configuration object
 * @throws {Error} If required environment variables are missing
 */
function loadConfig() {
  const { error, value } = configSchema.validate(process.env);

  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }

  return {
    telegram: {
      botToken: value.TELEGRAM_BOT_TOKEN,
      webhookPath: value.BOT_WEBHOOK_PATH || null,
      adminId: value.ADMIN_TELEGRAM_ID
    },
    openai: {
      apiKey: value.OPENAI_API_KEY,
      groqApiKey: value.GROQ_API_KEY || null,
      useGroq: value.USE_GROQ || false
    },
    deepgram: {
      apiKey: value.DEEPGRAM_API_KEY || null,
      useDeepgram: value.USE_DEEPGRAM || false
    },
    anthropic: {
      apiKey: value.ANTHROPIC_API_KEY || null
    },
    firebase: {
      projectId: value.FIREBASE_PROJECT_ID,
      privateKey: value.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: value.FIREBASE_CLIENT_EMAIL,
      privateKeyId: value.FIREBASE_PRIVATE_KEY_ID || null,
      clientId: value.FIREBASE_CLIENT_ID || null
    },
    mcp: {
      port: value.MCP_SERVER_PORT,
      host: value.MCP_SERVER_HOST
    },
    nodeEnv: value.NODE_ENV
  };
}

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error('FATAL: Configuration validation failed');
  console.error(error.message);
  process.exit(1);
}

module.exports = config;
