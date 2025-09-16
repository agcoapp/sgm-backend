#!/bin/bash

# Test Setup Script for Better-Auth Implementation
# This script sets up a separate test environment

echo "🚀 Setting up Better-Auth Test Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install it and try again."
    exit 1
fi

print_status "Checking for existing test containers..."

# Stop and remove existing test containers if they exist
if docker ps -a --format "table {{.Names}}" | grep -q "sgm-test-"; then
    print_warning "Found existing test containers. Stopping and removing them..."
    docker-compose -f docker-compose.test.yml down -v
fi

print_status "Building test environment..."

# Build and start the test environment
docker-compose -f docker-compose.test.yml up --build -d

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Check if containers are running
if docker ps --format "table {{.Names}}" | grep -q "sgm-test-backend"; then
    print_success "Test environment is running!"
    echo ""
    echo "📊 Test Environment Status:"
    echo "  - Database: localhost:5433"
    echo "  - Backend API: localhost:3001"
    echo "  - Redis (optional): localhost:6380"
    echo ""
    echo "🔗 Test URLs:"
    echo "  - Health Check: http://localhost:3001/api/health"
    echo "  - API Documentation: http://localhost:3001/api-docs"
    echo "  - Better-Auth Session: http://localhost:3001/api/auth/session"
    echo ""
    echo "🧪 To run tests:"
    echo "  - Test Script: node test-better-auth.js"
    echo "  - Or: API_URL=http://localhost:3001 node test-better-auth.js"
    echo ""
    echo "📝 To create an admin user for testing:"
    echo "  docker exec -it sgm-test-backend npx prisma studio --schema=./prisma/schema.prisma"
    echo ""
    echo "🛑 To stop test environment:"
    echo "  docker-compose -f docker-compose.test.yml down"
    echo ""
    print_success "Test environment setup complete!"
else
    print_error "Failed to start test environment. Check the logs:"
    echo "  docker-compose -f docker-compose.test.yml logs"
    exit 1
fi
