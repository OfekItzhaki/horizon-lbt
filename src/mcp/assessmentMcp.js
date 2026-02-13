const express = require('express');
const axios = require('axios');
const assessmentService = require('../services/assessmentService');
const config = require('../config/config');
const logger = require('../utils/logger');

const app = express();
app.use(express.json());

/**
 * MCP tool definition for assess_voice
 */
const ASSESS_VOICE_TOOL = {
  name: 'assess_voice',
  description: 'Assess language learning voice recording with AI-powered feedback',
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'User ID (Telegram ID or external system ID)'
      },
      lessonDay: {
        type: 'number',
        description: 'Lesson day number'
      },
      targetLanguage: {
        type: 'string',
        description: 'Target language code (en, es, fr, de)',
        enum: ['en', 'es', 'fr', 'de']
      },
      audioUrl: {
        type: 'string',
        description: 'URL to download the audio file'
      },
      lessonWords: {
        type: 'array',
        description: 'Array of lesson vocabulary words',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string' },
            translation: { type: 'string' },
            example: { type: 'string' }
          }
        }
      },
      expectedAnswer: {
        type: 'string',
        description: 'Expected response or quiz prompt'
      },
      nativeLanguage: {
        type: 'string',
        description: 'Native language code (default: he)',
        default: 'he'
      }
    },
    required: ['userId', 'lessonDay', 'targetLanguage', 'audioUrl']
  }
};

/**
 * Handle assess_voice tool call
 * @param {Object} params - Tool parameters
 * @returns {Promise<Object>} Assessment result
 */
async function handleAssessVoice(params) {
  try {
    logger.info('MCP assess_voice called', {
      userId: params.userId,
      lessonDay: params.lessonDay,
      targetLanguage: params.targetLanguage
    });

    // Validate required parameters
    if (!params.userId || !params.lessonDay || !params.targetLanguage || !params.audioUrl) {
      return {
        success: false,
        error: 'Missing required parameters',
        code: 'ERR_INVALID_INPUT'
      };
    }

    // Download audio from URL
    let audioBuffer;
    try {
      const response = await axios.get(params.audioUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      audioBuffer = Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download audio from URL', { error: error.message });
      return {
        success: false,
        error: 'Failed to download audio file',
        code: 'ERR_AUDIO_DOWNLOAD'
      };
    }

    // Prepare assessment parameters
    const assessmentParams = {
      userId: params.userId,
      lessonDay: params.lessonDay,
      targetLanguage: params.targetLanguage,
      nativeLanguage: params.nativeLanguage || 'he',
      audioBuffer,
      lessonWords: params.lessonWords || [],
      expectedAnswer: params.expectedAnswer || 'Practice speaking'
    };

    // Call assessment service (reuse same logic as bot)
    const result = await assessmentService.assessVoice(assessmentParams);

    if (!result.success) {
      return result;
    }

    // Return MCP-formatted response
    return {
      success: true,
      score: result.data.score,
      feedback: result.data.feedback,
      transcript: result.data.transcript,
      strengths: result.data.strengths,
      weakAreas: result.data.weakAreas,
      assessmentId: result.data.assessmentId
    };

  } catch (error) {
    logger.error('MCP assess_voice failed', { error: error.message });
    return {
      success: false,
      error: 'Assessment processing failed',
      code: 'ERR_GRADING_FAILED'
    };
  }
}

/**
 * MCP protocol endpoints
 */

// List available tools
app.post('/mcp/list-tools', (req, res) => {
  res.json({
    tools: [ASSESS_VOICE_TOOL]
  });
});

// Call tool
app.post('/mcp/call-tool', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;

    if (name !== 'assess_voice') {
      return res.status(404).json({
        error: `Tool '${name}' not found`
      });
    }

    const result = await handleAssessVoice(args);
    res.json(result);

  } catch (error) {
    logger.error('MCP call-tool error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'ERR_INTERNAL'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'language-learning-mcp' });
});

/**
 * Start MCP server
 * @param {number} port - Server port
 * @param {string} host - Server host
 * @returns {Promise<void>}
 */
async function startMcpServer(port = 3001, host = 'localhost') {
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, host, () => {
        logger.info(`MCP server started`, { host, port });
        resolve(server);
      });

      server.on('error', (error) => {
        logger.error('MCP server error', { error: error.message });
        reject(error);
      });
    } catch (error) {
      logger.error('Failed to start MCP server', { error: error.message });
      reject(error);
    }
  });
}

// If run directly (not imported)
if (require.main === module) {
  startMcpServer(config.mcp.port, config.mcp.host)
    .then(() => {
      logger.info('MCP server running standalone');
    })
    .catch((error) => {
      logger.error('Failed to start MCP server', { error: error.message });
      process.exit(1);
    });
}

module.exports = {
  startMcpServer,
  handleAssessVoice,
  app
};
