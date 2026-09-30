import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ChatSession } from '@/lib/db/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const sessions = db.getChatSessions(projectId);
  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, title, scope = 'project', paperId, paperTitle, searchAcrossLibrary = false } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const newSession: ChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      title: title || (scope === 'paper' && paperTitle ? `Discussion: ${paperTitle.substring(0, 35)}...` : 'New Research Conversation'),
      scope,
      paperId: paperId || undefined,
      paperTitle: paperTitle || undefined,
      searchAcrossLibrary: searchAcrossLibrary || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = db.createChatSession(newSession);
    return NextResponse.json({ session: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, title, scope, paperId, paperTitle, searchAcrossLibrary } = body;
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const updates: Partial<ChatSession> = {};
    if (title !== undefined) updates.title = title;
    if (scope !== undefined) updates.scope = scope;
    if (paperId !== undefined) updates.paperId = paperId;
    if (paperTitle !== undefined) updates.paperTitle = paperTitle;
    if (searchAcrossLibrary !== undefined) updates.searchAcrossLibrary = searchAcrossLibrary;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
    }

    const updated = db.updateChatSession(sessionId, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const success = db.deleteChatSession(sessionId);
  return NextResponse.json({ success });
}
