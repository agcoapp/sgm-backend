const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database...');

  // Generate secure password hash for production users
  const motPasseHash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'MotPasse123!', 12);

  // Create a production president user
  const president = await prisma.utilisateur.upsert({
    where: { email: 'president@sgm-gabon.org' },
    update: {},
    create: {
      prenoms: 'Lamine',
      nom: 'DIOUGA-DIOP',
      numero_piece_identite: 'PRES001',
      email: 'president@sgm-gabon.org',
      telephone: '+242057424200',
      adresse: 'Siège SGM, Libreville, Gabon',
      date_naissance: new Date(1965, 3, 14), // 14-04-1965 en format français
      lieu_naissance: 'Libreville',
      profession: 'Président Association',
      ville_residence: 'Brazzaville',
      date_entree_congo: new Date(2000, 0, 1), // 01-01-2000 en format français
      employeur_ecole: 'Les Ateliers Reunis',
      type_piece_identite: 'PASSEPORT',
      date_emission_piece: new Date(2020, 0, 1), // 01-01-2020 en format français
      statut: 'APPROUVE',
      role: 'PRESIDENT',
      code_formulaire: 'N°001/AGCO/P/01-2025',
      photo_profil_url: 'https://via.placeholder.com/300x400',
      carte_emise_le: new Date(),
      nom_utilisateur: 'president.sgm',
      mot_passe_hash: motPasseHash,
      doit_changer_mot_passe: true, // Force password change on first login
      a_paye: true,
      a_soumis_formulaire: true
    },
  });

  // Create a production secretary user
  const secretary = await prisma.utilisateur.upsert({
    where: { email: 'secretaire@sgm-gabon.org' },
    update: {},
    create: {
      prenoms: 'Mesmin',
      nom: 'LENGANDY',
      numero_piece_identite: 'SEC001',
      email: 'secretaire@sgm-gabon.org',
      telephone: '+242066000002',
      adresse: 'Siège SGM, Brazzaville, Congo',
      date_naissance: new Date(1985, 4, 15), // 15-05-1985 en format français
      lieu_naissance: 'Brazzaville',
      profession: 'Secrétaire Générale',
      ville_residence: 'Brazzaville',
      date_entree_congo: new Date(2010, 0, 1), // 01-01-2010 en format français
      employeur_ecole: 'SGM Association',
      type_piece_identite: 'CARTE_CONSULAIRE',
      date_emission_piece: new Date(2020, 0, 1), // 01-01-2020 en format français
      statut: 'APPROUVE',
      role: 'SECRETAIRE_GENERALE',
      code_formulaire: 'N°002/AGCO/SG/01-2025',
      photo_profil_url: 'https://via.placeholder.com/300x400',
      carte_emise_le: new Date(),
      nom_utilisateur: 'secretaire.sgm',
      mot_passe_hash: motPasseHash,
      doit_changer_mot_passe: true, // Force password change on first login
      a_paye: true,
      a_soumis_formulaire: true
    },
  });

  // Create a test member who paid but hasn't submitted form (for secretary dashboard)
  const testMember = await prisma.utilisateur.upsert({
    where: { email: 'membre.test@example.com' },
    update: {},
    create: {
      prenoms: 'Jean Claude',
      nom: 'Mbongo',
      numero_piece_identite: 'TEST001',
      email: 'membre.test@example.com',
      telephone: '+241066000999',
      adresse: 'Port-Gentil, Gabon',
      date_naissance: new Date(1990, 2, 20), // 20-03-1990 en format français
      lieu_naissance: 'Port-Gentil',
      profession: 'Ingénieur',
      ville_residence: 'Port-Gentil',
      date_entree_congo: new Date(2020, 0, 15), // 15-01-2020 en format français
      employeur_ecole: 'Total Gabon',
      type_piece_identite: 'PASSEPORT',
      date_emission_piece: new Date(2023, 5, 10), // 10-06-2023 en format français
      statut: 'EN_ATTENTE',
      role: 'MEMBRE',
      photo_profil_url: 'https://via.placeholder.com/300x400',
      a_paye: true, // A payé
      a_soumis_formulaire: false, // Mais n'a pas soumis le formulaire
      doit_changer_mot_passe: true
    },
  });

  // Create initial audit log
  await prisma.journalAudit.create({
    data: {
      action: 'DATABASE_SEED_PRODUCTION',
      details: {
        message: 'Base de données de production initialisée',
        utilisateurs_crees: 2,
        environment: 'production'
      },
      adresse_ip: '0.0.0.0',
      agent_utilisateur: 'railway-seed',
    },
  });

  console.log('✅ Production database seeded successfully');
  console.log('🔐 IMPORTANT: Default admin credentials created');
  console.log('   President: president.sgm / MotPasse123! (CHANGE IMMEDIATELY)');
  console.log('   Secretary: secretaire.sgm / MotPasse123! (CHANGE IMMEDIATELY)');
  console.log('⚠️  Both users are forced to change password on first login');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Production seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });