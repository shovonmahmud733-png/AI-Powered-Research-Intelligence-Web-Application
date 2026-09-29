import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ResearchMemoryItem } from '@/lib/db/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const memory = db.getMemory(projectId);
  return NextResponse.json({ memory });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, category, content, context, date } = body;

    if (!projectId || !content) {
      return NextResponse.json({ error: 'projectId and content are required' }, { status: 400 });
    }

    const newItem: ResearchMemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      category: category || 'decision',
      content,
      context: context || '',
      date: date || new Date().toISOString().split('T')[0],
    };

    const saved = db.createMemory(newItem);
    return NextResponse.json({ memoryItem: saved }, { status: 201 });
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

  const success = db.deleteMemory(id);
  return NextResponse.json({ success });
}
