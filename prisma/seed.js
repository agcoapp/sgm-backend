const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Générer mot de passe haché pour les utilisateurs test
  const motPasseHash = await bcrypt.hash('MotPasse123!', 12);


  // Create a test president user
  const president = await prisma.utilisateur.upsert({
    where: { email: 'president@sgm-gabon.org' },
    update: {},
    create: {
      prenoms: 'Jean pierre',
      nom: 'PRESIDENT TEST',
      numero_carte_consulaire: 'PRES001',
      email: 'president@sgm-gabon.org',
      telephone: '+241066000001',
      adresse: 'Libreville, Gabon',
      date_naissance: new Date(1985, 4, 15),
      statut: 'APPROUVE',
      role: 'PRESIDENT',
      code_formulaire: 'N°002/AGCO/SG/01-2025',
      // photo_piece_url: 'https://via.placeholder.com/400x300', // SUPPRIMÉ - champ n'existe plus
      photo_profil_url: 'https://via.placeholder.com/300x400',
      carte_emise_le: new Date(),
      nom_utilisateur: 'jean.president',
      mot_passe_hash: motPasseHash,
      doit_changer_mot_passe: false,
      a_change_mot_passe_temporaire: true, // Already changed in development
      a_paye: true,
      a_soumis_formulaire: true
    },
  });

  // Create a test secretary user
  const secretary = await prisma.utilisateur.upsert({
    where: { email: 'secretary@sgm-gabon.org' },
    update: {},
    create: {
      prenoms: 'Marie claire',
      nom: 'SECRETAIRE GENERALE',
      numero_carte_consulaire: 'SEC001',
      email: 'secretary@sgm-gabon.org',
      telephone: '+241066000002',
      adresse: 'Brazzaville, Congo',
      date_naissance: new Date(1985, 4, 15),
      statut: 'APPROUVE',
      role: 'SECRETAIRE_GENERALE',
      code_formulaire: 'Congo/SGM/SEC001',
      // photo_piece_url: 'https://via.placeholder.com/400x300', // SUPPRIMÉ - champ n'existe plus
      photo_profil_url: 'https://via.placeholder.com/300x400',
      carte_emise_le: new Date(),
      nom_utilisateur: 'marie.secretaire',
      mot_passe_hash: motPasseHash,
      doit_changer_mot_passe: false,
      a_change_mot_passe_temporaire: true, // Already changed in development
      a_paye: true,
      a_soumis_formulaire: true
    },
  });

  // Create test pending members
  const pendingMembers = await Promise.all([
    // Membre qui a payé mais n'a pas soumis le formulaire
    prisma.utilisateur.upsert({
      where: { email: 'member1@example.com' },
      update: {},
      create: {
        prenoms: 'Jean claude',
        nom: 'MBONGO',
        numero_carte_consulaire: 'MBR001',
        email: 'member1@example.com',
        telephone: '+241066000003',
        adresse: 'Port-Gentil, Gabon',
        date_naissance: new Date(1985, 4, 15),
        statut: 'EN_ATTENTE',
        role: 'MEMBRE',
        // photo_piece_url: 'https://via.placeholder.com/400x300', // SUPPRIMÉ
        photo_profil_url: 'https://via.placeholder.com/300x400',
        a_paye: true, // A payé
        a_soumis_formulaire: false // Mais n'a pas soumis le formulaire
      },
    }),
    // Membre qui n'a ni payé ni soumis le formulaire
    prisma.utilisateur.upsert({
      where: { email: 'member2@example.com' },
      update: {},
      create: {
        prenoms: 'Marie josephine',
        nom: 'NZOMO',
        numero_carte_consulaire: 'MBR002',
        email: 'member2@example.com',
        telephone: '+242066000004',
        adresse: 'Pointe-Noire, Congo',
        date_naissance: new Date(1988, 6, 10),
        statut: 'EN_ATTENTE',
        role: 'MEMBRE',
        // photo_piece_url: 'https://via.placeholder.com/400x300', // SUPPRIMÉ
        photo_profil_url: 'https://via.placeholder.com/300x400',
        a_paye: false, // N'a pas payé
        a_soumis_formulaire: false // N'a pas soumis le formulaire
      },
    }),
  ]);

  // Create president's signature record
  await prisma.signature.create({
    data: {
      id_president: president.id,
      url_signature: 'https://res.cloudinary.com/sgm-demo/image/upload/v123456789/sgm/signatures/president_signature_demo.png',
      cloudinary_id: 'sgm/signatures/president_signature_demo',
      est_active: true,
    },
  });

  // Create initial audit log
  await prisma.journalAudit.create({
    data: {
      action: 'DATABASE_SEED',
      details: {
        message: 'Base de données initialisée avec les données de test',
        utilisateurs_crees: 4,
      },
      adresse_ip: '127.0.0.1',
      agent_utilisateur: 'prisma-seed',
    },
  });

  console.log('✅ Database seeded successfully');
  console.log('📋 Test users created:');
  console.log('   President:', president.email);
  console.log('   Secretary:', secretary.email);
  console.log('   Pending members:', pendingMembers.length);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });