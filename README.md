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

### 🔐 Authentication & Password Management
- `POST /api/auth/connexion` - User login
- `POST /api/auth/change-temporary-password` - First-time password change
- `POST /api/auth/change-password` - Password change (all users)
- `POST /api/auth/reset-password` - Email-based password reset
- `POST /api/auth/verify-reset` - Complete reset with token
- `GET /api/auth/profil` - User profile
- `POST /api/auth/deconnexion` - User logout

### 👥 Member Management
- `POST /api/adhesion/soumettre` - Submit membership application
- `GET /api/membre/formulaire-adhesion` - View membership form
- `GET /api/membre/carte-membre` - View membership card
- `GET /api/membre/annuaire` - Member directory (approved members only)
- `GET /api/membre/telecharger-carte` - Download membership card PDF
- `GET /api/membre/telecharger-formulaire` - Download form PDF

### 🏛️ Secretary Management
- `GET /api/secretaire/tableau-bord` - Secretary dashboard
- `POST /api/secretaire/creer-identifiants` - Create member credentials
- `POST /api/secretaire/approuver-formulaire` - Approve membership form
- `POST /api/secretaire/rejeter-formulaire` - Reject membership form
- `DELETE /api/secretaire/desactiver-utilisateur` - Deactivate member
- `GET /api/secretaire/nouveaux-utilisateurs-credentials` - View temporary passwords

### 📧 Email Notifications
- Automatic emails for form approval/rejection
- Account deactivation notifications
- Password reset verification links
- HTML templates with responsive design

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

# Email Service Configuration (For Notifications)
EMAIL_HOST="smtp.gmail.com"           # SMTP server hostname
EMAIL_PORT="587"                      # SMTP port (587 for TLS, 465 for SSL)
EMAIL_SECURE="false"                  # true for 465, false for other ports
EMAIL_USER="your-email@gmail.com"     # Email account username
EMAIL_PASS="your-app-password"        # Email account password/app password
EMAIL_FROM="your-email@gmail.com"     # From email address (optional, defaults to EMAIL_USER)
EMAIL_FROM_NAME="SGM Association"     # From name (optional)

# SMS Service (Optional)
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

### Recent Improvements

**🔄 Simplified Password Management (v1.1)**
- Consolidated 7 endpoints into 4 streamlined endpoints
- Universal access for all authenticated users
- Email-based password reset with secure token verification
- Enhanced security with 1-hour token expiration
- Comprehensive audit logging for all password operations

**📧 Email Notification System (v1.1)**
- Nodemailer integration with HTML email templates
- Automatic notifications for form approval/rejection
- Account deactivation notifications
- Password reset verification emails
- Responsive email design with fallback text versions
- Configurable SMTP settings for any email provider

**🔧 System Improvements (v1.1)**
- Fixed authentication middleware compatibility issues
- Removed redundant code (300+ lines eliminated)
- Enhanced error handling and logging
- Updated API documentation with comprehensive examples
- Improved separation of concerns across controllers

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