import { prisma } from '../config/db';

// Simple one-off script to ensure the database is reachable
// and to insert some demo data into the existing Prisma models.
// Run with: npm run db:init (from backend)

async function main() {
  // Create or reuse a demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
    },
  });

  // Create a demo meeting hosted by that user
  const meeting = await prisma.meeting.create({
    data: {
      title: 'Demo Meeting',
      hostId: user.id,
      scheduledAt: new Date(),
    },
  });

  console.log('Seeded demo data:', { userId: user.id, meetingId: meeting.id });
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Error while initializing DB:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


