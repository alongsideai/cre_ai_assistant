import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storeUploadedFile } from '@/lib/fileStorage';

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
          status: 'UPLOADED',
          filePath,
          fileName,
          mimeType,
        },
      });

      uploadedDocuments.push({
        id: document.id,
        fileName: document.fileName,
        type: document.type,
        status: document.status,
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
