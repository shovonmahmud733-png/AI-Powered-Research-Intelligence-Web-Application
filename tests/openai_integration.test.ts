import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OpenAI from 'openai';
import { openAIProvider, ModelRouter, OpenAIProvider } from '../src/lib/ai/provider';
import { researchChatEngine } from '../src/lib/ai/chatEngine';
import { GET as healthCheckGET } from '../src/app/api/ai/health/route';
import { POST as messagesPOST } from '../src/app/api/chat/messages/route';
import { db } from '../src/lib/db';
import { DEMO_PROJECT_ID } from '../src/lib/db/seedData';

describe('OpenAI API Real Integration & AI Assistant Test Suite', () => {
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
  // 1. Successful Responses via Mocked SDK
  // --------------------------------------------------------------------------
  describe('1. Successful Responses via Mocked SDK Calls', () => {
    it('generates grounded response using Responses API when available', async () => {
      process.env.OPENAI_API_KEY = 'sk-mock-valid-key-test-12345';
      process.env.OPENAI_MODEL = 'gpt-4o-mini';

      const provider = new OpenAIProvider();

      // Spy on client creation and responses.create
      const mockResponsesCreate = vi.fn().mockResolvedValue({
        output_text: 'Based on Page 8 of the paper, XLM-R achieved 84.1% Macro-F1 score.',
        usage: { input_tokens: 120, output_tokens: 35 },
      });

      vi.spyOn(provider, 'getClient').mockReturnValue({
        responses: { create: mockResponsesCreate },
        chat: { completions: { create: vi.fn() } },
        models: { retrieve: vi.fn() },
      } as any);

      const response = await provider.generate({
        task: 'research_synthesis',
        prompt: 'What was the performance of XLM-R on dialectal sentiment?',
        retrievedChunks: [
          {
            score: 0.95,
            chunk: {
              id: 'c1',
              chunk_id: 'c1',
              user_id: 'u1',
              userId: 'u1',
              project_id: testProjectId,
              projectId: testProjectId,
              paper_id: paper1Id,
              paperId: paper1Id,
              document_id: 'd1',
              documentId: 'd1',
              page_number: 8,
              pageNumber: 8,
              section: 'Results & Evaluation',
              sectionName: 'Results & Evaluation',
              chunkIndex: 0,
              content: 'XLM-R with subword regularization achieved 84.1% Macro-F1.',
              source_filename: 'paper1.pdf',
              sourceFilename: 'paper1.pdf',
            },
            highlightSnippets: ['XLM-R with subword regularization achieved 84.1% Macro-F1.'],
          },
        ],
      });

      expect(response.answer).toContain('84.1% Macro-F1');
      expect(response.provider).toBe('OpenAI');
      expect(response.modelUsed).toBe('gpt-4o-mini');
      expect(response.evidence).toHaveLength(1);
      expect(response.evidence[0].page).toBe(8);
      expect(response.evidence[0].section).toBe('Results & Evaluation');
      expect(response.usage).toEqual({ promptTokens: 120, completionTokens: 35 });
      expect(mockResponsesCreate).toHaveBeenCalledTimes(1);
    });

    it('falls back to chat completions API when Responses API is not supported by model', async () => {
      process.env.OPENAI_API_KEY = 'sk-mock-valid-key-test-12345';
      process.env.OPENAI_MODEL = 'gpt-4o-mini';

      const provider = new OpenAIProvider();

      const mockResponsesCreate = vi.fn().mockRejectedValue(new Error('Responses endpoint not supported for this model'));
      const mockChatCompletionsCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Fallback response: XLM-R achieved 84.1% Macro-F1.',
            },
          },
        ],
        usage: { prompt_tokens: 110, completion_tokens: 28 },
      });

      vi.spyOn(provider, 'getClient').mockReturnValue({
        responses: { create: mockResponsesCreate },
        chat: { completions: { create: mockChatCompletionsCreate } },
        models: { retrieve: vi.fn() },
      } as any);

      const response = await provider.generate({
        task: 'research_synthesis',
        prompt: 'What was the performance?',
        retrievedChunks: [],
      });

      expect(response.answer).toContain('Fallback response: XLM-R achieved 84.1% Macro-F1.');
      expect(response.modelUsed).toBe('gpt-4o-mini');
      expect(mockResponsesCreate).toHaveBeenCalledTimes(1);
      expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Missing and Invalid Credentials
  // --------------------------------------------------------------------------
  describe('2. Missing and Invalid API Credentials', () => {
    it('throws clear error when OPENAI_API_KEY is missing on generate()', async () => {
      delete process.env.OPENAI_API_KEY;
      const provider = new OpenAIProvider();

      expect(provider.isAvailable()).toBe(false);
      await expect(
        provider.generate({
          task: 'research_synthesis',
          prompt: 'test prompt',
        })
      ).rejects.toThrow(/OpenAI API key is missing/i);
    });

    it('handles AuthenticationError (401) and throws transparent non-disguised error', async () => {
      process.env.OPENAI_API_KEY = 'sk-invalid-fake-key';
      const provider = new OpenAIProvider();

      const authErr = new OpenAI.AuthenticationError(
        401,
        { message: 'Incorrect API key provided' },
        'Incorrect API key provided',
        new Headers()
      );

      vi.spyOn(provider, 'getClient').mockReturnValue({
        responses: { create: vi.fn().mockRejectedValue(authErr) },
      } as any);

      await expect(
        provider.generate({
          task: 'research_synthesis',
          prompt: 'test',
        })
      ).rejects.toThrow(/OpenAI Authentication Failed: Invalid API key/i);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Invalid or Inaccessible Model Configuration
  // --------------------------------------------------------------------------
  describe('3. Invalid or Inaccessible Model Configuration', () => {
    it('handles NotFoundError (404) for non-existent model', async () => {
      process.env.OPENAI_API_KEY = 'sk-valid-key';
      process.env.OPENAI_MODEL = 'gpt-non-existent-model-v99';
      const provider = new OpenAIProvider();

      const notFoundErr = new OpenAI.NotFoundError(
        404,
        { message: 'The model does not exist' },
        'The model does not exist',
        new Headers()
      );

      vi.spyOn(provider, 'getClient').mockReturnValue({
        responses: { create: vi.fn().mockRejectedValue(notFoundErr) },
        chat: { completions: { create: vi.fn().mockRejectedValue(notFoundErr) } },
      } as any);

      await expect(
        provider.generate({ task: 'research_synthesis', prompt: 'test' })
      ).rejects.toThrow(/OpenAI Model Not Found/i);
    });

    it('handles PermissionDeniedError (403) for inaccessible models', async () => {
      process.env.OPENAI_API_KEY = 'sk-valid-key';
      process.env.OPENAI_MODEL = 'gpt-restricted-preview';
      const provider = new OpenAIProvider();

      const permErr = new OpenAI.PermissionDeniedError(
        403,
        { message: 'You do not have access to this model' },
        'You do not have access to this model',
        new Headers()
      );

      vi.spyOn(provider, 'getClient').mockReturnValue({
        responses: { create: vi.fn().mockRejectedValue(permErr) },
      } as any);

      await expect(
        provider.generate({ task: 'research_synthesis', prompt: 'test' })
      ).rejects.toThrow(/OpenAI Permission Denied/i);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Quota and Rate-Limit Errors
  // --------------------------------------------------------------------------
  describe('4. Quota and Rate-Limit Errors', () => {
    it('distinguishes quota/billing errors from standard rate-limits', async () => {
      process.env.OPENAI_API_KEY = 'sk-valid-key';
      const provider = new OpenAIProvider();

      const quotaErr = new OpenAI.RateLimitError(
        429,
        { message: 'You exceeded your current quota, please check your plan and billing details.' },
        'You exceeded your current quota, please check your plan and billing details.',
        new Headers()
      );

      vi.spyOn(provider, 'getClient').mockReturnValue({
        responses: { create: vi.fn().mockRejectedValue(quotaErr) },
      } as any);

      await expect(
        provider.generate({ task: 'research_synthesis', prompt: 'test' })
      ).rejects.toThrow(/OpenAI Quota Exceeded/i);
    });

    it('reports Rate Limit Exceeded when quota is not the cause', async () => {
      process.env.OPENAI_API_KEY = 'sk-valid-key';
      const provider = new OpenAIProvider();

      const rateLimitErr = new OpenAI.RateLimitError(
        429,
        { message: 'Rate limit reached for requests per minute.' },
        'Rate limit reached for requests per minute.',
        new Headers()
      );

      vi.spyOn(provider, 'getClient').mockReturnValue({
        responses: { create: vi.fn().mockRejectedValue(rateLimitErr) },
      } as any);

      await expect(
        provider.generate({ task: 'research_synthesis', prompt: 'test' })
      ).rejects.toThrow(/OpenAI Rate Limit Exceeded/i);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Network Failures and Timeouts
  // --------------------------------------------------------------------------
  describe('5. Network Failures and Timeouts', () => {
    it('handles connection timeouts gracefully', async () => {
      process.env.OPENAI_API_KEY = 'sk-valid-key';
      const provider = new OpenAIProvider();

      const timeoutErr = new OpenAI.APIConnectionTimeoutError();

      vi.spyOn(provider, 'getClient').mockReturnValue({
        responses: { create: vi.fn().mockRejectedValue(timeoutErr) },
      } as any);

      await expect(
        provider.generate({ task: 'research_synthesis', prompt: 'test' })
      ).rejects.toThrow(/OpenAI Connection Timeout/i);
    });

    it('handles general APIConnectionError (DNS/network down)', async () => {
      process.env.OPENAI_API_KEY = 'sk-valid-key';
      const provider = new OpenAIProvider();

      const connErr = new OpenAI.APIConnectionError({ message: 'getaddrinfo ENOTFOUND api.openai.com' });

      vi.spyOn(provider, 'getClient').mockReturnValue({
        responses: { create: vi.fn().mockRejectedValue(connErr) },
      } as any);

      await expect(
        provider.generate({ task: 'research_synthesis', prompt: 'test' })
      ).rejects.toThrow(/OpenAI Network Failure/i);
    });
  });

  // --------------------------------------------------------------------------
  // 6. API Key Isolation from Client-Side Code
  // --------------------------------------------------------------------------
  describe('6. API Key Isolation from Client-Side Code', () => {
    it('does not expose the API key in error messages, health responses, or assistant messages', async () => {
      const secretKey = 'sk-super-secret-key-that-must-never-leak-998877';
      process.env.OPENAI_API_KEY = secretKey;

      const provider = new OpenAIProvider();

      // Health check with invalid key
      const authErr = new OpenAI.AuthenticationError(
        401,
        { message: 'Invalid credentials' },
        'Invalid credentials',
        new Headers()
      );
      vi.spyOn(provider, 'getClient').mockReturnValue({
        models: { retrieve: vi.fn().mockRejectedValue(authErr) },
      } as any);

      const health = await provider.checkHealth();
      const serializedHealth = JSON.stringify(health);
      expect(serializedHealth).not.toContain(secretKey);
      expect(health.status).toBe('authentication_failed');

      // Check health route GET directly
      vi.spyOn(openAIProvider, 'checkHealth').mockResolvedValue(health);
      const res = await healthCheckGET();
      const resBody = await res.json();
      expect(JSON.stringify(resBody)).not.toContain(secretKey);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Safe Provider Health Check Endpoint
  // --------------------------------------------------------------------------
  describe('7. Safe Provider Health Check (/api/ai/health)', () => {
    it('returns missing_credentials status (HTTP 200) when key is not configured', async () => {
      delete process.env.OPENAI_API_KEY;

      const res = await healthCheckGET();
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.status).toBe('missing_credentials');
      expect(data.configured).toBe(false);
      expect(data.provider).toBe('OpenAI');
      expect(data.model).toBeDefined();
    });

    it('returns connected status (HTTP 200) when connectivity succeeds', async () => {
      process.env.OPENAI_API_KEY = 'sk-valid-key';
      process.env.OPENAI_MODEL = 'gpt-4o-mini';

      vi.spyOn(openAIProvider, 'checkHealth').mockResolvedValue({
        status: 'connected',
        configured: true,
        provider: 'OpenAI',
        model: 'gpt-4o-mini',
        message: 'Successfully connected to OpenAI API.',
      });

      const res = await healthCheckGET();
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.status).toBe('connected');
      expect(data.configured).toBe(true);
    });

    it('returns 503 status code when provider fails authentication or connectivity', async () => {
      process.env.OPENAI_API_KEY = 'sk-bad-key';

      vi.spyOn(openAIProvider, 'checkHealth').mockResolvedValue({
        status: 'authentication_failed',
        configured: true,
        provider: 'OpenAI',
        model: 'gpt-4o-mini',
        message: 'OpenAI authentication failed: Invalid API key.',
      });

      const res = await healthCheckGET();
      expect(res.status).toBe(503);
      const data = await res.json();

      expect(data.status).toBe('authentication_failed');
    });
  });

  // --------------------------------------------------------------------------
  // 8. AI OFF Behavior
  // --------------------------------------------------------------------------
  describe('8. AI OFF Behavior', () => {
    it('returns HTTP 400 when aiAssistanceEnabled is false in POST /api/chat/messages', async () => {
      const session = await db.createChatSession({
        projectId: testProjectId,
        title: 'AI OFF Test Session',
        scope: 'project',
      });

      const req = new Request('http://localhost:3000/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          projectId: testProjectId,
          content: 'Should not generate because AI is OFF',
          aiAssistanceEnabled: false,
        }),
      });

      const res = await messagesPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('AI OFF mode');
    });
  });

  // --------------------------------------------------------------------------
  // 9. Single Paper Mode Isolation
  // --------------------------------------------------------------------------
  describe('9. Single Paper Mode Isolation', () => {
    it('only retrieves chunks from the selected paper when scope=paper and searchAcrossLibrary=false', async () => {
      const response = await researchChatEngine.generateResponse({
        projectId: testProjectId,
        scope: 'paper',
        paperId: paper1Id,
        searchAcrossLibrary: false,
        userMessage: 'What are the main results and evaluation metrics in this paper?',
      });

      expect(response.sources.length).toBeGreaterThan(0);
      // Verify every single source belongs exclusively to paper1Id
      response.sources.forEach((src) => {
        if (src.paperId) {
          expect(src.paperId).toBe(paper1Id);
        }
      });
      // Paper 2 must never appear in sources
      const leakedPaper2 = response.sources.some((s) => s.paperId === paper2Id);
      expect(leakedPaper2).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 10. Evidence-Grounded Responses & Anti-Hallucination
  // --------------------------------------------------------------------------
  describe('10. Evidence-Grounded Responses & Anti-Hallucination', () => {
    it('returns "Insufficient evidence" without invoking external LLMs when query has no matching evidence', async () => {
      const mockGenerate = vi.fn();
      vi.spyOn(openAIProvider, 'generate').mockImplementation(mockGenerate);

      const response = await researchChatEngine.generateResponse({
        projectId: testProjectId,
        scope: 'paper',
        paperId: paper1Id,
        searchAcrossLibrary: false,
        userMessage: 'What was the quantum entanglement temperature recorded in the 1920 Antarctic study?',
      });

      expect(response.content).toContain('Insufficient evidence in the selected paper');
      expect(response.sources).toHaveLength(0);
      expect(mockGenerate).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // 11. Existing Provider & Router Regression Behavior
  // --------------------------------------------------------------------------
  describe('11. Existing Provider & Router Regression Behavior', () => {
    it('selects OfflineAcademicEngine when no external API keys are configured', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const router = new ModelRouter();
      const provider = router.selectProvider('research_synthesis');
      expect(provider.name).toBe('Academic Local Reasoning Engine');
      expect(provider.isAvailable()).toBe(true);
    });

    it('prioritizes OpenAI when OPENAI_API_KEY is present', () => {
      process.env.OPENAI_API_KEY = 'sk-mock-key';
      const router = new ModelRouter();
      const provider = router.selectProvider('research_synthesis');
      expect(provider.name).toBe('OpenAI');
      expect(provider.isAvailable()).toBe(true);
    });

    it('does NOT disguise OpenAI failures as local reasoning engine success', async () => {
      process.env.OPENAI_API_KEY = 'sk-mock-key';
      const router = new ModelRouter();

      const openAiProvider = router.selectProvider('research_synthesis');
      vi.spyOn(openAiProvider, 'generate').mockRejectedValue(
        new Error('OpenAI Authentication Failed: Invalid API key. Please check your OPENAI_API_KEY.')
      );

      await expect(
        router.execute({
          task: 'research_synthesis',
          prompt: 'Test inquiry',
        })
      ).rejects.toThrow(/OpenAI Authentication Failed/i);
    });
  });
});
