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
      prenoms: 'Président',
      nom: 'SGM',
      numero_piece_identite: 'PRES001',
      email: 'president@sgm-gabon.org',
      telephone: '+241066000001',
      adresse: 'Siège SGM, Libreville, Gabon',
      date_naissance: new Date('1980-01-01'),
      lieu_naissance: 'Libreville',
      profession: 'Président Association',
      ville_residence: 'Libreville',
      date_entree_congo: new Date('2000-01-01'),
      employeur_ecole: 'SGM Association',
      type_piece_identite: 'PASSEPORT',
      date_emission_piece: new Date('2020-01-01'),
      statut: 'APPROUVE',
      role: 'PRESIDENT',
      code_formulaire: 'Gabon/SGM/PRES001',
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
      prenoms: 'Secrétaire',
      nom: 'Générale SGM',
      numero_piece_identite: 'SEC001',
      email: 'secretaire@sgm-gabon.org',
      telephone: '+242066000002',
      adresse: 'Siège SGM, Brazzaville, Congo',
      date_naissance: new Date('1985-05-15'),
      lieu_naissance: 'Brazzaville',
      profession: 'Secrétaire Générale',
      ville_residence: 'Brazzaville',
      date_entree_congo: new Date('2010-01-01'),
      employeur_ecole: 'SGM Association',
      type_piece_identite: 'CARTE_CONSULAIRE',
      date_emission_piece: new Date('2020-01-01'),
      statut: 'APPROUVE',
      role: 'SECRETAIRE_GENERALE',
      code_formulaire: 'Congo/SGM/SEC001',
      photo_profil_url: 'https://via.placeholder.com/300x400',
      carte_emise_le: new Date(),
      nom_utilisateur: 'secretaire.sgm',
      mot_passe_hash: motPasseHash,
      doit_changer_mot_passe: true, // Force password change on first login
      a_paye: true,
      a_soumis_formulaire: true
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