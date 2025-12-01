import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding maintenance demo data...');

  // Create or update Property: Willow Creek Shopping Center
  const willowCreek = await prisma.property.upsert({
    where: { id: 'prop_willowcreek' },
    update: {},
    create: {
      id: 'prop_willowcreek',
      name: 'Willow Creek Shopping Center',
      address: '1234 Commerce Blvd, Springfield, IL 62701',
      type: 'RETAIL',
      timeZone: 'America/Chicago',
      ownerEntity: 'Willow Creek Holdings LLC',
      assetManager: 'Sarah Thompson',
      notes: 'Community retail center, 150,000 SF GLA',
    },
  });

  // Create or update Property: Metro Office Tower
  const metroTower = await prisma.property.upsert({
    where: { id: 'prop_metrotower' },
    update: {},
    create: {
      id: 'prop_metrotower',
      name: 'Metro Office Tower',
      address: '500 Financial District Way, Chicago, IL 60601',
      type: 'OFFICE',
      timeZone: 'America/Chicago',
      ownerEntity: 'Metro Tower REIT',
      assetManager: 'James Chen',
      notes: 'Class A office tower, 25 floors',
    },
  });

  // Create or update Property: Gateway Industrial Park
  const gatewayIndustrial = await prisma.property.upsert({
    where: { id: 'prop_gatewayindustrial' },
    update: {},
    create: {
      id: 'prop_gatewayindustrial',
      name: 'Gateway Industrial Park',
      address: '8900 Distribution Center Dr, Indianapolis, IN 46241',
      type: 'INDUSTRIAL',
      timeZone: 'America/Indiana/Indianapolis',
      ownerEntity: 'Gateway Logistics Holdings',
      assetManager: 'Michael Rodriguez',
      notes: 'Distribution warehouse complex, 500,000 SF total',
    },
  });

  console.log('Created properties:', willowCreek.name, metroTower.name, gatewayIndustrial.name);

  // Create Spaces at Willow Creek Shopping Center
  const suite120 = await prisma.space.upsert({
    where: { id: 'space_wc_suite120' },
    update: {},
    create: {
      id: 'space_wc_suite120',
      propertyId: willowCreek.id,
      spaceLabel: 'Suite 120',
      floor: '1',
      areaSqft: 15000,
      useType: 'RETAIL',
      notes: 'Anchor space, grocery',
    },
  });

  const suite210 = await prisma.space.upsert({
    where: { id: 'space_wc_suite210' },
    update: {},
    create: {
      id: 'space_wc_suite210',
      propertyId: willowCreek.id,
      spaceLabel: 'Suite 210',
      floor: '2',
      areaSqft: 3500,
      useType: 'RETAIL',
      notes: 'Inline retail',
    },
  });

  const suite105 = await prisma.space.upsert({
    where: { id: 'space_wc_suite105' },
    update: {},
    create: {
      id: 'space_wc_suite105',
      propertyId: willowCreek.id,
      spaceLabel: 'Suite 105',
      floor: '1',
      areaSqft: 8000,
      useType: 'RETAIL',
      notes: 'Large format retail',
    },
  });

  // Create Spaces at Metro Office Tower
  const floor3East = await prisma.space.upsert({
    where: { id: 'space_mt_floor3east' },
    update: {},
    create: {
      id: 'space_mt_floor3east',
      propertyId: metroTower.id,
      spaceLabel: '3rd Floor East Wing',
      floor: '3',
      areaSqft: 12000,
      useType: 'OFFICE',
      notes: 'Full floor office',
    },
  });

  const suite1500 = await prisma.space.upsert({
    where: { id: 'space_mt_suite1500' },
    update: {},
    create: {
      id: 'space_mt_suite1500',
      propertyId: metroTower.id,
      spaceLabel: 'Suite 1500',
      floor: '15',
      areaSqft: 5000,
      useType: 'OFFICE',
      notes: 'Executive office suite',
    },
  });

  // Create Spaces at Gateway Industrial Park
  const bay4 = await prisma.space.upsert({
    where: { id: 'space_gi_bay4' },
    update: {},
    create: {
      id: 'space_gi_bay4',
      propertyId: gatewayIndustrial.id,
      spaceLabel: 'Bay 4',
      floor: '1',
      areaSqft: 75000,
      useType: 'WAREHOUSE',
      notes: 'Loading dock access, 28ft clear height',
    },
  });

  console.log('Created spaces');

  // Create Occupiers
  const anchorGrocery = await prisma.occupier.upsert({
    where: { id: 'occ_anchorgrocery' },
    update: {},
    create: {
      id: 'occ_anchorgrocery',
      spaceId: suite120.id,
      legalName: 'Anchor Grocery Inc.',
      brandName: 'Anchor Grocery',
      primaryContactName: 'Maria Santos',
      primaryContactEmail: 'maria.santos@anchorgrocery.com',
      primaryContactPhone: '(217) 555-0120',
      storeNumber: 'AG-4521',
      notes: 'Anchor tenant, open 7am-10pm daily',
    },
  });

  const techStartup = await prisma.occupier.upsert({
    where: { id: 'occ_techstartup' },
    update: {},
    create: {
      id: 'occ_techstartup',
      spaceId: floor3East.id,
      legalName: 'TechStart Solutions LLC',
      brandName: 'TechStart',
      primaryContactName: 'David Kim',
      primaryContactEmail: 'david.kim@techstart.io',
      primaryContactPhone: '(312) 555-0300',
      notes: 'Tech startup, 50 employees',
    },
  });

  const fitnessBrand = await prisma.occupier.upsert({
    where: { id: 'occ_fitnessbrand' },
    update: {},
    create: {
      id: 'occ_fitnessbrand',
      spaceId: suite105.id,
      legalName: 'FitLife Gym Holdings Inc.',
      brandName: 'FitLife Gym',
      primaryContactName: 'Jennifer Walsh',
      primaryContactEmail: 'jwalsh@fitlifegym.com',
      primaryContactPhone: '(217) 555-0105',
      notes: 'Fitness center, 24/7 access',
    },
  });

  const globalLogistics = await prisma.occupier.upsert({
    where: { id: 'occ_globallogistics' },
    update: {},
    create: {
      id: 'occ_globallogistics',
      spaceId: bay4.id,
      legalName: 'Global Logistics Corp',
      brandName: 'GlobalLog',
      primaryContactName: 'Robert Thompson',
      primaryContactEmail: 'rthompson@globallog.com',
      primaryContactPhone: '(317) 555-0400',
      notes: 'Distribution center, 24/7 operations',
    },
  });

  console.log('Created occupiers');

  // Create Vendors
  const vendors = await Promise.all([
    prisma.vendor.upsert({
      where: { id: 'vendor_roofpro' },
      update: {},
      create: {
        id: 'vendor_roofpro',
        name: 'RoofPro Commercial Services',
        trade: 'ROOFING',
        email: 'dispatch@roofprocommercial.com',
        phone: '(800) 555-ROOF',
        notes: 'Preferred roofing contractor, 24hr emergency service',
      },
    }),
    prisma.vendor.upsert({
      where: { id: 'vendor_climatecontrol' },
      update: {},
      create: {
        id: 'vendor_climatecontrol',
        name: 'Climate Control HVAC',
        trade: 'HVAC',
        email: 'service@climatecontrolhvac.com',
        phone: '(800) 555-HVAC',
        notes: 'Commercial HVAC specialists',
      },
    }),
    prisma.vendor.upsert({
      where: { id: 'vendor_rapidplumbing' },
      update: {},
      create: {
        id: 'vendor_rapidplumbing',
        name: 'Rapid Response Plumbing',
        trade: 'PLUMBING',
        email: 'emergency@rapidplumbing.com',
        phone: '(800) 555-PIPE',
        notes: 'Emergency plumbing, commercial specialists',
      },
    }),
    prisma.vendor.upsert({
      where: { id: 'vendor_voltelectric' },
      update: {},
      create: {
        id: 'vendor_voltelectric',
        name: 'Volt Electric Commercial',
        trade: 'ELECTRICAL',
        email: 'service@voltelectric.com',
        phone: '(800) 555-VOLT',
        notes: 'Licensed commercial electricians',
      },
    }),
    prisma.vendor.upsert({
      where: { id: 'vendor_buildright' },
      update: {},
      create: {
        id: 'vendor_buildright',
        name: 'BuildRight General Contractors',
        trade: 'GENERAL_CONTRACTOR',
        email: 'projects@buildrightgc.com',
        phone: '(800) 555-BUILD',
        notes: 'Full-service commercial general contractor',
      },
    }),
    prisma.vendor.upsert({
      where: { id: 'vendor_firesafe' },
      update: {},
      create: {
        id: 'vendor_firesafe',
        name: 'FireSafe Systems Inc.',
        trade: 'LIFE_SAFETY',
        email: 'emergency@firesafesystems.com',
        phone: '(800) 555-FIRE',
        notes: 'Fire protection, sprinkler systems, emergency services',
      },
    }),
  ]);

  console.log('Created vendors:', vendors.length);

  console.log('Maintenance demo data seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
