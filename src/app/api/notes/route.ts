import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ResearchNote } from '@/lib/db/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const notes = db.getNotes(projectId);
  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, title, content, tags, linkedPaperId, linkedEvidenceId, linkedGapId, linkedExperimentId } = body;

    if (!projectId || !title) {
      return NextResponse.json({ error: 'projectId and title are required' }, { status: 400 });
    }

    const newNote: ResearchNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      title,
      content: content || '',
      tags: Array.isArray(tags) ? tags : [],
      linkedPaperId: linkedPaperId || undefined,
      linkedEvidenceId: linkedEvidenceId || undefined,
      linkedGapId: linkedGapId || undefined,
      linkedExperimentId: linkedExperimentId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = db.createNote(newNote);
    return NextResponse.json({ note: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'Note id is required' }, { status: 400 });
    }

    const updated = db.updateNote(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    return NextResponse.json({ note: updated });
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

  const success = db.deleteNote(id);
  return NextResponse.json({ success });
}
