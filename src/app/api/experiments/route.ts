import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MLExperiment } from '@/lib/db/types';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const user = getSessionUser(req);
  if (!db.isProjectAccessible(projectId, user?.id)) {
    return NextResponse.json(
      { error: 'Forbidden: Access denied to experiments in this project' },
      { status: 403 }
    );
  }

  const experiments = db.getExperiments(projectId);
  return NextResponse.json({ experiments });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, name, model, dataset, version, hyperparameters, metrics, status, notes, linkedPaperId } = body;

    if (!projectId || !name) {
      return NextResponse.json({ error: 'projectId and name are required' }, { status: 400 });
    }

    const user = getSessionUser(req);
    if (!db.isProjectAccessible(projectId, user?.id)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to log experiments in this project' },
        { status: 403 }
      );
    }

    const newExperiment: MLExperiment = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      name,
      model: model || 'transformer-baseline',
      dataset: dataset || 'Benchmark Dataset',
      version: version || 'v1.0.0',
      hyperparameters: hyperparameters || {},
      metrics: metrics || {},
      status: status || 'completed',
      notes: notes || '',
      linkedPaperId: linkedPaperId || undefined,
      createdAt: new Date().toISOString(),
    };

    const saved = db.createExperiment(newExperiment);
    return NextResponse.json({ experiment: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'Experiment id is required' }, { status: 400 });
    }

    const existing = db.getExperiments('').find(e => e.id === id);
    if (existing) {
      const user = getSessionUser(req);
      if (!db.isProjectAccessible(existing.projectId, user?.id)) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to modify this experiment' },
          { status: 403 }
        );
      }
    }

    const updated = db.updateExperiment(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }
    return NextResponse.json({ experiment: updated });
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

  const success = db.deleteExperiment(id);
  return NextResponse.json({ success });
}
