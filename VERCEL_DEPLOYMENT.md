# Vercel Deployment Guide

## Overview
This project deploys the Vite frontend and the Express/MongoDB backend on Vercel. The `api/index.js` serverless function handles every `/api/*` request.

## Important Notes

### Database

- MongoDB Atlas is required. JSON/file-based storage is not supported.
- The Vercel function reuses its Mongoose connection between warm invocations.
- Allow Vercel to reach your Atlas cluster through Atlas Network Access before deploying.

### Scraping Limitations
- Puppeteer (used for web scraping) has limited support in Vercel serverless functions
- Consider using external scraping services or dedicated worker environments for production scraping

## Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Configure for Vercel deployment"
git push origin main
```

### 2. Deploy via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables (see below)
5. Click "Deploy"

### 3. Environment Variables
Set these in Vercel Project Settings > Environment Variables:

```
JWT_SECRET=your-secret-key-change-in-production
MONGO_URI=mongodb+srv://your-user:your-url-encoded-password@your-cluster.mongodb.net/gaia?retryWrites=true&w=majority
ADMIN_USERNAME=admin
ADMIN_PASSWORD=use-a-strong-password
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
CORS_ORIGIN=https://your-project.vercel.app
```

### 4. Post-Deployment Setup
The first successful request automatically creates the configured admin account if it does not exist.

## Local Development vs Production

### Local Development
```bash
npm run dev
```
- Frontend: http://localhost:5174
- Backend: http://localhost:5000
- Database: MongoDB Atlas

### Vercel Production
- Frontend + Backend: Single URL
- Database: MongoDB Atlas
- API routes: `/api/*`

## Troubleshooting

### Build Errors
- Ensure Node.js version is >= 18.0.0
- Check that all dependencies are in `package.json`

### Runtime Errors
- Check Vercel function logs for errors
- Verify environment variables are set correctly
- Confirm `MONGO_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` are set for the Production environment, then redeploy. Vercel applies environment-variable changes only to new deployments.

### MongoDB Connection Errors
- In Atlas, configure Network Access for the Vercel deployment; use Vercel Static IP if available on your plan, or a temporary broad allowlist only for development.
- Confirm the database user's password in `MONGO_URI` is URL-encoded.
- Open the Vercel function logs and look for `MongoDB connected:`.

## Current Configuration Files

- `vercel.json` - Route configuration for API and frontend
- `api/index.js` - Serverless function entry point
- `vite.config.mjs` - Frontend build configuration
- `package.json` - Dependencies and Node version

## Support
For issues specific to Vercel deployment, check:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
