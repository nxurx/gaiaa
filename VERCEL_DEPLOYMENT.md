# Vercel Deployment Guide

## Overview
This project is configured to deploy on Vercel with both frontend and backend as serverless functions.

## Important Notes

### Database Limitations
- **Current Setup**: Uses JSON file-based database stored in `/tmp/data` on Vercel
- **Warning**: Data in `/tmp` is ephemeral and resets on every deployment/function cold start
- **Production Recommendation**: For production use, switch to MongoDB Atlas or Vercel Postgres

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
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
USE_MONGODB=false
```

### 4. Post-Deployment Setup
After deployment, you'll need to seed the admin user:
- Access your deployed site
- The system will create a default admin user on first run
- Or manually seed via Vercel CLI if needed

## Local Development vs Production

### Local Development
```bash
npm run dev
```
- Frontend: http://localhost:5174
- Backend: http://localhost:5000
- Database: `backend/data/` (persistent)

### Vercel Production
- Frontend + Backend: Single URL
- Database: `/tmp/data` (ephemeral)
- API routes: `/api/*`

## Migration to Production Database

To switch to a persistent database for production:

### Option 1: MongoDB Atlas
1. Create a free MongoDB Atlas account
2. Create a cluster and get connection string
3. Set environment variable: `USE_MONGODB=true`
4. Set environment variable: `MONGO_URI=mongodb+srv://...`
5. Remove the `process.env.USE_MONGODB = 'false'` line in `api/index.js`

### Option 2: Vercel Postgres
1. Add Vercel Postgres database to your project
2. Install `@vercel/postgres` package
3. Rewrite `json-db.js` to use Postgres instead of JSON files
4. Update models to use SQL queries

## Troubleshooting

### Build Errors
- Ensure Node.js version is >= 18.0.0
- Check that all dependencies are in `package.json`

### Runtime Errors
- Check Vercel function logs for errors
- Verify environment variables are set correctly
- Ensure API routes are properly configured in `vercel.json`

### Data Persistence Issues
- If data disappears after deployments, you're using the JSON database
- Switch to MongoDB Atlas or Vercel Postgres for persistent storage

## Current Configuration Files

- `vercel.json` - Route configuration for API and frontend
- `api/index.js` - Serverless function entry point
- `vite.config.mjs` - Frontend build configuration
- `package.json` - Dependencies and Node version

## Support
For issues specific to Vercel deployment, check:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
