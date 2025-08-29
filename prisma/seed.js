const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  console.log('⚠️  Note: The sys admin user will be created via Better Auth sign-up');
  console.log('    The seeded user in the database needs to match Better Auth requirements');
  
  // We'll create the user via Better Auth API instead of direct database insertion
  // This ensures proper Account records are created

  // Only sys admin exists at startup
  // All other users (president, secretary, etc.) will be invited by sys admin
  // and must fill out adhesion forms like regular members

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('🔑 REQUIRED: Create System Administrator');
  console.log('   Use Better Auth sign-up endpoint to create sys admin:');
  console.log('');
  console.log('   POST /api/auth/sign-up/email');
  console.log('   {');
  console.log('     "email": "sysadmin@sgm.ga",');
  console.log('     "password": "SysAdmin2024!",');
  console.log('     "name": "System Administrator"');
  console.log('   }');
  console.log('');
  console.log('   Then update the user role to ADMIN in the database.');
  console.log('');
  console.log('🔄 Next Steps:');
  console.log('   1. Sign up sys admin via Better Auth');
  console.log('   2. Update sys admin role to ADMIN');  
  console.log('   3. Login as sys admin to create invitations');
  console.log('   4. Invite president, secretary, and initial members');
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