const { betterAuth } = require("better-auth");
const { prismaAdapter } = require("better-auth/adapters/prisma");
const { username } = require("better-auth/plugins");
const prisma = require('../config/database');
const logger = require('../config/logger');

const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    disabled: false
  },
  // Enable email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disable for now since we use invitation-based signup
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  // Enable username and password authentication
  plugins: [
    username({
      enabled: true,
      async generateUsername(user, request) {
        // Use the username field from our User model
        return user.username || `user_${Date.now()}`;
      }
    })
  ],
  // OAuth providers can be added here later
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!process.env.GOOGLE_CLIENT_ID, // Only enable if env vars are set
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!process.env.GITHUB_CLIENT_ID, // Only enable if env vars are set
    },
    // Add more OAuth providers as needed
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    }
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "MEMBER"
      },
      status: {
        type: "string", 
        defaultValue: "PENDING"
      },
      membership_number: {
        type: "string",
        required: false
      },
      phone: {
        type: "string",
        required: false
      },
      address: {
        type: "string",
        required: false
      },
      profession: {
        type: "string",
        required: false
      },
      city_residence: {
        type: "string",
        required: false
      },
      employer_school: {
        type: "string",
        required: false
      },
      spouse_first_name: {
        type: "string",
        required: false
      },
      spouse_last_name: {
        type: "string",
        required: false
      },
      children_count: {
        type: "number",
        required: false
      },
      comments: {
        type: "string",
        required: false
      },
      has_paid: {
        type: "boolean",
        defaultValue: false
      },
      has_submitted_form: {
        type: "boolean",
        defaultValue: false
      },
      form_code: {
        type: "string",
        required: false
      },
      qr_code_url: {
        type: "string",
        required: false
      },
      card_issued_at: {
        type: "date",
        required: false
      },
      rejection_reason: {
        type: "string",
        required: false
      },
      rejected_at: {
        type: "date",
        required: false
      },
      rejected_by: {
        type: "string",
        required: false
      },
      is_active: {
        type: "boolean",
        defaultValue: true
      },
      deactivated_at: {
        type: "date",
        required: false
      },
      deactivated_by: {
        type: "string",
        required: false
      },
      deactivation_reason: {
        type: "string",
        required: false
      }
    }
  },
  trustedOrigins: [
    process.env.FRONTEND_URL || "http://localhost:3001",
    "http://localhost:3000"
  ],
  // Security settings
  security: {
    csrfProtection: {
      enabled: true,
      secret: process.env.CSRF_SECRET || "your-csrf-secret-key"
    }
  }
});

module.exports = { auth };