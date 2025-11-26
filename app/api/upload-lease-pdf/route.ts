import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ingestLeaseDocument } from '@/lib/leaseIngestion';
import { storeLeaseFile } from '@/lib/fileStorage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const leaseId = formData.get('leaseId') as string;
    const file = formData.get('file') as File;

    if (!leaseId || !file) {
      return NextResponse.json(
        { error: 'Missing leaseId or file' },
        { status: 400 }
      );
    }

    // Verify lease exists
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    // Store the file using shared helper
    const { filePath: filepath, fileName: filename } = await storeLeaseFile(
      file,
      leaseId
    );

    // Trigger document ingestion (chunking + embedding)
    // This will create the Document record and process chunks
    let ingestionResult;
    try {
      console.log(`Starting ingestion for lease ${leaseId}`);
      ingestionResult = await ingestLeaseDocument({
        leaseId,
        filePath: filepath,
        fileName: filename,
      });
      console.log(
        `Ingestion completed for lease ${leaseId}: ${ingestionResult.chunksCreated} chunks created`
      );
    } catch (ingestionError) {
      console.error(`Ingestion failed for lease ${leaseId}:`, ingestionError);
      // Don't fail the upload if ingestion fails
      ingestionResult = {
        success: false,
        chunksCreated: 0,
        error: (ingestionError as Error).message,
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Lease PDF uploaded successfully',
      document: {
        id: ingestionResult.documentId || null,
        filename,
        chunksCreated: ingestionResult.chunksCreated,
      },
      ingestion: ingestionResult,
    });

  } catch (error) {
    console.error('Error uploading lease PDF:', error);
    return NextResponse.json(
      { error: 'Failed to upload lease PDF', details: (error as Error).message },
      { status: 500 }
    );
  }
}
