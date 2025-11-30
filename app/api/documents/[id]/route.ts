import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch document with relations
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        lease: {
          select: {
            id: true,
            tenantName: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
          },
        },
        chunks: {
          select: {
            id: true,
            chunkIndex: true,
            content: true,
          },
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

    // Parse extractedData if it exists
    let extractedData: unknown = null;
    if (document.extractedData) {
      try {
        extractedData = JSON.parse(document.extractedData);
      } catch (error) {
        console.error('Error parsing extractedData:', error);
        extractedData = document.extractedData;
      }
    }

    // Format response
    const response = {
      id: document.id,
      type: document.type,
      status: document.status,
      fileName: document.fileName,
      filePath: document.filePath,
      mimeType: document.mimeType,
      uploadedAt: document.uploadedAt.toISOString(),
      leaseId: document.leaseId,
      propertyId: document.propertyId,
      extractedData,
      lease: document.lease
        ? {
            id: document.lease.id,
            name: document.lease.tenantName,
          }
        : undefined,
      property: document.property
        ? {
            id: document.property.id,
            name: document.property.name,
          }
        : undefined,
      chunks: document.chunks.map((chunk) => ({
        id: chunk.id,
        chunkIndex: chunk.chunkIndex,
        preview: chunk.content.substring(0, 200),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch document',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        fileName: true,
        leaseId: true,
        propertyId: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete document chunks first (due to foreign key constraint)
    await prisma.documentChunk.deleteMany({
      where: { documentId: id },
    });

    // Delete the document
    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
      deletedDocument: {
        id: document.id,
        fileName: document.fileName,
      },
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
