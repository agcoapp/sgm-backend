const prisma = require('../config/database');
const logger = require('../config/logger');

const formatterDateFrancaise = (date) => {
  if (!date) return null;
  const dateObj = new Date(date);
  const jour = String(dateObj.getDate()).padStart(2, '0');
  const mois = String(dateObj.getMonth() + 1).padStart(2, '0');
  const annee = dateObj.getFullYear();
  return `${jour}-${mois}-${annee}`;
};

class MembreController {

  /**
   * Voir le formulaire d'adhésion
   */
  async voirFormulaireAdhesion(req, res, next) {
    try {
      const utilisateurId = req.utilisateur.id;

      // Récupérer l'utilisateur avec ses informations complètes
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateur) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      // Vérifier si le formulaire a été soumis
      if (!utilisateur.a_soumis_formulaire) {
        const error = new Error('Aucun formulaire d\'adhésion trouvé. Veuillez soumettre votre formulaire d\'abord.');
        error.status = 404;
        throw error;
      }

      const formulaire = {
        numero_adhesion: utilisateur.numero_adhesion,
        nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
        statut: utilisateur.statut,
        code_formulaire: utilisateur.code_formulaire,
        signature_membre_url: utilisateur.signature_membre_url,
        date_soumission: utilisateur.cree_le ? formatterDateFrancaise(utilisateur.cree_le) : null,
        derniere_modification: utilisateur.modifie_le,
        informations_personnelles: {
          prenoms: utilisateur.prenoms,
          nom: utilisateur.nom,
          telephone: utilisateur.telephone,
          email: utilisateur.email,
          date_naissance: utilisateur.date_naissance ? formatterDateFrancaise(utilisateur.date_naissance) : null,
          lieu_naissance: utilisateur.lieu_naissance,
          adresse: utilisateur.adresse,
          profession: utilisateur.profession,
          ville_residence: utilisateur.ville_residence,
          date_entree_congo: utilisateur.date_entree_congo ? formatterDateFrancaise(utilisateur.date_entree_congo) : null,
          employeur_ecole: utilisateur.employeur_ecole,
          type_piece_identite: utilisateur.type_piece_identite,
          numero_piece_identite: utilisateur.numero_piece_identite,
          date_emission_piece: utilisateur.date_emission_piece ? formatterDateFrancaise(utilisateur.date_emission_piece) : null,
          prenom_conjoint: utilisateur.prenom_conjoint,
          nom_conjoint: utilisateur.nom_conjoint,
          nombre_enfants: utilisateur.nombre_enfants,
          photo_profil_url: utilisateur.photo_profil_url
        }
      };

      res.json({
        formulaire
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Voir la carte de membre
   */
  async voirCarteMembre(req, res, next) {
    try {
      const utilisateurId = req.utilisateur.id;

      // Récupérer l'utilisateur
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateur) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      // Vérifier que le membre est approuvé
      if (utilisateur.statut !== 'APPROUVE') {
        const error = new Error('Carte de membre non disponible. Votre demande d\'adhésion n\'est pas encore approuvée.');
        error.status = 404;
        throw error;
      }

      // Récupérer la signature du président active
      const signaturePresident = await prisma.signature.findFirst({
        where: { est_active: true },
        include: {
          utilisateur: {
            select: {
              prenoms: true,
              nom: true
            }
          }
        }
      });

      const carte = {
        numero_adhesion: utilisateur.numero_adhesion,
        nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
        photo_profil_url: utilisateur.photo_profil_url,
        code_formulaire: utilisateur.code_formulaire,
        url_qr_code: utilisateur.url_qr_code,
        date_emission: utilisateur.carte_emise_le ? formatterDateFrancaise(utilisateur.carte_emise_le) : null,
        signature_presidente_url: signaturePresident?.url_signature || null,
        nom_presidente: signaturePresident ? `${signaturePresident.utilisateur.prenoms} ${signaturePresident.utilisateur.nom}` : null
      };

      res.json({
        carte
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Télécharger le formulaire d'adhésion en PDF
   */
  async telechargerFormulaire(req, res, next) {
    try {
      const utilisateurId = req.utilisateur.id;

      // Récupérer l'utilisateur
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateur) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      if (!utilisateur.a_soumis_formulaire) {
        const error = new Error('Aucun formulaire d\'adhésion trouvé');
        error.status = 404;
        throw error;
      }

      // TODO: Implémenter la génération PDF du formulaire
      // Pour l'instant, on retourne un message
      res.json({
        message: 'Génération PDF du formulaire - À implémenter',
        utilisateur: {
          nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
          numero_adhesion: utilisateur.numero_adhesion
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Annuaire des membres - Accessible aux membres approuvés seulement
   */
  async obtenirAnnuaireMembres(req, res, next) {
    try {
      const utilisateurId = req.utilisateur.id;

      // Vérifier que l'utilisateur connecté est approuvé pour accéder à l'annuaire
      const utilisateurConnecte = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId },
        select: { 
          id: true, 
          statut: true, 
          role: true,
          nom_utilisateur: true,
          a_soumis_formulaire: true 
        }
      });

      if (!utilisateurConnecte) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      // Vérifier que l'utilisateur est approuvé ET a soumis son formulaire
      if (utilisateurConnecte.statut !== 'APPROUVE' || !utilisateurConnecte.a_soumis_formulaire) {
        const error = new Error('Accès restreint. Seuls les membres avec une adhésion validée peuvent consulter l\'annuaire des membres.');
        error.status = 403;
        throw error;
      }

      const { page = 1, limite = 50, recherche = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limite);
      
      // Limiter la pagination pour éviter les abus
      const limiteMax = Math.min(parseInt(limite), 100);

      // Construire les conditions de recherche (optionnelle)
      const conditionsRecherche = recherche ? {
        OR: [
          { prenoms: { contains: recherche, mode: 'insensitive' } },
          { nom: { contains: recherche, mode: 'insensitive' } },
          { telephone: { contains: recherche } },
          { email: { contains: recherche, mode: 'insensitive' } },
          { numero_adhesion: { contains: recherche, mode: 'insensitive' } },
          { adresse: { contains: recherche, mode: 'insensitive' } }
        ]
      } : {};

      // Récupérer tous les membres approuvés (données publiques seulement)
      const [membres, total] = await Promise.all([
        prisma.utilisateur.findMany({
          where: {
            AND: [
              { statut: 'APPROUVE' }, // Seulement les membres approuvés
              { est_actif: true }, // Seulement les comptes actifs
              { role: 'MEMBRE' }, // Exclure les admins de l'annuaire public
              conditionsRecherche
            ]
          },
          select: {
            // DONNÉES PUBLIQUES SEULEMENT - Pas de données sensibles
            id: true,
            numero_adhesion: true,
            prenoms: true,
            nom: true,
            adresse: true,
            telephone: true,
            email: true,
            statut: true,
            ville_residence: true, // Peut être utile pour contact
            profession: true // Information publique utile
            // PAS d'accès aux mots de passe, dates naissance, etc.
          },
          orderBy: [
            { nom: 'asc' },
            { prenoms: 'asc' }
          ],
          skip: offset,
          take: limiteMax
        }),
        prisma.utilisateur.count({
          where: {
            AND: [
              { statut: 'APPROUVE' },
              { est_actif: true },
              { role: 'MEMBRE' },
              conditionsRecherche
            ]
          }
        })
      ]);

      // Journal d'audit pour tracer l'accès à l'annuaire
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateurId,
          action: 'CONSULTATION_ANNUAIRE_MEMBRES',
          details: {
            nom_utilisateur: utilisateurConnecte.nom_utilisateur,
            recherche_effectuee: !!recherche,
            termes_recherche: recherche || null,
            nombre_resultats: membres.length
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Consultation annuaire membres par ${utilisateurConnecte.nom_utilisateur}`, {
        utilisateur_id: utilisateurId,
        nombre_resultats: membres.length,
        recherche: recherche || 'aucune'
      });

      res.json({
        message: 'Annuaire des membres récupéré',
        donnees: {
          membres: membres.map(membre => ({
            id: membre.id,
            numero_adhesion: membre.numero_adhesion,
            nom_complet: `${membre.prenoms} ${membre.nom}`,
            prenoms: membre.prenoms,
            nom: membre.nom,
            adresse: membre.adresse || 'Non renseignée',
            telephone: membre.telephone,
            email: membre.email || 'Non renseigné',
            ville_residence: membre.ville_residence || 'Non renseignée',
            profession: membre.profession || 'Non renseignée',
            statut: membre.statut
          })),
          pagination: {
            page: parseInt(page),
            limite: limiteMax,
            total,
            pages_total: Math.ceil(total / limiteMax)
          },
          information: `${total} membre${total > 1 ? 's' : ''} approuvé${total > 1 ? 's' : ''} dans l'association`
        }
      });

    } catch (error) {
      if (error.status) {
        return next(error);
      }
      
      logger.error('Erreur consultation annuaire membres:', {
        utilisateur_id: req.utilisateur?.id,
        error: error.message,
        stack: error.stack
      });
      
      const serverError = new Error('Erreur lors de la récupération de l\'annuaire des membres');
      serverError.status = 500;
      next(serverError);
    }
  }

  /**
   * Télécharger la carte de membre en PDF
   */
  async telechargerCarte(req, res, next) {
    try {
      const utilisateurId = req.utilisateur.id;

      // Récupérer l'utilisateur
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateur) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      if (utilisateur.statut !== 'APPROUVE') {
        const error = new Error('Carte de membre non disponible');
        error.status = 404;
        throw error;
      }

      // TODO: Implémenter la génération PDF de la carte
      // Pour l'instant, on retourne un message
      res.json({
        message: 'Génération PDF de la carte - À implémenter',
        utilisateur: {
          nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
          numero_adhesion: utilisateur.numero_adhesion,
          code_formulaire: utilisateur.code_formulaire
        }
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MembreController();