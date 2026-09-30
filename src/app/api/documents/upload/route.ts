import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parsePdfBuffer } from '@/lib/pdf/parser';
import { extractionAgent } from '@/lib/ai/agents';
import { Paper, DocumentChunk } from '@/lib/db/types';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const titleOverride = formData.get('title') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file was provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // 1. Validation
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file format. Only academic PDF documents (.pdf) are permitted.' },
        { status: 400 }
      );
    }

    // 20MB limit
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum permitted limit (25 MB).' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const paperId = `paper-upload-${Date.now()}`;

    // 2. Parse PDF
    const parseResult = await parsePdfBuffer(buffer, paperId);

    const cleanTitle =
      titleOverride ||
      (parseResult.title && parseResult.title.length > 5
        ? parseResult.title
        : file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));

    // 3. Create Paper record
    const paper: Paper = {
      id: paperId,
      projectId,
      title: cleanTitle,
      authors: parseResult.authors || ['Extracted from Uploaded PDF'],
      abstract:
        parseResult.abstract ||
        (parseResult.chunks.length > 0
          ? parseResult.chunks[0].content.substring(0, 450) + '...'
          : 'Extracted PDF text document.'),
      publicationYear: new Date().getFullYear(),
      journalOrConference: 'Uploaded Manuscript / Working Paper',
      url: '',
      citationCount: 0,
      sourceProvider: 'upload',
      sourceId: file.name,
      references: [],
      retrievalDate: new Date().toISOString(),
      metadataStatus: 'partial',
      retractionStatus: 'clean',
      pdfFileName: file.name,
      pdfFileSize: file.size,
      processingStatus: 'ready',
      createdAt: new Date().toISOString(),
    };

    db.createPaper(paper);

    // 4. Save Chunks with Mandatory Immutable Document Metadata
    const project = db.getProjectById(projectId);
    const userId = project?.userId || 'usr_default';
    const documentId = `doc-${paperId}`;

    const fullChunks: DocumentChunk[] = parseResult.chunks.map((c, i) => {
      const chunkId = `chunk-${paperId}-${i}`;
      return {
        id: chunkId,
        chunk_id: chunkId,
        user_id: userId,
        userId: userId,
        project_id: projectId,
        projectId: projectId,
        paper_id: paperId,
        paperId: paperId,
        document_id: documentId,
        documentId: documentId,
        page_number: c.pageNumber,
        pageNumber: c.pageNumber,
        section: c.sectionName,
        sectionName: c.sectionName,
        chunkIndex: c.chunkIndex,
        content: c.content,
        source_filename: file.name,
        sourceFilename: file.name,
        doi: paper.doi || '',
      };
    });

    if (fullChunks.length > 0) {
      db.addChunks(fullChunks);
    }

    // 5. Trigger structured analysis
    const analysis = await extractionAgent.extractStructuredAnalysis(
      paperId,
      paper.title,
      fullChunks
    );
    db.saveAnalysis(analysis);

    // 6. Literature Matrix synchronization
    db.saveMatrixRow({
      id: `mat-${paperId}`,
      projectId,
      paperId,
      paperTitle: paper.title,
      year: paper.publicationYear,
      dataset: analysis.dataset || 'Extracted Empirical Corpus',
      model: analysis.model || 'Transformer Architecture',
      language: 'Dialect / English / Indic',
      method: analysis.features?.[0] || 'Empirical Validation',
      metric: 'Macro-F1 / Accuracy',
      result: Object.entries(analysis.results)[0]?.[1]?.toString() || 'Validated metrics',
      limitation: analysis.limitations?.[0] || 'Domain constraint',
      customColumns: {},
    });

    return NextResponse.json({
      success: true,
      paper,
      chunks: fullChunks,
      chunksExtracted: fullChunks.length,
      totalPages: parseResult.totalPages,
      warnings: parseResult.warnings,
    });
  } catch (err: any) {
    console.error('PDF upload handler error:', err);
    return NextResponse.json({ error: err.message || 'PDF processing failed' }, { status: 500 });
  }
}
