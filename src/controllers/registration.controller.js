const { getAuth, getUser } = require('../config/clerk');
const prisma = require('../config/database');
const logger = require('../config/logger');
const cloudinaryService = require('../services/cloudinary.service');
const pdfGeneratorService = require('../services/pdf-generator.service');
const { registerSchema, validateFiles } = require('../schemas/user.schema');

class RegistrationController {
  /**
   * Complete member registration with documents
   */
  async register(req, res) {
    try {
      const auth = getAuth(req);
      
      if (!auth?.userId) {
        return res.status(401).json({
          error: 'Non authentifié',
          code: 'UNAUTHORIZED'
        });
      }

      // Check if user exists in our database
      const existingUser = await prisma.user.findUnique({
        where: { clerkId: auth.userId }
      });

      if (!existingUser) {
        return res.status(404).json({
          error: 'Utilisateur non trouvé. Veuillez d\'abord compléter l\'inscription.',
          code: 'USER_NOT_FOUND',
          action_required: 'Call POST /api/auth/signup first'
        });
      }

      // Check if registration is already complete
      if (existingUser.id_number && existingUser.id_front_photo_url) {
        return res.status(409).json({
          error: 'Inscription déjà complétée',
          code: 'REGISTRATION_COMPLETE',
          user: {
            id: existingUser.id,
            status: existingUser.status,
            form_code: existingUser.form_code
          }
        });
      }

      // Validate form data
      const validatedData = registerSchema.parse(req.body);

      // Validate uploaded files
      const fileValidation = validateFiles(req.files);
      if (!fileValidation.valid) {
        return res.status(400).json({
          error: 'Fichiers invalides',
          code: 'INVALID_FILES',
          details: fileValidation.errors
        });
      }

      // Check for duplicate email and ID number (excluding current user)
      const duplicateCheck = await prisma.user.findFirst({
        where: {
          AND: [
            {
              OR: [
                { email: validatedData.email },
                { id_number: validatedData.id_number }
              ]
            },
            {
              id: { not: existingUser.id }
            }
          ]
        }
      });

      if (duplicateCheck) {
        const duplicateField = duplicateCheck.email === validatedData.email ? 'email' : 'id_number';
        return res.status(409).json({
          error: `Un membre avec ce ${duplicateField === 'email' ? 'email' : 'numéro d\'identification'} existe déjà`,
          code: 'DUPLICATE_MEMBER',
          field: duplicateField
        });
      }

      // Upload photos to Cloudinary
      logger.info(`Uploading photos for user ${existingUser.id}`);
      const photoUrls = await cloudinaryService.uploadIdPhotos(
        req.files.id_front_photo.buffer,
        req.files.id_back_photo.buffer,
        req.files.selfie_photo.buffer,
        existingUser.id
      );

      // Update user with registration data
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: validatedData.name,
          id_number: validatedData.id_number,
          email: validatedData.email,
          phone: validatedData.phone || existingUser.phone,
          address: validatedData.address || existingUser.address,
          dob: validatedData.dob ? new Date(validatedData.dob) : existingUser.dob,
          id_type: validatedData.id_type,
          id_front_photo_url: photoUrls.id_front_photo_url,
          id_back_photo_url: photoUrls.id_back_photo_url,
          selfie_photo_url: photoUrls.selfie_photo_url,
          status: 'PENDING' // Reset to pending for admin review
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          user_id: updatedUser.id,
          action: 'COMPLETE_REGISTRATION',
          details: {
            email: validatedData.email,
            id_number: validatedData.id_number,
            id_type: validatedData.id_type,
            photos_uploaded: true
          },
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info(`Registration completed for user ${updatedUser.id} (${validatedData.email})`);

      // Generate PDF
      logger.info(`Generating adhesion PDF for user ${updatedUser.id}`);
      const pdfBuffer = await pdfGeneratorService.genererFicheAdhesion(
        updatedUser,
        photoUrls.selfie_photo_url
      );

      // Send PDF as response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="fiche-adhesion-${updatedUser.name.replace(/\s/g, '_')}.pdf"`
      );
      res.send(pdfBuffer);

    } catch (error) {
      if (error.name === 'ZodError') {
        logger.warn('Registration validation error:', error.errors);
        return res.status(400).json({
          error: 'Données invalides',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }

      logger.error('Registration error:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'inscription',
        code: 'REGISTRATION_ERROR',
        message: 'Une erreur est survenue lors du traitement de votre inscription'
      });
    }
  }


  /**
   * Get current user registration status
   */
  async getRegistrationStatus(req, res) {
    try {
      const auth = getAuth(req);
      
      if (!auth?.userId) {
        return res.status(401).json({
          error: 'Non authentifié',
          code: 'UNAUTHORIZED'
        });
      }

      const user = await prisma.user.findUnique({
        where: { clerkId: auth.userId },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          id_number: true,
          phone: true,
          address: true,
          dob: true,
          id_type: true,
          form_code: true,
          qr_code_url: true,
          card_issued_at: true,
          created_at: true,
          updated_at: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND',
          needs_signup: true
        });
      }

      const isRegistrationComplete = !!(user.id_number && user.email);
      
      res.json({
        message: 'Statut d\'inscription récupéré',
        user: user,
        registration_complete: isRegistrationComplete,
        can_download_card: user.status === 'APPROVED' && user.qr_code_url,
        next_actions: this.getNextActions(user, isRegistrationComplete)
      });

    } catch (error) {
      logger.error('Get registration status error:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération du statut',
        code: 'STATUS_ERROR'
      });
    }
  }

  /**
   * Helper method to determine next actions for user
   */
  getNextActions(user, isRegistrationComplete) {
    if (!isRegistrationComplete) {
      return ['Compléter l\'inscription avec vos documents'];
    }

    switch (user.status) {
      case 'PENDING':
        return ['Attendre l\'examen de votre dossier par les administrateurs'];
      case 'APPROVED':
        const actions = ['Télécharger votre carte de membre'];
        if (!user.qr_code_url) {
          actions.push('Votre code QR sera généré prochainement');
        }
        return actions;
      case 'REJECTED':
        return ['Contacter les administrateurs pour plus d\'informations'];
      default:
        return [];
    }
  }
}

module.exports = new RegistrationController();