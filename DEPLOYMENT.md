# Deployment Guide - Run Bot 24/7

Your bot is currently running locally. Here's how to deploy it to run 24/7 in the cloud.

## Option 1: Railway (Recommended - Easiest)

Railway is free for hobby projects and super easy to set up.

### Steps:

1. **Sign up for Railway**
   - Go to: https://railway.app/
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `horizon-lbt` repository

3. **Add Environment Variables**
   - In Railway dashboard, go to your project
   - Click "Variables" tab
   - Add all variables from your `.env` file:
     ```
     TELEGRAM_BOT_TOKEN=7587338954:AAHiHKxVAPfsK7uiJQ2qVBDMzzQe_l-f3yQ
     ADMIN_TELEGRAM_ID=891983295
     OPENAI_API_KEY=sk-proj-...
     FIREBASE_PROJECT_ID=gengoaibot
     FIREBASE_PRIVATE_KEY_ID=380317feb4faf781fb79b4bf27c8df655db15386
     FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
     FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@gengoaibot.iam.gserviceaccount.com
     FIREBASE_CLIENT_ID=105560542638994446598
     MCP_SERVER_PORT=3001
     MCP_SERVER_HOST=0.0.0.0
     NODE_ENV=production
     ```

4. **Deploy**
   - Railway will automatically detect it's a Node.js app
   - It will run `npm install` and `npm start`
   - Your bot will be live in ~2 minutes!

5. **Done!**
   - Your bot now runs 24/7
   - Auto-deploys when you push to GitHub
   - Free for hobby projects

---

## Option 2: Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login and Create App**
   ```bash
   heroku login
   heroku create gengoaibot
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set TELEGRAM_BOT_TOKEN=your_token
   heroku config:set OPENAI_API_KEY=your_key
   # ... set all other env vars
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

---

## Option 3: Google Cloud Run

1. **Install gcloud CLI**
   - Download from: https://cloud.google.com/sdk/docs/install

2. **Build and Deploy**
   ```bash
   gcloud run deploy gengoaibot \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

3. **Set Environment Variables**
   - Go to Cloud Run console
   - Edit service → Variables & Secrets
   - Add all env vars

---

## Monitoring Your Bot

Once deployed, you can monitor it:

- **Railway**: Check logs in the Railway dashboard
- **Heroku**: `heroku logs --tail`
- **Cloud Run**: Check logs in Google Cloud Console

---

## Cost

- **Railway**: Free for hobby projects (500 hours/month)
- **Heroku**: Free tier available
- **Cloud Run**: Pay per use (very cheap for bots)

---

## Recommended: Railway

Railway is the easiest and most beginner-friendly. Just connect your GitHub repo and it handles everything automatically!

**Next Steps:**
1. Wait for Firestore to fully activate (3-5 minutes)
2. Test the bot locally to make sure it works
3. Deploy to Railway for 24/7 operation
