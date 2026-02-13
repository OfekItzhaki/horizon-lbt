# Language Learning Bot 🌍

A production-ready Telegram bot for language learning with AI-powered voice assessment, daily lessons, progress tracking, and weekly reports.

## Features

- 🌐 **Multi-language Support**: English, Spanish, French, German (easily extensible)
- 🎤 **AI Voice Assessment**: Pronunciation, grammar, vocabulary, fluency, and comprehension scoring
- 📚 **Daily Lessons**: Automated lesson delivery at user-configured times
- 📊 **Progress Tracking**: Streaks, average scores, and weak area identification
- 📈 **Weekly Reports**: Admin reports with user analytics and recommendations
- 🔌 **MCP Server**: External API access for voice assessment functionality
- 🔥 **Firebase Integration**: Persistent data storage with Firestore

## Prerequisites

- Node.js v18 or higher
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- OpenAI API Key (for Whisper + GPT-4)
- Firebase Project with Firestore enabled

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd language-learning-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your credentials:
   - `TELEGRAM_BOT_TOKEN`: Get from @BotFather
   - `OPENAI_API_KEY`: Get from OpenAI dashboard
   - `FIREBASE_*`: Get from Firebase project settings
   - `ADMIN_TELEGRAM_ID`: Your Telegram user ID for reports

4. **Set up Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Firestore Database
   - Create a service account and download credentials
   - Set Firestore rules (for development):
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /{document=**} {
           allow read, write: if true;
         }
       }
     }
     ```

## Running the Bot

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### MCP Server Only
```bash
npm run start:mcp
```

## Usage

### User Commands

- `/start` - Start the bot and select target language
- `/lesson` - Get current lesson
- `/progress` - View learning statistics
- `/change` - Change target language

### User Flow

1. Send `/start` to the bot
2. Select your target language (English, Spanish, French, or German)
3. Receive Day 1 lesson with 5 vocabulary words
4. Click ✅ to mark lesson complete
5. Send a voice message with your practice answer
6. Receive AI-powered feedback with score and suggestions
7. Use `/progress` to track your stats

## MCP Server API

The MCP server runs on port 3001 (configurable) and provides voice assessment functionality.

### Endpoints

**List Tools**
```bash
POST http://localhost:3001/mcp/list-tools
```

**Call Tool**
```bash
POST http://localhost:3001/mcp/call-tool
Content-Type: application/json

{
  "name": "assess_voice",
  "arguments": {
    "userId": "123456789",
    "lessonDay": 1,
    "targetLanguage": "en",
    "audioUrl": "https://example.com/audio.ogg",
    "lessonWords": [
      {"word": "hello", "translation": "שלום", "example": "Hello, how are you?"}
    ],
    "expectedAnswer": "Say hello"
  }
}
```

**Health Check**
```bash
GET http://localhost:3001/health
```

## Testing

```bash
npm test
```

## Project Structure

```
language-learning-bot/
├── src/
│   ├── index.js              # Bot entry point
│   ├── config/
│   │   ├── config.js         # Environment configuration
│   │   └── languages.js      # Lesson content
│   ├── handlers/
│   │   ├── startHandler.js   # /start + language picker
│   │   ├── lessonHandler.js  # Daily lessons
│   │   ├── assessmentHandler.js # Voice assessment
│   │   ├── progressHandler.js   # /progress
│   │   └── settingsHandler.js   # Language change
│   ├── services/
│   │   ├── assessmentService.js # AI grading core
│   │   ├── lessonService.js     # Lesson content
│   │   ├── openaiService.js     # Whisper + LLM
│   │   ├── firebaseService.js   # Database operations
│   │   └── reportService.js     # Weekly analytics
│   ├── mcp/
│   │   └── assessmentMcp.js  # MCP server
│   └── utils/
│       ├── logger.js         # Winston logging
│       └── validator.js      # Joi validation
├── tests/
│   └── assessment.test.js
├── .env.example
├── package.json
└── README.md
```

## Deployment

### Using Railway

1. Install Railway CLI
   ```bash
   npm install -g @railway/cli
   ```

2. Login and initialize
   ```bash
   railway login
   railway init
   ```

3. Set environment variables in Railway dashboard

4. Deploy
   ```bash
   railway up
   ```

5. Set webhook URL
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_RAILWAY_URL>/webhook"
   ```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "src/index.js"]
```

## Deployment Checklist

- [ ] Bot responds to /start
- [ ] Language picker works + persists
- [ ] Daily lesson sends (09:00 cron)
- [ ] Voice → assessment < 10s
- [ ] Score stored in Firestore
- [ ] Weekly report to admin (Sunday 20:00)
- [ ] MCP server responds at configured port
- [ ] /progress shows stats
- [ ] /change language resets lessons
- [ ] Zero crashes (error handling)

## Troubleshooting

### Firebase Errors

**Error: "project not found"**
- Check `FIREBASE_PROJECT_ID` in `.env`

**Error: "permission denied"**
- Enable Firestore in Firebase Console
- Update Firestore security rules

### Bot Not Responding

Check webhook status:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Should show your production URL.

### Voice Assessment Fails

- Check OpenAI API key and credits
- Test Whisper API manually
- Check logs for detailed error messages

## Architecture

The bot follows a modular architecture:

- **Handlers**: Process Telegram updates and user interactions
- **Services**: Implement business logic and coordinate external APIs
- **Utils**: Provide logging, validation, and helper functions
- **MCP**: Expose assessment functionality via Model Context Protocol

All services return standardized responses:
```javascript
{
  success: boolean,
  data?: any,
  error?: string,
  code?: string
}
```

## Contributing

1. Follow the coding standards in `.cursorrules`
2. Write tests for new features
3. Keep files under 250 lines
4. Use async/await (no callbacks)
5. Add JSDoc comments to public functions

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
