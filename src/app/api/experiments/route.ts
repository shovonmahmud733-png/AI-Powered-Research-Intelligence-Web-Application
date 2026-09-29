import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MLExperiment } from '@/lib/db/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
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
