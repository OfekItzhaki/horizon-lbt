# Deploy to Render

## Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (recommended)

## Step 2: Create New Web Service
1. Click "New +" button
2. Select "Web Service"
3. Connect your GitHub repository
4. Select the `horizon-lbt` repository

## Step 3: Configure Service
Render will auto-detect the `render.yaml` file. You just need to add the secret environment variables:

### Required Environment Variables
Add these in the Render dashboard under "Environment":

**Copy from your `.env` file:**
- `TELEGRAM_BOT_TOKEN`
- `ADMIN_TELEGRAM_ID`
- `GROQ_API_KEY`
- `DEEPGRAM_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY_ID`
- `FIREBASE_CLIENT_ID`
- `FIREBASE_PRIVATE_KEY` (paste the entire value including quotes and \n characters)
- `OPENAI_API_KEY` (optional, only if not using Groq)

## Step 4: Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy
3. Wait 2-3 minutes for deployment to complete
4. Check logs to verify bot started successfully

## Step 5: Test
Send `/start` to your bot on Telegram. It should respond immediately!

## Advantages over Railway
- More stable for long-running processes
- Better free tier (750 hours/month)
- Simpler networking - no "configure network" issues
- Auto-deploys on git push
- Better logging

## Monitoring
- View logs in real-time from Render dashboard
- Bot will auto-restart if it crashes
- Free tier includes basic metrics

## Cost
- **Free tier**: 750 hours/month (enough for 24/7 operation)
- After free hours: $7/month for continuous operation
