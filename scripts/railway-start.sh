#!/bin/bash

echo "🚀 Starting SGM Backend on Railway..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate --schema=./prisma/schema.prisma

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma Client"
    exit 1
fi

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

if [ $? -ne 0 ]; then
    echo "❌ Failed to run migrations"
    exit 1
fi

# Create logs directory with proper permissions
echo "📁 Creating logs directory..."
mkdir -p logs
chmod 755 logs

# Seed database (only if not already seeded)
echo "🌱 Seeding database..."
node prisma/seed-production.js

# Start the application
echo "▶️  Starting server..."
exec node src/server.js