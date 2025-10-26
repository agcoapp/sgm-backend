#!/bin/bash
set -e

echo "🚀 Setting up SGM Backend Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if Node.js is installed (for local development)
if ! command -v node &> /dev/null; then
    print_warning "Node.js is not installed. Install Node.js 18+ for local development."
fi

# Copy environment template
print_info "Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.template .env
    print_status "Created .env file from template"
    print_warning "Please update .env file with your actual credentials before running the app"
else
    print_info ".env file already exists, skipping..."
fi

# Install dependencies locally (if Node.js is available)
if command -v node &> /dev/null; then
    print_info "Installing Node.js dependencies..."
    npm install
    print_status "Dependencies installed successfully"
fi

# Build and start Docker containers
print_info "Building Docker containers..."
docker-compose build

print_info "Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
print_info "Waiting for PostgreSQL to be ready..."
sleep 10

# Run database migrations (if Prisma is available)
if command -v npx &> /dev/null; then
    print_info "Running database migrations..."
    npx prisma generate
    npx prisma db push
    print_status "Database migrations completed"
else
    print_warning "Prisma CLI not available. Run 'npm install' first, then 'npx prisma db push'"
fi

# Create init.sql for Docker
cat > scripts/init.sql << 'EOF'
-- Initialize SGM Database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create additional indexes for performance
-- These will be created after Prisma migrations
EOF

print_status "Development environment setup completed!"
echo
print_info "Next steps:"
echo "1. Update .env file with your credentials"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Or run 'docker-compose up' to start everything with Docker"
echo
print_info "Available commands:"
echo "- npm run dev          # Start development server"
echo "- npm run docker:up    # Start with Docker"
echo "- npm run db:studio    # Open Prisma Studio"
echo "- npm run db:reset     # Reset database"
echo