import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { researchChatEngine } from '@/lib/ai/chatEngine';
import { getSessionUser } from '@/lib/auth/session';
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
    const user = getSessionUser(req);
    const body = await req.json();
    const {
      sessionId,
      projectId,
      content,
      scope = 'project',
      paperId,
      searchAcrossLibrary = false,
      stream = false,
      clientPapers,
      clientChunks,
    } = body;

    if (!sessionId || !projectId || !content) {
      return NextResponse.json(
        { error: 'sessionId, projectId, and content are required' },
        { status: 400 }
      );
    }

    // Synchronize clientPapers into db if not present in this serverless container
    if (clientPapers && Array.isArray(clientPapers)) {
      for (const p of clientPapers) {
        if (!db.getPaperById(p.id)) {
          db.createPaper(p);
        }
      }
    }

    // Synchronize clientChunks into db if not present in this serverless container
    if (clientChunks && Array.isArray(clientChunks) && clientChunks.length > 0) {
      const existingChunkIds = new Set(db.getChunksByProject(projectId).map((c) => c.id));
      const chunksToAdd = clientChunks
        .filter((c: any) => !existingChunkIds.has(c.id))
        .map((c: any) => ({
          ...c,
          user_id: c.user_id || c.userId || user?.id || 'usr_default',
          userId: c.userId || c.user_id || user?.id || 'usr_default',
          project_id: c.project_id || c.projectId || projectId,
          projectId: c.projectId || c.project_id || projectId,
          document_id: c.document_id || c.documentId || `doc-${c.paperId || c.paper_id}`,
          documentId: c.documentId || c.document_id || `doc-${c.paperId || c.paper_id}`,
          page_number: c.page_number || c.pageNumber || 1,
          pageNumber: c.pageNumber || c.page_number || 1,
          section: c.section || c.sectionName || 'Document Section',
          sectionName: c.sectionName || c.section || 'Document Section',
        }));
      if (chunksToAdd.length > 0) {
        db.addChunks(chunksToAdd);
      }
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

    // 3. Generate Evidence-Grounded AI Response with Strict Isolation
    const result = await researchChatEngine.generateResponse({
      sessionId,
      projectId,
      userId: user?.id,
      scope,
      paperId,
      searchAcrossLibrary,
      userMessage: content,
      history,
      clientPapers,
      clientChunks,
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

    // 5. Persist thread state: scope, paperId, searchAcrossLibrary
    // This ensures Single Paper mode persists across all messages in the thread
    const session = db.getChatSessionById(sessionId);
    const sessionUpdates: Record<string, any> = {};

    // Always persist the scope and paperId the user explicitly selected
    if (scope) sessionUpdates.scope = scope;
    if (scope === 'paper' && paperId) {
      sessionUpdates.paperId = paperId;
      // Find paper title for display
      const allPapers = [...db.getPapers(projectId), ...(clientPapers || [])];
      const targetPaper = allPapers.find((p: any) => p.id === paperId) || db.getPaperById(paperId);
      if (targetPaper) sessionUpdates.paperTitle = targetPaper.title;
    }
    if (searchAcrossLibrary !== undefined) {
      sessionUpdates.searchAcrossLibrary = searchAcrossLibrary;
    }

    // Auto-title: if session title is default and this is first user message
    if (session && (session.title === 'New Research Conversation' || !session.title)) {
      sessionUpdates.title = content.substring(0, 36) + (content.length > 36 ? '...' : '');
    }

    if (Object.keys(sessionUpdates).length > 0) {
      db.updateChatSession(sessionId, sessionUpdates);
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
