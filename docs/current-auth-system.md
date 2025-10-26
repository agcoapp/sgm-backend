# Current Authentication System Documentation

## Overview

The SGM backend currently uses a **hybrid authentication system** that has evolved from Clerk-based authentication to a predominantly **local authentication system**. This document provides comprehensive details of the current implementation before migrating to Better-auth.

---

## 🏗️ System Architecture

### Current State: **Local Authentication (Primary) + Legacy Clerk Components**

- **Primary System**: Custom JWT-based authentication with bcrypt password hashing
- **Legacy Components**: Clerk integration exists but is mostly **deprecated/commented out**
- **Database**: Prisma ORM with PostgreSQL
- **Password Management**: Full password lifecycle (creation, reset, temporary passwords)

---

## 📂 File Structure

### Core Authentication Files

```
src/
├── controllers/auth.controller.js       # Main auth logic (login, password management)
├── services/auth.service.js             # Auth business logic & utilities
├── middleware/auth-local.js             # JWT authentication middleware (PRIMARY)
├── middleware/auth.js                   # Legacy Clerk middleware (DEPRECATED)
├── routes/auth.js                       # Authentication endpoints
├── schemas/auth.schema.js               # Zod validation schemas
├── config/clerk.js                      # Clerk configuration (DEPRECATED)
└── middleware/security.js               # Rate limiting and security headers
```

### Database Models
```
prisma/
├── schema.prisma                        # User model with auth fields
└── seed.js                             # Database seeding
```

---

## 🔐 Authentication Flow

### 1. User Registration Flow
```
Secrétaire creates member → Local credentials generated → Member logs in → Changes temp password
```

**Steps:**
1. **Secretary creates member** via `/api/secretaire/creer-nouveau-membre`
2. **System generates**:
   - Username (e.g., `jean.mbongo`)
   - Temporary password (8 chars: letters + numbers)
   - Password hash (bcrypt, 12 rounds)
3. **Member receives credentials** from secretary
4. **First login**: Must change temporary password via `/api/auth/change-temporary-password`
5. **Subsequent logins**: Standard login flow

### 2. Login Flow
```
POST /api/auth/connexion
→ Validate credentials (bcrypt)
→ Generate JWT token (24h expiry)
→ Update last_login
→ Return user data + token
```

### 3. Password Reset Flow
```
POST /api/auth/reset-password (email/username)
→ Generate secure token (1h expiry)
→ Send email with reset link
→ POST /api/auth/verify-reset (token + new password)
→ Update password hash
```

---

## 📊 Database Schema (Authentication Fields)

### `Utilisateur` Model - Auth-Related Fields

```sql
-- Deprecated Clerk integration
-- clerkId                String?   @unique (COMMENTED OUT)

-- Local authentication (ACTIVE)
nom_utilisateur        String?   @unique  -- Generated username
mot_passe_hash         String?            -- Bcrypt hash (12 rounds)
mot_passe_temporaire   String?            -- Temporary password (for SG/President view)
doit_changer_mot_passe Boolean   @default(false)
a_change_mot_passe_temporaire Boolean @default(false)

-- User management
email                  String?   @unique  -- Optional email for password reset
role                   Role      @default(MEMBRE)
statut                 Statut    @default(EN_ATTENTE)
est_actif              Boolean   @default(true)
derniere_connexion     DateTime?

-- Account lifecycle tracking
desactive_le           DateTime?
desactive_par          Int?
raison_desactivation   String?
```

### `TokenRecuperation` Model (Password Reset)

```sql
model TokenRecuperation {
  id             Int       @id @default(autoincrement())
  id_utilisateur Int
  token          String    @unique       -- 32-byte hex token
  expire_le      DateTime               -- 1 hour expiry
  utilise        Boolean   @default(false)
  cree_le        DateTime  @default(now())
  
  utilisateur    Utilisateur @relation(fields: [id_utilisateur], references: [id])
}
```

### `JournalAudit` Model (Auth Events)

```sql
model JournalAudit {
  id                Int       @id @default(autoincrement())
  id_utilisateur    Int?
  action            String    -- CONNEXION, CHANGER_MOT_PASSE, etc.
  details           Json?     -- Additional context
  adresse_ip        String?
  agent_utilisateur String?
  cree_le           DateTime  @default(now())
  
  utilisateur       Utilisateur? @relation(fields: [id_utilisateur], references: [id])
}
```

---

## 🚀 API Endpoints

### Authentication Endpoints (`/api/auth/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/connexion` | User login | ❌ |
| POST | `/change-temporary-password` | Change temp password (first login) | ✅ |
| POST | `/change-password` | Change password (all users) | ✅ |
| POST | `/reset-password` | Request password reset email | ❌ |
| POST | `/verify-reset` | Complete password reset with token | ❌ |
| GET | `/profil` | Get user profile | ✅ |
| GET | `/statut` | Get user status | ✅ |
| POST | `/deconnexion` | Logout (audit only) | ✅ |

### Secretary User Management (`/api/secretaire/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/creer-nouveau-membre` | Create new member with credentials |
| POST | `/creer-identifiants` | **DEPRECATED**: Create credentials for existing user |

---

## 🔧 Middleware System

### 1. JWT Authentication (`auth-local.js` - **PRIMARY**)

```javascript
authentifierJWT(req, res, next)
```
- **Validates**: JWT token in Authorization header
- **Checks**: User exists and is active
- **Sets**: `req.user` and `req.utilisateur`
- **Error Handling**: Structured auth errors

### 2. Role-Based Authorization

```javascript
verifierRole(...rolesAutorises)
```
- **Roles**: `MEMBRE`, `SECRETAIRE_GENERALE`, `PRESIDENT`
- **Usage**: `verifierRole('SECRETAIRE_GENERALE', 'PRESIDENT')`

### 3. Password Change Enforcement

```javascript
verifierChangementMotPasse(req, res, next)
```
- **Blocks**: Users who must change their password
- **Allows**: Access to password change endpoints only

### 4. Legacy Clerk Middleware (`auth.js` - **DEPRECATED**)

```javascript
requireAuth, syncUserMiddleware  // NO LONGER USED
```

---

## 🛡️ Security Implementation

### Rate Limiting (`security.js`)

```javascript
// Login attempts
loginLimiter: 10 attempts per 15 minutes per IP

// General API calls  
generalLimiter: 100 requests per 15 minutes per IP

// Auth endpoints
authLimiter: 5 requests per 15 minutes per IP

// File uploads
uploadLimiter: 10 uploads per hour per IP
```

### Password Security

- **Hashing**: bcrypt with 12 salt rounds
- **Temporary Passwords**: 8 characters (letters + numbers)
- **Validation**: Minimum 8 chars, requires uppercase, lowercase, numbers, special chars
- **Reset Tokens**: 32-byte hex, 1-hour expiry

### Headers & CSP

```javascript
helmet({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    imgSrc: ["'self'", "https://res.cloudinary.com", "data:"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    connectSrc: ["'self'"]
  }
})
```

---

## 📝 Validation Schemas (`auth.schema.js`)

### Login Schema
```javascript
connexionSchema = {
  nom_utilisateur: string(1-50 chars),
  mot_passe: string(required)
}
```

### Password Change Schema
```javascript
changerMotPasseSchema = {
  ancien_mot_passe: string(required),
  nouveau_mot_passe: string(8+ chars, regex validation),
  confirmer_mot_passe: string(must match)
}
```

### New Member Creation Schema
```javascript
creerNouveauMembreSchema = {
  prenoms: string(1-100 chars, letters only),
  nom: string(1-100 chars, letters only), 
  a_paye: boolean(default: true),
  telephone: string(8+ chars, phone format)
}
```

---

## 🔄 Service Layer (`auth.service.js`)

### Core Methods

```javascript
// Username generation
genererNomUtilisateur(prenoms, nom) → "jean.mbongo"

// Password utilities  
genererMotPasseTemporaire() → "Km9fR2pQ"
hacherMotPasse(password) → bcrypt hash
verifierMotPasse(plain, hash) → boolean

// User management
creerNouveauMembre(prenoms, nom, aPaye, telephone, idSecretaire)
authentifier(username, password, ip, userAgent)
changerMotPasse(userId, oldPassword, newPassword)

// Password reset
genererTokenRecuperation(email)
reinitialiserMotPasse(token, newPassword)
```

---

## 🚨 Known Issues & Deprecated Components

### Deprecated/Legacy Code

1. **Clerk Integration** (`src/config/clerk.js`, `src/middleware/auth.js`)
   - Clerk dependencies still in package.json but **not actively used**
   - `clerkId` field commented out in schema
   - Old auth middleware exists but routes use local auth

2. **Old Registration Flow** 
   - `/creer-identifiants` endpoint marked as deprecated
   - Modern flow: direct member creation with credentials

### Current Limitations

1. **No session management** - JWT tokens can't be revoked
2. **Email dependency** for password reset (not all users have emails)
3. **Manual password visibility** for secretaries (temporary passwords stored in DB)
4. **Mixed authentication patterns** in different controllers

---

## 📋 Environment Variables

### Required for Authentication

```env
# JWT
JWT_SECRET=your-secret-key

# Database  
DATABASE_URL=postgresql://...

# Email (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME="SGM Association"

# Rate limiting (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000
```

### Legacy (Can be removed after migration)

```env
# Clerk (DEPRECATED)
CLERK_SECRET_KEY=sk_...
CLERK_PUBLISHABLE_KEY=pk_...
```

---

## 🔄 Audit Trail

### Tracked Authentication Events

- `CONNEXION` - User login
- `DECONNEXION` - User logout
- `CREATION_NOUVEAU_MEMBRE` - New member created by secretary
- `IDENTIFIANTS_CREES` - Credentials created (deprecated)
- `CHANGER_MOT_PASSE_TEMPORAIRE` - First-time password change
- `CHANGER_MOT_PASSE` - Regular password change  
- `DEMANDER_REINITIALISATION_MOT_PASSE` - Password reset requested
- `REINITIALISER_MOT_PASSE_AVEC_TOKEN` - Password reset completed

---

## 📊 User States & Workflows

### User Account States

```
MEMBER LIFECYCLE:
Created by Secretary → Has temporary password → First login → Must change password → Active member
                   ↓
                Can be: EN_ATTENTE → APPROUVE/REJETE (form submission)
                   ↓  
                Can be: Deactivated by admin
```

### Password States

```
TEMPORARY PASSWORD FLOW:
doit_changer_mot_passe: true → First login → Change password → doit_changer_mot_passe: false
                                              ↓
                              a_change_mot_passe_temporaire: true
```

---

## 🎯 Migration Preparation Notes

### What Works Well
- ✅ Local password management
- ✅ JWT token system
- ✅ Role-based authorization
- ✅ Comprehensive audit logging
- ✅ Password reset via email
- ✅ Rate limiting and security headers

### What Needs Better-auth
- 🔄 Session management (token revocation)
- 🔄 OAuth providers (if needed)
- 🔄 Better password policy enforcement
- 🔄 Account lockout mechanisms  
- 🔄 Two-factor authentication
- 🔄 Simplified middleware stack
- 🔄 Remove Clerk dependencies entirely

### Files to Remove/Replace
- `src/config/clerk.js` (remove)
- `src/middleware/auth.js` (remove)
- Clerk dependencies in `package.json`
- `clerkId` field from schema (already commented)

### Files to Migrate
- `src/controllers/auth.controller.js` → Better-auth handlers
- `src/middleware/auth-local.js` → Better-auth middleware
- `src/services/auth.service.js` → Better-auth configuration
- `src/routes/auth.js` → Better-auth routes

---

**Generated**: August 2024 for Better-auth migration planning
**Status**: Current production authentication system
**Next Step**: Replace with Better-auth while preserving user data and workflows