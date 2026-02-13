const winston = require('winston');

/**
 * Redact sensitive data from log messages
 * @param {string} message - Log message
 * @returns {string} Redacted message
 */
function redactSensitiveData(message) {
  if (typeof message !== 'string') {
    return message;
  }

  let redacted = message;

  // Redact API keys (sk-..., Bearer ...)
  redacted = redacted.replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***REDACTED***');
  redacted = redacted.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer ***REDACTED***');
  
  // Redact tokens
  redacted = redacted.replace(/[0-9]{8,}:[a-zA-Z0-9_-]{35}/g, '***REDACTED_TOKEN***');
  
  // Redact private keys
  redacted = redacted.replace(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g, '***REDACTED_PRIVATE_KEY***');
  
  // Redact Firebase credentials
  redacted = redacted.replace(/"private_key":\s*"[^"]+"/g, '"private_key": "***REDACTED***"');
  
  return redacted;
}

/**
 * Custom format to redact sensitive information
 */
const redactFormat = winston.format((info) => {
  if (info.message) {
    info.message = redactSensitiveData(info.message);
  }
  
  if (info.meta && typeof info.meta === 'object') {
    info.meta = JSON.parse(redactSensitiveData(JSON.stringify(info.meta)));
  }
  
  return info;
});

/**
 * Winston logger instance with structured logging
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    redactFormat(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let log = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0 && meta.stack) {
            log += `\n${meta.stack}`;
          } else if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
          }
          return log;
        })
      )
    })
  ]
});

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Object} meta - Additional metadata
 */
logger.logError = (message, meta = {}) => {
  logger.error(message, meta);
};

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {Object} meta - Additional metadata
 */
logger.logWarn = (message, meta = {}) => {
  logger.warn(message, meta);
};

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} meta - Additional metadata
 */
logger.logInfo = (message, meta = {}) => {
  logger.info(message, meta);
};

/**
 * Log debug message
 * @param {string} message - Debug message
 * @param {Object} meta - Additional metadata
 */
logger.logDebug = (message, meta = {}) => {
  logger.debug(message, meta);
};

module.exports = logger;
