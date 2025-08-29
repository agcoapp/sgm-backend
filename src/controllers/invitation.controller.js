const prisma = require('../config/database');
const logger = require('../config/logger');
const crypto = require('crypto');

/**
 * Create a new invitation
 */
const createInvitation = async (req, res) => {
  try {
    const { email, role } = req.validatedData;
    const inviterId = req.user.id;

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        type: 'validation_error',
        message: 'Un utilisateur avec cet email existe déjà',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await prisma.invitation.findUnique({
      where: { email }
    });

    if (existingInvitation && existingInvitation.status === 'pending') {
      return res.status(400).json({
        type: 'validation_error',
        message: 'Une invitation est déjà en attente pour cet email',
        code: 'INVITATION_PENDING'
      });
    }

    // Delete any expired invitations for this email
    if (existingInvitation) {
      await prisma.invitation.delete({
        where: { email }
      });
    }

    // Create new invitation that expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        invitedBy: inviterId,
        expiresAt,
        status: 'pending'
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Log the invitation creation
    await prisma.journalAudit.create({
      data: {
        id_utilisateur: inviterId,
        action: 'INVITATION_CREATED',
        details: {
          invited_email: email,
          invited_role: role,
          invitation_id: invitation.id
        },
        adresse_ip: req.ip,
        agent_utilisateur: req.get('User-Agent')
      }
    });

    logger.info('Invitation créée avec succès', {
      invitation_id: invitation.id,
      invited_email: email,
      invited_role: role,
      inviter_id: inviterId
    });

    res.status(201).json({
      type: 'success',
      message: 'Invitation créée avec succès',
      data: {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
          inviter: invitation.inviter
        }
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la création de l\'invitation', {
      error: error.message,
      stack: error.stack,
      user_id: req.user?.id
    });

    res.status(500).json({
      type: 'server_error',
      message: 'Erreur lors de la création de l\'invitation',
      code: 'INVITATION_CREATE_ERROR'
    });
  }
};

/**
 * Get all invitations
 */
const getInvitations = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) {
      where.status = status;
    }

    const [invitations, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        include: {
          inviter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: parseInt(limit),
        skip: offset
      }),
      prisma.invitation.count({ where })
    ]);

    res.json({
      type: 'success',
      message: 'Invitations récupérées avec succès',
      data: {
        invitations,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des invitations', {
      error: error.message,
      stack: error.stack,
      user_id: req.user?.id
    });

    res.status(500).json({
      type: 'server_error',
      message: 'Erreur lors de la récupération des invitations',
      code: 'INVITATIONS_FETCH_ERROR'
    });
  }
};

/**
 * Delete an invitation
 */
const deleteInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if invitation exists
    const invitation = await prisma.invitation.findUnique({
      where: { id }
    });

    if (!invitation) {
      return res.status(404).json({
        type: 'not_found_error',
        message: 'Invitation non trouvée',
        code: 'INVITATION_NOT_FOUND'
      });
    }

    // Delete the invitation
    await prisma.invitation.delete({
      where: { id }
    });

    // Log the invitation deletion
    await prisma.journalAudit.create({
      data: {
        id_utilisateur: userId,
        action: 'INVITATION_DELETED',
        details: {
          deleted_invitation_id: id,
          invited_email: invitation.email,
          invited_role: invitation.role
        },
        adresse_ip: req.ip,
        agent_utilisateur: req.get('User-Agent')
      }
    });

    logger.info('Invitation supprimée avec succès', {
      invitation_id: id,
      deleted_by: userId
    });

    res.json({
      type: 'success',
      message: 'Invitation supprimée avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'invitation', {
      error: error.message,
      stack: error.stack,
      user_id: req.user?.id,
      invitation_id: req.params.id
    });

    res.status(500).json({
      type: 'server_error',
      message: 'Erreur lors de la suppression de l\'invitation',
      code: 'INVITATION_DELETE_ERROR'
    });
  }
};

module.exports = {
  createInvitation,
  getInvitations,
  deleteInvitation
};