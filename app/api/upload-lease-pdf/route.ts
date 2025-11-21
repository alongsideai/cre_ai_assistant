import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import pdf from 'pdf-parse';
import { prisma } from '@/lib/prisma';
import { ingestLeaseDocument } from '@/lib/leaseIngestion';

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

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', 'leases');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${leaseId}-${timestamp}.pdf`;
    const filepath = join(uploadsDir, filename);

    // Save the file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Extract text from PDF
    let extractedText = '';
    try {
      const pdfData = await pdf(buffer);
      extractedText = pdfData.text;
    } catch (pdfError) {
      console.error('Error extracting PDF text:', pdfError);
      extractedText = 'Error extracting text from PDF';
    }

    // Create LeaseDocument record
    const leaseDocument = await prisma.leaseDocument.create({
      data: {
        leaseId,
        filePath: filepath,
        extractedText,
      },
    });

    // Trigger document ingestion (chunking + embedding)
    let ingestionResult = null;
    try {
      console.log(`Starting ingestion for lease ${leaseId}`);
      ingestionResult = await ingestLeaseDocument({
        leaseId,
        filePath: filepath,
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
        id: leaseDocument.id,
        filename,
        textLength: extractedText.length,
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
