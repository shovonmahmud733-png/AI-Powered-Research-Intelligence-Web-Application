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
    const {
      projectId,
      topic,
      paperAId,
      claimA,
      evidenceA,
      pageA,
      sectionA,
      paperBId,
      claimB,
      evidenceB,
      pageB,
      sectionB,
      potentialReasons,
      notes,
      status,
      conflictCategory,
    } = body;

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
      pageA: typeof pageA === 'number' ? pageA : parseInt(pageA, 10) || 1,
      sectionA: sectionA || undefined,
      paperBId,
      paperBTitle: paperB ? paperB.title : 'Second Compared Paper',
      claimB: claimB || '',
      evidenceB: evidenceB || '',
      pageB: typeof pageB === 'number' ? pageB : parseInt(pageB, 10) || 1,
      sectionB: sectionB || undefined,
      potentialReasons: Array.isArray(potentialReasons) && potentialReasons.length > 0 ? potentialReasons : ['Differences in evaluation dataset', 'Variance in preprocessing pipelines'],
      notes: notes || '',
      status: status || 'detected',
      conflictCategory: conflictCategory || 'methodological_divergence',
      createdAt: new Date().toISOString(),
    };

    const saved = db.createContradiction(newContradiction);
    return NextResponse.json({ contradiction: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, updates } = body;
    if (!id || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'id and updates object are required' }, { status: 400 });
    }

    const updated = db.updateContradiction(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Contradiction not found' }, { status: 404 });
    }

    return NextResponse.json({ contradiction: updated });
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
