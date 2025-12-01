/**
 * Seed script for leasing and NOI data
 * Run with: npx tsx prisma/seed-leasing.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding leasing and NOI demo data...');

  const now = new Date();

  // Helper to create dates relative to now
  const addMonths = (months: number): Date => {
    const date = new Date(now);
    date.setMonth(date.getMonth() + months);
    return date;
  };

  const subtractMonths = (months: number): Date => {
    const date = new Date(now);
    date.setMonth(date.getMonth() - months);
    return date;
  };

  // First day of month helper
  const firstOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  // Get existing properties
  const willowCreek = await prisma.property.findUnique({ where: { id: 'prop_willowcreek' } });
  const metroTower = await prisma.property.findUnique({ where: { id: 'prop_metrotower' } });
  const gatewayIndustrial = await prisma.property.findUnique({ where: { id: 'prop_gatewayindustrial' } });

  if (!willowCreek || !metroTower || !gatewayIndustrial) {
    console.error('Properties not found. Please run seed-maintenance.ts first.');
    process.exit(1);
  }

  // Clear existing leases and NOI snapshots for clean re-seed
  await prisma.lease.deleteMany({});
  await prisma.monthlyNOISnapshot.deleteMany({});

  console.log('Creating lease records...');

  // Create leases with mix of expiry dates
  const leases = await Promise.all([
    // Willow Creek Shopping Center leases
    prisma.lease.create({
      data: {
        propertyId: willowCreek.id,
        tenantName: 'Anchor Grocery Inc.',
        suite: 'Suite 120',
        squareFeet: 15000,
        baseRent: 18750, // $15/SF/year = $15000 * 15 / 12
        leaseStart: subtractMonths(36),
        leaseEnd: addMonths(3), // Expiring in 3 months
        status: 'ACTIVE',
      },
    }),
    prisma.lease.create({
      data: {
        propertyId: willowCreek.id,
        tenantName: 'FitLife Gym Holdings Inc.',
        suite: 'Suite 105',
        squareFeet: 8000,
        baseRent: 10000, // $15/SF/year
        leaseStart: subtractMonths(24),
        leaseEnd: addMonths(8), // Expiring in 8 months
        status: 'ACTIVE',
      },
    }),
    prisma.lease.create({
      data: {
        propertyId: willowCreek.id,
        tenantName: 'Coffee Corner LLC',
        suite: 'Suite 102',
        squareFeet: 1500,
        baseRent: 2500, // $20/SF/year
        leaseStart: subtractMonths(12),
        leaseEnd: addMonths(24), // 2 years out
        status: 'ACTIVE',
      },
    }),
    prisma.lease.create({
      data: {
        propertyId: willowCreek.id,
        tenantName: 'Pet Paradise Inc.',
        suite: 'Suite 210',
        squareFeet: 3500,
        baseRent: 5833, // $20/SF/year
        leaseStart: subtractMonths(6),
        leaseEnd: addMonths(5), // Expiring in 5 months
        status: 'ACTIVE',
      },
    }),
    prisma.lease.create({
      data: {
        propertyId: willowCreek.id,
        tenantName: 'Quick Clips Salon',
        suite: 'Suite 215',
        squareFeet: 1200,
        baseRent: 2000,
        leaseStart: subtractMonths(48),
        leaseEnd: addMonths(36), // Long term
        status: 'ACTIVE',
      },
    }),

    // Metro Office Tower leases
    prisma.lease.create({
      data: {
        propertyId: metroTower.id,
        tenantName: 'TechStart Solutions LLC',
        suite: 'Suite 300 (3rd Floor East)',
        squareFeet: 12000,
        baseRent: 30000, // $30/SF/year
        leaseStart: subtractMonths(18),
        leaseEnd: addMonths(4), // Expiring in 4 months
        status: 'ACTIVE',
      },
    }),
    prisma.lease.create({
      data: {
        propertyId: metroTower.id,
        tenantName: 'Sterling Law Partners LLP',
        suite: 'Suite 1500',
        squareFeet: 5000,
        baseRent: 14583, // $35/SF/year
        leaseStart: subtractMonths(60),
        leaseEnd: addMonths(11), // Expiring in 11 months
        status: 'ACTIVE',
      },
    }),
    prisma.lease.create({
      data: {
        propertyId: metroTower.id,
        tenantName: 'Midwest Financial Advisors',
        suite: 'Suite 800',
        squareFeet: 8000,
        baseRent: 20000, // $30/SF/year
        leaseStart: subtractMonths(36),
        leaseEnd: addMonths(48), // Long term
        status: 'ACTIVE',
      },
    }),
    prisma.lease.create({
      data: {
        propertyId: metroTower.id,
        tenantName: 'DataVault Systems Inc.',
        suite: 'Suite 2200',
        squareFeet: 15000,
        baseRent: 43750, // $35/SF/year
        leaseStart: subtractMonths(24),
        leaseEnd: addMonths(60), // Long term
        status: 'ACTIVE',
      },
    }),
    prisma.lease.create({
      data: {
        propertyId: metroTower.id,
        tenantName: 'CloudFirst Technologies',
        suite: 'Suite 1000',
        squareFeet: 6000,
        baseRent: 15000, // $30/SF/year
        leaseStart: subtractMonths(6),
        leaseEnd: addMonths(2), // Expiring in 2 months
        status: 'NOTICE_GIVEN',
      },
    }),

    // Gateway Industrial Park leases
    prisma.lease.create({
      data: {
        propertyId: gatewayIndustrial.id,
        tenantName: 'Global Logistics Corp',
        suite: 'Bay 4',
        squareFeet: 75000,
        baseRent: 37500, // $6/SF/year
        leaseStart: subtractMonths(48),
        leaseEnd: addMonths(7), // Expiring in 7 months
        status: 'ACTIVE',
      },
    }),
    prisma.lease.create({
      data: {
        propertyId: gatewayIndustrial.id,
        tenantName: 'FastShip Distribution LLC',
        suite: 'Bay 1-2',
        squareFeet: 150000,
        baseRent: 75000, // $6/SF/year
        leaseStart: subtractMonths(24),
        leaseEnd: addMonths(36), // Long term
        status: 'ACTIVE',
      },
    }),
    prisma.lease.create({
      data: {
        propertyId: gatewayIndustrial.id,
        tenantName: 'Midwest Manufacturing Co.',
        suite: 'Bay 3',
        squareFeet: 50000,
        baseRent: 25000, // $6/SF/year
        leaseStart: subtractMonths(12),
        leaseEnd: addMonths(10), // Expiring in 10 months
        status: 'ACTIVE',
      },
    }),
    prisma.lease.create({
      data: {
        propertyId: gatewayIndustrial.id,
        tenantName: 'EcoPackage Solutions',
        suite: 'Bay 5',
        squareFeet: 40000,
        baseRent: 20000, // $6/SF/year
        leaseStart: addMonths(2), // Future lease
        leaseEnd: addMonths(62),
        status: 'FUTURE',
      },
    }),
  ]);

  console.log(`Created ${leases.length} leases`);

  console.log('Creating NOI snapshots...');

  // Create NOI snapshots for last 6 months
  const noiSnapshots = await Promise.all([
    prisma.monthlyNOISnapshot.create({
      data: {
        month: firstOfMonth(subtractMonths(5)),
        portfolio: 'DEFAULT',
        noi: 425000,
        revenue: 680000,
        expenses: 255000,
      },
    }),
    prisma.monthlyNOISnapshot.create({
      data: {
        month: firstOfMonth(subtractMonths(4)),
        portfolio: 'DEFAULT',
        noi: 432000,
        revenue: 695000,
        expenses: 263000,
      },
    }),
    prisma.monthlyNOISnapshot.create({
      data: {
        month: firstOfMonth(subtractMonths(3)),
        portfolio: 'DEFAULT',
        noi: 418000,
        revenue: 685000,
        expenses: 267000,
      },
    }),
    prisma.monthlyNOISnapshot.create({
      data: {
        month: firstOfMonth(subtractMonths(2)),
        portfolio: 'DEFAULT',
        noi: 445000,
        revenue: 710000,
        expenses: 265000,
      },
    }),
    prisma.monthlyNOISnapshot.create({
      data: {
        month: firstOfMonth(subtractMonths(1)),
        portfolio: 'DEFAULT',
        noi: 452000,
        revenue: 720000,
        expenses: 268000,
      },
    }),
    prisma.monthlyNOISnapshot.create({
      data: {
        month: firstOfMonth(now),
        portfolio: 'DEFAULT',
        noi: 460000,
        revenue: 735000,
        expenses: 275000,
      },
    }),
  ]);

  console.log(`Created ${noiSnapshots.length} NOI snapshots`);

  // Summary stats
  const activeLeases = leases.filter(l => l.status === 'ACTIVE' || l.status === 'NOTICE_GIVEN').length;
  const expiring6Months = leases.filter(l => {
    if (!l.leaseEnd) return false;
    const monthsToExpiry = (l.leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsToExpiry > 0 && monthsToExpiry <= 6 && (l.status === 'ACTIVE' || l.status === 'NOTICE_GIVEN');
  }).length;

  console.log('\nSummary:');
  console.log(`- Active leases: ${activeLeases}`);
  console.log(`- Expiring within 6 months: ${expiring6Months}`);
  console.log(`- Latest NOI: $${noiSnapshots[noiSnapshots.length - 1].noi.toLocaleString()}`);

  console.log('\nLeasing and NOI demo data seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
