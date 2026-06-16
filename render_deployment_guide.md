# Deploying FreezyMails Worker on Render

To ensure your campaigns run 24/7 without being killed by Vercel's serverless function timeouts, you can run your Next.js frontend/API on Vercel, and run the `pg-boss` background worker on Render.

Both platforms will pull from the same GitHub repository and talk to the same Supabase PostgreSQL database.

## Prerequisites
1. A **Supabase** Database (or any externally accessible Postgres DB).
2. Your code pushed to a **GitHub** repository.
3. A **Render.com** account.

---

## Step-by-Step Deployment

### 1. Create a Background Worker on Render
1. Go to your Render Dashboard and click **New +** > **Background Worker**.
2. Connect your GitHub repository containing the FreezyMails codebase.

### 2. Configure the Worker
Fill in the deployment settings as follows:
- **Name:** `freezymails-worker` (or whatever you prefer)
- **Language:** `Node`
- **Branch:** `main`
- **Root Directory:** (Leave blank)
- **Build Command:** `npm ci` (or `npm install`)
- **Start Command:** `npm run worker`
- **Instance Type:** "Free" or "Starter" ($7/mo) works perfectly for this.

### 3. Add Environment Variables
The worker needs to connect to the exact same database and Supabase project as your Vercel app. 
Scroll down to **Environment Variables** and add exactly what you have in your Vercel `.env`:

| Key | Value |
| :--- | :--- |
| `DATABASE_URL` | *Your Supabase connection string* (Must be the Session pooler / IPv4 string if possible) |
| `NEXT_PUBLIC_SUPABASE_URL` | *Your Supabase URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| *Your Supabase Anon Key* |
| `SMTP_ENCRYPTION_KEY` | *The exact key from your Vercel env* |
| `CRON_SECRET` | *The exact key from your Vercel env* |
| `GOOGLE_CLIENT_ID` | *(Optional but recommended if workers need OAuth refresh access)* |
| `GOOGLE_CLIENT_SECRET` | *(Optional but recommended)* |

### 4. Deploy!
Click **Create Background Worker**. Render will clone your repo, install dependencies, and run `tsx src/workers/index.ts`. 

If successful, you will see the following in your Render Logs:
```
Starting pg-boss worker...
pg-boss started successfully
Registering worker handlers...
Handlers registered.
```

---

## How it works together:
1. **User UI (Vercel)**: User clicks "Start Campaign". Vercel hits `/api/send` and inserts 500 rows into the `pg-boss` database tables. Vercel responds to the browser in `0.1s`.
2. **Worker (Render)**: The Render process (which is constantly polling the database) sees the 500 new jobs. It picks them up, connects to Gmail, and sends them one-by-one, pausing/retrying if Gmail rate limits you.
3. **Database (Supabase)**: Acts as the bridge between Vercel and Render.
