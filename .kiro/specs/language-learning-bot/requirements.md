# Requirements Document

## Introduction

This document specifies the requirements for a production-ready Telegram bot designed for language learning. The system enables busy adults to practice language skills through daily lessons, AI-powered voice assessments, and progress tracking. The bot supports multiple target languages, provides personalized feedback, and generates weekly progress reports. An MCP server interface allows external systems to access the voice assessment functionality.

## Glossary

- **Bot**: The Telegram language learning bot system
- **User**: A Telegram user interacting with the Bot
- **Admin**: The system administrator who receives weekly reports
- **Target_Language**: The language the User is learning
- **Native_Language**: The User's primary language
- **Lesson**: A structured learning unit containing vocabulary words, translations, and examples
- **Assessment**: An AI-powered evaluation of a User's voice recording
- **MCP_Server**: Model Context Protocol server providing voice assessment API
- **Firestore**: Firebase Firestore database for data persistence
- **Whisper_API**: OpenAI's speech-to-text transcription service
- **LLM**: Large Language Model used for grading assessments
- **Streak**: Consecutive days a User has completed lessons
- **Lesson_Day**: Sequential day number in the learning curriculum
- **Voice_Recording**: Audio message sent by User for assessment
- **Transcript**: Text output from Whisper_API transcription
- **Score**: Numerical grade (0-100) for an Assessment
- **Rubric**: Scoring criteria with five components (Pronunciation, Grammar, Vocabulary, Fluency, Comprehension)
- **Weak_Areas**: Skills identified as needing improvement
- **Cron_Job**: Scheduled automated task
- **Inline_Button**: Telegram keyboard button for user interaction
- **Webhook**: HTTP callback for receiving Telegram updates

## Requirements

### Requirement 1: User Onboarding and Language Selection

**User Story:** As a new user, I want to select my target language when I start using the bot, so that I receive lessons in the language I want to learn.

#### Acceptance Criteria

1. WHEN a User sends the /start command, THE Bot SHALL display a welcome message with inline buttons for language selection
2. THE Bot SHALL support at minimum English, Spanish, French, and German as Target_Language options
3. WHEN a User selects a Target_Language, THE Bot SHALL store the User's telegramId, name, Target_Language, and Native_Language in Firestore
4. WHEN a User selects a Target_Language, THE Bot SHALL initialize the User's Lesson_Day to 1
5. WHEN a User selects a Target_Language, THE Bot SHALL send the Day 1 Lesson immediately
6. WHEN a User sends the /change command, THE Bot SHALL display the language selection inline buttons
7. WHEN a User changes their Target_Language, THE Bot SHALL reset their Lesson_Day to 1
8. WHEN a User changes their Target_Language, THE Bot SHALL update the Target_Language field in Firestore

### Requirement 2: Daily Lesson Delivery

**User Story:** As a user, I want to receive daily lessons at a consistent time, so that I can build a regular learning habit.

#### Acceptance Criteria

1. THE Bot SHALL schedule a Cron_Job to send lessons at the User's configured lesson time
2. THE Bot SHALL use 09:00 as the default lesson time for new Users
3. WHEN the Cron_Job executes, THE Bot SHALL send a Lesson to each User with notifications enabled
4. THE Lesson SHALL contain exactly 5 vocabulary words with translations and example sentences
5. THE Lesson SHALL be retrieved from a structured configuration file (languages.js)
6. THE Lesson SHALL correspond to the User's current Lesson_Day and Target_Language
7. WHEN a Lesson is sent, THE Bot SHALL include a ✅ completion button
8. WHEN a User clicks the ✅ button, THE Bot SHALL mark the Lesson as complete
9. WHEN a User marks a Lesson complete, THE Bot SHALL increment the User's totalLessons count in Firestore

### Requirement 3: Voice Assessment System

**User Story:** As a user, I want to receive AI-powered feedback on my pronunciation and grammar, so that I can improve my speaking skills.

#### Acceptance Criteria

1. WHEN a User marks a Lesson complete, THE Bot SHALL prompt the User to send a Voice_Recording
2. WHEN a User sends a Voice_Recording, THE Bot SHALL download the audio file from Telegram servers
3. WHEN the Bot receives a Voice_Recording, THE Bot SHALL send the audio to Whisper_API for transcription
4. WHEN Whisper_API returns a Transcript, THE Bot SHALL send the Transcript to the LLM for grading
5. THE LLM SHALL grade the Transcript using a 100-point Rubric with five components: Pronunciation (25pts), Grammar (25pts), Vocabulary (20pts), Fluency (20pts), Comprehension (10pts)
6. THE LLM SHALL return a Score, actionable feedback text, strengths list, and Weak_Areas list
7. THE Bot SHALL send the Score and feedback to the User within 10 seconds of receiving the Voice_Recording
8. THE Bot SHALL store the Assessment in Firestore with userId, lessonDay, targetLanguage, score, transcript, expectedAnswer, feedback, strengths, and weakAreas
9. WHEN an Assessment is completed, THE Bot SHALL update the User's avgScore in Firestore
10. WHEN an Assessment is completed, THE Bot SHALL update the User's Streak if the lesson was completed on a new day

### Requirement 4: Progress Tracking and Display

**User Story:** As a user, I want to view my learning progress and statistics, so that I can stay motivated and identify areas for improvement.

#### Acceptance Criteria

1. WHEN a User sends the /progress command, THE Bot SHALL display the User's current Streak with a 🔥 emoji
2. WHEN a User sends the /progress command, THE Bot SHALL display the User's average Score with a 📊 emoji
3. WHEN a User sends the /progress command, THE Bot SHALL display the total number of lessons completed
4. WHEN a User sends the /progress command, THE Bot SHALL display the User's identified Weak_Areas
5. THE Bot SHALL calculate Streak as consecutive days with at least one completed lesson
6. THE Bot SHALL calculate average Score from all stored Assessments for the User
7. WHEN displaying progress, THE Bot SHALL include inline buttons for /lesson, /change, and /settings commands

### Requirement 5: Weekly Progress Reports

**User Story:** As an admin, I want to receive weekly reports on user engagement and performance, so that I can monitor the bot's effectiveness and identify users who need support.

#### Acceptance Criteria

1. THE Bot SHALL schedule a Cron_Job to generate weekly reports every Sunday at 20:00
2. WHEN the weekly Cron_Job executes, THE Bot SHALL generate a report for all active Users
3. THE report SHALL include consistency metrics: days practiced per week and current Streak
4. THE report SHALL include performance metrics: average Score, best day score, and performance trends
5. THE report SHALL include aggregated Weak_Areas analysis across all Users
6. THE report SHALL include personalized recommendations for each User
7. WHEN the report is generated, THE Bot SHALL send it to the Admin's Telegram ID
8. THE Bot SHALL retrieve the Admin's Telegram ID from the ADMIN_TELEGRAM_ID environment variable

### Requirement 6: MCP Server for External API Access

**User Story:** As an external system developer, I want to access the voice assessment functionality through an MCP server, so that I can integrate language assessment into other applications.

#### Acceptance Criteria

1. THE MCP_Server SHALL run as a standalone server on a configurable port
2. THE MCP_Server SHALL use port 3001 as the default port
3. THE MCP_Server SHALL expose a tool named "assess_voice"
4. WHEN the assess_voice tool is called, THE MCP_Server SHALL accept parameters: userId, lessonDay, targetLanguage, audioUrl, lessonWords, expectedAnswer
5. WHEN the assess_voice tool is called, THE MCP_Server SHALL download audio from the provided audioUrl
6. WHEN the assess_voice tool is called, THE MCP_Server SHALL transcribe the audio using Whisper_API
7. WHEN the assess_voice tool is called, THE MCP_Server SHALL grade the Transcript using the LLM with the same Rubric as the Bot
8. WHEN the assess_voice tool is called, THE MCP_Server SHALL store the Assessment in Firestore
9. WHEN the assess_voice tool completes, THE MCP_Server SHALL return: success status, score, feedback, transcript, strengths, weakAreas, and assessmentId
10. THE MCP_Server SHALL complete assessment requests within 10 seconds

### Requirement 7: Data Persistence and Schema

**User Story:** As a system, I need to persist user data and assessments reliably, so that user progress is maintained across sessions and can be analyzed over time.

#### Acceptance Criteria

1. THE Bot SHALL use Firebase Admin SDK to interact with Firestore
2. THE Bot SHALL store user records in a "users" collection with document ID equal to telegramUserId
3. THE user document SHALL contain: telegramId, name, targetLanguage, nativeLanguage, createdAt, streak, totalLessons, avgScore, and settings object
4. THE settings object SHALL contain: lessonTime and notificationEnabled fields
5. THE Bot SHALL store assessment records in an "assessments" collection with auto-generated document IDs
6. THE assessment document SHALL contain: userId, lessonDay, targetLanguage, score, transcript, expectedAnswer, feedback, strengths array, weakAreas array, and timestamp
7. WHEN storing data, THE Bot SHALL validate all required fields are present
8. WHEN retrieving data, THE Bot SHALL handle missing documents gracefully and return appropriate error messages

### Requirement 8: Configuration and Environment Management

**User Story:** As a developer, I want all configuration to be managed through environment variables, so that the bot can be deployed securely across different environments.

#### Acceptance Criteria

1. THE Bot SHALL load configuration from environment variables using dotenv
2. THE Bot SHALL validate all required environment variables on startup
3. THE Bot SHALL require: TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
4. THE Bot SHALL support optional environment variables: ANTHROPIC_API_KEY, MCP_SERVER_PORT, MCP_SERVER_HOST, BOT_WEBHOOK_PATH
5. THE Bot SHALL use NODE_ENV to determine development or production mode
6. WHEN required environment variables are missing, THE Bot SHALL log an error and exit with a non-zero status code
7. THE Bot SHALL provide an .env.example file documenting all environment variables
8. THE Bot SHALL never log or expose sensitive environment variable values

### Requirement 9: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can diagnose issues and maintain system reliability.

#### Acceptance Criteria

1. THE Bot SHALL use Winston for structured logging
2. THE Bot SHALL log at appropriate levels: error, warn, info, debug
3. THE Bot SHALL never use console.log in production code
4. WHEN an error occurs, THE Bot SHALL return an error object with: success (false), error message, and error code
5. THE Bot SHALL handle all promise rejections with try-catch blocks
6. WHEN a Telegram API call fails, THE Bot SHALL log the error and send a user-friendly message to the User
7. WHEN an OpenAI API call fails, THE Bot SHALL log the error and notify the User that assessment is temporarily unavailable
8. WHEN a Firestore operation fails, THE Bot SHALL log the error and retry up to 3 times with exponential backoff
9. THE Bot SHALL log all incoming Telegram updates at debug level
10. THE Bot SHALL log all assessment completions at info level

### Requirement 10: Code Quality and Architecture Standards

**User Story:** As a developer, I want the codebase to follow consistent standards and best practices, so that the code is maintainable and extensible.

#### Acceptance Criteria

1. THE Bot SHALL use async/await for all asynchronous operations
2. THE Bot SHALL never use callback-style asynchronous code
3. THE Bot SHALL validate all service layer inputs using Joi schemas
4. THE Bot SHALL document all public functions with JSDoc comments
5. THE Bot SHALL organize code into modules: handlers, services, mcp, config, and utils
6. THE Bot SHALL keep all source files under 250 lines of code
7. THE Bot SHALL never include hardcoded strings, API keys, or configuration values in source code
8. THE Bot SHALL use meaningful variable and function names following camelCase convention
9. THE Bot SHALL handle edge cases: empty audio files, malformed transcripts, network timeouts, invalid user input
10. THE Bot SHALL include error boundaries to prevent crashes from propagating

### Requirement 11: Assessment Rubric and LLM Prompt

**User Story:** As a user, I want consistent and fair assessment of my language skills, so that I can trust the feedback and track meaningful improvement.

#### Acceptance Criteria

1. THE LLM prompt SHALL identify the LLM as an expert teacher for Native_Language speakers learning Target_Language
2. THE LLM prompt SHALL include the Transcript, lesson words, and expected answer
3. THE LLM prompt SHALL specify the Rubric with exact point allocations: Pronunciation (25pts), Grammar (25pts), Vocabulary (20pts), Fluency (20pts), Comprehension (10pts)
4. THE LLM prompt SHALL request a Score in the format "SCORE: X/100"
5. THE LLM prompt SHALL request actionable feedback limited to 1-2 sentences
6. THE LLM prompt SHALL request strengths as a comma-separated list
7. THE LLM prompt SHALL request Weak_Areas as a comma-separated list
8. THE Bot SHALL parse the LLM response to extract Score, feedback, strengths, and Weak_Areas
9. WHEN the LLM response cannot be parsed, THE Bot SHALL log an error and assign a default Score of 0 with generic feedback
10. THE Bot SHALL use the same prompt template for both Bot assessments and MCP_Server assessments

### Requirement 12: Testing Requirements

**User Story:** As a developer, I want automated tests to verify core functionality, so that I can confidently make changes without breaking existing features.

#### Acceptance Criteria

1. THE Bot SHALL include a test suite using Jest
2. THE test suite SHALL include tests/assessment.test.js covering assessment functionality
3. THE assessment tests SHALL mock OpenAI API calls
4. THE assessment tests SHALL mock Firestore operations
5. THE assessment tests SHALL verify grading response parsing
6. THE assessment tests SHALL test edge cases: empty audio, malformed transcripts, API failures
7. THE test suite SHALL include tests/lesson.test.js covering lesson functionality
8. THE lesson tests SHALL verify Day 1 English lesson returns correct vocabulary words
9. THE lesson tests SHALL verify language switching resets Lesson_Day to 1
10. THE Bot SHALL achieve test execution without requiring live API credentials

### Requirement 13: Deployment and Production Readiness

**User Story:** As a system administrator, I want the bot to be production-ready with proper deployment configuration, so that it can run reliably in a production environment.

#### Acceptance Criteria

1. THE Bot SHALL support both webhook mode (production) and polling mode (development)
2. WHEN NODE_ENV is "production", THE Bot SHALL use webhook mode
3. WHEN NODE_ENV is "development", THE Bot SHALL use polling mode
4. THE Bot SHALL respond to /start command within 2 seconds
5. THE Bot SHALL complete voice assessments within 10 seconds
6. THE Bot SHALL send daily lessons at the scheduled time with less than 1 minute variance
7. THE Bot SHALL send weekly reports at the scheduled time with less than 5 minute variance
8. THE MCP_Server SHALL respond to assess_voice requests at the configured host and port
9. THE Bot SHALL handle graceful shutdown: close database connections, stop cron jobs, and complete in-flight requests
10. THE Bot SHALL include a README.md with setup instructions, environment variable documentation, and deployment checklist
