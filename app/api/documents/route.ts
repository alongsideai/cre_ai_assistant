import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const typeParam = searchParams.get('type');
    const leaseId = searchParams.get('leaseId');
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(
      parseInt(searchParams.get('pageSize') || '20'),
      100
    );

    // Build where clause
    const where: any = {};

    if (typeParam) {
      // Support comma-separated types
      const types = typeParam.split(',').map((t) => t.trim());
      where.type = { in: types };
    }

    if (leaseId) {
      where.leaseId = leaseId;
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (status) {
      where.status = status;
    }

    // Get total count for pagination
    const total = await prisma.document.count({ where });

    // Calculate pagination
    const totalPages = Math.ceil(total / pageSize);
    const skip = (page - 1) * pageSize;

    // Fetch documents
    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        type: true,
        status: true,
        fileName: true,
        uploadedAt: true,
        leaseId: true,
        propertyId: true,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
      skip,
      take: pageSize,
    });

    // Format response
    const data = documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      status: doc.status,
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt.toISOString(),
      leaseId: doc.leaseId,
      propertyId: doc.propertyId,
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch documents',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
