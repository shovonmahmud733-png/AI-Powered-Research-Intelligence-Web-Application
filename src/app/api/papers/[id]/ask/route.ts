import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vectorStore } from '@/lib/ai/vectorStore';
import { modelRouter } from '@/lib/ai/provider';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { question } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'A valid question string is required' }, { status: 400 });
    }

    const paper = db.getPaperById(id);
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    let chunks = db.getChunksByPaper(id);

    // If chunks are not yet indexed (e.g. newly added from search without pdf upload),
    // construct virtual chunks from paper title, abstract, and known metadata so questions can still be answered!
    if (chunks.length === 0) {
      chunks = [
        {
          id: `virtual-${id}-1`,
          paperId: id,
          pageNumber: 1,
          sectionName: 'Abstract',
          chunkIndex: 0,
          content: paper.abstract || 'No abstract text available for this publication.',
        },
        {
          id: `virtual-${id}-2`,
          paperId: id,
          pageNumber: 1,
          sectionName: 'Publication Metadata',
          chunkIndex: 1,
          content: `Title: ${paper.title}. Authors: ${paper.authors.join(', ')}. Published in ${paper.journalOrConference} (${paper.publicationYear}). DOI: ${paper.doi || 'N/A'}.`,
        },
      ];
    }

    // Retrieve relevant chunks via Vector Store
    const scoredChunks = vectorStore.retrieveRelevantChunks(chunks, question, 4);

    const response = await modelRouter.execute({
      task: 'rag_qa',
      prompt: question,
      retrievedChunks: scoredChunks,
      paperMetadata: {
        title: paper.title,
        authors: paper.authors,
        year: paper.publicationYear,
        journal: paper.journalOrConference,
      },
    });

    return NextResponse.json({
      question,
      paperId: id,
      paperTitle: paper.title,
      answer: response.answer,
      evidence: response.evidence,
      modelUsed: response.modelUsed,
      provider: response.provider,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
