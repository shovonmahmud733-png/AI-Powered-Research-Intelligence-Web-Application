import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LiteratureMatrixRow } from '@/lib/db/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const rows = db.getMatrixRows(projectId);
  return NextResponse.json({ rows });
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
