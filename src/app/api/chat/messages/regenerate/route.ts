import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { researchChatEngine } from '@/lib/ai/chatEngine';

export async function POST(req: Request) {
  try {
    const { sessionId, projectId, scope = 'project', paperId } = await req.json();

    if (!sessionId || !projectId) {
      return NextResponse.json({ error: 'sessionId and projectId are required' }, { status: 400 });
    }

    const messages = db.getChatMessages(sessionId);
    if (messages.length === 0) {
      return NextResponse.json({ error: 'No messages to regenerate in this session' }, { status: 400 });
    }

    // Find last user message
    let lastUserMessage = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessage = messages[i].content;
        break;
      }
    }

    if (!lastUserMessage) {
      return NextResponse.json({ error: 'No user message found to regenerate' }, { status: 400 });
    }

    // Generate new response
    const result = await researchChatEngine.generateResponse({
      sessionId,
      projectId,
      scope,
      paperId,
      userMessage: lastUserMessage,
      history: messages,
    });

    // Record as new assistant message or update last assistant message
    const newAssistantMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      sessionId,
      role: 'assistant' as const,
      content: result.content,
      sources: result.sources,
      interpretationNotes: result.interpretationNotes,
      unverifiedWarnings: result.unverifiedWarnings,
      createdAt: new Date().toISOString(),
    };

    db.addChatMessage(newAssistantMessage);

    return NextResponse.json({
      assistantMessage: newAssistantMessage,
      modelUsed: result.modelUsed,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
