# 🚀 Deploy SGM Backend to Railway NOW

## 📋 5-Minute Deployment Checklist

### Step 1: Get Your Accounts Ready
- [ ] **Railway Account**: Sign up at [railway.app](https://railway.app) (free)
- [ ] **Cloudinary Account**: Sign up at [cloudinary.com](https://cloudinary.com) (free)
- [ ] **GitHub**: Make sure your code is pushed to GitHub

### Step 2: Push Code to GitHub
```bash
git add .
git commit -m "feat: prepare for Railway deployment"
git push origin main
```

### Step 3: Deploy to Railway

1. **Go to Railway**: https://railway.app
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Choose your SGM Backend repository**
5. **Add PostgreSQL database**:
   - Click "New Service" → "Database" → "PostgreSQL"

### Step 4: Configure Environment Variables

In Railway project settings → Variables, add these:

```env
# Database (automatically set by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT Secret (generate random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-abcdef123456

# Server
NODE_ENV=production
PORT=${{PORT}}

# Cloudinary (from cloudinary.com dashboard)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# CORS (your frontend domains)
FRONTEND_URL=https://your-frontend.vercel.app,http://localhost:3001

# Optional
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 5: Deploy & Test

Railway will automatically deploy. Once ready:

**Your API URL**: `https://your-project-name.up.railway.app`

**Test it**:
```bash
curl https://your-project-name.up.railway.app/api/health
```

## 🎯 For Frontend Developers

### API Base URL:
```javascript
const API_BASE_URL = 'https://your-project-name.up.railway.app/api';
```

### Test Login:
```javascript
const response = await fetch(`${API_BASE_URL}/auth/connexion`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nom_utilisateur: 'president.sgm',
    mot_passe: 'MotPasse123!'
  })
});
```

### Available Endpoints:
- `GET /api/health` - Health check
- `POST /api/auth/connexion` - Login
- `GET /api/auth/profil` - User profile (authenticated)
- `GET /api/secretaire/tableau-bord` - Secretary dashboard (authenticated)
- `POST /api/adhesion/soumettre` - Submit membership form

### Postman Collection:
1. Import `postman/SGM-Backend-Local-Auth.postman_collection.json`
2. Import `postman/SGM-Production.postman_environment.json`
3. Update base URL to your Railway URL
4. Test all endpoints!

## 🔧 Default Production Credentials

**⚠️ CHANGE IMMEDIATELY AFTER FIRST LOGIN**

```
President: president.sgm / MotPasse123!
Secretary: secretaire.sgm / MotPasse123!
```

Both accounts are forced to change password on first login.

## 💡 Pro Tips

1. **Cloudinary Setup**: 
   - Dashboard → Settings → API Keys
   - Copy Cloud name, API key, API secret

2. **JWT Secret Generation**:
   ```bash
   openssl rand -base64 64
   ```

3. **Monitor Deployment**:
   - Railway Dashboard → Your Project → Deployments
   - Check logs for any issues

4. **CORS Issues**:
   - Add all your frontend domains to FRONTEND_URL
   - Include both development and production URLs

## 🆘 Common Issues

**Build Fails**: Check Railway logs, ensure all dependencies in package.json

**Database Connection**: Verify DATABASE_URL is set to `${{Postgres.DATABASE_URL}}`

**CORS Errors**: Add frontend domains to FRONTEND_URL environment variable

**File Upload Fails**: Verify Cloudinary credentials are correct

---

**🎉 Once deployed, share your Railway URL with the frontend team!**

Example: `https://sgm-backend-production.up.railway.app`