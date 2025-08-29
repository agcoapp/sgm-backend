const prisma = require('../config/database');
const logger = require('../config/logger');

class SetupController {
  /**
   * Promote user to ADMIN role (one-time setup helper)
   */
  async promoteToAdmin(req, res) {
    try {
      const { email, secret } = req.body;

      // Simple security check
      if (secret !== 'SGM-SETUP-2024') {
        return res.status(403).json({
          message: 'Invalid setup secret'
        });
      }

      if (!email) {
        return res.status(400).json({
          message: 'Email is required'
        });
      }

      // Find the user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });

      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      // Update to ADMIN role
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          role: 'ADMIN',
          membership_number: 'SYS-ADMIN-001',
          status: 'APPROVED',
          is_active: true,
          has_paid: true,
          has_submitted_form: true
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          membership_number: true
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          user_id: updatedUser.id,
          action: 'PROMOTE_TO_ADMIN',
          details: {
            message: 'User promoted to ADMIN role during setup',
            promoted_by: 'setup_controller'
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info('User promoted to ADMIN', {
        user_id: updatedUser.id,
        email: updatedUser.email
      });

      res.json({
        message: 'User successfully promoted to ADMIN',
        user: updatedUser
      });

    } catch (error) {
      logger.error('Error promoting user to admin', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        message: 'Error promoting user to admin',
        error: error.message
      });
    }
  }

  /**
   * Clean database helper (removes all users)
   */
  async cleanDatabase(req, res) {
    try {
      const { secret, confirm } = req.body;

      if (secret !== 'SGM-SETUP-2024' || confirm !== 'DELETE_ALL_USERS') {
        return res.status(403).json({
          message: 'Invalid setup secret or confirmation'
        });
      }

      // Delete in correct order (foreign key constraints)
      await prisma.auditLog.deleteMany({});
      await prisma.invitation.deleteMany({});
      await prisma.account.deleteMany({});
      await prisma.session.deleteMany({});
      await prisma.membershipForm.deleteMany({});
      await prisma.recoveryToken.deleteMany({});
      await prisma.signature.deleteMany({});
      await prisma.officialDocument.deleteMany({});
      await prisma.user.deleteMany({});

      logger.warn('Database cleaned - all users deleted', {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      res.json({
        message: 'Database cleaned successfully',
        deleted: ['users', 'accounts', 'sessions', 'audit_logs', 'invitations']
      });

    } catch (error) {
      logger.error('Error cleaning database', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        message: 'Error cleaning database',
        error: error.message
      });
    }
  }

  /**
   * View database status
   */
  async getDatabaseStatus(req, res) {
    try {
      const [
        userCount,
        adminCount,
        accountCount,
        sessionCount,
        invitationCount
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.account.count(),
        prisma.session.count(),
        prisma.invitation.count()
      ]);

      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        counts: {
          users: userCount,
          admins: adminCount,
          accounts: accountCount,
          sessions: sessionCount,
          invitations: invitationCount
        },
        users
      });

    } catch (error) {
      res.status(500).json({
        message: 'Error getting database status',
        error: error.message
      });
    }
  }
}

module.exports = new SetupController();