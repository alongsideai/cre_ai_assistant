import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractLeaseData } from '@/lib/leaseExtraction';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Load document with chunks and lease
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        chunks: {
          select: {
            content: true,
            chunkIndex: true,
          },
          orderBy: {
            chunkIndex: 'asc',
          },
        },
        lease: {
          select: {
            id: true,
            tenantName: true,
            baseRent: true,
            leaseStart: true,
            leaseEnd: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify document type is LEASE
    if (document.type !== 'LEASE') {
      return NextResponse.json(
        {
          error: 'Document is not a lease',
          message: `Document type is ${document.type}. Only LEASE documents can be extracted.`,
        },
        { status: 400 }
      );
    }

    // Concatenate chunk text (limit to reasonable size)
    const documentText = document.chunks
      .slice(0, 20) // Take first 20 chunks max
      .map((c) => c.content)
      .join('\n\n');

    if (!documentText) {
      return NextResponse.json(
        {
          error: 'No content available',
          message: 'Document has no chunks to extract from. Upload and process the document first.',
        },
        { status: 400 }
      );
    }

    // Extract lease data using LLM
    console.log(`[Extract] Extracting lease data from document ${id}`);
    const extractedData = await extractLeaseData(documentText);
    console.log(`[Extract] Extraction complete:`, extractedData);

    // Save extracted data to document
    await prisma.document.update({
      where: { id },
      data: {
        extractedData: JSON.stringify(extractedData),
      },
    });

    // Update linked lease if present
    let leaseUpdated = false;
    if (document.leaseId && extractedData) {
      const leaseUpdateData: any = {};

      // Map extracted data to lease fields
      if (extractedData.baseRent !== undefined) {
        leaseUpdateData.baseRent = extractedData.baseRent;
      }
      if (extractedData.startDate) {
        try {
          leaseUpdateData.leaseStart = new Date(extractedData.startDate);
        } catch (e) {
          console.warn('Invalid start date:', extractedData.startDate);
        }
      }
      if (extractedData.endDate) {
        try {
          leaseUpdateData.leaseEnd = new Date(extractedData.endDate);
        } catch (e) {
          console.warn('Invalid end date:', extractedData.endDate);
        }
      }
      if (extractedData.suite) {
        leaseUpdateData.suite = extractedData.suite;
      }

      // Only update if we have data to update
      if (Object.keys(leaseUpdateData).length > 0) {
        await prisma.lease.update({
          where: { id: document.leaseId },
          data: leaseUpdateData,
        });
        leaseUpdated = true;
        console.log(`[Extract] Updated lease ${document.leaseId} with extracted data`);
      }
    }

    return NextResponse.json({
      id: document.id,
      type: document.type,
      extractedData,
      leaseUpdated,
    });
  } catch (error) {
    console.error('Error extracting lease data:', error);
    return NextResponse.json(
      {
        error: 'Failed to extract lease data',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
