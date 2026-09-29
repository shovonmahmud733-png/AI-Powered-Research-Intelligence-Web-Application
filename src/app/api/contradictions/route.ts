import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Contradiction } from '@/lib/db/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const contradictions = db.getContradictions(projectId);
  return NextResponse.json({ contradictions });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, topic, paperAId, claimA, evidenceA, pageA, paperBId, claimB, evidenceB, pageB, potentialReasons, notes } = body;

    if (!projectId || !topic || !paperAId || !paperBId) {
      return NextResponse.json({ error: 'projectId, topic, paperAId, and paperBId are required' }, { status: 400 });
    }

    const paperA = db.getPaperById(paperAId);
    const paperB = db.getPaperById(paperBId);

    const newContradiction: Contradiction = {
      id: `contra-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      topic,
      paperAId,
      paperATitle: paperA ? paperA.title : 'First Compared Paper',
      claimA: claimA || '',
      evidenceA: evidenceA || '',
      pageA: pageA || 1,
      paperBId,
      paperBTitle: paperB ? paperB.title : 'Second Compared Paper',
      claimB: claimB || '',
      evidenceB: evidenceB || '',
      pageB: pageB || 1,
      potentialReasons: Array.isArray(potentialReasons) ? potentialReasons : ['Differences in evaluation dataset', 'Variance in preprocessing pipelines'],
      notes: notes || '',
    };

    const saved = db.createContradiction(newContradiction);
    return NextResponse.json({ contradiction: saved }, { status: 201 });
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

  const success = db.deleteContradiction(id);
  return NextResponse.json({ success });
}
