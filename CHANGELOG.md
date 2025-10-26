# Changelog

All notable changes to the SGM Backend API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-09-12

### 🔧 Bug Fixes & Improvements

#### 🏛️ Admin Form Status Management Fix
- **Fixed critical bug** in admin form status handling where system was trying to access non-existent `statut` field on `FormulaireAdhesion` model
- **Corrected status management** to use `utilisateur.statut` field instead of form-level status
- **Updated seed data** - PRESIDENT and SECRETAIRE_GENERALE users now start with `EN_ATTENTE` status instead of `APPROUVE`
- **Fixed admin form listing endpoint** (`/api/secretaire/formulaires-admin`) to properly return user status
- **Corrected approval/rejection logic** to update `utilisateur.statut` when forms are processed
- **Improved filtering and search** in admin forms listing to work with user-level status

#### 🎯 Technical Improvements
- **Removed incorrect form status logic** from admin-form controller
- **Updated database queries** to include `statut` field in user selection
- **Fixed response objects** to use correct variable names and data sources
- **Enhanced error handling** with proper status validation

### 📋 Files Modified
- `prisma/seed-production.js` - Updated admin user status to EN_ATTENTE
- `src/controllers/admin-form.controller.js` - Fixed status retrieval logic
- `src/controllers/secretaire.controller.js` - Fixed approval/rejection and listing logic

## [1.1.0] - 2025-08-21

### 🎉 Major Features Added

#### 📧 Email Notification System
- **Added comprehensive email service** with Nodemailer integration
- **HTML email templates** with responsive design for all notifications
- **Four notification types**: form approval, rejection, account deactivation, password reset
- **Conditional email sending** - only sends to users with email addresses
- **Graceful failure handling** - system continues working if email service unavailable
- **Configurable SMTP settings** for any email provider

#### 🔄 Simplified Password Management
- **Consolidated 7 endpoints into 4** streamlined password management endpoints
- **Universal access** - all authenticated users can now change passwords
- **Email-based password reset** with secure token verification
- **Smart user lookup** - find users by email OR username for reset
- **Enhanced security** with 1-hour token expiration
- **Comprehensive audit logging** for all password operations

#### 🖊️ President Signature Management
- **New endpoint**: `GET /api/membre/president-signature` for fetching president's signature
- **Role-based access control** - restricted to Secretary and President roles only
- **Cloudinary integration** - retrieves signature images from cloud storage
- **Frontend-ready response** with signature URL and president name
- **Database-backed** signature management with active signature tracking

### 🛠️ System Improvements

#### 🔧 Technical Enhancements
- **Fixed authentication middleware compatibility** - resolved `req.user` vs `req.utilisateur` mismatch
- **Removed 300+ lines of redundant code** from duplicate password methods
- **Enhanced error handling and logging** across all controllers
- **Improved separation of concerns** - moved password management to auth controller
- **Updated API documentation** with comprehensive Swagger specifications

#### 📋 API Changes
- **BREAKING**: Moved password endpoints from `/api/membre/` to `/api/auth/`
- **Added**: `POST /api/auth/change-password` - Universal password change
- **Added**: `POST /api/auth/reset-password` - Email-based password reset
- **Added**: `POST /api/auth/verify-reset` - Complete reset with email token
- **Enhanced**: `POST /api/auth/change-temporary-password` - Now supports optional email addition
- **Removed**: Redundant password endpoints from member controller

### 📧 Email Templates Added
- **Password reset email** with secure verification links
- **Form approval email** with congratulations and next steps
- **Form rejection email** with specific reasons and guidance
- **Account deactivation email** with suspension details

### 🔒 Security Enhancements
- **Token-based password reset** with 1-hour expiration
- **Email verification required** for password reset
- **Enhanced audit logging** for all authentication operations
- **Strong password validation** maintained across all endpoints

### 📚 Documentation Updates
- **Updated README.md** with new API endpoints and features
- **Enhanced CLAUDE.md** with password management and email system details
- **Comprehensive API documentation** with Swagger specifications
- **Environment variable documentation** for email configuration

### 🐛 Bug Fixes
- **Fixed authentication middleware** property mismatch causing role validation failures
- **Resolved import dependencies** in controllers after code consolidation
- **Fixed email field inclusion** in database queries for notifications

### 🧹 Code Cleanup
- **Removed duplicate password methods** from membre controller
- **Cleaned up unused imports** (bcrypt, crypto, schemas)
- **Removed obsolete routes** from membre.js
- **Consolidated authentication logic** in auth controller

---

## [1.0.0] - 2025-08-20

### Initial Release
- Member registration and management system
- Role-based authentication (MEMBER, SECRETAIRE_GENERALE, PRESIDENT)
- Document upload and verification with Cloudinary
- Digital membership cards with QR codes
- Secretary dashboard for member approval/rejection
- Database integration with Prisma and PostgreSQL
- Comprehensive API documentation with Swagger
- Security middleware with rate limiting and validation
- Audit logging for all system operations