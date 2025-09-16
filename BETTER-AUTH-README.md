# Better-Auth REST API Implementation

This document describes the implementation of a functional REST API with sessions and RBAC (Role-Based Access Control) using the better-auth library.

## Overview

The SGM Backend now uses better-auth as the primary authentication system, replacing the custom JWT-based authentication. This provides:

- **Session-based authentication** with secure cookies
- **Role-based access control** (RBAC) with MEMBER and ADMIN roles
- **Invitation-based registration** system
- **Password management** (change, reset, forgot)
- **Comprehensive audit logging**
- **Email notifications** for various events

## Architecture

### Authentication Flow

1. **Admin creates invitation** → Email sent to user
2. **User signs up** using invitation token → Account created
3. **User signs in** → Session established
4. **User accesses protected resources** → RBAC validation
5. **User signs out** → Session invalidated

### Database Schema

The system uses Prisma with PostgreSQL and includes:

- **User model** with better-auth compatibility
- **Session model** for better-auth sessions
- **Account model** for better-auth accounts
- **Invitation model** for RBAC system
- **AuditLog model** for tracking actions

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/signup`
Create a new user account using an invitation token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "john.doe",
  "name": "John Doe",
  "invitationToken": "invitation-token-here"
}
```

**Response (201):**
```json
{
  "message": "Account created successfully",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "username": "john.doe",
    "role": "MEMBER",
    "status": "PENDING"
  }
}
```

#### POST `/api/auth/signin`
Authenticate user with email/username and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Sign in successful",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "username": "john.doe",
    "role": "MEMBER",
    "status": "PENDING",
    "is_active": true
  },
  "session": {
    "id": "session-id",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST `/api/auth/signout`
Sign out the current user and invalidate session.

**Headers:** `Cookie: better-auth.session_token=...`

**Response (200):**
```json
{
  "message": "Sign out successful"
}
```

#### GET `/api/auth/session`
Get information about the current user session.

**Headers:** `Cookie: better-auth.session_token=...`

**Response (200):**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "username": "john.doe",
    "role": "MEMBER",
    "status": "PENDING",
    "is_active": true
  },
  "session": {
    "id": "session-id",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST `/api/auth/change-password`
Change the current user's password.

**Headers:** `Cookie: better-auth.session_token=...`

**Request Body:**
```json
{
  "currentPassword": "CurrentPass123!",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

#### POST `/api/auth/forgot-password`
Send a password reset link to the user's email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account with this email exists, a password reset link has been sent"
}
```

#### POST `/api/auth/reset-password`
Reset password using the token from email.

**Request Body:**
```json
{
  "token": "reset-token-here",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

### User Management Endpoints

#### GET `/api/user/profile`
Get the profile of the authenticated user.

**Headers:** `Cookie: better-auth.session_token=...`

**Response (200):**
```json
{
  "user": {
    "id": "user-id",
    "username": "john.doe",
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "+1234567890",
    "role": "MEMBER",
    "status": "PENDING",
    "has_paid": false,
    "has_submitted_form": false,
    "membership_number": null,
    "form_code": null,
    "last_login": "2024-01-01T00:00:00.000Z",
    "is_active": true
  }
}
```

#### GET `/api/user/status`
Get complete status of authenticated user including form submission status.

**Headers:** `Cookie: better-auth.session_token=...`

**Response (200):**
```json
{
  "authenticated": true,
  "user": {
    "id": "user-id",
    "username": "john.doe",
    "full_name": "John Doe",
    "role": "MEMBER",
    "status": "PENDING",
    "is_active": true
  },
  "must_submit_form": true,
  "form_status": {
    "submitted": false,
    "status": "PENDING",
    "form_code": null,
    "card_issued_at": null,
    "rejection_reason": null,
    "rejected_at": null,
    "rejected_by": null
  },
  "next_action": "SUBMIT_FORM",
  "account_active": true
}
```

#### PUT `/api/user/profile`
Update the profile information of the authenticated user.

**Headers:** `Cookie: better-auth.session_token=...`

**Request Body:**
```json
{
  "name": "Updated Name",
  "phone": "+1234567890",
  "address": "123 Main Street",
  "profession": "Software Developer",
  "city_residence": "New York",
  "employer_school": "Tech Corp",
  "spouse_first_name": "Jane",
  "spouse_last_name": "Doe",
  "children_count": 2,
  "comments": "Additional information"
}
```

**Response (200):**
```json
{
  "message": "Profil mis à jour avec succès",
  "user": {
    "id": "user-id",
    "name": "Updated Name",
    "email": "user@example.com",
    "phone": "+1234567890",
    "address": "123 Main Street",
    "profession": "Software Developer",
    "city_residence": "New York",
    "employer_school": "Tech Corp",
    "spouse_first_name": "Jane",
    "spouse_last_name": "Doe",
    "children_count": 2,
    "comments": "Additional information"
  }
}
```

### Admin Endpoints

#### GET `/api/admin/dashboard`
Get dashboard data for admins including member statistics.

**Headers:** `Cookie: better-auth.session_token=...` (Admin role required)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term

**Response (200):**
```json
{
  "message": "Admin dashboard retrieved successfully",
  "data": {
    "members": [
      {
        "id": "user-id",
        "name": "John Doe",
        "email": "user@example.com",
        "phone": "+1234567890",
        "username": "john.doe",
        "status": "PENDING",
        "role": "MEMBER",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "last_login": "2024-01-01T00:00:00.000Z",
        "has_paid": false,
        "has_submitted_form": false,
        "is_active": true,
        "full_name": "John Doe",
        "has_credentials": true,
        "connection_status": "connected"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1
    },
    "statistics": {
      "total_members": 1,
      "members_with_credentials": 1,
      "members_form_submitted": 0,
      "members_approved": 0,
      "members_pending": 1,
      "members_rejected": 0,
      "members_connected_recently": 1,
      "percentage_with_credentials": 100,
      "percentage_form_submitted": 0
    }
  }
}
```

#### GET `/api/admin/membership-forms`
Get membership forms for review.

**Headers:** `Cookie: better-auth.session_token=...` (Admin role required)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (PENDING, APPROVED, REJECTED, default: PENDING)
- `search` (optional): Search term

**Response (200):**
```json
{
  "message": "Membership forms retrieved successfully",
  "data": {
    "forms": [
      {
        "id": 1,
        "user_id": "user-id",
        "version_number": 1,
        "form_image_url": "https://example.com/form.jpg",
        "data_snapshot": {},
        "is_active_version": true,
        "created_at": "2024-01-01T00:00:00.000Z",
        "user": {
          "id": "user-id",
          "name": "John Doe",
          "email": "user@example.com",
          "phone": "+1234567890",
          "username": "john.doe",
          "status": "PENDING",
          "membership_number": null,
          "form_code": null,
          "has_paid": false,
          "consular_card_number": null,
          "birth_date": null,
          "address": null,
          "profession": null
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

#### POST `/api/admin/membership-forms/{userId}/approve`
Approve a pending membership form.

**Headers:** `Cookie: better-auth.session_token=...` (Admin role required)

**Response (200):**
```json
{
  "message": "Form approved successfully",
  "data": {
    "membership_number": "SGM-2024-001",
    "form_code": "N°001/AGCO/M/2024",
    "email_sent": true
  }
}
```

#### POST `/api/admin/membership-forms/{userId}/reject`
Reject a pending membership form.

**Headers:** `Cookie: better-auth.session_token=...` (Admin role required)

**Request Body:**
```json
{
  "rejection_reason": "Incomplete information provided"
}
```

**Response (200):**
```json
{
  "message": "Form rejected successfully",
  "data": {
    "rejection_reason": "Incomplete information provided",
    "email_sent": true
  }
}
```

### Invitation Management Endpoints

#### POST `/api/invitations`
Create an invitation (Admin only).

**Headers:** `Cookie: better-auth.session_token=...` (Admin role required)

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "MEMBER"
}
```

**Response (201):**
```json
{
  "message": "Invitation created successfully",
  "data": {
    "id": "invitation-id",
    "email": "newuser@example.com",
    "role": "MEMBER",
    "expiresAt": "2024-01-08T00:00:00.000Z",
    "email_sent": true
  }
}
```

#### GET `/api/invitations`
Get all invitations (Admin only).

**Headers:** `Cookie: better-auth.session_token=...` (Admin role required)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (all, pending, accepted, expired, default: all)

**Response (200):**
```json
{
  "message": "Invitations retrieved successfully",
  "data": {
    "invitations": [
      {
        "id": "invitation-id",
        "email": "newuser@example.com",
        "role": "MEMBER",
        "status": "pending",
        "expiresAt": "2024-01-08T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "inviter": {
          "id": "admin-id",
          "name": "Admin User",
          "email": "admin@example.com"
        },
        "is_expired": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1
    },
    "statistics": {
      "total_invitations": 1,
      "pending_invitations": 1,
      "accepted_invitations": 0,
      "expired_invitations": 0
    }
  }
}
```

#### DELETE `/api/invitations/{id}`
Delete an invitation (Admin only).

**Headers:** `Cookie: better-auth.session_token=...` (Admin role required)

**Response (200):**
```json
{
  "message": "Invitation deleted successfully"
}
```

#### POST `/api/invitations/{id}/resend`
Resend invitation email (Admin only).

**Headers:** `Cookie: better-auth.session_token=...` (Admin role required)

**Response (200):**
```json
{
  "message": "Invitation email resent successfully",
  "data": {
    "email_sent": true
  }
}
```

## Middleware

### Authentication Middleware

- **`requireAuth`**: Requires valid session
- **`requireAdmin`**: Requires ADMIN role
- **`requireMember`**: Requires MEMBER or ADMIN role
- **`requireActiveAccount`**: Requires active account
- **`requireApprovedStatus`**: Requires APPROVED status

### Security Middleware

- **Rate limiting** on authentication endpoints
- **CORS** configuration for frontend integration
- **Helmet** for security headers
- **CSRF protection** via better-auth

## Error Handling

The API uses a comprehensive error handling system with:

- **Structured error responses** with type, message, and code
- **Business logic errors** with helpful suggestions
- **Authentication errors** for invalid sessions
- **Authorization errors** for insufficient permissions
- **Validation errors** for invalid input data

## Testing

Run the test script to verify the authentication flow:

```bash
node test-better-auth.js
```

The test script covers:
- Health check
- User signup with invitation
- User signin
- Session management
- Profile management
- Password change
- RBAC validation
- Sign out

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sgm_db"

# Better-Auth
CSRF_SECRET="your-csrf-secret-key"

# Frontend URLs
FRONTEND_URL="http://localhost:3001"

# Email (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### Database Setup

1. Run Prisma migrations:
```bash
npm run db:migrate
```

2. Seed the database with initial data:
```bash
npm run db:seed
```

## Deployment

The API is ready for deployment with:

- **Docker support** via Dockerfile and docker-compose.yml
- **Railway deployment** scripts
- **Health checks** for monitoring
- **Graceful shutdown** handling

## Security Features

- **Session-based authentication** with secure cookies
- **Password hashing** with bcrypt
- **Rate limiting** on sensitive endpoints
- **CSRF protection**
- **Input validation** with Zod schemas
- **Audit logging** for all actions
- **Role-based access control**

## Migration from JWT

The system maintains backward compatibility with the legacy JWT system while providing the new better-auth endpoints. The legacy routes are still available under `/api/auth/` for existing clients.

## Support

For issues or questions about the better-auth implementation, please refer to:

- [Better-Auth Documentation](https://better-auth.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com)
