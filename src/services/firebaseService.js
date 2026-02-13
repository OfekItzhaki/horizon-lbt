const admin = require('firebase-admin');
const Joi = require('joi');
const config = require('../config/config');
const logger = require('../utils/logger');
const { validate } = require('../utils/validator');

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase() {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail
      })
    });
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', { error: error.message });
    throw error;
  }
}

// Initialize Firebase on module load
initializeFirebase();

/**
 * Get Firestore instance
 * @returns {FirebaseFirestore.Firestore} Firestore instance
 */
function getFirestore() {
  const db = admin.firestore();
  return db;
}

/**
 * User data validation schema
 */
const userSchema = Joi.object({
  telegramId: Joi.string().required(),
  name: Joi.string().required(),
  targetLanguage: Joi.string().valid('en', 'es', 'fr', 'de').required(),
  nativeLanguage: Joi.string().default('he'),
  createdAt: Joi.date().default(() => new Date()),
  streak: Joi.number().integer().min(0).default(0),
  totalLessons: Joi.number().integer().min(0).default(0),
  avgScore: Joi.number().min(0).max(100).default(0),
  lessonDay: Joi.number().integer().min(1).default(1),
  settings: Joi.object({
    lessonTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).default('09:00'),
    notificationEnabled: Joi.boolean().default(true)
  }).default()
});

/**
 * Assessment data validation schema
 */
const assessmentSchema = Joi.object({
  userId: Joi.string().required(),
  lessonDay: Joi.number().integer().min(1).required(),
  targetLanguage: Joi.string().valid('en', 'es', 'fr', 'de').required(),
  score: Joi.number().min(0).max(100).required(),
  transcript: Joi.string().required(),
  expectedAnswer: Joi.string().required(),
  feedback: Joi.string().required(),
  strengths: Joi.array().items(Joi.string()).default([]),
  weakAreas: Joi.array().items(Joi.string()).default([]),
  timestamp: Joi.date().default(() => new Date())
});

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {Array<number>} delays - Delay in ms for each retry
 * @returns {Promise<any>} Result of the function
 */
async function retryWithBackoff(fn, maxRetries = 3, delays = [100, 200, 400]) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = delays[attempt] || delays[delays.length - 1];
        logger.warn(`Firestore operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
          error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Create or update user
 * @param {Object} userData - User data object
 * @returns {Promise<{success: boolean, error?: string, code?: string}>}
 */
async function upsertUser(userData) {
  try {
    // Validate user data
    const validation = validate(userData, userSchema);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        code: 'ERR_INVALID_INPUT'
      };
    }

    const validatedData = validation.value;
    const db = getFirestore();
    
    await retryWithBackoff(async () => {
      await db.collection('users').doc(validatedData.telegramId).set(validatedData, { merge: true });
    });

    logger.info('User upserted successfully', { userId: validatedData.telegramId });
    
    return { success: true };
  } catch (error) {
    logger.error('Failed to upsert user', { error: error.message });
    return {
      success: false,
      error: 'Failed to save user data',
      code: 'ERR_DATABASE_ERROR'
    };
  }
}

/**
 * Get user by Telegram ID
 * @param {string} telegramId - Telegram user ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string, code?: string}>}
 */
async function getUser(telegramId) {
  try {
    const db = getFirestore();
    
    const doc = await retryWithBackoff(async () => {
      return await db.collection('users').doc(telegramId).get();
    });

    if (!doc.exists) {
      return {
        success: false,
        error: 'User not found',
        code: 'ERR_USER_NOT_FOUND'
      };
    }

    return {
      success: true,
      data: doc.data()
    };
  } catch (error) {
    logger.error('Failed to get user', { telegramId, error: error.message });
    return {
      success: false,
      error: 'Failed to retrieve user data',
      code: 'ERR_DATABASE_ERROR'
    };
  }
}

/**
 * Store assessment
 * @param {Object} assessmentData - Assessment data object
 * @returns {Promise<{success: boolean, data?: string, error?: string, code?: string}>}
 */
async function storeAssessment(assessmentData) {
  try {
    // Validate assessment data
    const validation = validate(assessmentData, assessmentSchema);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        code: 'ERR_INVALID_INPUT'
      };
    }

    const validatedData = validation.value;
    const db = getFirestore();
    
    const docRef = await retryWithBackoff(async () => {
      return await db.collection('assessments').add(validatedData);
    });

    logger.info('Assessment stored successfully', { 
      assessmentId: docRef.id,
      userId: validatedData.userId,
      score: validatedData.score
    });
    
    return {
      success: true,
      data: docRef.id
    };
  } catch (error) {
    logger.error('Failed to store assessment', { error: error.message });
    return {
      success: false,
      error: 'Failed to save assessment',
      code: 'ERR_DATABASE_ERROR'
    };
  }
}

/**
 * Get user assessments
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of assessments to retrieve
 * @returns {Promise<{success: boolean, data?: Array, error?: string, code?: string}>}
 */
async function getUserAssessments(userId, limit = 50) {
  try {
    const db = getFirestore();
    
    const snapshot = await retryWithBackoff(async () => {
      return await db.collection('assessments')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
    });

    const assessments = [];
    snapshot.forEach(doc => {
      assessments.push({ id: doc.id, ...doc.data() });
    });

    return {
      success: true,
      data: assessments
    };
  } catch (error) {
    logger.error('Failed to get user assessments', { userId, error: error.message });
    return {
      success: false,
      error: 'Failed to retrieve assessments',
      code: 'ERR_DATABASE_ERROR'
    };
  }
}

/**
 * Update user statistics
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, error?: string, code?: string}>}
 */
async function updateUserStats(userId, updates) {
  try {
    const db = getFirestore();
    
    await retryWithBackoff(async () => {
      await db.collection('users').doc(userId).update(updates);
    });

    logger.info('User stats updated successfully', { userId, updates });
    
    return { success: true };
  } catch (error) {
    logger.error('Failed to update user stats', { userId, error: error.message });
    return {
      success: false,
      error: 'Failed to update user statistics',
      code: 'ERR_DATABASE_ERROR'
    };
  }
}

module.exports = {
  upsertUser,
  getUser,
  storeAssessment,
  getUserAssessments,
  updateUserStats,
  getFirestore
};
