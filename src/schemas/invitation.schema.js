const { z } = require('zod');

const invitationSchema = z.object({
  email: z.string().email('Email invalide'),
  role: z.enum(['MEMBER', 'ADMIN'], {
    errorMap: () => ({ message: 'Le rôle doit être MEMBER ou ADMIN' })
  })
});

const validateInvitation = (req, res, next) => {
  try {
    const validatedData = invitationSchema.parse(req.body);
    req.validatedData = validatedData;
    next();
  } catch (error) {
    return res.status(400).json({
      type: 'validation_error',
      message: 'Données d\'invitation invalides',
      code: 'INVALID_INVITATION_DATA',
      errors: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    });
  }
};

module.exports = {
  invitationSchema,
  validateInvitation
};