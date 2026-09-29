import { describe, it, expect } from 'vitest';
import { db } from '../src/lib/db';
import { scholarlySearch } from '../src/lib/scholarly';
import { vectorStore } from '../src/lib/ai/vectorStore';
import { modelRouter } from '../src/lib/ai/provider';
import { hashPassword, comparePassword, signToken, verifyToken } from '../src/lib/auth/session';

describe('End-to-End Workflow: Complete Research Journey', () => {
  let createdUserId = '';
  let createdProjectId = '';
  let savedPaperId = '';

  // 1. Authentication & Isolation
  it('Phase 1.1: User signs up with hashed credentials and token session', () => {
    const rawPassword = 'SecureLabPassword2025!';
    const hashed = hashPassword(rawPassword);
    expect(comparePassword(rawPassword, hashed)).toBe(true);
    expect(comparePassword('WrongPassword', hashed)).toBe(false);

    const user = db.createUser({
      id: `usr_test_${Date.now()}`,
      name: 'Dr. Alan Turing',
      email: `turing_${Date.now()}@cambridge.edu`,
      passwordHash: hashed,
      institution: 'University of Cambridge NLP Group',
      fieldOfStudy: 'Computational Linguistics',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    createdUserId = user.id;
    const token = signToken({ userId: user.id, email: user.email });
    const verified = verifyToken(token);
    expect(verified?.userId).toBe(user.id);
  });

  // 2. Project Creation
  it('Phase 1.2: Researcher creates isolated project with objectives and research questions', () => {
    const project = db.createProject({
      id: `proj_test_${Date.now()}`,
      userId: createdUserId,
      title: 'Bengali Dialectal Sentiment & Morphological Fragmentation',
      description: 'End-to-end investigation into tokenization and subword regularizers.',
      researchField: 'Computational Linguistics',
      researchQuestions: [
        {
          id: 'rq-test-1',
          question: 'Does subword fragmentation increase on colloquial Chatgaiya verbs?',
          status: 'active',
        },
      ],
      objectives: ['Benchmark 4 transformer baselines on dialect corpus'],
      tags: ['NLP', 'Dialects', 'Transformers'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    createdProjectId = project.id;
    expect(db.getProjectById(createdProjectId)?.title).toBe('Bengali Dialectal Sentiment & Morphological Fragmentation');
  });

  // 3. Academic Paper Discovery & Search
  it('Phase 1.3: Researcher searches academic literature and receives transparent relevance signals', async () => {
    const searchRes = await scholarlySearch.search({
      query: 'subword tokenization Indic sentiment',
      limit: 5,
      projectContext: {
        field: 'Computational Linguistics',
        tags: ['NLP', 'Dialects', 'Transformers'],
      },
    });

    expect(searchRes.papers.length).toBeGreaterThan(0);
    const topPaper = searchRes.papers[0];
    expect(topPaper.relevance.score).toBeGreaterThan(50);
    expect(topPaper.relevance.reasons.length).toBeGreaterThan(0);
  });

  // 4. Save Paper & Deduplication
  it('Phase 1.4: Researcher saves paper into project with DOI deduplication verification', () => {
    const paper = db.createPaper({
      id: `paper_test_${Date.now()}`,
      projectId: createdProjectId,
      doi: '10.1016/demo.chatgaiya.test',
      title: '[DEMO PAPER — NOT A REAL PUBLICATION] Dialectal Morphological Regularization',
      authors: ['Rahman, T.', 'Hossain, M.'],
      abstract: 'We test phonetic regularization on dialectal tokenization.',
      publicationYear: 2024,
      journalOrConference: 'Indic NLP 2024',
      url: 'https://doi.org/10.1016/demo.chatgaiya.test',
      citationCount: 15,
      sourceProvider: 'demo',
      sourceId: 'demo-test',
      references: [],
      retrievalDate: new Date().toISOString(),
      metadataStatus: 'verified',
      retractionStatus: 'clean',
      processingStatus: 'ready',
      createdAt: new Date().toISOString(),
    });

    savedPaperId = paper.id;
    expect(db.getPaperById(savedPaperId)?.title).toContain('Dialectal Morphological Regularization');

    // Duplicate prevention
    const existing = db.getPaperByDoi('10.1016/demo.chatgaiya.test', createdProjectId);
    expect(existing).toBeDefined();
    expect(existing?.id).toBe(savedPaperId);
  });

  // 5. Index Document Chunks & RAG Q&A
  it('Phase 1.5: Ask the Paper returns grounded answer with exact page citations without hallucination', async () => {
    db.addChunks([
      {
        id: `chunk_${savedPaperId}_1`,
        paperId: savedPaperId,
        pageNumber: 6,
        sectionName: 'Methodology',
        chunkIndex: 0,
        content: 'We selected XLM-R because its 250,000 SentencePiece subword vocabulary provides broad Indic phoneme cluster coverage.',
      },
      {
        id: `chunk_${savedPaperId}_2`,
        paperId: savedPaperId,
        pageNumber: 8,
        sectionName: 'Results',
        chunkIndex: 1,
        content: 'As shown in Table 4, XLM-R with phonetic regularization achieved 84.1% Macro-F1, outperforming mBERT by 4.9%.',
      },
    ]);

    const chunks = db.getChunksByPaper(savedPaperId);
    expect(chunks.length).toBe(2);

    const scored = vectorStore.retrieveRelevantChunks(chunks, 'Why was XLM-R selected?', 2);
    const response = await modelRouter.execute({
      task: 'rag_qa',
      prompt: 'Why was XLM-R selected?',
      retrievedChunks: scored,
    });

    expect(response.answer).toBeDefined();
    expect(response.evidence.length).toBeGreaterThan(0);
    expect(response.evidence[0].page).toBe(6);
    expect(response.evidence[0].section).toBe('Methodology');
    expect(response.evidence[0].snippet).toContain('SentencePiece subword vocabulary');
  });

  // 6. Evidence Collection & Location Hierarchy
  it('Phase 1.6: Researcher records grounded claim with full location hierarchy', () => {
    const evidence = db.createEvidence({
      id: `ev_test_${Date.now()}`,
      projectId: createdProjectId,
      paperId: savedPaperId,
      paperTitle: 'Dialectal Morphological Regularization',
      claim: 'XLM-R outperformed mBERT by 4.9% Macro-F1 on dialect test set',
      page: 8,
      section: 'Results',
      snippet: 'As shown in Table 4, XLM-R with phonetic regularization achieved 84.1% Macro-F1, outperforming mBERT by 4.9%.',
      evidenceType: 'empirical',
      confidence: 0.98,
      verificationStatus: 'supported',
      location: 'Results → Table 4 → Page 8',
      createdBy: 'Dr. Alan Turing',
      createdAt: new Date().toISOString(),
    });

    const recorded = db.getEvidence(createdProjectId);
    expect(recorded.some((e) => e.claim.includes('4.9%'))).toBe(true);
  });

  // 7. Literature Matrix Synchronization & Custom Columns
  it('Phase 1.7: Literature matrix stores structured row and allows researcher edits and custom columns', () => {
    const row = db.saveMatrixRow({
      id: `mat_${savedPaperId}`,
      projectId: createdProjectId,
      paperId: savedPaperId,
      paperTitle: 'Dialectal Morphological Regularization',
      year: 2024,
      dataset: 'CSC-24 (4,200 utterances)',
      model: 'XLM-R + Phonetic Reg',
      language: 'Chatgaiya',
      method: 'Phonetic subword regularization',
      metric: 'Macro-F1: 84.1%',
      result: '+4.9% F1 over mBERT',
      limitation: 'Script restricted; excludes Romanized Banglish',
      customColumns: {
        'Compute Hours': '2.4 hrs A100',
      },
    });

    const rows = db.getMatrixRows(createdProjectId);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].customColumns['Compute Hours']).toBe('2.4 hrs A100');
  });
});
