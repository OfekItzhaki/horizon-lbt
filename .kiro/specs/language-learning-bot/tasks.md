# Implementation Plan: Language Learning Bot

## Overview

This implementation plan breaks down the language learning bot into incremental, testable steps. Each task builds on previous work, with property-based tests and unit tests integrated throughout to catch errors early. The plan follows a bottom-up approach: core services first, then handlers, then integration and cron jobs.

## Tasks

- [x] 1. Project setup and configuration
  - Initialize Node.js project with package.json
  - Install dependencies: telegraf, openai, firebase-admin, axios, dotenv, node-cron, form-data, joi, winston, jest, fast-check
  - Create directory structure: src/{config,handlers,services,mcp,utils}, tests/
  - Create .env.example with all required and optional environment variables
  - _Requirements: 8.7_

- [ ] 2. Configuration and validation module
  - [x] 2.1 Implement config.js with environment variable loading
    - Load environment variables using dotenv
    - Define Joi schema for required variables: TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
    - Define optional variables with defaults: MCP_SERVER_PORT (3001), MCP_SERVER_HOST (localhost), NODE_ENV (development)
    - Export typed configuration object
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 2.2 Write unit tests for config validation
    - Test missing required variables cause validation failure
    - Test optional variables use defaults
    - Test NODE_ENV determines mode correctly
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [ ] 3. Logging and validation utilities
  - [x] 3.1 Implement logger.js with Winston
    - Configure Winston with console transport
    - Define log levels: error, warn, info, debug
    - Implement structured logging format with timestamps
    - Add sensitive data redaction for API keys and tokens
    - _Requirements: 9.1, 9.2, 8.8_
  
  - [x] 3.2 Implement validator.js with Joi wrapper
    - Create validate() function that accepts data and schema
    - Return {valid: boolean, error?: string} format
    - _Requirements: 10.3_
  
  - [ ]* 3.3 Write property test for sensitive data redaction
    - **Property 24: Sensitive Data Not Logged**
    - **Validates: Requirements 8.8**

- [ ] 4. Language configuration
  - [x] 4.1 Create languages.js with lesson content
    - Define structure for English (en), Spanish (es), French (fr), German (de)
    - Each language has name, flag emoji, and lessons object
    - Day 1 lesson for each language with 5 words (word, translation, example)
    - Include quizPrompt for each lesson day
    - _Requirements: 1.2, 2.4, 2.5_
  
  - [ ]* 4.2 Write unit test for lesson structure
    - Test Day 1 English lesson has exactly 5 words
    - Test each word has required fields
    - _Requirements: 2.4_

- [ ] 5. Firebase service
  - [x] 5.1 Implement firebaseService.js initialization
    - Initialize Firebase Admin SDK with credentials from config
    - Get Firestore instance
    - _Requirements: 7.1_
  
  - [x] 5.2 Implement user CRUD operations
    - upsertUser(userData): Create or update user with Joi validation
    - getUser(telegramId): Retrieve user by ID, return error if not found
    - updateUserStats(userId, updates): Update specific fields
    - Use document ID equal to telegramId
    - _Requirements: 7.2, 7.3, 7.4, 7.7, 7.8_
  
  - [x] 5.3 Implement assessment operations
    - storeAssessment(assessmentData): Store with auto-generated ID and Joi validation
    - getUserAssessments(userId, limit): Retrieve user's assessments ordered by timestamp
    - _Requirements: 7.5, 7.6, 7.7_
  
  - [x] 5.4 Implement retry logic with exponential backoff
    - Wrap Firestore operations in retry function
    - Retry up to 3 times with delays: 100ms, 200ms, 400ms
    - Log each retry attempt
    - _Requirements: 9.8_
  
  - [ ]* 5.5 Write property test for user initialization
    - **Property 1: User Initialization Completeness**
    - **Validates: Requirements 1.3, 1.4, 2.2**
  
  - [ ]* 5.6 Write property test for document ID
    - **Property 19: Document ID Matches Telegram ID**
    - **Validates: Requirements 7.2**
  
  - [ ]* 5.7 Write property test for schema compliance
    - **Property 18: User Document Schema Compliance**
    - **Validates: Requirements 7.3, 7.4**
  
  - [ ]* 5.8 Write property test for data validation
    - **Property 20: Data Validation Before Storage**
    - **Validates: Requirements 7.7, 10.3**
  
  - [ ]* 5.9 Write property test for missing data handling
    - **Property 21: Graceful Handling of Missing Data**
    - **Validates: Requirements 7.8**
  
  - [ ]* 5.10 Write unit test for retry logic
    - Test Firestore failure triggers 3 retries
    - Test exponential backoff delays
    - _Requirements: 9.8_

- [ ] 6. Checkpoint - Core infrastructure complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Lesson service
  - [x] 7.1 Implement lessonService.js
    - getLesson(languageCode, lessonDay): Retrieve lesson from languages.js
    - Validate language code and lesson day
    - Return standardized response: {success, data/error, code}
    - formatLesson(lesson, lessonDay): Format lesson for Telegram display
    - _Requirements: 2.5, 2.6_
  
  - [ ]* 7.2 Write property test for lesson structure
    - **Property 4: Lesson Structure Invariant**
    - **Validates: Requirements 2.4**
  
  - [ ]* 7.3 Write property test for lesson retrieval
    - **Property 5: Lesson Retrieval Correctness**
    - **Validates: Requirements 2.6**

- [ ] 8. OpenAI service
  - [x] 8.1 Implement openaiService.js
    - Initialize OpenAI client with API key from config
    - transcribeAudio(audioBuffer, language): Call Whisper API, return {success, data/error}
    - Implement retry logic (1 retry after 1 second)
    - _Requirements: 3.3_
  
  - [x] 8.2 Implement LLM grading function
    - gradeTranscript(params): Build prompt from template, call GPT-4
    - Prompt template includes: teacher role, transcript, lesson words, expected answer, rubric (Pronunciation 25, Grammar 25, Vocabulary 20, Fluency 20, Comprehension 10)
    - Request format: SCORE, FEEDBACK, STRENGTHS, WEAK_AREAS
    - Implement retry logic (1 retry after 1 second)
    - _Requirements: 3.4, 3.5, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
  
  - [ ]* 8.3 Write unit test for LLM prompt template
    - Test prompt includes all required sections
    - Test rubric point allocations are correct
    - _Requirements: 11.1, 11.3, 11.4, 11.5, 11.6, 11.7_
  
  - [ ]* 8.4 Write unit test for API failure recovery
    - Test OpenAI failure triggers retry
    - Test error response after retry fails
    - _Requirements: 9.7_

- [ ] 9. Assessment service
  - [x] 9.1 Implement assessmentService.js core logic
    - assessVoice(params): Coordinate transcription, grading, and storage
    - Validate inputs with Joi schema
    - Call openaiService.transcribeAudio()
    - Call openaiService.gradeTranscript()
    - Parse LLM response to extract score, feedback, strengths, weakAreas
    - Store assessment in Firestore
    - Update user avgScore and streak
    - Return standardized response with assessmentId
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.8, 3.9, 3.10_
  
  - [x] 9.2 Implement parseGradingResponse() function
    - Extract SCORE: X/100 using regex
    - Extract FEEDBACK: text
    - Extract STRENGTHS: comma-separated list
    - Extract WEAK_AREAS: comma-separated list
    - Handle malformed responses: return default values (score: 0, generic feedback)
    - Log parsing errors
    - _Requirements: 11.8, 11.9_
  
  - [x] 9.3 Implement streak calculation logic
    - calculateStreak(userId, newAssessmentDate): Get user's assessments
    - Check if newAssessmentDate is consecutive with last assessment
    - Increment streak if consecutive, reset to 1 if not
    - Return new streak value
    - _Requirements: 3.10, 4.5_
  
  - [ ]* 9.4 Write property test for voice recording workflow
    - **Property 8: Voice Recording Workflow**
    - **Validates: Requirements 3.2, 3.3, 3.4**
  
  - [ ]* 9.5 Write property test for assessment storage
    - **Property 9: Assessment Storage Completeness**
    - **Validates: Requirements 3.8, 6.8, 7.6**
  
  - [ ]* 9.6 Write property test for average score calculation
    - **Property 10: Average Score Recalculation**
    - **Validates: Requirements 3.9, 4.6**
  
  - [ ]* 9.7 Write property test for streak increment
    - **Property 11: Streak Increment on New Day**
    - **Validates: Requirements 3.10, 4.5**
  
  - [ ]* 9.8 Write property test for LLM response parsing
    - **Property 12: LLM Response Parsing**
    - **Validates: Requirements 3.6, 11.8**
  
  - [ ]* 9.9 Write unit test for malformed LLM response
    - Test parsing failure returns default values
    - Test error is logged
    - _Requirements: 11.9_
  
  - [ ]* 9.10 Write unit test for empty audio file
    - Test empty buffer returns error
    - _Requirements: 10.9_

- [ ] 10. Checkpoint - Core services complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Start handler
  - [x] 11.1 Implement startHandler.js
    - handleStart(ctx): Send welcome message with language selection inline keyboard
    - Keyboard layout: [🇺🇸 English] [🇪🇸 Spanish] / [🇫🇷 French] [🇩🇪 German]
    - Register callback query handler for language selection
    - _Requirements: 1.1, 1.2_
  
  - [x] 11.2 Implement language selection callback
    - handleLanguageSelection(ctx, languageCode): Extract user info from ctx
    - Create user record with targetLanguage, nativeLanguage (default 'he'), lessonDay: 1
    - Call firebaseService.upsertUser()
    - Call lessonService.getLesson() for Day 1
    - Send lesson to user
    - _Requirements: 1.3, 1.4, 1.5_
  
  - [ ]* 11.3 Write property test for language selection
    - **Property 2: Language Selection Triggers Day 1 Lesson**
    - **Validates: Requirements 1.5**
  
  - [ ]* 11.4 Write unit test for /start response
    - Test response contains welcome message and buttons
    - Test buttons include en, es, fr, de
    - _Requirements: 1.1, 1.2_

- [ ] 12. Lesson handler
  - [x] 12.1 Implement lessonHandler.js
    - sendLesson(userId, languageCode, lessonDay): Get lesson from lessonService
    - Format lesson message with emoji and structure
    - Add ✅ completion inline button
    - Send message via Telegram API
    - _Requirements: 2.6, 2.7_
  
  - [x] 12.2 Implement lesson completion callback
    - handleLessonComplete(ctx): Extract userId from ctx
    - Increment totalLessons in Firestore
    - Send voice recording prompt with quiz question
    - _Requirements: 2.8, 2.9, 3.1_
  
  - [ ]* 12.3 Write property test for lesson completion
    - **Property 6: Lesson Completion Increments Counter**
    - **Validates: Requirements 2.9**
  
  - [ ]* 12.4 Write property test for voice prompt
    - **Property 7: Lesson Completion Triggers Voice Prompt**
    - **Validates: Requirements 3.1**
  
  - [ ]* 12.5 Write property test for lesson message structure
    - Test lesson message includes completion button
    - _Requirements: 2.7_

- [ ] 13. Assessment handler
  - [x] 13.1 Implement assessmentHandler.js
    - handleVoiceMessage(ctx): Extract voice message from ctx
    - Download audio file from Telegram servers using file_id
    - Get user's current lesson info from Firestore
    - Get expected answer from lesson configuration
    - Call assessmentService.assessVoice() with audio buffer
    - Format and send assessment result to user
    - Handle errors gracefully with user-friendly messages
    - _Requirements: 3.2, 3.7_
  
  - [x] 13.2 Implement formatAssessmentResult() function
    - Format score with 📊 emoji
    - Format feedback text
    - Format strengths with ✅ emoji
    - Format weak areas with ⚠️ emoji
    - _Requirements: 3.7_
  
  - [ ]* 13.3 Write property test for voice message handling
    - Test voice message triggers assessment workflow
    - _Requirements: 3.2_
  
  - [ ]* 13.4 Write unit test for error handling
    - Test Telegram API failure shows user-friendly message
    - Test OpenAI API failure shows service unavailable message
    - _Requirements: 9.6, 9.7_

- [ ] 14. Progress handler
  - [x] 14.1 Implement progressHandler.js
    - handleProgress(ctx): Get userId from ctx
    - Retrieve user data from Firestore
    - Calculate streak using assessmentService.calculateStreak()
    - Format progress message with emojis: 🔥 for streak, 📊 for score
    - Include totalLessons and weakAreas
    - Add inline buttons: /lesson, /change, /settings
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [ ]* 14.2 Write property test for progress display
    - **Property 13: Progress Display Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
  
  - [ ]* 14.3 Write unit test for progress buttons
    - Test message includes /lesson, /change, /settings buttons
    - _Requirements: 4.7_

- [ ] 15. Settings handler
  - [x] 15.1 Implement settingsHandler.js
    - handleChangeLanguage(ctx): Display language selection keyboard (reuse from startHandler)
    - Handle language change callback: Update targetLanguage in Firestore
    - Reset lessonDay to 1
    - Send confirmation message
    - _Requirements: 1.6, 1.7, 1.8_
  
  - [ ]* 15.2 Write property test for language change
    - **Property 3: Language Change Resets Progress**
    - **Validates: Requirements 1.7, 1.8**
  
  - [ ]* 15.3 Write unit test for /change response
    - Test response contains language selection buttons
    - _Requirements: 1.6_

- [ ] 16. Checkpoint - All handlers complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Report service
  - [x] 17.1 Implement reportService.js
    - generateWeeklyReport(): Get all users from Firestore
    - For each user, calculate consistency metrics (days practiced in last 7 days, current streak)
    - Calculate performance metrics (avgScore, best day score, trends)
    - Aggregate weak areas across all users
    - Generate personalized recommendations based on weak areas
    - Format report with emoji and structure
    - Return formatted report string
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 17.2 Implement helper functions
    - calculateConsistency(userId, days): Count assessments in last N days
    - aggregateWeakAreas(assessments): Count occurrences of each weak area
    - generateRecommendations(weakAreas): Map weak areas to actionable advice
    - _Requirements: 5.3, 5.5, 5.6_
  
  - [ ]* 17.3 Write property test for report structure
    - **Property 14: Weekly Report Structure**
    - **Validates: Requirements 5.3, 5.4, 5.5, 5.6**
  
  - [ ]* 17.4 Write property test for weak areas aggregation
    - Test aggregation counts correctly across multiple assessments
    - _Requirements: 5.5_

- [ ] 18. MCP server
  - [x] 18.1 Implement assessmentMcp.js
    - Create Express server on configured port (default 3001)
    - Implement MCP protocol JSON-RPC interface
    - Define assess_voice tool with input schema
    - handleAssessVoice(params): Validate params, download audio from audioUrl
    - Call assessmentService.assessVoice() (reuse same logic as bot)
    - Return response: {success, score, feedback, transcript, strengths, weakAreas, assessmentId}
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_
  
  - [x] 18.2 Implement startMcpServer() function
    - Start Express server on configured host and port
    - Log server start with host:port
    - Handle server errors
    - _Requirements: 6.1, 6.2_
  
  - [ ]* 18.3 Write property test for MCP consistency
    - **Property 16: MCP Assessment Consistency**
    - **Validates: Requirements 6.6, 6.7, 11.10**
  
  - [ ]* 18.4 Write property test for MCP response
    - **Property 17: MCP Response Completeness**
    - **Validates: Requirements 6.9**
  
  - [ ]* 18.5 Write unit test for MCP tool definition
    - Test assess_voice tool is exposed
    - Test input schema validation
    - _Requirements: 6.3, 6.4_

- [ ] 19. Bot initialization and cron jobs
  - [x] 19.1 Implement index.js bot setup
    - Load and validate configuration (exit if invalid)
    - Initialize Firebase
    - Create Telegraf bot instance
    - Register command handlers: /start, /progress, /change
    - Register message handler for voice messages
    - Register callback query handlers for buttons
    - _Requirements: 8.2, 8.6_
  
  - [x] 19.2 Implement bot startup logic
    - Check NODE_ENV: use webhook if production, polling if development
    - For webhook: configure webhook path from BOT_WEBHOOK_PATH
    - For polling: start polling with error handling
    - Log bot startup with mode
    - _Requirements: 8.5, 13.1, 13.2, 13.3_
  
  - [x] 19.3 Implement daily lesson cron job
    - Schedule cron job using node-cron
    - For each user with notificationEnabled: true, send lesson at their lessonTime
    - Default to 09:00 if lessonTime not set
    - Log each lesson sent
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 19.4 Implement weekly report cron job
    - Schedule cron job for Sunday 20:00
    - Call reportService.generateWeeklyReport()
    - Send report to admin Telegram ID from config
    - Log report generation
    - _Requirements: 5.1, 5.7, 5.8_
  
  - [x] 19.5 Implement graceful shutdown
    - Register handlers for SIGTERM and SIGINT
    - Stop cron jobs
    - Close Firestore connection
    - Stop bot (webhook or polling)
    - Wait for in-flight requests to complete
    - Exit with code 0
    - _Requirements: 13.9_
  
  - [ ]* 19.6 Write property test for environment mode
    - **Property 22: Environment Mode Determines Bot Mode**
    - **Validates: Requirements 8.5**
  
  - [ ]* 19.7 Write property test for startup failure
    - **Property 23: Missing Required Environment Variables Cause Startup Failure**
    - **Validates: Requirements 8.6**
  
  - [ ]* 19.8 Write property test for graceful shutdown
    - **Property 29: Graceful Shutdown Cleanup**
    - **Validates: Requirements 13.9**
  
  - [ ]* 19.9 Write unit test for cron job scheduling
    - Test daily lesson cron uses correct time
    - Test weekly report cron uses Sunday 20:00
    - Use fake timers for testing
    - _Requirements: 2.1, 5.1_

- [ ] 20. Integration and wiring
  - [x] 20.1 Start MCP server in index.js
    - Call startMcpServer() with config.mcp.port and config.mcp.host
    - Log MCP server start
    - _Requirements: 6.1, 6.2_
  
  - [x] 20.2 Wire all components together
    - Ensure all handlers use services correctly
    - Ensure all services use standardized error responses
    - Ensure all errors are logged appropriately
    - Test end-to-end flow: /start → language selection → lesson → voice → assessment → progress
    - _Requirements: 9.4, 9.5_
  
  - [ ]* 20.3 Write integration tests
    - Test complete user onboarding flow
    - Test complete assessment flow
    - Test report generation with multiple users
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.8, 5.2_

- [ ] 21. Error handling standardization
  - [ ] 21.1 Implement standardized error responses
    - Ensure all service functions return {success, data/error, code}
    - Define all error codes in a constants file
    - _Requirements: 9.4_
  
  - [ ]* 21.2 Write property test for error response format
    - **Property 25: Standardized Error Response Format**
    - **Validates: Requirements 9.4**
  
  - [ ]* 21.3 Write property test for Telegram API failure
    - **Property 26: Telegram API Failure Recovery**
    - **Validates: Requirements 9.6**
  
  - [ ]* 21.4 Write property test for OpenAI API failure
    - **Property 27: OpenAI API Failure Recovery**
    - **Validates: Requirements 9.7**
  
  - [ ]* 21.5 Write property test for Firestore retry
    - **Property 28: Firestore Retry Logic**
    - **Validates: Requirements 9.8**

- [ ] 22. Documentation and README
  - [x] 22.1 Create comprehensive README.md
    - Project overview and features
    - Prerequisites and dependencies
    - Installation instructions: npm install
    - Environment variable setup (reference .env.example)
    - Running the bot: npm run dev (development), npm start (production)
    - Running tests: npm test
    - MCP server usage and API documentation
    - Deployment checklist from requirements
    - Troubleshooting common issues
    - _Requirements: 13.10_
  
  - [ ] 22.2 Add JSDoc comments to all public functions
    - Document parameters, return types, and behavior
    - Include examples where helpful
    - _Requirements: 10.4_

- [ ] 23. Final checkpoint - Complete system verification
  - Run all tests and ensure 100% pass rate
  - Verify test coverage meets goals (80% overall, 90% services)
  - Run linter and fix any issues
  - Test bot manually with .env.example configuration
  - Verify MCP server responds correctly
  - Ensure all files are under 250 lines
  - Ask the user if questions arise before considering complete.

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and allow for course correction
- Property tests validate universal correctness properties across many inputs
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation follows a bottom-up approach: infrastructure → services → handlers → integration
- All external APIs (OpenAI, Telegram, Firestore) should be mocked in tests for fast, deterministic execution
