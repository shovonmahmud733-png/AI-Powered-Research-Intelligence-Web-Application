import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Paper } from '@/lib/db/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const papers = db.getPapers(projectId);
  return NextResponse.json({ papers });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, doi, title, authors, abstract, publicationYear, journalOrConference, url, openAccessUrl, citationCount, sourceProvider, sourceId } = body;

    if (!projectId || !title) {
      return NextResponse.json({ error: 'projectId and title are required' }, { status: 400 });
    }

    // Deduplication check: check if paper with same DOI already exists in project
    if (doi) {
      const existing = db.getPaperByDoi(doi, projectId);
      if (existing) {
        return NextResponse.json(
          { error: 'Paper with this DOI is already saved in this research project.', paper: existing },
          { status: 409 }
        );
      }
    }

    const newPaper: Paper = {
      id: `paper-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      doi: doi || undefined,
      title: title.trim(),
      authors: Array.isArray(authors) ? authors : [authors || 'Unknown Author'],
      abstract: abstract || '',
      publicationYear: publicationYear || new Date().getFullYear(),
      journalOrConference: journalOrConference || 'Scholarly Journal / Proceedings',
      url: url || '',
      openAccessUrl: openAccessUrl || undefined,
      citationCount: citationCount || 0,
      sourceProvider: sourceProvider || 'crossref',
      sourceId: sourceId || doi || String(Date.now()),
      references: [],
      retrievalDate: new Date().toISOString(),
      metadataStatus: doi ? 'verified' : 'unverified',
      retractionStatus: 'clean',
      processingStatus: 'ready',
      isDemo: body.isDemo || false,
      createdAt: new Date().toISOString(),
    };

    const saved = db.createPaper(newPaper);

    // Also auto-create a Literature Matrix row for this paper so the matrix is always synchronized!
    db.saveMatrixRow({
      id: `mat-${saved.id}`,
      projectId,
      paperId: saved.id,
      paperTitle: saved.title,
      year: saved.publicationYear,
      dataset: 'Pending extraction',
      model: 'Pending extraction',
      language: 'Multilingual / English',
      method: 'Empirical Investigation',
      metric: 'Macro-F1 / Accuracy',
      result: 'Pending full-text synthesis',
      limitation: 'Pending review',
      customColumns: {},
    });

    return NextResponse.json({ paper: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Paper ID is required' }, { status: 400 });
    }
    const cleanId = decodeURIComponent(id).trim();
    db.deletePaper(cleanId);
    return NextResponse.json({ success: true, deletedId: cleanId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
