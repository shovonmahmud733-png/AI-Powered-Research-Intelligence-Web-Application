import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Evidence } from '@/lib/db/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const evidence = db.getEvidence(projectId);
  return NextResponse.json({ evidence });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, paperId, claim, page, section, snippet, evidenceType, confidence, verificationStatus, location, createdBy } = body;

    if (!projectId || !claim) {
      return NextResponse.json({ error: 'projectId and claim are required' }, { status: 400 });
    }

    const paper = paperId ? db.getPaperById(paperId) : undefined;

    const newEvidence: Evidence = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      paperId: paperId || '',
      paperTitle: paper ? paper.title : body.paperTitle || 'External Scholarly Source',
      claim,
      page: page || 1,
      section: section || 'General Content',
      snippet: snippet || '',
      evidenceType: evidenceType || 'empirical',
      confidence: confidence ?? 0.9,
      verificationStatus: verificationStatus || 'supported',
      location: location || `${section || 'Section'} → Page ${page || 1}`,
      createdBy: createdBy || 'Lead Researcher',
      createdAt: new Date().toISOString(),
    };

    const saved = db.createEvidence(newEvidence);
    return NextResponse.json({ evidence: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'Evidence id is required' }, { status: 400 });
    }

    const updated = db.updateEvidence(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Evidence record not found' }, { status: 404 });
    }
    return NextResponse.json({ evidence: updated });
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

  const success = db.deleteEvidence(id);
  return NextResponse.json({ success });
}
