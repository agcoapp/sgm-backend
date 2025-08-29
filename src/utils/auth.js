const { betterAuth } = require("better-auth");
const { prismaAdapter } = require("better-auth/adapters/prisma");
const { username } = require("better-auth/plugins");
const prisma = require('../config/database');

const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // Enable email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disable for now since we use invitation-based signup
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
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "MEMBER"
      }
    }
  },
  trustedOrigins: [
    process.env.FRONTEND_URL || "http://localhost:3001"
  ]
});

module.exports = { auth };