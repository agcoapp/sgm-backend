# SGM Backend API - Postman Collection

This folder contains comprehensive Postman collection and environment files for testing the SGM Backend API.

## 📁 Files

- `SGM-Backend-API.postman_collection.json` - Complete API collection
- `SGM-Environment.postman_environment.json` - Environment variables
- `README.md` - This documentation file

## 🚀 Quick Setup

### 1. Import Collections
1. Open Postman
2. Click **Import** button
3. Drag and drop both JSON files or browse to select them
4. Collections will appear in your Postman workspace

### 2. Configure Environment
1. Select **SGM Backend Environment** from the environment dropdown
2. Click the **eye icon** to view/edit variables
3. Update these required variables:
   - `clerk_token` - Get from your Clerk dashboard or frontend login
   - `base_url` - Default is `http://localhost:3000` for local development

### 3. Test the API
1. Start your SGM backend server: `npm run dev`
2. Run requests in order:
   - Start with **System & Health** folder
   - Test **Authentication** endpoints
   - Proceed with other endpoints

## 📊 Collection Structure

### 🔧 System & Health
- **API Info** - Get API information and available endpoints
- **Health Check** - Basic server health check
- **Detailed Health Check** - Database and performance metrics

### 🔐 Authentication
- **Auth Test (Public)** - Test auth without token
- **Get Current User** - Get authenticated user info
- **User Status** - Check registration status

### 👤 Member Registration
- **Register New Member** - Complete registration with file uploads

### 👥 Member Management (Admin Only)
- **List All Members** - View all members with filters
- **Approve Member** - Approve pending registrations
- **Reject Member** - Reject registrations with reason
- **Assign Form Code** - Assign unique form codes

### 📄 Signatures (President Only)
- **Upload Signature** - Upload president's digital signature
- **Get Active Signature** - Retrieve current active signature

### 🖼️ Photos & Documents (Admin Only)
- **Get Member Photos** - Access member's uploaded documents

### 🎯 QR Code & Verification
- **Verify Member** - Public QR code verification
- **Generate QR Code** - Create member QR codes

### 👤 Member Profile
- **Get My Profile** - Member's own profile access
- **Download My Card** - Download digital membership card

### 🧪 Test Data (Development Only)
- **Seed Test Data** - Create sample data for testing
- **Reset Test Database** - Clear all test data (DANGEROUS)

## 🔑 Authentication

### Getting a Clerk Token
1. **Method 1 - From Frontend:**
   - Login to your frontend application
   - Open browser dev tools → Network tab
   - Look for API requests with `Authorization: Bearer` header
   - Copy the token value

2. **Method 2 - From Clerk Dashboard:**
   - Go to your Clerk project dashboard
   - Navigate to Users section
   - Select a user and generate a session token

3. **Method 3 - Development Bypass:**
   - Set `BYPASS_AUTH=true` in your `.env` file
   - Some endpoints will work without authentication

### Token Format
```
Bearer your_jwt_token_here
```

## 🧪 Test Data

The collection includes realistic test data:

### Sample Member Registration
```json
{
  "name": "Jean Claude MBONGO",
  "id_number": "GAB2024001",
  "email": "jean.mbongo@example.com",
  "phone": "+241066123456",
  "address": "Libreville, Gabon",
  "dob": "1990-05-15",
  "id_type": "PASSPORT"
}
```

### Sample Approval/Rejection
```json
{
  "status": "APPROVED",
  "reason": "Documents validés, membre accepté"
}
```

### Sample Form Code
```json
{
  "form_code": "Gabon/SGMAssociation/001"
}
```

## 📋 Testing Workflow

### Basic Testing Sequence:
1. **Health Check** - Verify server is running
2. **Auth Test** - Test authentication endpoints
3. **Register Member** - Create a test registration
4. **List Members** - View pending registrations (admin)
5. **Approve Member** - Approve the registration (admin)
6. **Assign Form Code** - Give member a form code (admin)
7. **Get Profile** - Member views their profile
8. **Verify QR** - Test QR code verification (public)

### Role-Based Testing:
- **Member Role:** Profile access, card download
- **Secretary Role:** View members, approve/reject, assign codes
- **President Role:** All secretary permissions + signature upload

## 🌍 Environment Switching

### Local Development
```json
{
  "base_url": "http://localhost:3000"
}
```

### Staging
```json
{
  "base_url": "https://sgm-backend-staging.herokuapp.com"
}
```

### Production
```json
{
  "base_url": "https://sgm-backend-prod.herokuapp.com"
}
```

## 📝 Notes

- **File Uploads:** For endpoints with file uploads, use the form-data tab in Postman
- **Error Handling:** API returns structured error responses with codes
- **Rate Limiting:** Some endpoints have rate limits (check headers)
- **CORS:** Configured for localhost and production domains

## 🐛 Troubleshooting

### Common Issues:

1. **401 Unauthorized**
   - Check your `clerk_token` is valid
   - Ensure token is properly formatted with "Bearer " prefix

2. **403 Forbidden**
   - User doesn't have required role permissions
   - Check user role in database

3. **500 Internal Server Error**
   - Check server logs
   - Verify database connection
   - Ensure all environment variables are set

4. **Connection Refused**
   - Ensure server is running (`npm run dev`)
   - Check correct port (default 3000)
   - Verify firewall settings

## 📚 Additional Resources

- **API Documentation:** See main README.md
- **Development Setup:** Follow setup instructions in project root
- **Database Schema:** Check `prisma/schema.prisma`
- **Environment Variables:** See `.env.template`

## 👥 Support

**Authors:** Elvis Destin OLEMBE & Mondésir NTSOUMOU

For issues or questions about the API collection, check the server logs or refer to the main project documentation.