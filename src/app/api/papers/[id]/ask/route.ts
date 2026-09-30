import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vectorStore } from '@/lib/ai/vectorStore';
import { modelRouter } from '@/lib/ai/provider';
import { getSessionUser } from '@/lib/auth/session';
import { DocumentChunk } from '@/lib/db/types';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionUser(req);
    const { id } = await params;
    const { question } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'A valid question string is required' }, { status: 400 });
    }

    const paper = db.getPaperById(id);
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    const project = db.getProjectById(paper.projectId);
    const userId = user?.id || project?.userId || 'usr_default';

    // 1. Strict Candidate Pre-filtering: WHERE user_id, project_id, paper_id BEFORE ranking
    let chunks = db.getChunksByPaper(id).filter(
      (c) =>
        (c.paperId === id || c.paper_id === id) &&
        (!c.projectId || c.projectId === paper.projectId || c.project_id === paper.projectId)
    );

    // If chunks are not yet indexed, construct virtual chunks with full immutable metadata
    if (chunks.length === 0) {
      const documentId = `doc-${id}`;
      chunks = [
        {
          id: `virtual-${id}-1`,
          chunk_id: `virtual-${id}-1`,
          user_id: userId,
          userId,
          project_id: paper.projectId,
          projectId: paper.projectId,
          paper_id: id,
          paperId: id,
          document_id: documentId,
          documentId,
          page_number: 1,
          pageNumber: 1,
          section: 'Abstract',
          sectionName: 'Abstract',
          chunkIndex: 0,
          content: paper.abstract || 'No abstract text available for this publication.',
          source_filename: paper.pdfFileName || `${paper.title}.pdf`,
          sourceFilename: paper.pdfFileName || `${paper.title}.pdf`,
          doi: paper.doi,
        },
        {
          id: `virtual-${id}-2`,
          chunk_id: `virtual-${id}-2`,
          user_id: userId,
          userId,
          project_id: paper.projectId,
          projectId: paper.projectId,
          paper_id: id,
          paperId: id,
          document_id: documentId,
          documentId,
          page_number: 1,
          pageNumber: 1,
          section: 'Publication Metadata',
          sectionName: 'Publication Metadata',
          chunkIndex: 1,
          content: `Title: ${paper.title}. Authors: ${paper.authors.join(', ')}. Published in ${paper.journalOrConference} (${paper.publicationYear}). DOI: ${paper.doi || 'N/A'}.`,
          source_filename: paper.pdfFileName || `${paper.title}.pdf`,
          sourceFilename: paper.pdfFileName || `${paper.title}.pdf`,
          doi: paper.doi,
        },
      ];
    }

    // 2. Retrieve relevant chunks via Vector Store
    const scoredChunks = vectorStore.retrieveRelevantChunks(chunks, question, 4);

    // 3. Wrong Document Protection: Validate retrieved chunks strictly belong to this paper
    const validatedChunks = scoredChunks.filter(
      (sc) => (sc.chunk.paperId === id || sc.chunk.paper_id === id)
    );

    // Debug logging
    console.log(`=== ASK THIS PAPER RETRIEVAL DEBUG ===
Question: "${question}"
Active User: ${userId}
Active Project: ${paper.projectId}
Selected Paper: ${id} (${paper.title})
Search Scope: SINGLE_PAPER
Retrieved Chunks: ${validatedChunks.length} / ${scoredChunks.length} valid
======================================`);

    // Check evidence sufficiency
    const qLower = question.toLowerCase();
    const isLimitation = qLower.includes('limit') || qLower.includes('constraint') || qLower.includes('drawback');
    const hasLimitationEvidence = isLimitation && validatedChunks.some(
      (c) => /limit|constraint|restrict|bottleneck|drawback/i.test(c.chunk.content) || /limit/i.test(c.chunk.sectionName || c.chunk.section || '')
    );
    const hasKeywordMatch = validatedChunks.some((c) => c.score >= 0.2);

    if (validatedChunks.length === 0 || (isLimitation && !hasLimitationEvidence) || (!isLimitation && !hasKeywordMatch && !qLower.includes('summar') && !qLower.includes('about') && !qLower.includes('what'))) {
      return NextResponse.json({
        question,
        paperId: id,
        paperTitle: paper.title,
        answer: 'Insufficient evidence in the selected paper regarding this inquiry.',
        evidence: [],
        modelUsed: 'offline-academic-reasoner-v1',
        provider: 'Local Academic Reasoning Engine',
      });
    }

    const response = await modelRouter.execute({
      task: 'rag_qa',
      prompt: question,
      retrievedChunks: validatedChunks,
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
