const prisma = require('../config/database');
const logger = require('../config/logger');
const ErrorHandler = require('../utils/errorHandler');

class UserController {
  /**
   * Get user profile (replaces obtenirProfil)
   */
  async getProfile(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          has_paid: true,
          has_submitted_form: true,
          membership_number: true,
          form_code: true,
          last_login: true,
          is_active: true
        }
      });

      if (!user) {
        const context = {
          operation: 'get_user_profile',
          user_id: req.user?.id
        };
        return ErrorHandler.notFound(res, 'User', context);
      }

      res.json({
        user: {
          ...user,
          full_name: user.name || 'N/A'
        }
      });

    } catch (error) {
      const context = {
        operation: 'get_user_profile',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Get user status (replaces obtenirStatut)
   */
  async getStatus(req, res) {
    try {
      if (!req.user) {
        return res.json({
          authenticated: false,
          user: null,
          must_change_password: false,
          must_submit_form: false,
          form_status: null
        });
      }

      // Fetch complete user data including form status
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          status: true,
          has_submitted_form: true,
          rejection_reason: true,
          rejected_at: true,
          rejected_by: true,
          is_active: true,
          form_code: true,
          card_issued_at: true
        }
      });

      logger.info(`DEBUG - Status check for user ${req.user.id}: has_submitted_form = ${user?.has_submitted_form}, status = ${user?.status}`);

      if (!user) {
        const context = {
          operation: 'get_user_status',
          user_id: req.user.id
        };
        return ErrorHandler.notFound(res, 'User', context);
      }

      // Determine what the user should do next
      let next_action = null;
      if (!user.has_submitted_form) {
        next_action = 'SUBMIT_FORM';
      } else if (user.status === 'PENDING') {
        next_action = 'AWAIT_APPROVAL';
      } else if (user.status === 'REJECTED') {
        next_action = 'REVIEW_REJECTION';
      } else if (user.status === 'APPROVED') {
        next_action = 'FULL_ACCESS';
      }

      res.json({
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.name || 'N/A',
          role: user.role,
          status: user.status,
          is_active: user.is_active
        },
        must_submit_form: !user.has_submitted_form,
        form_status: {
          submitted: user.has_submitted_form,
          status: user.status,
          form_code: user.form_code,
          card_issued_at: user.card_issued_at,
          rejection_reason: user.rejection_reason,
          rejected_at: user.rejected_at,
          rejected_by: user.rejected_by
        },
        next_action,
        account_active: user.is_active
      });

    } catch (error) {
      const context = {
        operation: 'get_user_status',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { 
        name,
        phone,
        address,
        profession,
        city_residence,
        employer_school,
        spouse_first_name,
        spouse_last_name,
        children_count,
        comments
      } = req.body;

      // Only allow users to update their own profile
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        const context = {
          operation: 'update_user_profile',
          user_id: userId
        };
        return ErrorHandler.notFound(res, 'User', context);
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          phone,
          address,
          profession,
          city_residence,
          employer_school,
          spouse_first_name,
          spouse_last_name,
          children_count: children_count ? parseInt(children_count) : null,
          comments
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          profession: true,
          city_residence: true,
          employer_school: true,
          spouse_first_name: true,
          spouse_last_name: true,
          children_count: true,
          comments: true
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          user_id: userId,
          action: 'UPDATE_PROFILE',
          details: {
            updated_fields: Object.keys(req.body)
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info('User profile updated successfully', {
        user_id: userId,
        updated_fields: Object.keys(req.body)
      });

      res.json({
        message: 'Profil mis à jour avec succès',
        user: updatedUser
      });

    } catch (error) {
      const context = {
        operation: 'update_user_profile',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }
}

module.exports = new UserController();