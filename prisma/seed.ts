import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a sample property
  const property = await prisma.property.create({
    data: {
      name: 'Downtown Business Plaza',
      address: '123 Main Street, Anytown, CA 90210',
      leases: {
        create: [
          {
            tenantName: 'Acme Corporation',
            suite: '101',
            squareFeet: 2500,
            baseRent: 5000,
            leaseStart: new Date('2023-01-01'),
            leaseEnd: new Date('2025-12-31'),
          },
          {
            tenantName: 'Tech Innovations LLC',
            suite: '202',
            squareFeet: 3200,
            baseRent: 7500,
            leaseStart: new Date('2023-06-01'),
            leaseEnd: new Date('2028-05-31'),
          },
        ],
      },
    },
  });

  console.log(`Created property: ${property.name}`);
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
