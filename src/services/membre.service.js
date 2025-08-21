const prisma = require('../config/database');

class MembreService {
  async getPresidentSignature() {
    const signature = await prisma.signature.findFirst({
      where: {
        est_active: true,
        utilisateur: {
          role: 'PRESIDENT',
        },
      },
      include: {
        utilisateur: {
          select: {
            prenoms: true,
            nom: true,
          },
        },
      },
    });

    return signature;
  }
}

module.exports = new MembreService();