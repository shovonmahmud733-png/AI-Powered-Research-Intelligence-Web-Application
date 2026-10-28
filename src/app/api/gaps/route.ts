import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ResearchGap } from '@/lib/db/types';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const user = getSessionUser(req);
  if (!db.isProjectAccessible(projectId, user?.id)) {
    return NextResponse.json(
      { error: 'Forbidden: Access denied to research gaps in this project' },
      { status: 403 }
    );
  }

  const gaps = db.getGaps(projectId);
  return NextResponse.json({ gaps });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      projectId,
      title,
      description,
      category,
      supportingPaperIds,
      contraryEvidence,
      confidence,
      verificationStatus,
      proposedDirection,
      whyItMatters,
      researcherNotes,
      directionStatus,
      evidenceSnippets,
    } = body;

    if (!projectId || !title) {
      return NextResponse.json({ error: 'projectId and title are required' }, { status: 400 });
    }

    const papers = db.getPapers(projectId);
    const supportingTitles: string[] = (supportingPaperIds || []).map((id: string) => {
      const p = papers.find((paper) => paper.id === id);
      return p ? p.title : id;
    });

    const newGap: ResearchGap = {
      id: `gap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      title,
      description: description || '',
      category: category || 'methodological',
      supportingPaperIds: supportingPaperIds || [],
      supportingPaperTitles: supportingTitles,
      contraryEvidence: contraryEvidence || undefined,
      confidence: confidence || 'moderate',
      verificationStatus: verificationStatus || 'Under Investigation',
      proposedDirection: proposedDirection || 'Further experimental exploration recommended.',
      whyItMatters: whyItMatters || undefined,
      researcherNotes: researcherNotes || '',
      directionStatus: directionStatus || 'ai_suggested',
      evidenceSnippets: Array.isArray(evidenceSnippets) ? evidenceSnippets : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = db.createGap(newGap);
    return NextResponse.json({ gap: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'Gap id is required' }, { status: 400 });
    }

    const updated = db.updateGap(id, { ...updates, updatedAt: new Date().toISOString() });
    if (!updated) {
      return NextResponse.json({ error: 'Research gap record not found' }, { status: 404 });
    }
    return NextResponse.json({ gap: updated });
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

  const success = db.deleteGap(id);
  return NextResponse.json({ success });
}
