# RL Mastery

8 weeks. 56 days. Build deep intuition for reinforcement learning — one quiz at a time.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Auth.js v5** — Google OAuth
- **Upstash Redis** — per-user progress persistence
- **KaTeX** — math rendering in questions, answers, and explanations
- **E-ink inspired UI** — minimal, clean, zero animations

## Local Development

```bash
npm install
npm run dev
```

Create a `.env.local` from `.env.example` and fill in the required secrets.

## Environment Variables

| Variable | How to get |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID |
| `AUTH_GOOGLE_SECRET` | Same as above |
| `UPSTASH_REDIS_REST_URL` | Upstash Console → Redis database → REST API → URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → Redis database → REST API → Token |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add the authorized redirect URI:
   - Production: `https://yourdomain.com/api/auth/callback/google`
   - Local: `http://localhost:3000/api/auth/callback/google`
4. Copy the Client ID and Client Secret into your env vars.

### Upstash Redis Setup

1. Go to [Upstash Console](https://console.upstash.com/redis).
2. Create a new Redis database (free tier is sufficient).
3. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into your env vars.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo on [Vercel](https://vercel.com/new).
3. Add the environment variables in the Vercel dashboard (Settings → Environment Variables).
4. Redeploy.

## Features

- **Per-user progress tracking** — sign in with Google, your progress is isolated and persistent.
- **Adaptive unlocking** — pass a day to unlock the next one.
- **Weak tag analysis** — see which topics you miss most often.
- **Dark / light mode** — toggle in the nav, respects system preference by default.
- **LaTeX math** — auto-rendered in questions, options, explanations, and correct answers.
