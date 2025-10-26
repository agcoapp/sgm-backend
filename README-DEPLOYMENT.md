# 🚀 SGM Backend - Railway Deployment Guide

This guide will help you deploy the SGM Backend API to Railway for frontend developers to use.

## 🎯 Quick Deploy to Railway

### 1. Prerequisites
- [Railway Account](https://railway.app) (free tier available)
- [Cloudinary Account](https://cloudinary.com) (for file uploads)
- This repository pushed to GitHub

### 2. One-Click Deploy
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template)

Or manual deployment:

### 3. Manual Railway Setup

1. **Connect Repository:**
   ```bash
   # Push your code to GitHub first
   git add .
   git commit -m "feat: prepare for Railway deployment"
   git push origin main
   ```

2. **Create Railway Project:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your SGM Backend repository

3. **Add PostgreSQL Database:**
   - In your Railway project, click "New Service"
   - Select "Database" → "PostgreSQL"
   - Railway will create a database automatically

4. **Configure Environment Variables:**
   Go to your service Settings → Variables and add:

   ```env
   # Database (automatically set by Railway PostgreSQL)
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   
   # JWT Secret (generate a strong random string)
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345
   
   # Server Config
   NODE_ENV=production
   PORT=${{PORT}}
   
   # Cloudinary (get from cloudinary.com)
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   
   # CORS (replace with your actual frontend domains)
   FRONTEND_URL=https://sgm-frontend.vercel.app,https://sgm-admin.vercel.app
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

5. **Deploy:**
   - Railway will automatically build and deploy
   - The build process runs: `npm install` → `npx prisma generate` → `npm start`
   - Database migrations will run on first deploy

## 🔧 Environment Variables Explained

### Required Variables:
- **`DATABASE_URL`** - Automatically provided by Railway PostgreSQL
- **`JWT_SECRET`** - Generate a strong secret: `openssl rand -base64 64`
- **`CLOUDINARY_*`** - File upload service credentials

### Optional Variables:
- **`FRONTEND_URL`** - Comma-separated list of allowed frontend domains
- **`NODE_ENV`** - Set to `production`
- **`RATE_LIMIT_*`** - API rate limiting configuration

## 📡 After Deployment

### Your API will be available at:
```
https://your-project-name.up.railway.app
```

### Test Endpoints:
- **Health Check:** `GET /api/health`
- **API Info:** `GET /api`
- **Secretary Login:** `POST /api/auth/connexion`

### Default Test Users:
```json
{
  "secretary": {
    "nom_utilisateur": "marie.secretaire",
    "mot_passe": "MotPasse123!"
  },
  "president": {
    "nom_utilisateur": "jean.president", 
    "mot_passe": "MotPasse123!"
  }
}
```

## 🎯 For Frontend Developers

### API Base URL:
```javascript
const API_BASE_URL = 'https://your-project-name.up.railway.app/api';
```

### Authentication Example:
```javascript
// Login
const response = await fetch(`${API_BASE_URL}/auth/connexion`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nom_utilisateur: 'marie.secretaire',
    mot_passe: 'MotPasse123!'
  })
});

const { token, utilisateur } = await response.json();

// Use token for authenticated requests
const authResponse = await fetch(`${API_BASE_URL}/auth/profil`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Postman Collection:
Update the base URL in `postman/SGM-Development.postman_environment.json`:
```json
{
  "key": "baseUrl",
  "value": "https://your-project-name.up.railway.app"
}
```

## 🔄 Continuous Deployment

Railway automatically redeploys when you push to your main branch:

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin main
# Railway will automatically deploy the changes
```

## 📊 Monitoring

### Railway Dashboard:
- **Logs:** View real-time application logs
- **Metrics:** CPU, Memory, Network usage
- **Deployments:** Track deployment history

### Health Checks:
```bash
# Test if API is running
curl https://your-project-name.up.railway.app/api/health

# Detailed health check
curl https://your-project-name.up.railway.app/api/health/detailed
```

## 🚨 Production Considerations

### Security:
- [ ] Change default JWT_SECRET
- [ ] Update default user passwords
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and alerting

### Performance:
- [ ] Monitor database performance
- [ ] Set up proper logging
- [ ] Configure rate limiting for your needs

### Backup:
- [ ] Railway PostgreSQL includes automatic backups
- [ ] Consider additional backup strategy for critical data

## 💰 Cost Estimation

### Railway Free Tier:
- **$0/month** for starter projects
- 512MB RAM, 1 vCPU
- $5/month for additional resources

### Cloudinary Free Tier:
- **25 credits/month** free
- Sufficient for development/testing

## 🆘 Troubleshooting

### Common Issues:

1. **Database Connection Error:**
   ```bash
   # Check if DATABASE_URL is set correctly
   echo $DATABASE_URL
   ```

2. **Build Failures:**
   ```bash
   # Check build logs in Railway dashboard
   # Ensure all dependencies are in package.json
   ```

3. **CORS Issues:**
   ```bash
   # Update FRONTEND_URL environment variable
   # Include all frontend domains
   ```

### Support:
- Railway Docs: https://docs.railway.app
- SGM Project Issues: [GitHub Issues](https://github.com/your-repo/issues)

---

**🎉 Once deployed, share the API URL with your frontend team so they can start development!**