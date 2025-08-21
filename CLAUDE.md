# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Quick Setup:**
```bash
npm run setup          # Automated environment setup
cp .env.template .env   # Copy and edit environment variables
```

**Development:**
```bash
npm run dev            # Start development server with nodemon
npm run docker:up      # Start full Docker environment (recommended)
npm run docker:down    # Stop Docker environment
```

**Database:**
```bash
npm run db:migrate     # Run Prisma migrations
npm run db:studio      # Open Prisma Studio GUI
npm run db:seed        # Seed test data
npx prisma generate    # Regenerate Prisma client
```

**Testing & Quality:**
```bash
npm test              # Run test suite
npm run lint          # Run ESLint
```

## Architecture Overview

**SGM Backend** is a member management system for the Gabonese Association of Congo, handling member registrations, document verification, and digital membership cards.

### Core Technology Stack
- **Express.js** API with comprehensive middleware stack
- **PostgreSQL** database with **Prisma ORM**
- **Clerk** for authentication and user management
- **Cloudinary** for document/photo storage and processing
- **Nodemailer** for email notifications with HTML templates
- **Zod** schemas for input validation
- **Winston** for structured logging

### Authentication System
- **Clerk integration** provides JWT-based authentication
- **Role hierarchy:** MEMBER → SECRETARY → PRESIDENT
- Users must complete both Clerk signup AND local registration
- Local user sync via `POST /api/auth/signup` and `POST /api/auth/signin`

### Key Business Logic

**Registration Flow:**
1. User signs up via Clerk
2. Complete registration with required documents: ID front/back, selfie photo
3. Secretary reviews and approves/rejects with form code assignment
4. Approved members get QR code and digital membership card
5. **Email notifications** automatically sent for approval, rejection, or account deactivation (only to members with email addresses)

**File Upload Requirements:**
- 3 required photos: `id_front_photo`, `id_back_photo`, `selfie_photo`
- JPEG/PNG only, max 5MB each
- Automatic Cloudinary upload with optimization (800x600, quality optimization)
- Stored in `sgm/id_documents/` folder structure

**Email Notification System:**
- **Nodemailer integration** with configurable SMTP settings
- **HTML email templates** with responsive design for all notifications
- **Conditional sending** - only sends to users with email addresses
- **Three notification types:**
  - Form approval (with form code and congratulations)
  - Form rejection (with specific reasons and next steps)
  - Account deactivation (with suspension details)
- **Graceful failure handling** - system continues working if email service is unavailable
- **Comprehensive logging** of all email operations

### Database Schema Key Points
- **User model** contains both Clerk sync data and registration details
- **Status field:** PENDING → APPROVED/REJECTED workflow
- **Signature model** for president signature management on cards
- **AuditLog** tracks all significant actions for compliance
- All file references stored as Cloudinary URLs

### API Structure
- **Health endpoints:** `/api/health` (basic) and `/api/health/detailed` (comprehensive)
- **Auth endpoints:** User signup/signin sync and status checks
- **Registration endpoint:** Complete member registration with file uploads
- Role-based access control throughout

### Security Features
- Multi-tiered rate limiting (general: 100/15min, auth: 5/15min, uploads: 10/hour)
- Helmet for security headers, CORS configuration
- Input sanitization and Zod validation on all endpoints
- File type/size validation for uploads

### Environment Requirements
Essential variables: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

**Email Service Variables (for notifications):**
- `EMAIL_HOST`: SMTP server (e.g., "smtp.gmail.com")
- `EMAIL_PORT`: SMTP port (587 for TLS, 465 for SSL)
- `EMAIL_SECURE`: "true" for SSL (port 465), "false" for TLS (port 587)
- `EMAIL_USER`: Email account username
- `EMAIL_PASS`: Email account password/app password
- `EMAIL_FROM`: From email (optional, defaults to EMAIL_USER)
- `EMAIL_FROM_NAME`: From display name (optional, defaults to "SGM Association")

### Development Patterns
- **MVC structure:** Routes → Controllers → Services pattern
- **Error handling:** Structured error responses with appropriate HTTP codes
- **Logging:** Winston with file outputs (`logs/error.log`, `logs/combined.log`)
- **Validation:** Zod schemas in `src/schemas/`
- **Middleware:** Authentication, security, and upload handling in `src/middleware/`

### Adding New Features
1. Create route in `src/routes/`
2. Add controller in `src/controllers/`
3. Implement service logic in `src/services/` 
4. Register route in `src/app.js`
5. Add Zod validation schema in `src/schemas/`
6. Test with appropriate role permissions

### Database Changes
1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate` to create migration
3. Update `prisma/seed.js` if needed
4. Use `npm run db:studio` to verify changes

The system is production-ready with Docker support, comprehensive logging, and follows Node.js security best practices.

## Available Specialized Agents

This project includes 36 specialized Claude Code agents in the `claude/` directory for domain-specific expertise:

### 🏗️ Development & Architecture
- **backend-architect** - RESTful APIs, microservices, database design
- **frontend-developer** - Next.js, React, shadcn/ui, Tailwind CSS
- **mobile-developer** - React Native, Flutter development
- **graphql-architect** - GraphQL schemas and federation

### 💻 Language Specialists  
- **python-pro** - Advanced Python development
- **typescript-expert** - Type-safe TypeScript with advanced features
- **golang-pro** - Idiomatic Go with goroutines and channels
- **rust-pro** - Memory-safe Rust development

### 🛡️ Quality & Security
- **code-reviewer** - Code quality and maintainability review
- **security-auditor** - Vulnerability assessment and OWASP compliance
- **test-automator** - Comprehensive test suite creation
- **debugger** - Error investigation and resolution

### 🚀 Infrastructure & Operations
- **devops-troubleshooter** - Production debugging and deployment fixes
- **deployment-engineer** - CI/CD pipelines and containerization
- **cloud-architect** - AWS/Azure/GCP infrastructure design
- **database-optimizer** - SQL optimization and migration handling

### 📊 Data & AI
- **data-scientist** - Data analysis and SQL optimization
- **ai-engineer** - LLM applications and RAG systems
- **ml-engineer** - ML pipelines and model serving

### 🎯 Specialized Domains
- **api-documenter** - OpenAPI specs and developer documentation
- **payment-integration** - Stripe/PayPal integration
- **accessibility-specialist** - WCAG compliance
- **performance-engineer** - Application profiling and optimization

**Usage:** Agents are automatically invoked based on context, or explicitly requested:
```
"Use the security-auditor to review this authentication code"
"Have the performance-engineer optimize this database query"
```