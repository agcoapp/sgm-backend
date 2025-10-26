#!/bin/bash
set -e

echo "🚀 Deploying SGM Backend..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Build production Docker image
print_info "Building production Docker image..."
docker build -t sgm-backend:latest .

# Run production checks
print_info "Running production checks..."

# Check if required environment variables are set
required_vars=("DATABASE_URL" "CLERK_SECRET_KEY" "CLOUDINARY_CLOUD_NAME")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

print_status "Production image built successfully!"
print_info "Image tagged as: sgm-backend:latest"

echo
print_info "Deploy options:"
echo "1. Push to Docker registry:"
echo "   docker tag sgm-backend:latest your-registry/sgm-backend:latest"
echo "   docker push your-registry/sgm-backend:latest"
echo
echo "2. Deploy to Railway/Heroku:"
echo "   - Set up environment variables on platform"
echo "   - Connect repository for auto-deployment"
echo
echo "3. Deploy to VPS:"
echo "   - Copy docker-compose.yml to server"
echo "   - Run docker-compose up -d"