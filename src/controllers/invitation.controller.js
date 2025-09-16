const prisma = require('../config/database');
const logger = require('../config/logger');
const emailService = require('../services/email.service');
const ErrorHandler = require('../utils/errorHandler');
const crypto = require('crypto');

class InvitationController {
  /**
   * Create an invitation (Admin only)
   */
  async createInvitation(req, res) {
    try {
      const { email, role = 'MEMBER' } = req.body;
      const adminId = req.user.id;

      if (!email) {
        const validationError = ErrorHandler.createBusinessError(
          'Email is required',
          'EMAIL_REQUIRED',
          400,
          ['Provide a valid email address']
        );
        const context = {
          operation: 'create_invitation',
          user_id: adminId
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
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
          ['User already has an account with this email']
        );
        const context = {
          operation: 'create_invitation',
          user_id: adminId
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Check if invitation already exists
      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          email: email.toLowerCase(),
          status: 'pending',
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (existingInvitation) {
        const businessError = ErrorHandler.createBusinessError(
          'Active invitation already exists for this email',
          'INVITATION_EXISTS',
          409,
          ['An active invitation already exists for this email']
        );
        const context = {
          operation: 'create_invitation',
          user_id: adminId
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Generate invitation token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation
      const invitation = await prisma.invitation.create({
        data: {
          email: email.toLowerCase(),
          role,
          invitedBy: adminId,
          token,
          expiresAt,
          status: 'pending'
        }
      });

      // Send invitation email
      const invitationSent = await emailService.sendInvitationEmail(
        email.toLowerCase(),
        token,
        role,
        expiresAt
      );

      // Create audit log
      await prisma.auditLog.create({
        data: {
          user_id: adminId,
          action: 'CREATE_INVITATION',
          details: {
            invited_email: email.toLowerCase(),
            role,
            invitation_id: invitation.id,
            email_sent: invitationSent.success
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info('Invitation created successfully', {
        admin_id: adminId,
        invited_email: email.toLowerCase(),
        role,
        invitation_id: invitation.id
      });

      res.status(201).json({
        message: 'Invitation created successfully',
        data: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          email_sent: invitationSent.success
        }
      });

    } catch (error) {
      const context = {
        operation: 'create_invitation',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Get all invitations (Admin only)
   */
  async getInvitations(req, res) {
    try {
      const { page = 1, limit = 10, status = 'all' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build status filter
      const statusFilter = status === 'all' ? {} : { status };

      // Get invitations
      const invitations = await prisma.invitation.findMany({
        where: statusFilter,
        include: {
          inviter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      });

      // Count total for pagination
      const totalInvitations = await prisma.invitation.count({
        where: statusFilter
      });

      // Get statistics
      const stats = await this.getInvitationStats();

      res.json({
        message: 'Invitations retrieved successfully',
        data: {
          invitations: invitations.map(invitation => ({
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
            createdAt: invitation.createdAt,
            inviter: invitation.inviter,
            is_expired: invitation.expiresAt < new Date()
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalInvitations,
            total_pages: Math.ceil(totalInvitations / parseInt(limit))
          },
          statistics: stats
        }
      });

    } catch (error) {
      const context = {
        operation: 'get_invitations',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Delete an invitation (Admin only)
   */
  async deleteInvitation(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;

      // Get the invitation
      const invitation = await prisma.invitation.findUnique({
        where: { id }
      });

      if (!invitation) {
        const context = {
          operation: 'delete_invitation',
          user_id: adminId,
          invitation_id: id
        };
        return ErrorHandler.notFound(res, 'Invitation', context);
      }

      // Delete the invitation
      await prisma.invitation.delete({
        where: { id }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          user_id: adminId,
          action: 'DELETE_INVITATION',
          details: {
            deleted_invitation_id: id,
            deleted_email: invitation.email,
            deleted_role: invitation.role
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info('Invitation deleted successfully', {
        admin_id: adminId,
        invitation_id: id,
        invitation_email: invitation.email
      });

      res.json({
        message: 'Invitation deleted successfully'
      });

    } catch (error) {
      const context = {
        operation: 'delete_invitation',
        user_id: req.user?.id,
        invitation_id: req.params.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Resend invitation email (Admin only)
   */
  async resendInvitation(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;

      // Get the invitation
      const invitation = await prisma.invitation.findUnique({
        where: { id }
      });

      if (!invitation) {
        const context = {
          operation: 'resend_invitation',
          user_id: adminId,
          invitation_id: id
        };
        return ErrorHandler.notFound(res, 'Invitation', context);
      }

      if (invitation.status !== 'pending') {
        const businessError = ErrorHandler.createBusinessError(
          'Only pending invitations can be resent',
          'INVALID_STATUS',
          400,
          ['Invitation must be in pending status to be resent']
        );
        const context = {
          operation: 'resend_invitation',
          user_id: adminId,
          invitation_id: id
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Send invitation email
      const invitationSent = await emailService.sendInvitationEmail(
        invitation.email,
        invitation.token,
        invitation.role,
        invitation.expiresAt
      );

      // Create audit log
      await prisma.auditLog.create({
        data: {
          user_id: adminId,
          action: 'RESEND_INVITATION',
          details: {
            invitation_id: id,
            invitation_email: invitation.email,
            email_sent: invitationSent.success
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info('Invitation resent successfully', {
        admin_id: adminId,
        invitation_id: id,
        invitation_email: invitation.email
      });

      res.json({
        message: 'Invitation email resent successfully',
        data: {
          email_sent: invitationSent.success
        }
      });

    } catch (error) {
      const context = {
        operation: 'resend_invitation',
        user_id: req.user?.id,
        invitation_id: req.params.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Get invitation statistics
   */
  async getInvitationStats() {
    try {
      const [
        totalInvitations,
        pendingInvitations,
        acceptedInvitations,
        expiredInvitations
      ] = await Promise.all([
        prisma.invitation.count(),
        prisma.invitation.count({ where: { status: 'pending' } }),
        prisma.invitation.count({ where: { status: 'accepted' } }),
        prisma.invitation.count({
          where: {
            status: 'pending',
            expiresAt: { lt: new Date() }
          }
        })
      ]);

      return {
        total_invitations: totalInvitations,
        pending_invitations: pendingInvitations,
        accepted_invitations: acceptedInvitations,
        expired_invitations: expiredInvitations
      };

    } catch (error) {
      logger.error('Error getting invitation statistics', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = new InvitationController();