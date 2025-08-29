const prisma = require('../config/database');
const logger = require('../config/logger');
const emailService = require('../services/email.service');
const ErrorHandler = require('../utils/errorHandler');

class AdminController {

  /**
   * Admin dashboard - List members with credentials who haven't submitted forms
   */
  async getDashboard(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build search conditions
      const searchConditions = search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      } : {};

      // List members who have credentials but haven't submitted forms
      // (These members have already paid in cash and received their credentials)
      const members = await prisma.user.findMany({
        where: {
          AND: [
            { NOT: { username: null } }, // Have credentials
            { has_submitted_form: false }, // Haven't submitted form
            { role: 'MEMBER' }, // Exclude admins
            searchConditions
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          username: true,
          status: true,
          role: true,
          createdAt: true,
          last_login: true,
          has_paid: true,
          has_submitted_form: true,
          is_active: true
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      });

      // Count total for pagination
      const totalMembers = await prisma.user.count({
        where: {
          AND: [
            { NOT: { username: null } }, // Have credentials
            { has_submitted_form: false }, // Haven't submitted form
            { role: 'MEMBER' }, // Exclude admins
            searchConditions
          ]
        }
      });

      // General statistics
      const statistics = await this.getStatistics();

      res.json({
        message: 'Admin dashboard retrieved successfully',
        data: {
          members: members.map(member => ({
            ...member,
            full_name: member.name || 'N/A',
            has_credentials: !!member.username,
            connection_status: member.last_login ? 'connected' : 'never_connected'
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalMembers,
            total_pages: Math.ceil(totalMembers / parseInt(limit))
          },
          statistics
        }
      });

    } catch (error) {
      const context = {
        operation: 'admin_dashboard',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Get statistics for the dashboard
   */
  async getStatistics() {
    try {
      // Exclude admin roles from statistics
      const nonAdminFilter = {
        role: { notIn: ['ADMIN'] }
      };

      const [
        totalMembers,
        membersWithCredentials,
        membersFormSubmitted,
        membersApproved,
        membersPending,
        membersRejected,
        membersConnectedRecently
      ] = await Promise.all([
        prisma.user.count({ where: nonAdminFilter }),
        prisma.user.count({ 
          where: { 
            ...nonAdminFilter,
            NOT: { username: null } 
          } 
        }),
        prisma.user.count({ 
          where: { 
            ...nonAdminFilter,
            has_submitted_form: true 
          } 
        }),
        prisma.user.count({ 
          where: { 
            ...nonAdminFilter,
            status: 'APPROVED' 
          } 
        }),
        prisma.user.count({ 
          where: { 
            ...nonAdminFilter,
            status: 'PENDING' 
          } 
        }),
        prisma.user.count({ 
          where: { 
            ...nonAdminFilter,
            status: 'REJECTED' 
          } 
        }),
        prisma.user.count({ 
          where: { 
            ...nonAdminFilter,
            last_login: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          } 
        })
      ]);

      return {
        total_members: totalMembers,
        members_with_credentials: membersWithCredentials,
        members_form_submitted: membersFormSubmitted,
        members_approved: membersApproved,
        members_pending: membersPending,
        members_rejected: membersRejected,
        members_connected_recently: membersConnectedRecently,
        percentage_with_credentials: totalMembers > 0 ? Math.round((membersWithCredentials / totalMembers) * 100) : 0,
        percentage_form_submitted: totalMembers > 0 ? Math.round((membersFormSubmitted / totalMembers) * 100) : 0
      };

    } catch (error) {
      logger.error('Error getting admin statistics', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get all membership forms for review
   */
  async getMembershipForms(req, res) {
    try {
      const { page = 1, limit = 10, status = 'PENDING', search = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build search conditions
      const searchConditions = search ? {
        user: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { username: { contains: search, mode: 'insensitive' } }
          ]
        }
      } : {};

      // Get membership forms
      const forms = await prisma.membershipForm.findMany({
        where: {
          AND: [
            { user: { status: status } },
            searchConditions
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              username: true,
              status: true,
              membership_number: true,
              form_code: true,
              has_paid: true,
              consular_card_number: true,
              birth_date: true,
              address: true,
              profession: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: parseInt(limit)
      });

      // Count total for pagination
      const totalForms = await prisma.membershipForm.count({
        where: {
          AND: [
            { user: { status: status } },
            searchConditions
          ]
        }
      });

      res.json({
        message: 'Membership forms retrieved successfully',
        data: {
          forms,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalForms,
            total_pages: Math.ceil(totalForms / parseInt(limit))
          }
        }
      });

    } catch (error) {
      const context = {
        operation: 'get_membership_forms',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Approve a membership form
   */
  async approveMembershipForm(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.user.id;

      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          has_submitted_form: true
        }
      });

      if (!user) {
        const context = {
          operation: 'approve_membership_form',
          user_id: adminId,
          target_user_id: userId
        };
        return ErrorHandler.notFound(res, 'User', context);
      }

      if (user.status !== 'PENDING') {
        const businessError = ErrorHandler.createBusinessError(
          'Only pending forms can be approved',
          'INVALID_STATUS',
          400,
          ['Form must be in PENDING status to be approved']
        );
        const context = {
          operation: 'approve_membership_form',
          user_id: adminId,
          target_user_id: userId
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Generate membership number and form code
      const membershipNumber = await this.generateMembershipNumber();
      const formCode = await this.generateFormCode();

      // Update user status
      await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'APPROVED',
          membership_number: membershipNumber,
          form_code: formCode,
          card_issued_at: new Date()
        }
      });

      // Send approval email if user has email
      if (user.email) {
        await emailService.sendApprovalNotification(user, formCode);
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          user_id: adminId,
          action: 'APPROVE_MEMBERSHIP_FORM',
          details: {
            approved_user_id: userId,
            approved_user_name: user.name,
            membership_number: membershipNumber,
            form_code: formCode
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info('Membership form approved successfully', {
        admin_id: adminId,
        approved_user_id: userId,
        membership_number: membershipNumber,
        form_code: formCode
      });

      res.json({
        message: 'Form approved successfully',
        data: {
          membership_number: membershipNumber,
          form_code: formCode,
          email_sent: !!user.email
        }
      });

    } catch (error) {
      const context = {
        operation: 'approve_membership_form',
        user_id: req.user?.id,
        target_user_id: req.params.userId
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Reject a membership form
   */
  async rejectMembershipForm(req, res) {
    try {
      const { userId } = req.params;
      const { rejection_reason } = req.body;
      const adminId = req.user.id;

      if (!rejection_reason) {
        const validationError = ErrorHandler.createBusinessError(
          'Rejection reason is required',
          'REJECTION_REASON_REQUIRED',
          400,
          ['Please provide a reason for rejecting this form']
        );
        const context = {
          operation: 'reject_membership_form',
          user_id: adminId,
          target_user_id: userId
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          status: true
        }
      });

      if (!user) {
        const context = {
          operation: 'reject_membership_form',
          user_id: adminId,
          target_user_id: userId
        };
        return ErrorHandler.notFound(res, 'User', context);
      }

      if (user.status !== 'PENDING') {
        const businessError = ErrorHandler.createBusinessError(
          'Only pending forms can be rejected',
          'INVALID_STATUS',
          400,
          ['Form must be in PENDING status to be rejected']
        );
        const context = {
          operation: 'reject_membership_form',
          user_id: adminId,
          target_user_id: userId
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Update user status
      await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'REJECTED',
          rejection_reason: rejection_reason,
          rejected_at: new Date(),
          rejected_by: adminId
        }
      });

      // Send rejection email if user has email
      if (user.email) {
        await emailService.sendRejectionNotification(user, rejection_reason);
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          user_id: adminId,
          action: 'REJECT_MEMBERSHIP_FORM',
          details: {
            rejected_user_id: userId,
            rejected_user_name: user.name,
            rejection_reason: rejection_reason
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info('Membership form rejected successfully', {
        admin_id: adminId,
        rejected_user_id: userId,
        rejection_reason: rejection_reason
      });

      res.json({
        message: 'Form rejected successfully',
        data: {
          rejection_reason: rejection_reason,
          email_sent: !!user.email
        }
      });

    } catch (error) {
      const context = {
        operation: 'reject_membership_form',
        user_id: req.user?.id,
        target_user_id: req.params.userId
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Generate unique membership number
   */
  async generateMembershipNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.user.count({
      where: {
        membership_number: { not: null },
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      }
    });
    
    const sequence = (count + 1).toString().padStart(3, '0');
    return `SGM-${year}-${sequence}`;
  }

  /**
   * Generate unique form code
   */
  async generateFormCode() {
    const year = new Date().getFullYear();
    const count = await prisma.user.count({
      where: {
        form_code: { not: null },
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      }
    });
    
    const sequence = (count + 1).toString().padStart(3, '0');
    return `N°${sequence}/AGCO/M/${year}`;
  }
}

module.exports = new AdminController();