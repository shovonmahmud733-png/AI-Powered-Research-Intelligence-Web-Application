import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { LiteratureMatrixRow } from '../../../lib/db/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const rows = db.getMatrixRows(projectId);
  const papers = db.getPapers(projectId);
  const papersMap = new Map(papers.map((p) => [p.id, p]));
  const evidenceList = db.getEvidence(projectId);

  const enrichedRows = rows.map((r) => {
    const p = papersMap.get(r.paperId);
    const analysis = p ? db.getAnalysisByPaper(p.id) : undefined;
    const paperEvidence = evidenceList.find((e) => e.paperId === r.paperId);

    return {
      ...r,
      authors: p?.authors || r.authors || [],
      journalOrConference: p?.journalOrConference || r.journalOrConference || '',
      doi: p?.doi || r.doi || '',
      sampleSize: analysis?.datasetSize || r.sampleSize || '',
      researchProblem: analysis?.researchProblem || r.researchProblem || '',
      futureWork: analysis?.futureWork?.join('; ') || r.futureWork || '',
      evidenceSnippet: paperEvidence?.snippet || r.evidenceSnippet || '',
      evidenceLocation: paperEvidence?.location || paperEvidence?.section || r.evidenceLocation || '',
      analysisStatus: analysis
        ? ('completed' as const)
        : r.dataset === 'Pending extraction'
        ? ('pending' as const)
        : ('not_analyzed' as const),
    };
  });

  const existingPaperIds = new Set(rows.map((r) => r.paperId));
  const availablePapers = papers.filter((p) => !existingPaperIds.has(p.id));

  return NextResponse.json({
    rows: enrichedRows,
    totalRows: enrichedRows.length,
    availablePapers: availablePapers.map((p) => ({
      id: p.id,
      title: p.title,
      authors: p.authors,
      publicationYear: p.publicationYear,
      venue: p.journalOrConference,
      doi: p.doi,
    })),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, paperId, paperTitle, year, dataset, model, language, method, metric, result, limitation, customColumns } = body;

    if (!projectId || !paperTitle) {
      return NextResponse.json({ error: 'projectId and paperTitle are required' }, { status: 400 });
    }

    const newRow: LiteratureMatrixRow = {
      id: body.id || `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      paperId: paperId || '',
      paperTitle,
      year: year || new Date().getFullYear(),
      dataset: dataset || 'Not specified',
      model: model || 'Not specified',
      language: language || 'English',
      method: method || 'Empirical',
      metric: metric || 'Accuracy / F1',
      result: result || 'Reported metrics',
      limitation: limitation || 'Not documented',
      customColumns: customColumns || {},
    };

    const saved = db.saveMatrixRow(newRow);
    return NextResponse.json({ row: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const row = await req.json();
    if (!row.id) {
      return NextResponse.json({ error: 'Row id is required' }, { status: 400 });
    }

    const saved = db.saveMatrixRow(row);
    return NextResponse.json({ row: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
  }

  const success = db.deleteMatrixRow(id);
  return NextResponse.json({ success });
}
