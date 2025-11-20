import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('rentRoll') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read the CSV file content
    const fileContent = await file.text();

    // Parse CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Track stats
    const stats = {
      propertiesCreated: 0,
      leasesCreated: 0,
    };

    // Group leases by property
    const propertiesByName = new Map<string, any[]>();

    for (const record of records) {
      const propertyName = record.property_name || record.propertyName;
      const address = record.address;

      if (!propertiesByName.has(propertyName)) {
        propertiesByName.set(propertyName, []);
      }

      propertiesByName.get(propertyName)!.push({
        tenantName: record.tenant_name || record.tenantName,
        suite: record.suite,
        squareFeet: record.square_feet || record.squareFeet
          ? parseInt(record.square_feet || record.squareFeet)
          : null,
        baseRent: record.base_rent || record.baseRent
          ? parseFloat(record.base_rent || record.baseRent)
          : null,
        leaseStart: record.lease_start || record.leaseStart
          ? new Date(record.lease_start || record.leaseStart)
          : null,
        leaseEnd: record.lease_end || record.leaseEnd
          ? new Date(record.lease_end || record.leaseEnd)
          : null,
        address,
      });
    }

    // Create or update properties and leases
    for (const [propertyName, leases] of propertiesByName.entries()) {
      const address = leases[0].address;

      // Upsert property
      const property = await prisma.property.upsert({
        where: {
          id: 'temp-id', // This will always fail the where check, forcing create
        },
        update: {},
        create: {
          name: propertyName,
          address: address || '',
        },
      }).catch(async () => {
        // If upsert fails, try to find existing property
        return await prisma.property.findFirst({
          where: { name: propertyName },
        }) || await prisma.property.create({
          data: {
            name: propertyName,
            address: address || '',
          },
        });
      });

      stats.propertiesCreated++;

      // Create leases for this property
      for (const leaseData of leases) {
        await prisma.lease.create({
          data: {
            propertyId: property.id,
            tenantName: leaseData.tenantName,
            suite: leaseData.suite,
            squareFeet: leaseData.squareFeet,
            baseRent: leaseData.baseRent,
            leaseStart: leaseData.leaseStart,
            leaseEnd: leaseData.leaseEnd,
          },
        });
        stats.leasesCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${stats.propertiesCreated} properties and ${stats.leasesCreated} leases`,
      stats,
    });

  } catch (error) {
    console.error('Error uploading rent roll:', error);
    return NextResponse.json(
      { error: 'Failed to process rent roll', details: (error as Error).message },
      { status: 500 }
    );
  }
}
