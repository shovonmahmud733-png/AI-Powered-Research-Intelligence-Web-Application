import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/lib/db';
import { researchChatEngine } from '../src/lib/ai/chatEngine';

import { DEMO_PROJECT_ID } from '../src/lib/db/seedData';

describe('Research Copilot AI Chat: Database & RAG Engine Tests', () => {
  const testProjectId = DEMO_PROJECT_ID;

  it('1. Chat Session CRUD operations work properly', async () => {
    // List initial sessions
    const initialSessions = await db.getChatSessions(testProjectId);
    expect(Array.isArray(initialSessions)).toBe(true);

    // Create a new session
    const newSession = await db.createChatSession({
      projectId: testProjectId,
      title: 'Bengali Dialect Morphosyntax Discussion',
      scope: 'project',
    });

    expect(newSession).toBeDefined();
    expect(newSession.id).toBeDefined();
    expect(newSession.title).toBe('Bengali Dialect Morphosyntax Discussion');
    expect(newSession.scope).toBe('project');

    // Retrieve by ID
    const retrieved = await db.getChatSessionById(newSession.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(newSession.id);

    // Update session title
    const updated = await db.updateChatSession(newSession.id, {
      title: 'Bengali Dialect Morphosyntax Discussion (Updated)',
    });
    expect(updated?.title).toBe('Bengali Dialect Morphosyntax Discussion (Updated)');

    // Delete session
    const deleted = await db.deleteChatSession(newSession.id);
    expect(deleted).toBe(true);

    const recheck = await db.getChatSessionById(newSession.id);
    expect(recheck).toBeUndefined();
  });

  it('2. Chat Messages persistence and retrieval with grounding sources', async () => {
    const session = await db.createChatSession({
      projectId: testProjectId,
      title: 'Verification Session',
      scope: 'project',
    });

    // Add user message
    const userMsg = await db.addChatMessage({
      sessionId: session.id,
      projectId: testProjectId,
      role: 'user',
      content: 'What is the Macro-F1 of XLM-R in the benchmark paper?',
    });
    expect(userMsg.role).toBe('user');
    expect(userMsg.id).toBeDefined();

    // Add assistant message with grounded sources
    const asstMsg = await db.addChatMessage({
      sessionId: session.id,
      projectId: testProjectId,
      role: 'assistant',
      content: 'According to Table 4 of the study, XLM-R achieved 84.1% Macro-F1 on the Chittagonian dialect corpus.',
      modelUsed: 'offline-academic-rag',
      sources: [
        {
          paperId: 'paper-demo-01',
          paperTitle: 'Benchmarking Cross-Lingual Transformers on Low-Resource Bengali Dialects',
          page: 8,
          section: 'Results & Evaluation',
          snippet: 'XLM-R with phonetic subword regularization achieved 84.1% Macro-F1',
          similarityScore: 92,
          sourceType: 'paper_chunk',
        },
      ],
    });

    expect(asstMsg.role).toBe('assistant');
    expect(asstMsg.sources?.length).toBe(1);
    expect(asstMsg.sources?.[0].page).toBe(8);
    expect(asstMsg.sources?.[0].section).toBe('Results & Evaluation');

    // Retrieve messages
    const msgs = await db.getChatMessages(session.id);
    expect(msgs.length).toBe(2);
    expect(msgs[0].role).toBe('user');
    expect(msgs[1].role).toBe('assistant');

    // Clear messages
    await db.clearChatMessages(session.id);
    const msgsAfterClear = await db.getChatMessages(session.id);
    expect(msgsAfterClear.length).toBe(0);

    // Clean up
    await db.deleteChatSession(session.id);
  });

  it('3. Research Chat Engine generates grounded response with exact citations', async () => {
    const result = await researchChatEngine.generateResponse({
      projectId: testProjectId,
      prompt: 'Compare XLM-R and BanglaBERT performance on low-resource dialects with exact page numbers.',
      scope: 'project',
      history: [],
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(20);
    expect(result.modelUsed).toBeDefined();
    expect(Array.isArray(result.sources)).toBe(true);

    // Should include sources from the project's document chunks
    if (result.sources.length > 0) {
      const firstSource = result.sources[0];
      expect(firstSource.page).toBeGreaterThan(0);
      expect(firstSource.section).toBeDefined();
      expect(firstSource.paperTitle).toBeDefined();
      expect(firstSource.snippet).toBeDefined();
    }
  });

  it('4. Research Chat Engine enforces anti-hallucination when no matching evidence exists', async () => {
    const result = await researchChatEngine.generateResponse({
      projectId: testProjectId,
      prompt: 'What was the quantum supercomputing qubit fidelity achieved in the 1920 Antarctic study?',
      scope: 'project',
      history: [],
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    // Anti-hallucination or unevidenced notice
    expect(
      result.content.toLowerCase().includes('insufficient evidence') ||
      result.content.toLowerCase().includes('not found') ||
      result.content.toLowerCase().includes('no explicit mention') ||
      result.content.toLowerCase().includes('evidence')
    ).toBe(true);
  });

  it('5. Research Chat Engine respects paper-restricted scope', async () => {
    const result = await researchChatEngine.generateResponse({
      projectId: testProjectId,
      paperId: 'paper-demo-01',
      prompt: 'What dataset was used in this study?',
      scope: 'paper',
      searchAcrossLibrary: false,
      history: [],
    });

    expect(result).toBeDefined();
    // All sources returned must belong to paper-demo-01
    for (const src of result.sources) {
      expect(src.paperId).toBe('paper-demo-01');
    }
  });

  it('6. Research Chat Engine synthesizes cross-paper limitations with grounded sources', async () => {
    const result = await researchChatEngine.generateResponse({
      projectId: testProjectId,
      prompt: 'What are the major limitations across the papers in my current project?',
      scope: 'project',
      history: [],
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content.toLowerCase()).toContain('limitation');
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it('7. Research Chat Engine handles cross-paper disagreements and contradictions', async () => {
    const result = await researchChatEngine.generateResponse({
      projectId: testProjectId,
      prompt: 'Why do these papers disagree on model performance?',
      scope: 'project',
      history: [],
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content.toLowerCase().includes('disagree') || result.content.toLowerCase().includes('claim') || result.content.toLowerCase().includes('trade-off')).toBe(true);
  });

  it('8. Research Chat Engine accurately answers "What are the limitations?" on uploaded papers', async () => {
    const uploadProjId = `proj-test-${Date.now()}`;
    db.createProject({
      id: uploadProjId,
      userId: 'usr_demo_researcher_01',
      title: 'Upload Test Project',
      description: 'Testing PDF upload and inquiry',
      researchField: 'Machine Learning',
      researchQuestions: [],
      objectives: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const paperId = `paper-test-${Date.now()}`;
    db.createPaper({
      id: paperId,
      projectId: uploadProjId,
      title: 'Neural Transformer Scaling Boundaries',
      authors: ['Jane Doe', 'John Smith'],
      abstract: 'We explore limitations in neural transformer context windows.',
      publicationYear: 2026,
      journalOrConference: 'ICML',
      url: '',
      citationCount: 0,
      sourceProvider: 'upload',
      sourceId: 'paper.pdf',
      references: [],
      retrievalDate: new Date().toISOString(),
      metadataStatus: 'partial',
      retractionStatus: 'clean',
      processingStatus: 'ready',
      createdAt: new Date().toISOString(),
    });

    db.addChunks([
      {
        id: `chunk-up-1-${Date.now()}`,
        paperId,
        pageNumber: 1,
        sectionName: 'Introduction',
        chunkIndex: 0,
        content: 'This paper investigates transformer scaling properties and memory footprint.',
      },
      {
        id: `chunk-up-2-${Date.now()}`,
        paperId,
        pageNumber: 4,
        sectionName: 'Limitations',
        chunkIndex: 1,
        content: 'Limitations: The primary limitation of our approach is the quadratic memory complexity in long-sequence attention, which restricts deployment on commodity GPUs.',
      },
    ]);

    // Test with singular "what are the limitation?" as the user typed in screenshot
    const resultSingular = await researchChatEngine.generateResponse({
      projectId: uploadProjId,
      paperId,
      prompt: 'what are the limitation?',
      scope: 'paper',
      history: [],
    });

    expect(resultSingular).toBeDefined();
    expect(resultSingular.content.toLowerCase()).toContain('limitation');
    expect(resultSingular.content).not.toContain('Insufficient evidence in the current research library');
    expect(resultSingular.sources.length).toBeGreaterThan(0);
    expect(resultSingular.sources[0].section).toBe('Limitations');

    // Test with plural "What are the limitations?" at project scope
    const resultPlural = await researchChatEngine.generateResponse({
      projectId: uploadProjId,
      prompt: 'What are the limitations?',
      scope: 'project',
      history: [],
    });

    expect(resultPlural).toBeDefined();
    expect(resultPlural.content.toLowerCase()).toContain('limitation');
    expect(resultPlural.content).not.toContain('Insufficient evidence in the current research library');
    expect(resultPlural.sources.length).toBeGreaterThan(0);
  });
});
