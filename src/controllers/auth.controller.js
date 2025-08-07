const { getAuth, getUser } = require('../config/clerk');
const prisma = require('../config/database');
const logger = require('../config/logger');

class AuthController {
  /**
   * Handle user sign-up from Clerk
   * This endpoint is called after user completes Clerk signup
   */
  async signUp(req, res) {
    try {
      const auth = getAuth(req);
      
      if (!auth?.userId) {
        return res.status(401).json({
          error: 'Non authentifié',
          code: 'UNAUTHORIZED'
        });
      }

      // Get user data from Clerk
      const clerkUser = await getUser(auth.userId);
      
      if (!clerkUser) {
        return res.status(404).json({
          error: 'Utilisateur non trouvé dans Clerk',
          code: 'CLERK_USER_NOT_FOUND'
        });
      }

      // Check if user already exists in our database
      const existingUser = await prisma.user.findUnique({
        where: { clerkId: auth.userId }
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Utilisateur déjà enregistré',
          code: 'USER_ALREADY_EXISTS',
          user: {
            id: existingUser.id,
            status: existingUser.status,
            role: existingUser.role
          }
        });
      }

      // Create basic user record (without full registration data)
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      const firstName = clerkUser.firstName || '';
      const lastName = clerkUser.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || email;

      const newUser = await prisma.user.create({
        data: {
          clerkId: auth.userId,
          name: fullName,
          email: email,
          status: 'PENDING',
          role: 'MEMBER'
          // All other fields are nullable and will be filled during registration
        }
      });

      // Log the signup
      await prisma.auditLog.create({
        data: {
          user_id: newUser.id,
          action: 'SIGNUP',
          details: {
            clerkId: auth.userId,
            email: email,
            name: fullName
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info(`New user signed up: ${email} (ID: ${newUser.id})`);

      res.status(201).json({
        message: 'Compte créé avec succès',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          status: newUser.status,
          role: newUser.role,
          needs_registration: true
        }
      });

    } catch (error) {
      logger.error('Sign up error:', error);
      res.status(500).json({
        error: 'Erreur lors de la création du compte',
        code: 'SIGNUP_ERROR'
      });
    }
  }

  /**
   * Handle user sign-in from Clerk
   * This endpoint is called after user completes Clerk signin
   */
  async signIn(req, res) {
    try {
      const auth = getAuth(req);
      
      if (!auth?.userId) {
        return res.status(401).json({
          error: 'Non authentifié',
          code: 'UNAUTHORIZED'
        });
      }

      // Find user in our database
      const user = await prisma.user.findUnique({
        where: { clerkId: auth.userId },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          role: true,
          form_code: true,
          qr_code_url: true,
          card_issued_at: true,
          created_at: true,
          id_number: true,
          phone: true,
          address: true
        }
      });

      if (!user) {
        // User exists in Clerk but not in our database
        // They need to complete signup first
        return res.status(404).json({
          error: 'Compte non trouvé',
          code: 'USER_NOT_FOUND',
          needs_signup: true,
          clerk_user_id: auth.userId
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { updated_at: new Date() }
      });

      // Log the signin
      await prisma.auditLog.create({
        data: {
          user_id: user.id,
          action: 'SIGNIN',
          details: {
            clerkId: auth.userId,
            email: user.email
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info(`User signed in: ${user.email} (ID: ${user.id})`);

      // Determine if user needs to complete registration
      const needsRegistration = !user.id_number || !user.id_front_photo_url;

      res.json({
        message: 'Connexion réussie',
        user: {
          ...user,
          needs_registration: needsRegistration
        }
      });

    } catch (error) {
      logger.error('Sign in error:', error);
      res.status(500).json({
        error: 'Erreur lors de la connexion',
        code: 'SIGNIN_ERROR'
      });
    }
  }

  /**
   * Get current authenticated user status
   */
  async getStatus(req, res) {
    try {
      const auth = getAuth(req);
      
      if (!auth?.userId) {
        return res.json({
          authenticated: false,
          user_in_database: false,
          needs_signup: true,
          needs_registration: false,
          user: null
        });
      }

      // Find user in our database
      const user = await prisma.user.findUnique({
        where: { clerkId: auth.userId },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          role: true,
          form_code: true,
          id_number: true,
          id_front_photo_url: true,
          selfie_photo_url: true
        }
      });

      if (!user) {
        return res.json({
          authenticated: true,
          user_in_database: false,
          needs_signup: true,
          needs_registration: false,
          clerk_user_id: auth.userId
        });
      }

      // Check if registration is complete
      const needsRegistration = !user.id_number || !user.id_front_photo_url;

      res.json({
        authenticated: true,
        user_in_database: true,
        needs_signup: false,
        needs_registration: needsRegistration,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status,
          role: user.role,
          form_code: user.form_code,
          has_complete_profile: !needsRegistration
        }
      });

    } catch (error) {
      logger.error('Get status error:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération du statut',
        code: 'STATUS_ERROR'
      });
    }
  }

  /**
   * Get current user profile
   */
  async getMe(req, res) {
    try {
      const auth = getAuth(req);
      
      if (!auth?.userId) {
        return res.status(401).json({
          error: 'Non authentifié',
          code: 'UNAUTHORIZED'
        });
      }

      // Get user from Clerk
      const clerkUser = await getUser(auth.userId);
      
      // Get user from our database
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: auth.userId }
      });

      res.json({
        message: 'Informations utilisateur récupérées',
        clerk_user: {
          id: clerkUser?.id,
          email: clerkUser?.emailAddresses?.[0]?.emailAddress,
          first_name: clerkUser?.firstName,
          last_name: clerkUser?.lastName,
          created_at: clerkUser?.createdAt,
          last_sign_in_at: clerkUser?.lastSignInAt
        },
        db_user: dbUser || null,
        needs_signup: !dbUser,
        needs_registration: dbUser ? (!dbUser.id_number || !dbUser.id_front_photo_url) : false
      });

    } catch (error) {
      logger.error('Get me error:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des informations',
        code: 'USER_FETCH_ERROR'
      });
    }
  }

  /**
   * Handle user logout (cleanup)
   */
  async signOut(req, res) {
    try {
      const auth = getAuth(req);
      
      if (auth?.userId) {
        const user = await prisma.user.findUnique({
          where: { clerkId: auth.userId },
          select: { id: true, email: true }
        });

        if (user) {
          // Log the signout
          await prisma.auditLog.create({
            data: {
              user_id: user.id,
              action: 'SIGNOUT',
              details: {
                clerkId: auth.userId,
                email: user.email
              },
              ip_address: req.ip,
              user_agent: req.get('User-Agent')
            }
          });

          logger.info(`User signed out: ${user.email} (ID: ${user.id})`);
        }
      }

      res.json({
        message: 'Déconnexion réussie'
      });

    } catch (error) {
      logger.error('Sign out error:', error);
      res.status(500).json({
        error: 'Erreur lors de la déconnexion',
        code: 'SIGNOUT_ERROR'
      });
    }
  }
}

module.exports = new AuthController();