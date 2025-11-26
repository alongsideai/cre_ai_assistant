import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractInvoiceData } from '@/lib/invoiceExtraction';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Load document with chunks
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        chunks: {
          orderBy: {
            chunkIndex: 'asc',
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

    // Validate document type
    if (document.type !== 'INVOICE') {
      return NextResponse.json(
        { error: 'Document is not an invoice. Please classify it as INVOICE first.' },
        { status: 400 }
      );
    }

    // Build content string from chunks
    if (!document.chunks || document.chunks.length === 0) {
      return NextResponse.json(
        { error: 'No document content available for extraction' },
        { status: 400 }
      );
    }

    const content = document.chunks
      .map((chunk) => chunk.content)
      .join('\n\n');

    // Truncate to reasonable length
    const truncatedContent = content.slice(0, 15000);

    // Extract invoice data
    const result = await extractInvoiceData(truncatedContent);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to extract invoice data. The content may not contain valid invoice information.' },
        { status: 500 }
      );
    }

    // Merge with existing extractedData
    const previousData = document.extractedData
      ? (typeof document.extractedData === 'string'
          ? JSON.parse(document.extractedData)
          : document.extractedData)
      : {};

    const updatedData = {
      ...previousData,
      invoice: result,
    };

    // Update document with extracted data and set status to EXTRACTED
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        extractedData: JSON.stringify(updatedData),
        status: 'EXTRACTED',
      },
    });

    return NextResponse.json({
      id: updatedDocument.id,
      type: updatedDocument.type,
      extractedData: updatedData,
      invoiceExtracted: true,
    });
  } catch (error) {
    console.error('Error in extract-invoice route:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
