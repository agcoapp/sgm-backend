const prisma = require('../config/database');

class MembreService {
  async getPresidentSignature() {
    // First, check if any signatures exist at all
    const allSignatures = await prisma.signature.findMany({
      select: {
        id: true,
        est_active: true,
        id_president: true,
        utilisateur: {
          select: {
            id: true,
            role: true,
            prenoms: true,
            nom: true
          }
        }
      }
    });

    // Check for active signature with president role
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

    // If no signature found, provide detailed debugging info
    if (!signature) {
      const debugInfo = {
        total_signatures: allSignatures.length,
        active_signatures: allSignatures.filter(s => s.est_active).length,
        president_users: await prisma.utilisateur.count({
          where: { role: 'PRESIDENT' }
        }),
        signatures_by_role: allSignatures.map(s => ({
          id: s.id,
          active: s.est_active,
          user_role: s.utilisateur?.role,
          user_name: s.utilisateur ? `${s.utilisateur.prenoms} ${s.utilisateur.nom}` : 'Unknown'
        }))
      };
      
      const error = new Error('No active president signature found in database');
      error.code = 'PRESIDENT_SIGNATURE_NOT_FOUND';
      error.debugInfo = debugInfo;
      throw error;
    }

    return signature;
  }
}

module.exports = new MembreService();