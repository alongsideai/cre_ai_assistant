import path from "path";
import { prisma } from "@/lib/prisma";
import { extractTextFromPdf, chunkText, embedChunks } from "@/lib/leaseIngestion";

export async function ingestDocument(documentId: string) {
  console.log("[ingestDocument] Starting ingestion for document", documentId);

  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    console.error("[ingestDocument] Document not found", documentId);
    return;
  }

  if (!document.filePath) {
    console.error("[ingestDocument] Document has no filePath", documentId);
    return;
  }

  try {
    const absolutePath = path.isAbsolute(document.filePath)
      ? document.filePath
      : path.join(process.cwd(), document.filePath);

    // extractTextFromPdf expects a file path string
    const fullText = await extractTextFromPdf(absolutePath);

    if (!fullText || !fullText.trim()) {
      console.warn("[ingestDocument] No text extracted for document", documentId);
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "UPLOADED" },
      });
      return;
    }

    const chunks = chunkText(fullText);

    if (!chunks.length) {
      console.warn("[ingestDocument] No chunks produced for document", documentId);
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "UPLOADED" },
      });
      return;
    }

    // Create embeddings
    const embeddings = await embedChunks(chunks);

    // Write DocumentChunk rows
    await prisma.documentChunk.deleteMany({ where: { documentId } });

    await prisma.documentChunk.createMany({
      data: chunks.map((content, index) => ({
        documentId,
        chunkIndex: index,
        content,
        embedding: JSON.stringify(embeddings[index]),
      })),
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "EXTRACTED" },
    });

    console.log(
      "[ingestDocument] Completed ingestion for document",
      documentId,
      "chunks:",
      chunks.length
    );
  } catch (err) {
    console.error("[ingestDocument] Error ingesting document", documentId, err);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "UPLOADED" },
    });
  }
}
