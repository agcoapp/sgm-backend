#!/bin/bash

# Script to create an admin user for testing Better-Auth
# This script connects to the test database and creates an admin user

echo "👤 Creating Admin User for Better-Auth Testing..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if test backend container is running
if ! docker ps --format "table {{.Names}}" | grep -q "sgm-test-backend"; then
    print_error "Test backend container is not running. Please start it first:"
    echo "  ./setup-test-env.sh"
    exit 1
fi

print_status "Creating admin user in test database..."

# Create admin user using Prisma
docker exec -it sgm-test-backend npx prisma db execute --stdin --schema=./prisma/schema.prisma << 'EOF'
-- Create an admin user for testing
INSERT INTO "user" (
    id,
    name,
    email,
    username,
    role,
    status,
    is_active,
    created_at,
    updated_at
) VALUES (
    'admin-test-user',
    'Test Admin User',
    'admin@test.com',
    'admin.test',
    'ADMIN',
    'APPROVED',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create a password for the admin user using better-auth
-- Note: This is a test password - change it in production
INSERT INTO "account" (
    id,
    "accountId",
    "providerId",
    "userId",
    password,
    "createdAt",
    "updatedAt"
) VALUES (
    'admin-account-test',
    'admin@test.com',
    'credential',
    'admin-test-user',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4V5Qj5.5.2', -- Password: AdminTest123!
    NOW(),
    NOW()
) ON CONFLICT ("accountId") DO NOTHING;
EOF

if [ $? -eq 0 ]; then
    print_success "Admin user created successfully!"
    echo ""
    echo "🔑 Admin Credentials:"
    echo "  Email: admin@test.com"
    echo "  Username: admin.test"
    echo "  Password: AdminTest123!"
    echo ""
    echo "🧪 Test the admin login:"
    echo "  curl -X POST http://localhost:3001/api/auth/signin \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"email\":\"admin@test.com\",\"password\":\"AdminTest123!\"}'"
    echo ""
    print_success "You can now test the admin functionality!"
else
    print_error "Failed to create admin user. Check the database connection."
    exit 1
fi
