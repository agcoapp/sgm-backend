#!/bin/bash

echo "🚀 SGM Backend - Railway Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if git is available
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Pre-deployment checklist:${NC}"
echo "1. ✅ Environment variables configured in Railway"
echo "2. ✅ PostgreSQL database added to Railway project"
echo "3. ✅ Cloudinary credentials configured"
echo "4. ✅ CORS domains configured"
echo ""

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
    git status --short
    echo ""
    read -p "Do you want to commit these changes? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " commit_message
        git add .
        git commit -m "$commit_message"
        echo -e "${GREEN}✅ Changes committed${NC}"
    else
        echo -e "${YELLOW}⚠️  Proceeding with uncommitted changes${NC}"
    fi
fi

# Push to main branch
echo -e "${BLUE}📤 Pushing to main branch...${NC}"
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully pushed to GitHub${NC}"
    echo -e "${GREEN}🚀 Railway will automatically deploy your changes${NC}"
    echo ""
    echo -e "${BLUE}📊 Next steps:${NC}"
    echo "1. Monitor deployment in Railway dashboard"
    echo "2. Check logs for any deployment issues"
    echo "3. Test API endpoints once deployed"
    echo "4. Share API URL with frontend team"
    echo ""
    echo -e "${BLUE}🔗 Useful links:${NC}"
    echo "• Railway Dashboard: https://railway.app/dashboard"
    echo "• API Health Check: https://your-project.up.railway.app/api/health"
    echo "• API Documentation: https://your-project.up.railway.app/api"
else
    echo -e "${RED}❌ Failed to push to GitHub${NC}"
    exit 1
fi