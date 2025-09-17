const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting development database seeding...');

  // Create a development admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dev.sgm' },
    update: {},
    create: {
      name: 'Development Admin',
      email: 'admin@dev.sgm',
      username: 'dev.admin',
      phone: '+242000000001',
      address: 'Development Environment',
      profession: 'System Administrator',
      city_residence: 'Brazzaville',
      employer_school: 'SGM Development',
      spouse_first_name: '',
      spouse_last_name: '',
      children_count: 0,
      comments: 'Development environment admin user',
      role: 'ADMIN',
      status: 'APPROUVE',
      membership_number: 'SGM-DEV-001',
      form_code: 'N°001/DEV/ADMIN/2025',
      has_submitted_form: true,
      is_active: true,
      card_issued_at: new Date(),
    },
  });

  // Create a test member user
  const testMember = await prisma.user.upsert({
    where: { email: 'member@test.sgm' },
    update: {},
    create: {
      name: 'Test Member',
      email: 'member@test.sgm',
      username: 'test.member',
      phone: '+242000000002',
      address: 'Test Address, Brazzaville',
      profession: 'Software Developer',
      city_residence: 'Brazzaville',
      employer_school: 'Test Company',
      spouse_first_name: 'Jane',
      spouse_last_name: 'DOE',
      children_count: 2,
      comments: 'Test member for development',
      role: 'MEMBER',
      status: 'EN_ATTENTE',
      membership_number: 'SGM-TEST-001',
      form_code: 'N°002/DEV/MEMBER/2025',
      has_submitted_form: true,
      is_active: true,
    },
  });

  console.log('✅ Development database seeded successfully');
  console.log('🔐 Development users created:');
  console.log('   Admin: admin@dev.sgm (ADMIN role)');
  console.log('   Member: member@test.sgm (MEMBER role)');
  console.log('');
  console.log('🔄 Next Steps:');
  console.log('   1. Sign up users via Better-Auth signup endpoint');
  console.log('   2. Test authentication and authorization');
  console.log('   3. Test invitation system');
  console.log('   4. Test member management features');
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