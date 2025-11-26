/**
 * File Storage Utilities
 *
 * Shared helpers for storing uploaded files
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface StoredFile {
  filePath: string;
  fileName: string;
  mimeType: string;
}

/**
 * Store an uploaded file in the appropriate directory
 */
export async function storeUploadedFile(
  file: File,
  options?: {
    subdirectory?: string;
    prefix?: string;
  }
): Promise<StoredFile> {
  const subdirectory = options?.subdirectory || 'documents';
  const prefix = options?.prefix || '';

  // Create uploads directory if it doesn't exist
  const uploadsDir = join(process.cwd(), 'uploads', subdirectory);
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = prefix
    ? `${prefix}-${timestamp}-${originalName}`
    : `${timestamp}-${originalName}`;
  const filePath = join(uploadsDir, fileName);

  // Save the file
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  return {
    filePath,
    fileName,
    mimeType: file.type || 'application/octet-stream',
  };
}

/**
 * Store a lease PDF file (legacy wrapper for backward compatibility)
 */
export async function storeLeaseFile(
  file: File,
  leaseId: string
): Promise<StoredFile> {
  return storeUploadedFile(file, {
    subdirectory: 'leases',
    prefix: leaseId,
  });
}
