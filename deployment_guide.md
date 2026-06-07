# 🚀 SmartFin — 100% Free Production Deployment Guide

This guide walks you through deploying the **SmartFin** platform (FastAPI backend + React frontend + PostgreSQL database) completely for free using **Supabase** (Database), **Render** (Backend), and **Vercel** (Frontend).

---

## 🛠️ Step 1: Push Code to GitHub

You will need a GitHub account. Since this is a monorepo containing both the frontend and backend, we will push the main folder `smartfin` as a single repository.

1. Create a **new public or private repository** on GitHub (name it `smartfin`).
2. Open your terminal in the `d:\ReadingStockMarket\smartfin` folder and run:
   ```bash
   git init
   git add .
   git commit -m "Configure deployment and prepare project for launch"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/smartfin.git
   git push -u origin main
   ```

---

## 🗄️ Step 2: Set Up Database on Supabase (Free PostgreSQL)

Supabase offers a fully managed free PostgreSQL instance (up to 500MB).

1. Sign up/Log in at [Supabase Console](https://supabase.com).
2. Click **New Project** and choose a project name (e.g. `smartfin-db`).
3. Set a secure **Database Password** (write this down, you will need it).
4. Select the region closest to you (e.g. India/Mumbai or Singapore) and click **Create New Project**.
5. Once created, go to **Project Settings** (gear icon on sidebar) → **Database**.
6. Scroll down to **Connection String** -> Select **URI** mode.
7. Copy the connection string. It will look like this:
   ```
   postgresql://postgres.[YOUR_PROJECT_ID]:[YOUR_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
   *Replace `[YOUR_PASSWORD]` with the database password you chose.*
8. Save this URL. This is your production `DATABASE_URL`.

---

## 🐍 Step 3: Deploy FastAPI Backend on Render (Free Web Service)

Render will build and run your FastAPI app directly using python.

1. Sign up/Log in at [Render Dashboard](https://dashboard.render.com) using your GitHub account.
2. Click **New +** (top right) → **Web Service**.
3. Connect your GitHub repository `smartfin` that you created in Step 1.
4. Set the following build settings:
   *   **Name**: `smartfin-backend`
   *   **Region**: Select the region closest to your database (e.g. Singapore).
   *   **Branch**: `main`
   *   **Root Directory**: `backend` (This is critical since the backend code is in the `/backend` folder).
   *   **Language**: `Python 3`
   *   **Build Command**: `pip install -r requirements.txt`
   *   **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   *   **Instance Type**: `Free`
5. Scroll down to **Environment Variables** and add the following keys:
   *   `ENVIRONMENT` = `production`
   *   `DEBUG` = `false`
   *   `DATABASE_URL` = *(Paste your Supabase URI from Step 2)*
   *   `ALLOWED_ORIGINS` = `["https://YOUR_FRONTEND_DOMAIN.vercel.app"]` *(We will update this after Step 4)*
   *   `OPENAI_API_KEY` = *(Your OpenAI API Key)*
   *   `GROQ_API_KEY` = *(Your Groq API Key)*
   *   `NEWS_API_KEY` = *(Your News API Key)*
   *   `EXCHANGE_RATE_API_KEY` = *(Your Forex API Key)*
   *   `SMTP_HOST` = `smtp.gmail.com`
   *   `SMTP_PORT` = `587`
   *   `SMTP_USER` = `your_gmail_address@gmail.com`
   *   `SMTP_PASSWORD` = `your_gmail_app_password`
   *   `SMTP_FROM` = `your_gmail_address@gmail.com`
   *   `TWILIO_ACCOUNT_SID` = `YOUR_TWILIO_ACCOUNT_SID`
   *   `TWILIO_AUTH_TOKEN` = `YOUR_TWILIO_AUTH_TOKEN`
   *   `TWILIO_WHATSAPP_FROM` = `whatsapp:+14155238886`
6. Click **Create Web Service**.
7. Once deployment starts, note the live URL of your backend (e.g., `https://smartfin-backend.onrender.com`). You will need this for frontend configuration.

### 🗃️ Run Database Migrations in production:
To create the tables in your Supabase database, run the Alembic migrations locally from your computer pointing to Supabase:
1. Open your terminal in `d:\ReadingStockMarket\smartfin\backend`.
2. Temporarily set your `DATABASE_URL` in your `.env` to the Supabase URI:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres.[YOUR_PROJECT_ID]:[YOUR_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
   *(Ensure you use `postgresql+asyncpg://` as the prefix for SQLAlchemy compatibility).*
3. Run:
   ```bash
   .\venv\Scripts\alembic upgrade head
   ```
4. Restore your local `.env` database URL back to `localhost` once done.

---

## ⚛️ Step 4: Deploy React Frontend on Vercel (Free Hosting)

Vercel will compile and host your frontend static bundle.

1. Sign up/Log in at [Vercel Dashboard](https://vercel.com) using your GitHub account.
2. Click **Add New** → **Project**.
3. Import your GitHub repository `smartfin`.
4. Configure the project settings:
   *   **Framework Preset**: `Vite`
   *   **Root Directory**: `frontend` (Since the frontend code is in the `/frontend` folder).
   *   **Build Command**: `npm run build`
   *   **Output Directory**: `dist`
5. Expand **Environment Variables** and add the following:
   *   `VITE_API_URL` = *(Your Render backend URL from Step 3, e.g. `https://smartfin-backend.onrender.com`)*
   *   `VITE_SUPABASE_URL` = `YOUR_SUPABASE_URL`
   *   `VITE_SUPABASE_ANON_KEY` = `YOUR_SUPABASE_ANON_KEY`
6. Click **Deploy**.
7. Vercel will build your application and generate a live URL (e.g., `https://smartfin-frontend.vercel.app`).

---

## 🔗 Step 5: Update CORS Origin in Backend

Now that your frontend has a live domain, you must allow it in the backend CORS settings:

1. Copy your Vercel URL (e.g., `https://smartfin-frontend.vercel.app`).
2. Go to your Render Web Service → **Environment** tab.
3. Update `ALLOWED_ORIGINS` to:
   ```json
   ["https://smartfin-frontend.vercel.app"]
   ```
4. Save the changes. Render will automatically redeploy the backend with the updated CORS headers.

---

### 🎉 All Done!
Your React web app and FastAPI backend are now communicating securely over HTTPS, using your free Supabase database.
