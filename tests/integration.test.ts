import { describe, it, expect } from 'vitest';
import { vectorStore } from '../src/lib/ai/vectorStore';
import { extractionAgent, verificationAgent, gapAgent } from '../src/lib/ai/agents';
import { analyzeDraftForMissingCitations } from '../src/lib/citations/detector';
import { DocumentChunk, Paper } from '../src/lib/db/types';

describe('Integration Tests: RAG Vector Store & Retrieval', () => {
  const mockChunks: DocumentChunk[] = [
    {
      id: 'c1',
      paperId: 'p1',
      pageNumber: 3,
      sectionName: 'Dataset Construction',
      chunkIndex: 0,
      content: 'The Chittagonian Sentiment Corpus (CSC-24) contains 4,200 curated social media comments annotated by three native linguists.',
    },
    {
      id: 'c2',
      paperId: 'p1',
      pageNumber: 8,
      sectionName: 'Results & Evaluation',
      chunkIndex: 1,
      content: 'As shown in Table 4, XLM-R with phonetic subword regularization achieved 84.1% Macro-F1, outperforming mBERT baseline by 4.9%.',
    },
    {
      id: 'c3',
      paperId: 'p1',
      pageNumber: 9,
      sectionName: 'Limitations',
      chunkIndex: 2,
      content: 'A major limitation of our benchmark is that it solely evaluated Bengali script, omitting Romanized Banglish phonetics.',
    },
  ];

  it('retrieves relevant chunks by semantic keyword and section alignment', () => {
    const scored = vectorStore.retrieveRelevantChunks(mockChunks, 'What dataset was used and how many comments?', 2);
    expect(scored.length).toBeGreaterThan(0);
    expect(scored[0].chunk.sectionName).toBe('Dataset Construction');
    expect(scored[0].chunk.pageNumber).toBe(3);
    expect(scored[0].chunk.content).toContain('CSC-24');
  });

  it('preserves exact page numbers and section names without hallucination', () => {
    const scored = vectorStore.retrieveRelevantChunks(mockChunks, 'Macro-F1 result for XLM-R', 1);
    expect(scored[0].chunk.pageNumber).toBe(8);
    expect(scored[0].chunk.sectionName).toBe('Results & Evaluation');
    expect(scored[0].score).toBeGreaterThan(0.5);
  });
});

describe('Integration Tests: AI Agents & Evidentiary Verification', () => {
  const mockChunks: DocumentChunk[] = [
    {
      id: 'c1',
      paperId: 'p1',
      pageNumber: 8,
      sectionName: 'Results & Evaluation',
      chunkIndex: 0,
      content: 'XLM-R with phonetic regularization achieved 84.1% Macro-F1, whereas mBERT reached 79.2%.',
    },
  ];

  it('verifies supported empirical claim against document evidence', async () => {
    const record = await verificationAgent.verifyClaim('XLM-R outperformed mBERT', mockChunks);
    expect(record.status).toBe('Supported');
    expect(record.location).toBe('Results & Evaluation → Page 8');
    expect(record.evidenceSnippet).toContain('84.1%');
  });

  it('declares Insufficient Evidence when claim is completely absent from corpus', async () => {
    const record = await verificationAgent.verifyClaim('Quantum teleportation was used for tokenizer training', mockChunks);
    expect(record.status).toBe('Insufficient Evidence');
    expect(record.explanation).toContain('No supporting evidence was found in the available sources');
  });

  it('synthesizes structured analysis schema from document chunks', async () => {
    const analysis = await extractionAgent.extractStructuredAnalysis('p1', 'Dialectal Transformers', mockChunks);
    expect(analysis.researchProblem).toBeDefined();
    expect(analysis.contributions.length).toBeGreaterThan(0);
    expect(analysis.preprocessing.length).toBeGreaterThan(0);
    expect(analysis.evaluationMetrics).toContain('Macro-F1');
  });
});

describe('Integration Tests: Missing Citation Detection', () => {
  const mockPapers: Paper[] = [
    {
      id: 'p1',
      projectId: 'proj1',
      title: 'Evaluating Transformers on Chittagonian Dialect',
      authors: ['Rahman, T.'],
      abstract: 'Dialect sentiment corpus study.',
      publicationYear: 2024,
      journalOrConference: 'LRP',
      url: '',
      citationCount: 10,
      sourceProvider: 'demo',
      sourceId: '1',
      references: [],
      retrievalDate: '',
      metadataStatus: 'verified',
      retractionStatus: 'clean',
      processingStatus: 'ready',
      createdAt: '',
    },
  ];

  const mockChunks: DocumentChunk[] = [
    {
      id: 'c1',
      paperId: 'p1',
      pageNumber: 8,
      sectionName: 'Results',
      chunkIndex: 0,
      content: 'XLM-R with phonetic subword regularization achieved 84.1% Macro-F1 on Chittagonian text.',
    },
  ];

  it('detects unreferenced empirical assertions and recommends grounded papers', () => {
    const draft = `Standard language models are trained on Wikipedia.
    
Studies have shown that multilingual transformer models suffer from catastrophic vocabulary fragmentation on dialectal text, where XLM-R achieved 84.1% Macro-F1.`;

    const results = analyzeDraftForMissingCitations(draft, mockPapers, mockChunks);
    expect(results.length).toBe(2);
    expect(results[0].needsCitation).toBe(false); // General conceptual statement
    expect(results[1].needsCitation).toBe(true);  // Contains empirical triggers
    expect(results[1].suggestedPapers.length).toBeGreaterThan(0);
    expect(results[1].suggestedPapers[0].paperId).toBe('p1');
    expect(results[1].suggestedPapers[0].page).toBe(8);
  });
});
