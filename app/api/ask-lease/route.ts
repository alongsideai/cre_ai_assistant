import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callLLM } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leaseId, question } = body;

    if (!leaseId || !question) {
      return NextResponse.json(
        { error: 'Missing leaseId or question' },
        { status: 400 }
      );
    }

    // Fetch lease with related data
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: true,
        documents: true,
      },
    });

    if (!lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      );
    }

    // Get the lease document text (if available)
    const leaseDocument = lease.documents[0];
    let leaseText = '';
    if (leaseDocument?.extractedData) {
      try {
        const parsed = JSON.parse(leaseDocument.extractedData);
        leaseText = parsed.text || '';
      } catch (error) {
        console.error('Error parsing extractedData:', error);
      }
    }

    // Truncate lease text if too long (keep first 10000 chars for now)
    const truncatedText = leaseText.length > 10000
      ? leaseText.substring(0, 10000) + '\n\n[... text truncated ...]'
      : leaseText;

    // Format lease metadata
    const metadata = {
      property: lease.property.name,
      address: lease.property.address,
      tenant: lease.tenantName,
      suite: lease.suite || 'N/A',
      squareFeet: lease.squareFeet || 'N/A',
      baseRent: lease.baseRent ? `$${lease.baseRent}` : 'N/A',
      leaseStart: lease.leaseStart ? lease.leaseStart.toISOString().split('T')[0] : 'N/A',
      leaseEnd: lease.leaseEnd ? lease.leaseEnd.toISOString().split('T')[0] : 'N/A',
    };

    // Build the RAG prompt
    const prompt = `You are a helpful commercial real estate assistant. You will answer questions about a specific lease using ONLY the information provided below.

LEASE METADATA:
- Property: ${metadata.property}
- Address: ${metadata.address}
- Tenant: ${metadata.tenant}
- Suite: ${metadata.suite}
- Square Feet: ${metadata.squareFeet}
- Base Rent: ${metadata.baseRent}
- Lease Start: ${metadata.leaseStart}
- Lease End: ${metadata.leaseEnd}

${truncatedText ? `LEASE DOCUMENT TEXT:
${truncatedText}

` : 'Note: No lease document text is available for this lease.\n\n'}USER QUESTION:
${question}

INSTRUCTIONS:
- Answer the question based ONLY on the lease metadata and document text provided above
- If the information is not available in the provided context, clearly state that you don't have that information
- Be concise and specific in your answer
- Reference specific sections or clauses from the lease when applicable

YOUR ANSWER:`;

    // Call the LLM
    const answer = await callLLM(prompt);

    return NextResponse.json({
      success: true,
      answer,
      metadata,
      hasDocument: !!leaseDocument,
    });

  } catch (error) {
    console.error('Error processing lease question:', error);
    return NextResponse.json(
      { error: 'Failed to process question', details: (error as Error).message },
      { status: 500 }
    );
  }
}
