const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database with Better-Auth system...');

  // Create a production admin user (replaces president)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sgm-gabon.org' },
    update: {},
    create: {
      name: 'Lamine DIOUGA-DIOP',
      email: 'admin@sgm-gabon.org',
      username: 'admin.sgm',
      phone: '+242057424200',
      address: 'Siège SGM, Libreville, Gabon',
      profession: 'Président Association',
      city_residence: 'Brazzaville',
      employer_school: 'Les Ateliers Reunis',
      spouse_first_name: '',
      spouse_last_name: '',
      children_count: 0,
      comments: 'Administrateur système SGM',
      role: 'ADMIN',
      status: 'APPROUVE',
      membership_number: 'SGM-ADMIN-001',
      form_code: 'N°001/AGCO/ADMIN/2025',
      has_submitted_form: true,
      is_active: true,
      card_issued_at: new Date(),
    },
  });

  // Create a production secretary user
  const secretary = await prisma.user.upsert({
    where: { email: 'secretaire@sgm-gabon.org' },
    update: {},
    create: {
      name: 'Mesmin LENGANDY',
      email: 'secretaire@sgm-gabon.org',
      username: 'secretaire.sgm',
      phone: '+242066000002',
      address: 'Siège SGM, Brazzaville, Congo',
      profession: 'Secrétaire Générale',
      city_residence: 'Brazzaville',
      employer_school: 'SGM Association',
      spouse_first_name: '',
      spouse_last_name: '',
      children_count: 0,
      comments: 'Secrétaire Générale SGM',
      role: 'ADMIN', // Secretary has admin privileges in better-auth system
      status: 'APPROUVE',
      membership_number: 'SGM-SEC-001',
      form_code: 'N°002/AGCO/SEC/2025',
      has_submitted_form: true,
      is_active: true,
      card_issued_at: new Date(),
    },
  });

  console.log('✅ Production database seeded successfully');
  console.log('🔐 IMPORTANT: Admin users created for Better-Auth system');
  console.log('   Admin: admin@sgm-gabon.org');
  console.log('   Secretary: secretaire@sgm-gabon.org');
  console.log('⚠️  Both users need to sign up via Better-Auth signup endpoint');
  console.log('   Use invitation system to create accounts with proper passwords');
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