const prisma = require('../config/database');
const logger = require('../config/logger');
const ErrorHandler = require('../utils/errorHandler');
const { amendmentSchema, amendmentDecisionSchema } = require('../schemas/user.schema');

// Fonction utilitaire pour convertir DD-MM-YYYY en Date
function convertirDateFrancaise(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  
  const [jour, mois, annee] = parts.map(part => part.trim());
  if (!jour || !mois || !annee) return null;
  
  const jourNum = parseInt(jour, 10);
  const moisNum = parseInt(mois, 10);
  const anneeNum = parseInt(annee, 10);
  
  if (isNaN(jourNum) || isNaN(moisNum) || isNaN(anneeNum)) return null;
  if (jourNum < 1 || jourNum > 31 || moisNum < 1 || moisNum > 12) return null;
  
  return new Date(anneeNum, moisNum - 1, jourNum);
}

// Fonction pour générer un numéro de référence unique
async function genererNumeroReference() {
  const annee = new Date().getFullYear();
  const dernierAmendment = await prisma.amendmentProfil.findFirst({
    where: {
      numero_reference: {
        startsWith: `AMD-${annee}-`
      }
    },
    orderBy: {
      numero_reference: 'desc'
    }
  });

  let numeroSequentiel = 1;
  if (dernierAmendment) {
    const match = dernierAmendment.numero_reference.match(/AMD-\d{4}-(\d+)$/);
    if (match) {
      numeroSequentiel = parseInt(match[1], 10) + 1;
    }
  }

  return `AMD-${annee}-${numeroSequentiel.toString().padStart(3, '0')}`;
}

// Fonction pour déterminer quels champs ont changé
function determinerChampsModifies(donneesAvant, donneesNouvelles) {
  const champsModifies = [];
  
  for (const [champ, nouvelleValeur] of Object.entries(donneesNouvelles)) {
    if (nouvelleValeur !== undefined && nouvelleValeur !== '') {
      const ancienneValeur = donneesAvant[champ];
      if (ancienneValeur !== nouvelleValeur) {
        champsModifies.push(champ);
      }
    }
  }
  
  return champsModifies;
}

class AmendmentController {
  /**
   * Soumettre une demande d'amendement de profil (MEMBRE approuvé uniquement)
   */
  async soumettreAmendement(req, res) {
    try {
      const idMembre = req.user.id;
      const roleMembre = req.user.role;

      // Vérifier que l'utilisateur est un membre approuvé
      if (roleMembre !== 'MEMBRE') {
        const authError = new Error('Seuls les membres peuvent soumettre des amendements');
        authError.code = 'NON_AUTORISE';
        authError.status = 403;
        const context = {
          operation: 'amendment_submission_authorization',
          user_id: idMembre
        };
        return ErrorHandler.formatAuthorizationError(authError, res, context);
      }

      // Valider les données avec le schéma
      const donneesValidees = amendmentSchema.parse(req.body);

      // Récupérer le membre et vérifier son statut
      const membre = await prisma.utilisateur.findUnique({
        where: { id: idMembre },
        select: {
          id: true,
          prenoms: true,
          nom: true,
          statut: true,
          telephone: true,
          email: true,
          adresse: true,
          profession: true,
          ville_residence: true,
          employeur_ecole: true,
          numero_carte_consulaire: true,
          date_emission_piece: true,
          prenom_conjoint: true,
          nom_conjoint: true,
          nombre_enfants: true,
          selfie_photo_url: true,
          signature_url: true
        }
      });

      if (!membre) {
        const context = { operation: 'member_lookup', user_id: idMembre };
        return ErrorHandler.notFound(res, 'Membre', context);
      }

      if (membre.statut !== 'APPROUVE') {
        const businessError = ErrorHandler.createBusinessError(
          'Seuls les membres approuvés peuvent soumettre des amendements',
          'MEMBRE_NON_APPROUVE',
          403,
          ['Votre adhésion doit être approuvée pour modifier vos informations']
        );
        const context = { operation: 'amendment_status_check', user_id: idMembre };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Vérifier s'il y a déjà un amendement en cours
      const amendementEnCours = await prisma.amendmentProfil.findFirst({
        where: {
          id_membre: idMembre,
          statut: 'EN_ATTENTE'
        }
      });

      if (amendementEnCours) {
        const businessError = ErrorHandler.createBusinessError(
          'Vous avez déjà un amendement en cours de traitement',
          'AMENDEMENT_EN_COURS',
          409,
          [
            'Attendez le traitement de votre amendement actuel',
            'Référence: ' + amendementEnCours.numero_reference
          ]
        );
        const context = { operation: 'amendment_conflict_check', user_id: idMembre };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Créer le snapshot des données actuelles
      const donneesAvant = {
        prenoms: membre.prenoms,
        nom: membre.nom,
        telephone: membre.telephone,
        email: membre.email,
        adresse: membre.adresse,
        profession: membre.profession,
        ville_residence: membre.ville_residence,
        employeur_ecole: membre.employeur_ecole,
        numero_carte_consulaire: membre.numero_carte_consulaire,
        date_emission_piece: membre.date_emission_piece?.toISOString().split('T')[0],
        prenom_conjoint: membre.prenom_conjoint,
        nom_conjoint: membre.nom_conjoint,
        nombre_enfants: membre.nombre_enfants,
        selfie_photo_url: membre.selfie_photo_url,
        signature_url: membre.signature_url
      };

      // Déterminer les champs modifiés
      const champsModifies = determinerChampsModifies(donneesAvant, donneesValidees.donnees_demandees);

      if (champsModifies.length === 0) {
        const businessError = ErrorHandler.createBusinessError(
          'Aucune modification détectée',
          'AUCUNE_MODIFICATION',
          400,
          ['Vous devez modifier au moins un champ pour soumettre un amendement']
        );
        const context = { operation: 'amendment_changes_validation', user_id: idMembre };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Générer le numéro de référence
      const numeroReference = await genererNumeroReference();

      // Créer l'amendement
      const amendment = await prisma.amendmentProfil.create({
        data: {
          id_membre: idMembre,
          numero_reference: numeroReference,
          type_amendment: donneesValidees.type_amendment,
          donnees_avant: donneesAvant,
          donnees_demandees: donneesValidees.donnees_demandees,
          champs_modifies: champsModifies,
          raison_modification: donneesValidees.raison_modification,
          documents_justificatifs: donneesValidees.documents_justificatifs || [],
          commentaire_membre: donneesValidees.commentaire_membre
        }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: idMembre,
          action: 'SOUMISSION_AMENDEMENT_PROFIL',
          details: {
            numero_reference: numeroReference,
            type_amendment: donneesValidees.type_amendment,
            champs_modifies: champsModifies,
            raison: donneesValidees.raison_modification
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Amendement soumis par ${membre.prenoms} ${membre.nom} (ID: ${idMembre}, Ref: ${numeroReference})`);

      res.status(201).json({
        message: 'Amendement de profil soumis avec succès',
        amendment: {
          id: amendment.id,
          numero_reference: numeroReference,
          type_amendment: donneesValidees.type_amendment,
          statut: 'EN_ATTENTE',
          champs_modifies: champsModifies,
          date_soumission: amendment.soumis_le,
          raison_modification: donneesValidees.raison_modification
        },
        prochaines_etapes: [
          '✅ Votre demande d\'amendement a été soumise avec succès',
          '📋 Référence: ' + numeroReference,
          '👩‍💼 Elle sera examinée par le secrétariat dans les plus brefs délais',
          '📧 Vous recevrez une notification dès qu\'une décision sera prise',
          '🔐 Votre statut de membre reste APPROUVÉ pendant l\'examen'
        ]
      });

    } catch (error) {
      logger.error('Erreur soumission amendement:', error);
      
      const context = {
        operation: 'amendment_submission',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Consulter le statut des amendements du membre connecté
   */
  async consulterMesAmendements(req, res) {
    try {
      const idMembre = req.user.id;
      const roleMembre = req.user.role;

      // Vérifier que l'utilisateur est un membre
      if (roleMembre !== 'MEMBRE') {
        const authError = new Error('Seuls les membres peuvent consulter leurs amendements');
        authError.code = 'NON_AUTORISE';
        authError.status = 403;
        const context = {
          operation: 'amendment_history_authorization',
          user_id: idMembre
        };
        return ErrorHandler.formatAuthorizationError(authError, res, context);
      }

      // Récupérer les amendements du membre (les 10 plus récents)
      const amendments = await prisma.amendmentProfil.findMany({
        where: {
          id_membre: idMembre
        },
        orderBy: {
          soumis_le: 'desc'
        },
        take: 10,
        select: {
          id: true,
          numero_reference: true,
          type_amendment: true,
          statut: true,
          champs_modifies: true,
          raison_modification: true,
          commentaire_membre: true,
          commentaire_secretaire: true,
          raison_rejet: true,
          soumis_le: true,
          traite_le: true,
          secretaire: {
            select: {
              prenoms: true,
              nom: true
            }
          }
        }
      });

      res.json({
        message: 'Historique des amendements récupéré',
        amendments: amendments.map(amendment => ({
          id: amendment.id,
          numero_reference: amendment.numero_reference,
          type_amendment: amendment.type_amendment,
          statut: amendment.statut,
          champs_modifies: amendment.champs_modifies,
          raison_modification: amendment.raison_modification,
          commentaire_membre: amendment.commentaire_membre,
          date_soumission: amendment.soumis_le,
          ...(amendment.statut !== 'EN_ATTENTE' && {
            traite_le: amendment.traite_le,
            traite_par: amendment.secretaire 
              ? `${amendment.secretaire.prenoms} ${amendment.secretaire.nom}`
              : null,
            commentaire_secretaire: amendment.commentaire_secretaire,
            ...(amendment.statut === 'REJETE' && {
              raison_rejet: amendment.raison_rejet
            })
          })
        })),
        statistiques: {
          total: amendments.length,
          en_attente: amendments.filter(a => a.statut === 'EN_ATTENTE').length,
          approuves: amendments.filter(a => a.statut === 'APPROUVE').length,
          rejetes: amendments.filter(a => a.statut === 'REJETE').length
        }
      });

    } catch (error) {
      logger.error('Erreur consultation amendements:', error);
      
      const context = {
        operation: 'amendment_history',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Lister tous les amendements en attente (SECRÉTAIRE uniquement)
   */
  async listerAmendementsPendants(req, res) {
    try {
      const roleUtilisateur = req.user.role;

      // Vérifier les permissions
      if (!['SECRETAIRE_GENERALE', 'PRESIDENT'].includes(roleUtilisateur)) {
        const authError = new Error('Seuls les secrétaires peuvent consulter les amendements en attente');
        authError.code = 'NON_AUTORISE';
        authError.status = 403;
        const context = {
          operation: 'amendment_list_authorization',
          user_id: req.user.id
        };
        return ErrorHandler.formatAuthorizationError(authError, res, context);
      }

      const amendments = await prisma.amendmentProfil.findMany({
        where: {
          statut: 'EN_ATTENTE'
        },
        orderBy: {
          soumis_le: 'asc' // Plus anciens en premier
        },
        include: {
          membre: {
            select: {
              id: true,
              prenoms: true,
              nom: true,
              numero_adhesion: true,
              telephone: true,
              email: true
            }
          }
        }
      });

      res.json({
        message: `${amendments.length} amendement(s) en attente de traitement`,
        amendments: amendments.map(amendment => ({
          id: amendment.id,
          numero_reference: amendment.numero_reference,
          type_amendment: amendment.type_amendment,
          membre: {
            id: amendment.membre.id,
            nom_complet: `${amendment.membre.prenoms} ${amendment.membre.nom}`,
            numero_adhesion: amendment.membre.numero_adhesion,
            telephone: amendment.membre.telephone,
            email: amendment.membre.email
          },
          champs_modifies: amendment.champs_modifies,
          raison_modification: amendment.raison_modification,
          commentaire_membre: amendment.commentaire_membre,
          documents_justificatifs: amendment.documents_justificatifs,
          date_soumission: amendment.soumis_le,
          donnees_avant: amendment.donnees_avant,
          donnees_demandees: amendment.donnees_demandees
        }))
      });

    } catch (error) {
      logger.error('Erreur liste amendements pendants:', error);
      
      const context = {
        operation: 'amendment_pending_list',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Approuver ou rejeter un amendement (SECRÉTAIRE uniquement)
   */
  async traiterAmendement(req, res) {
    try {
      const { id: amendmentId } = req.params;
      const idSecretaire = req.user.id;
      const roleSecretaire = req.user.role;

      // Vérifier les permissions
      if (!['SECRETAIRE_GENERALE', 'PRESIDENT'].includes(roleSecretaire)) {
        const authError = new Error('Seuls les secrétaires peuvent traiter les amendements');
        authError.code = 'NON_AUTORISE';
        authError.status = 403;
        const context = {
          operation: 'amendment_decision_authorization',
          user_id: idSecretaire
        };
        return ErrorHandler.formatAuthorizationError(authError, res, context);
      }

      // Valider les données de décision
      const donneesValidees = amendmentDecisionSchema.parse(req.body);

      // Récupérer l'amendement
      const amendment = await prisma.amendmentProfil.findUnique({
        where: { id: parseInt(amendmentId, 10) },
        include: {
          membre: {
            select: {
              id: true,
              prenoms: true,
              nom: true,
              statut: true
            }
          }
        }
      });

      if (!amendment) {
        const context = { operation: 'amendment_lookup', amendment_id: amendmentId };
        return ErrorHandler.notFound(res, 'Amendement', context);
      }

      if (amendment.statut !== 'EN_ATTENTE') {
        const businessError = ErrorHandler.createBusinessError(
          'Cet amendement a déjà été traité',
          'AMENDEMENT_DEJA_TRAITE',
          409,
          ['Statut actuel: ' + amendment.statut]
        );
        const context = { operation: 'amendment_status_check', amendment_id: amendmentId };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      const estApprouve = donneesValidees.decision === 'APPROUVE';
      const maintenant = new Date();

      if (estApprouve) {
        // Approuver l'amendement et mettre à jour le profil du membre
        await prisma.$transaction(async (tx) => {
          // Mettre à jour l'amendement
          await tx.amendmentProfil.update({
            where: { id: amendment.id },
            data: {
              statut: 'APPROUVE',
              traite_par: idSecretaire,
              traite_le: maintenant,
              commentaire_secretaire: donneesValidees.commentaire_secretaire
            }
          });

          // Préparer les données pour la mise à jour du membre
          const donneesAMettreAJour = {};
          for (const [champ, valeur] of Object.entries(amendment.donnees_demandees)) {
            if (valeur !== undefined && valeur !== '') {
              // Convertir les dates si nécessaire
              if (champ === 'date_emission_piece') {
                donneesAMettreAJour[champ] = convertirDateFrancaise(valeur);
              } else {
                donneesAMettreAJour[champ] = valeur;
              }
            }
          }

          // Mettre à jour le profil du membre
          if (Object.keys(donneesAMettreAJour).length > 0) {
            donneesAMettreAJour.modifie_le = maintenant;
            await tx.utilisateur.update({
              where: { id: amendment.id_membre },
              data: donneesAMettreAJour
            });
          }
        });

        logger.info(`Amendement ${amendment.numero_reference} approuvé par ${roleSecretaire} (ID: ${idSecretaire})`);
      } else {
        // Rejeter l'amendement
        await prisma.amendmentProfil.update({
          where: { id: amendment.id },
          data: {
            statut: 'REJETE',
            traite_par: idSecretaire,
            traite_le: maintenant,
            commentaire_secretaire: donneesValidees.commentaire_secretaire,
            raison_rejet: donneesValidees.raison_rejet
          }
        });

        logger.info(`Amendement ${amendment.numero_reference} rejeté par ${roleSecretaire} (ID: ${idSecretaire})`);
      }

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: idSecretaire,
          action: estApprouve ? 'APPROUVER_AMENDEMENT' : 'REJETER_AMENDEMENT',
          details: {
            amendment_id: amendment.id,
            numero_reference: amendment.numero_reference,
            id_membre: amendment.id_membre,
            type_amendment: amendment.type_amendment,
            champs_modifies: amendment.champs_modifies,
            ...(donneesValidees.commentaire_secretaire && {
              commentaire_secretaire: donneesValidees.commentaire_secretaire
            }),
            ...(donneesValidees.raison_rejet && {
              raison_rejet: donneesValidees.raison_rejet
            })
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      res.json({
        message: `Amendement ${estApprouve ? 'approuvé' : 'rejeté'} avec succès`,
        amendment: {
          id: amendment.id,
          numero_reference: amendment.numero_reference,
          nouveau_statut: estApprouve ? 'APPROUVE' : 'REJETE',
          membre: {
            nom_complet: `${amendment.membre.prenoms} ${amendment.membre.nom}`
          },
          traite_le: maintenant,
          commentaire_secretaire: donneesValidees.commentaire_secretaire,
          ...(donneesValidees.raison_rejet && {
            raison_rejet: donneesValidees.raison_rejet
          })
        },
        impact: estApprouve ? 
          'Les informations du membre ont été mises à jour' :
          'Aucune modification appliquée au profil du membre'
      });

    } catch (error) {
      logger.error('Erreur traitement amendement:', error);
      
      const context = {
        operation: 'amendment_decision',
        user_id: req.user?.id,
        amendment_id: req.params.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }
}

module.exports = new AmendmentController();