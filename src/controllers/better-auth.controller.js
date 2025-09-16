const { auth } = require('../utils/auth');
const prisma = require('../config/database');
const logger = require('../config/logger');
const ErrorHandler = require('../utils/errorHandler');

class BetterAuthController {
  /**
   * Sign up a new user (invitation-based)
   */
  async signUp(req, res) {
    try {
      const { email, password, username, invitationToken, name } = req.body;

      // Validate required fields
      if (!email || !password || !invitationToken) {
        const validationError = ErrorHandler.createBusinessError(
          'Email, password, and invitation token are required',
          'MISSING_REQUIRED_FIELDS',
          400,
          ['Provide email, password, and invitation token']
        );
        const context = {
          operation: 'user_signup',
          user_id: 'anonymous'
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Check if invitation exists and is valid
      const invitation = await prisma.invitation.findFirst({
        where: {
          email: email.toLowerCase(),
          token: invitationToken,
          status: 'pending',
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!invitation) {
        const businessError = ErrorHandler.createBusinessError(
          'Invalid or expired invitation',
          'INVALID_INVITATION',
          400,
          ['Check your invitation email', 'Contact an administrator for a new invitation']
        );
        const context = {
          operation: 'invitation_validation',
          user_id: 'anonymous'
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        const businessError = ErrorHandler.createBusinessError(
          'User already exists with this email',
          'USER_EXISTS',
          409,
          ['Use a different email', 'Try signing in instead']
        );
        const context = {
          operation: 'user_existence_check',
          user_id: 'anonymous'
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Create user with better-auth
      const result = await auth.api.signUpEmail({
        body: {
          email: email.toLowerCase(),
          password,
          name: name || email.split('@')[0],
          username: username || email.split('@')[0],
          role: invitation.role,
          status: 'PENDING',
          is_active: true
        }
      });

      if (!result.user) {
        throw new Error('Failed to create user');
      }

      // Update invitation status
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted' }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          user_id: result.user.id,
          action: 'USER_SIGNUP',
          details: {
            email: email.toLowerCase(),
            role: invitation.role,
            invitation_id: invitation.id
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info('User signed up successfully', {
        user_id: result.user.id,
        email: email.toLowerCase(),
        role: invitation.role
      });

      res.status(201).json({
        message: 'Account created successfully',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          username: result.user.username,
          role: result.user.role,
          status: result.user.status
        }
      });

    } catch (error) {
      const context = {
        operation: 'user_signup',
        user_id: 'anonymous'
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Sign in user
   */
  async signIn(req, res) {
    try {
      const { email, password, username } = req.body;

      // Validate required fields
      if ((!email && !username) || !password) {
        const validationError = ErrorHandler.createBusinessError(
          'Email/username and password are required',
          'MISSING_CREDENTIALS',
          400,
          ['Provide email or username and password']
        );
        const context = {
          operation: 'user_signin',
          user_id: 'anonymous'
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Find user by email or username
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email?.toLowerCase() },
            { username: username }
          ]
        }
      });

      if (!user) {
        const authError = new Error('Invalid credentials');
        authError.code = 'INVALID_CREDENTIALS';
        authError.status = 401;
        const context = {
          operation: 'user_signin',
          user_id: 'anonymous'
        };
        return ErrorHandler.formatAuthError(authError, res, context);
      }

      // Check if user is active
      if (!user.is_active) {
        const businessError = ErrorHandler.createBusinessError(
          'Account is deactivated',
          'ACCOUNT_DEACTIVATED',
          403,
          ['Contact an administrator to reactivate your account']
        );
        const context = {
          operation: 'account_status_check',
          user_id: user.id
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Sign in with better-auth
      const result = await auth.api.signInEmail({
        body: {
          email: user.email,
          password
        }
      });

      if (!result.user || !result.session) {
        const authError = new Error('Invalid credentials');
        authError.code = 'INVALID_CREDENTIALS';
        authError.status = 401;
        const context = {
          operation: 'user_signin',
          user_id: user.id
        };
        return ErrorHandler.formatAuthError(authError, res, context);
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          user_id: user.id,
          action: 'USER_SIGNIN',
          details: {
            email: user.email,
            username: user.username
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info('User signed in successfully', {
        user_id: user.id,
        email: user.email
      });

      res.json({
        message: 'Sign in successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          username: result.user.username,
          role: result.user.role,
          status: result.user.status,
          is_active: result.user.is_active
        },
        session: {
          id: result.session.id,
          expiresAt: result.session.expiresAt
        }
      });

    } catch (error) {
      const context = {
        operation: 'user_signin',
        user_id: 'anonymous'
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Sign out user
   */
  async signOut(req, res) {
    try {
      const sessionId = req.session?.id;

      if (sessionId) {
        // Sign out with better-auth
        await auth.api.signOut({
          headers: req.headers
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            user_id: req.user.id,
            action: 'USER_SIGNOUT',
            details: {},
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
          }
        });

        logger.info('User signed out successfully', {
          user_id: req.user.id
        });
      }

      res.json({
        message: 'Sign out successful'
      });

    } catch (error) {
      const context = {
        operation: 'user_signout',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Get current session
   */
  async getSession(req, res) {
    try {
      const session = await auth.api.getSession({
        headers: req.headers
      });

      if (!session) {
        return res.status(401).json({
          type: 'authentication_error',
          message: 'No active session',
          code: 'NO_SESSION'
        });
      }

      res.json({
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          username: session.user.username,
          role: session.user.role,
          status: session.user.status,
          is_active: session.user.is_active
        },
        session: {
          id: session.session.id,
          expiresAt: session.session.expiresAt
        }
      });

    } catch (error) {
      const context = {
        operation: 'get_session',
        user_id: 'anonymous'
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        const validationError = ErrorHandler.createBusinessError(
          'Current password and new password are required',
          'MISSING_PASSWORDS',
          400,
          ['Provide both current and new passwords']
        );
        const context = {
          operation: 'change_password',
          user_id: userId
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Validate password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        const validationError = ErrorHandler.createBusinessError(
          'Password must contain at least 8 characters with uppercase, lowercase, numbers, and special characters',
          'WEAK_PASSWORD',
          400,
          ['Use at least 8 characters', 'Include uppercase and lowercase letters', 'Add numbers and special characters']
        );
        const context = {
          operation: 'password_validation',
          user_id: userId
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Change password with better-auth
      const result = await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword
        },
        headers: req.headers
      });

      if (!result.success) {
        const authError = new Error('Current password is incorrect');
        authError.code = 'INVALID_CURRENT_PASSWORD';
        authError.status = 400;
        const context = {
          operation: 'change_password',
          user_id: userId
        };
        return ErrorHandler.formatAuthError(authError, res, context);
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          user_id: userId,
          action: 'CHANGE_PASSWORD',
          details: {},
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info('Password changed successfully', {
        user_id: userId
      });

      res.json({
        message: 'Password changed successfully'
      });

    } catch (error) {
      const context = {
        operation: 'change_password',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        const validationError = ErrorHandler.createBusinessError(
          'Email is required',
          'MISSING_EMAIL',
          400,
          ['Provide your email address']
        );
        const context = {
          operation: 'password_reset_request',
          user_id: 'anonymous'
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        // Don't reveal if user exists or not for security
        res.json({
          message: 'If an account with this email exists, a password reset link has been sent'
        });
        return;
      }

      // Request password reset with better-auth
      await auth.api.forgetPassword({
        body: {
          email: email.toLowerCase()
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          user_id: user.id,
          action: 'PASSWORD_RESET_REQUEST',
          details: {
            email: email.toLowerCase()
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info('Password reset requested', {
        user_id: user.id,
        email: email.toLowerCase()
      });

      res.json({
        message: 'If an account with this email exists, a password reset link has been sent'
      });

    } catch (error) {
      const context = {
        operation: 'password_reset_request',
        user_id: 'anonymous'
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        const validationError = ErrorHandler.createBusinessError(
          'Token and new password are required',
          'MISSING_RESET_DATA',
          400,
          ['Provide reset token and new password']
        );
        const context = {
          operation: 'password_reset',
          user_id: 'anonymous'
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Validate password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        const validationError = ErrorHandler.createBusinessError(
          'Password must contain at least 8 characters with uppercase, lowercase, numbers, and special characters',
          'WEAK_PASSWORD',
          400,
          ['Use at least 8 characters', 'Include uppercase and lowercase letters', 'Add numbers and special characters']
        );
        const context = {
          operation: 'password_reset_validation',
          user_id: 'anonymous'
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Reset password with better-auth
      const result = await auth.api.resetPassword({
        body: {
          token,
          newPassword
        }
      });

      if (!result.success) {
        const businessError = ErrorHandler.createBusinessError(
          'Invalid or expired reset token',
          'INVALID_RESET_TOKEN',
          400,
          ['Request a new password reset', 'Check your email for the latest reset link']
        );
        const context = {
          operation: 'password_reset',
          user_id: 'anonymous'
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      logger.info('Password reset successfully', {
        user_id: result.user?.id
      });

      res.json({
        message: 'Password reset successfully'
      });

    } catch (error) {
      const context = {
        operation: 'password_reset',
        user_id: 'anonymous'
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }
}

module.exports = new BetterAuthController();
