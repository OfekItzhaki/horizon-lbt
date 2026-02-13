const firebaseService = require('./firebaseService');
const logger = require('../utils/logger');

/**
 * Calculate user consistency metrics
 * @param {string} userId - User ID
 * @param {number} days - Number of days to analyze
 * @returns {Promise<{daysActive: number, streak: number}>}
 */
async function calculateConsistency(userId, days = 7) {
  try {
    const assessmentsResult = await firebaseService.getUserAssessments(userId, 100);
    
    if (!assessmentsResult.success || assessmentsResult.data.length === 0) {
      return { daysActive: 0, streak: 0 };
    }

    const assessments = assessmentsResult.data;
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get unique dates in the last N days
    const uniqueDates = new Set();
    assessments.forEach(assessment => {
      const date = new Date(assessment.timestamp.toDate ? assessment.timestamp.toDate() : assessment.timestamp);
      if (date >= cutoffDate) {
        const dateStr = date.toISOString().split('T')[0];
        uniqueDates.add(dateStr);
      }
    });

    // Get user data for streak
    const userResult = await firebaseService.getUser(userId);
    const streak = userResult.success ? (userResult.data.streak || 0) : 0;

    return {
      daysActive: uniqueDates.size,
      streak
    };
  } catch (error) {
    logger.error('Failed to calculate consistency', { userId, error: error.message });
    return { daysActive: 0, streak: 0 };
  }
}

/**
 * Analyze weak areas across users
 * @param {Array} assessments - Array of assessment objects
 * @returns {Object} Aggregated weak areas with counts
 */
function aggregateWeakAreas(assessments) {
  const weakAreaCounts = {};

  assessments.forEach(assessment => {
    if (assessment.weakAreas && Array.isArray(assessment.weakAreas)) {
      assessment.weakAreas.forEach(area => {
        weakAreaCounts[area] = (weakAreaCounts[area] || 0) + 1;
      });
    }
  });

  // Sort by count descending
  const sorted = Object.entries(weakAreaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return Object.fromEntries(sorted);
}

/**
 * Generate personalized recommendations based on weak areas
 * @param {Object} weakAreas - Weak areas with counts
 * @returns {Array<string>} Recommendations
 */
function generateRecommendations(weakAreas) {
  const recommendations = [];

  const areaRecommendations = {
    'pronunciation': 'Consider adding pronunciation-focused exercises',
    'grammar': 'Add more grammar drills and explanations',
    'vocabulary': 'Expand vocabulary exercises with more context',
    'fluency': 'Include more conversational practice sessions',
    'comprehension': 'Add listening comprehension exercises'
  };

  Object.keys(weakAreas).forEach(area => {
    const lowerArea = area.toLowerCase();
    for (const [key, recommendation] of Object.entries(areaRecommendations)) {
      if (lowerArea.includes(key)) {
        recommendations.push(recommendation);
        break;
      }
    }
  });

  if (recommendations.length === 0) {
    recommendations.push('Continue with current curriculum');
  }

  return recommendations;
}

/**
 * Generate weekly report for all users
 * @returns {Promise<{success: boolean, data?: string, error?: string, code?: string}>}
 */
async function generateWeeklyReport() {
  try {
    logger.info('Generating weekly report');

    const db = firebaseService.getFirestore();
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });

    if (users.length === 0) {
      return {
        success: true,
        data: '📊 Weekly Report\n\nNo active users yet.'
      };
    }

    // Get all assessments from the last week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const assessmentsSnapshot = await db.collection('assessments')
      .where('timestamp', '>=', oneWeekAgo)
      .get();
    
    const allAssessments = [];
    assessmentsSnapshot.forEach(doc => {
      allAssessments.push({ id: doc.id, ...doc.data() });
    });

    // Calculate metrics
    const activeUsers = new Set(allAssessments.map(a => a.userId)).size;
    const totalLessons = allAssessments.length;
    const avgScore = allAssessments.length > 0
      ? allAssessments.reduce((sum, a) => sum + a.score, 0) / allAssessments.length
      : 0;

    // Find top performers
    const userScores = {};
    allAssessments.forEach(assessment => {
      if (!userScores[assessment.userId]) {
        userScores[assessment.userId] = [];
      }
      userScores[assessment.userId].push(assessment.score);
    });

    const topPerformers = Object.entries(userScores)
      .map(([userId, scores]) => {
        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        const user = users.find(u => u.telegramId === userId);
        return {
          userId,
          name: user ? user.name : 'Unknown',
          avgScore: avg,
          streak: user ? user.streak : 0
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3);

    // Aggregate weak areas
    const weakAreas = aggregateWeakAreas(allAssessments);
    const recommendations = generateRecommendations(weakAreas);

    // Format report
    const startDate = new Date(oneWeekAgo);
    const endDate = new Date();
    const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

    let report = `📊 Weekly Language Learning Report\n`;
    report += `Week of: ${dateRange}\n\n`;
    
    report += `👥 Active Users: ${activeUsers}\n`;
    report += `📚 Total Lessons: ${totalLessons}\n`;
    report += `🎯 Average Score: ${Math.round(avgScore)}/100\n\n`;
    
    if (topPerformers.length > 0) {
      report += `🏆 Top Performers:\n`;
      topPerformers.forEach((performer, index) => {
        const streakEmoji = performer.streak >= 7 ? ' 🔥' : '';
        report += `${index + 1}. ${performer.name} - ${Math.round(performer.avgScore)} avg, ${performer.streak}-day streak${streakEmoji}\n`;
      });
      report += '\n';
    }
    
    if (Object.keys(weakAreas).length > 0) {
      report += `⚠️ Common Weak Areas:\n`;
      Object.entries(weakAreas).forEach(([area, count]) => {
        report += `  • ${area} (${count} users)\n`;
      });
      report += '\n';
    }
    
    if (recommendations.length > 0) {
      report += `💡 Recommendations:\n`;
      recommendations.forEach(rec => {
        report += `  • ${rec}\n`;
      });
      report += '\n';
    }
    
    report += `Next report: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`;

    logger.info('Weekly report generated successfully', {
      activeUsers,
      totalLessons,
      avgScore: Math.round(avgScore)
    });

    return {
      success: true,
      data: report
    };
  } catch (error) {
    logger.error('Failed to generate weekly report', { error: error.message });
    return {
      success: false,
      error: 'Failed to generate report',
      code: 'ERR_REPORT_GENERATION'
    };
  }
}

module.exports = {
  generateWeeklyReport,
  calculateConsistency,
  aggregateWeakAreas,
  generateRecommendations
};
