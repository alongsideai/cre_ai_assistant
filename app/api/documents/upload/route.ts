import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storeUploadedFile } from '@/lib/fileStorage';
import { ingestDocument } from '@/lib/documentIngestion';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const uploadedDocuments = [];

    for (const file of files) {
      if (!file || !(file instanceof File)) {
        continue;
      }

      // Store the file
      const { filePath, fileName, mimeType } = await storeUploadedFile(file);

      // Create Document record
      const document = await prisma.document.create({
        data: {
          type: 'OTHER',
          status: 'PROCESSING',
          filePath,
          fileName,
          mimeType,
        },
      });

      console.log("[/api/documents/upload] Created document", document.id);

      // Ingest document: extract text, chunk, and embed
      await ingestDocument(document.id);

      // Fetch updated document status
      const updatedDocument = await prisma.document.findUnique({
        where: { id: document.id },
        select: { status: true, _count: { select: { chunks: true } } },
      });

      uploadedDocuments.push({
        id: document.id,
        fileName: document.fileName,
        type: document.type,
        status: updatedDocument?.status || document.status,
        chunksCreated: updatedDocument?._count?.chunks || 0,
      });
    }

    return NextResponse.json({
      documents: uploadedDocuments,
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload documents',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
