# Influencer Analytics Admin Dashboard

Separate Next.js admin application for the Influencer Analytics platform.

## Features

- Admin login
- Creator overview
- Creator search
- Instagram connection status
- Follower totals and growth
- Latest follower snapshots
- Creator detail view
- AI Analyst connected to the dashboard data

## Environment variables

Copy `.env.example` to `.env.local` for local development or add the same variables in Vercel.

Required:
- DATABASE_URL
- ADMIN_EMAIL
- ADMIN_PASSWORD
- ADMIN_SESSION_SECRET
- OPENAI_API_KEY

Optional:
- OPENAI_MODEL (defaults to `gpt-5.6-luna`)

## Production architecture

This app should be deployed as a separate Vercel project from the public creator registration app, while both use the same PostgreSQL database.

Do not expose DATABASE_URL, OPENAI_API_KEY, or ADMIN_PASSWORD in client-side code.
