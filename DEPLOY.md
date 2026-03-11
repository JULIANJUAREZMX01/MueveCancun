# Deployment Guide

This project is deployed on **Render**.

## Render Configuration

1. Connect your GitHub repository to Render.
2. Create a new **Static Site**.
3. Configure the settings as follows:
   - **Build Command:**
     `pnpm install && pnpm run build`
   - **Publish Directory:**
     `dist`

### Environment Variables
Ensure the following are set in the Render dashboard:
- `NODE_VERSION`: `20`

## Manual Trigger
To trigger a manual build, push a commit to the `main` branch or use the "Manual Deploy" button in the Render dashboard.
