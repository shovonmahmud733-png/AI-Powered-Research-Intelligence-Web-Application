import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { researchChatEngine } from '@/lib/ai/chatEngine';
import { ChatMessage } from '@/lib/db/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const messages = db.getChatMessages(sessionId);
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, projectId, content, scope = 'project', paperId, stream = false } = body;

    if (!sessionId || !projectId || !content) {
      return NextResponse.json(
        { error: 'sessionId, projectId, and content are required' },
        { status: 400 }
      );
    }

    // 1. Record User Message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      sessionId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    db.addChatMessage(userMessage);

    // 2. Fetch history
    const history = db.getChatMessages(sessionId);

    // 3. Generate Evidence-Grounded AI Response
    const result = await researchChatEngine.generateResponse({
      sessionId,
      projectId,
      scope,
      paperId,
      userMessage: content,
      history,
    });

    // 4. Record Assistant Message
    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now() + 10}-${Math.random().toString(36).substring(2, 5)}`,
      sessionId,
      role: 'assistant',
      content: result.content,
      sources: result.sources,
      interpretationNotes: result.interpretationNotes,
      unverifiedWarnings: result.unverifiedWarnings,
      createdAt: new Date().toISOString(),
    };
    db.addChatMessage(assistantMessage);

    // If session title is default and this is first user message, update session title
    const session = db.getChatSessionById(sessionId);
    if (session && (session.title === 'New Research Conversation' || !session.title)) {
      db.updateChatSession(sessionId, {
        title: content.substring(0, 36) + (content.length > 36 ? '...' : ''),
      });
    }

    return NextResponse.json({
      userMessage,
      assistantMessage,
      modelUsed: result.modelUsed,
    });
  } catch (err: any) {
    console.error('Chat message processing error:', err);
    return NextResponse.json({ error: err.message || 'Chat generation failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const success = db.clearChatMessages(sessionId);
  return NextResponse.json({ success });
}
