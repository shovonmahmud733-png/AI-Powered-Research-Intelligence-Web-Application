import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { researchChatEngine } from '../src/lib/ai/chatEngine';
import { db } from '../src/lib/db';
import { DEMO_PROJECT_ID } from '../src/lib/db/seedData';
import { POST as messagesPOST } from '../src/app/api/chat/messages/route';
import { POST as regeneratePOST } from '../src/app/api/chat/messages/regenerate/route';
import { OpenAIProvider } from '../src/lib/ai/provider';

describe('Chatbot Regression & Root-Cause Verification Test Suite', () => {
  const originalEnv = process.env;
  const testProjectId = DEMO_PROJECT_ID;
  const paper1Id = 'paper-demo-01';
  const paper2Id = 'paper-demo-02';

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Greeting & Capabilities
  // --------------------------------------------------------------------------
  it('Scenario 1: Friendly greeting does not short-circuit to "Insufficient evidence in [Project]"', async () => {
    const greetings = ['Hello, what can you do?', 'Hi', 'Hey', 'Good morning', 'Who are you?'];

    for (const g of greetings) {
      const res = await researchChatEngine.generateResponse({
        projectId: testProjectId,
        prompt: g,
        scope: 'project',
        history: [],
      });

      expect(res).toBeDefined();
      expect(res.content).toBeDefined();
      // Must NOT return the broken insufficient evidence error
      expect(res.content.toLowerCase()).not.toContain('insufficient evidence in');
      // Must introduce capabilities
      expect(
        res.content.toLowerCase().includes('copilot') ||
        res.content.toLowerCase().includes('research') ||
        res.content.toLowerCase().includes('assist')
      ).toBe(true);
      // Sources drawer should be clean and empty
      expect(res.sources).toHaveLength(0);
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 2: General Scientific Concept Definition
  // --------------------------------------------------------------------------
  it('Scenario 2: General scientific questions return sound definitions without paper rejection', async () => {
    const conceptQueries = [
      'What is a neural network?',
      'What is machine learning?',
      'Explain precision and recall',
    ];

    for (const q of conceptQueries) {
      const res = await researchChatEngine.generateResponse({
        projectId: testProjectId,
        prompt: q,
        scope: 'project',
        history: [],
      });

      expect(res).toBeDefined();
      expect(res.content).toBeDefined();
      // Must NOT short-circuit to Insufficient evidence
      expect(res.content.toLowerCase()).not.toContain('insufficient evidence in');
      // Must explain the concept
      expect(res.content.length).toBeGreaterThan(50);
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Single Paper Isolation - Paper A
  // --------------------------------------------------------------------------
  it('Scenario 3: Single Paper Mode strictly isolates Paper A chunks', async () => {
    const res = await researchChatEngine.generateResponse({
      projectId: testProjectId,
      paperId: paper1Id,
      prompt: 'What dataset was used in this study?',
      scope: 'paper',
      searchAcrossLibrary: false,
      history: [],
    });

    expect(res).toBeDefined();
    expect(res.sources.length).toBeGreaterThan(0);
    // Every single source must belong exclusively to paper1Id
    for (const src of res.sources) {
      expect(src.paperId).toBe(paper1Id);
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Single Paper Isolation - Paper B
  // --------------------------------------------------------------------------
  it('Scenario 4: Single Paper Mode strictly isolates Paper B chunks', async () => {
    const res = await researchChatEngine.generateResponse({
      projectId: testProjectId,
      paperId: paper2Id,
      prompt: 'What dataset was used in this study?',
      scope: 'paper',
      searchAcrossLibrary: false,
      history: [],
    });

    expect(res).toBeDefined();
    expect(res.sources.length).toBeGreaterThan(0);
    // Every single source must belong exclusively to paper2Id
    for (const src of res.sources) {
      expect(src.paperId).toBe(paper2Id);
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Missing Evidence in Single Paper Mode
  // --------------------------------------------------------------------------
  it('Scenario 5: Completely unevidenced inquiry in single paper returns clean "Insufficient evidence in the selected paper."', async () => {
    const res = await researchChatEngine.generateResponse({
      projectId: testProjectId,
      paperId: paper1Id,
      prompt: 'What was the liquid nitrogen cooling temperature for the quantum cryostat in the laboratory?',
      scope: 'paper',
      searchAcrossLibrary: false,
      history: [],
    });

    expect(res).toBeDefined();
    expect(res.content).toContain('Insufficient evidence in the selected paper.');
    expect(res.sources).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Multi-turn Pronoun Resolution & History Passing
  // --------------------------------------------------------------------------
  it('Scenario 6: Multi-turn history is preserved and accessible across turns', async () => {
    const session = await db.createChatSession({
      projectId: testProjectId,
      title: 'Multi-turn Test Session',
      scope: 'project',
    });

    const mockHistory = [
      {
        id: 'msg-1',
        sessionId: session.id,
        role: 'user' as const,
        content: 'What dataset was curated in the Chittagonian dialect study?',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'msg-2',
        sessionId: session.id,
        role: 'assistant' as const,
        content: 'The authors curated a benchmark corpus of 5,000 annotated Chittagonian sentences from social media.',
        createdAt: new Date().toISOString(),
      },
    ];

    const res = await researchChatEngine.generateResponse({
      sessionId: session.id,
      projectId: testProjectId,
      prompt: 'How was it preprocessed and normalized?',
      scope: 'project',
      history: mockHistory,
    });

    expect(res).toBeDefined();
    expect(res.content.length).toBeGreaterThan(30);
    expect(
      res.content.toLowerCase().includes('preprocess') ||
      res.content.toLowerCase().includes('corpus') ||
      res.content.toLowerCase().includes('data')
    ).toBe(true);

    await db.deleteChatSession(session.id);
  });

  // --------------------------------------------------------------------------
  // Scenario 7: No Template Payload Leakage
  // --------------------------------------------------------------------------
  it('Scenario 7: Response does NOT leak internal prompt template payload to user', async () => {
    const res = await researchChatEngine.generateResponse({
      projectId: testProjectId,
      paperId: paper1Id,
      prompt: 'What are the main results and evaluation metrics in this paper?',
      scope: 'paper',
      history: [],
    });

    expect(res).toBeDefined();
    // Must NOT contain internal prompt markers
    expect(res.content).not.toContain('Project Field:');
    expect(res.content).not.toContain('Active Research Questions:');
    expect(res.content).not.toContain('Retrieved Paper Chunks:');
    expect(res.content).not.toContain('Structured Literature Matrix:');
    expect(res.content).not.toContain('Researcher Inquiry:');
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Limitations Extraction
  // --------------------------------------------------------------------------
  it('Scenario 8: Limitations query returns grounded limitations and accurate sources', async () => {
    const res = await researchChatEngine.generateResponse({
      projectId: testProjectId,
      paperId: paper1Id,
      prompt: 'What are the limitations of this paper?',
      scope: 'paper',
      history: [],
    });

    expect(res).toBeDefined();
    expect(res.content.toLowerCase()).toContain('limitation');
    expect(res.sources.length).toBeGreaterThan(0);
    const hasLimSection = res.sources.some((s) => s.section && s.section.toLowerCase().includes('limit'));
    expect(hasLimSection).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Cross-paper Comparison
  // --------------------------------------------------------------------------
  it('Scenario 9: Cross-paper comparative analysis synthesizes multiple documents', async () => {
    const res = await researchChatEngine.generateResponse({
      projectId: testProjectId,
      prompt: 'Compare XLM-R and BanglaBERT performance on low-resource dialects',
      scope: 'project',
      history: [],
    });

    expect(res).toBeDefined();
    expect(res.content.toLowerCase()).toContain('compar');
    expect(res.sources.length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // Scenario 10: AI OFF Mode Preserved
  // --------------------------------------------------------------------------
  it('Scenario 10: AI OFF mode explicitly rejects generation with HTTP 400', async () => {
    const req = new Request('http://localhost:3000/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'sess-test-off',
        projectId: testProjectId,
        content: 'Hello, explain AI',
        aiAssistanceEnabled: false,
      }),
    });

    const res = await messagesPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('AI assistance is currently disabled');
  });

  // --------------------------------------------------------------------------
  // Scenario 11: Oversized Message Input Gracefully Rejected
  // --------------------------------------------------------------------------
  it('Scenario 11: Oversized message (> 10,000 characters) is rejected with HTTP 400', async () => {
    const giantPrompt = 'A'.repeat(12000);

    const req = new Request('http://localhost:3000/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'sess-test-overflow',
        projectId: testProjectId,
        content: giantPrompt,
      }),
    });

    const res = await messagesPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('maximum allowed limit');
  });

  // --------------------------------------------------------------------------
  // Scenario 12: Provider Health & Error Integrity
  // --------------------------------------------------------------------------
  it('Scenario 12: Never disguises invalid OpenAI credentials as local reasoning engine success', async () => {
    process.env.OPENAI_API_KEY = 'sk-invalid-key-regression-test';
    const provider = new OpenAIProvider();

    // Health check must report authentication_failed
    const health = await provider.checkHealth();
    expect(health.configured).toBe(true);
    expect(
      health.status === 'authentication_failed' ||
      health.status === 'error' ||
      health.status === 'model_inaccessible'
    ).toBe(true);
  });
});
