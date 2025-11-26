import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractWorkOrder } from '@/lib/workOrderExtraction';

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
    if (document.type !== 'WORK_ORDER') {
      return NextResponse.json(
        { error: 'Document is not a work order. Please classify it as WORK_ORDER first.' },
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

    // Extract work order data
    const result = await extractWorkOrder(truncatedContent);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to extract work order data. The content may not contain valid work order information.' },
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
      workOrder: result,
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
      workOrderExtracted: true,
    });
  } catch (error) {
    console.error('Error in extract-work-order route:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
