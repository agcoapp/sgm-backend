# SGM Backend API

Backend API for **Association des Gabonais du Congo** - Member Management System

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Installation

1. **Clone and setup:**
   ```bash
   cd sgm-backend
   npm run setup
   ```

2. **Configure environment:**
   ```bash
   cp .env.template .env
   # Edit .env with your actual credentials
   ```

3. **Start development server:**
   ```bash
   # Option 1: With Docker (recommended)
   npm run docker:up
   
   # Option 2: Local development
   npm run dev
   ```

### Using Setup Scripts

The project includes automated setup scripts:

```bash
# Full development environment setup
./scripts/setup-dev.sh

# Production deployment
./scripts/deploy.sh
```

## 📊 API Endpoints

### Health & Info
- `GET /api` - API information
- `GET /api/health` - Health check
- `GET /api/health/detailed` - Detailed health metrics

### Coming Soon
- `POST /api/register` - Member registration
- `GET /api/members` - List members (admin)
- `PATCH /api/members/:id` - Approve/reject member
- `POST /api/signatures` - Upload president signature
- `GET /api/photos/:id` - Member ID photos (admin)
- `GET /api/verify/:id` - QR code verification
- `GET /api/profile` - Member profile

## 🗄️ Database

### Schema
- **Users** - Member information with photos
- **Signatures** - President signatures
- **AuditLog** - All actions tracking

### Management Commands
```bash
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed test data
npm run db:reset     # Reset database
```

## 🔒 Authentication & Authorization

- **Authentication:** Clerk integration
- **Authorization:** Role-based (MEMBER, SECRETARY, PRESIDENT)
- **Security:** Helmet, rate limiting, input validation

## 🐳 Docker Commands

```bash
npm run docker:build    # Build containers
npm run docker:up       # Start all services
npm run docker:down     # Stop all services
```

## 📝 Environment Variables

Copy `.env.template` to `.env` and configure:

```env
# Database
DATABASE_URL="postgresql://..."

# Clerk Authentication
CLERK_SECRET_KEY="sk_test_..."
CLERK_PUBLISHABLE_KEY="pk_test_..."

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Email & SMS
EMAIL_USER="..."
EMAIL_PASS="..."
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
```

## 🧪 Testing

```bash
npm test           # Run tests
npm run test:watch # Watch mode
```

## 📚 Development

### Project Structure
```
src/
├── config/        # Database, logger configuration
├── controllers/   # Request handlers
├── middleware/    # Auth, security, validation
├── routes/        # Route definitions
├── services/      # Business logic
└── utils/         # Helper functions
```

### Adding New Features
1. Create route in `src/routes/`
2. Add controller in `src/controllers/`
3. Add any services in `src/services/`
4. Register route in `src/app.js`

## 🚢 Deployment

### Option 1: Railway/Heroku
```bash
# Set environment variables on platform
# Connect GitHub repo for auto-deployment
```

### Option 2: Docker
```bash
docker build -t sgm-backend .
docker run -p 3000:3000 sgm-backend
```

## 👥 Authors
- Elvis Destin OLEMBE

## 📄 License
ISC

## 🆘 Support
- Health Check: `GET /api/health`
- Logs: Check `logs/` directory
- Issues: Check server logs for detailed error information