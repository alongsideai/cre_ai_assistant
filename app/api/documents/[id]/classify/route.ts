import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { classifyDocument, isValidDocumentType } from '@/lib/documentClassification';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const { forceType } = body as { forceType?: string };

    // Load document with chunks
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        chunks: {
          select: {
            content: true,
          },
          orderBy: {
            chunkIndex: 'asc',
          },
          take: 3, // Get first 3 chunks for sample
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const previousType = document.type;
    let newType: string;
    let confidence: number | undefined;

    // If forceType is provided, validate and use it
    if (forceType) {
      if (!isValidDocumentType(forceType)) {
        return NextResponse.json(
          { error: `Invalid document type: ${forceType}` },
          { status: 400 }
        );
      }
      newType = forceType;
    } else {
      // Auto-classify using LLM
      const contentSample = document.chunks.map((c) => c.content).join('\n\n');

      const result = await classifyDocument({
        fileName: document.fileName,
        contentSample: contentSample || undefined,
      });

      newType = result.type;
      confidence = result.confidence;
    }

    // Update document type
    await prisma.document.update({
      where: { id },
      data: { type: newType },
    });

    return NextResponse.json({
      id: document.id,
      type: newType,
      previousType,
      confidence,
    });
  } catch (error) {
    console.error('Error classifying document:', error);
    return NextResponse.json(
      {
        error: 'Failed to classify document',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
