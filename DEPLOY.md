# Deployment Guide

This project is deployed on **Vercel**.

## Vercel Configuration

1. Connect your GitHub repository to Vercel.
2. Select the **Astro** framework preset.
3. Configure the settings as follows:
   - **Build Command:**
     `pnpm install && pnpm run build`
   - **Output Directory:**
     `dist`

### Environment Variables
Ensure the following are set in the Vercel dashboard:
- `DATABASE_URL`: Your Neon Postgres connection string.
- `DATABASE_PROVIDER`: `neon` (default) or `supabase`.
- `STRIPE_SECRET_KEY`: For payments.
- `STRIPE_WEBHOOK_SECRET`: For payment verification.

## Manual Trigger
To trigger a manual build, push a commit to the `main` branch or use the "Deploy" button in the Vercel dashboard.
