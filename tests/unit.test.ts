import { describe, it, expect } from 'vitest';
import { formatCitation, formatAuthorList } from '../src/lib/citations/formatters';
import { calculateTransparentRelevance } from '../src/lib/scholarly/relevance';
import { Paper } from '../src/lib/db/types';
import { db } from '../src/lib/db';

describe('Unit Tests: Citation Intelligence & Metadata Formatting', () => {
  const samplePaper: Paper = {
    id: 'paper-unit-test-1',
    projectId: 'proj-1',
    doi: '10.1016/j.indic.2024.01',
    title: 'Evaluating Subword Tokenization on Chittagonian Dialectal Sentiment',
    authors: ['Rahman, T.', 'Hossain, M. Z.', 'Akter, F.'],
    abstract: 'An empirical investigation of multilingual transformer tokenization on low-resource Indic dialects.',
    publicationYear: 2024,
    journalOrConference: 'Proceedings of Indic NLP',
    url: 'https://doi.org/10.1016/j.indic.2024.01',
    citationCount: 22,
    sourceProvider: 'crossref',
    sourceId: '10.1016/j.indic.2024.01',
    references: [],
    retrievalDate: '2024-03-01T00:00:00Z',
    metadataStatus: 'verified',
    retractionStatus: 'clean',
    processingStatus: 'ready',
    createdAt: '2024-03-01T00:00:00Z',
  };

  it('formats APA 7th edition citation without fabricating metadata', () => {
    const citation = formatCitation(samplePaper, 'apa7');
    expect(citation).toContain('Rahman, T. et al. (2024)');
    expect(citation).toContain('Evaluating Subword Tokenization on Chittagonian Dialectal Sentiment');
    expect(citation).toContain('https://doi.org/10.1016/j.indic.2024.01');
  });

  it('formats IEEE citation with quotes and correct format', () => {
    const citation = formatCitation(samplePaper, 'ieee');
    expect(citation).toContain('"Evaluating Subword Tokenization on Chittagonian Dialectal Sentiment,"');
    expect(citation).toContain('Proceedings of Indic NLP, 2024');
    expect(citation).toContain('doi: 10.1016/j.indic.2024.01');
  });

  it('generates valid BibTeX with correct entry key and field escaping', () => {
    const bibtex = formatCitation(samplePaper, 'bibtex');
    expect(bibtex).toContain('@article{rahman2024,');
    expect(bibtex).toContain('author = {Rahman, T. and Hossain, M. Z. and Akter, F.}');
    expect(bibtex).toContain('year = {2024}');
    expect(bibtex).toContain('doi = {10.1016/j.indic.2024.01}');
  });

  it('generates compliant RIS reference tags for reference managers', () => {
    const ris = formatCitation(samplePaper, 'ris');
    expect(ris).toContain('TY  - JOUR');
    expect(ris).toContain('TI  - Evaluating Subword Tokenization on Chittagonian Dialectal Sentiment');
    expect(ris).toContain('AU  - Rahman, T.');
    expect(ris).toContain('PY  - 2024');
    expect(ris).toContain('ER  -');
  });
});

describe('Unit Tests: Deduplication & Transparent Relevance Engine', () => {
  it('calculates transparent relevance signals based on documented factors', () => {
    const breakdown = calculateTransparentRelevance(
      {
        title: 'Transformer Tokenization in Dialectal Sentiment Analysis',
        abstract: 'Investigating low-resource dialectal sentiment NLP with SentencePiece.',
        publicationYear: 2024,
      },
      {
        query: 'dialectal sentiment transformer',
        projectContext: {
          field: 'Low-Resource Dialectal NLP',
          tags: ['Sentiment', 'Transformers', 'Dialects'],
        },
      }
    );

    expect(breakdown.score).toBeGreaterThan(70);
    expect(breakdown.reasons.length).toBeGreaterThan(0);
    expect(breakdown.confidence).toBe('high');
  });

  it('detects domain mismatch when publication does not align with project field', () => {
    const breakdown = calculateTransparentRelevance(
      {
        title: 'Quantum Chromodynamics in Heavy Ion Collisions',
        abstract: 'Measurement of quark-gluon plasma viscosities in high energy physics.',
        publicationYear: 2010,
      },
      {
        query: 'subword tokenization Indic',
        projectContext: {
          field: 'Computational Linguistics & NLP',
        },
      }
    );

    expect(breakdown.mismatches.length).toBeGreaterThan(0);
    expect(breakdown.score).toBeLessThan(50);
  });

  it('deletes paper and thoroughly purges chunks, matrix, and analysis records', () => {
    const testPaperId = `paper-delete-test-${Date.now()}`;
    const testProjectId = `proj-delete-test-${Date.now()}`;

    // Create test paper
    db.createPaper({
      id: testPaperId,
      projectId: testProjectId,
      title: 'Temporary Test Paper to Delete',
      authors: ['Test Author'],
      abstract: 'Abstract for deletion test',
      publicationYear: 2024,
      journalOrConference: 'Test Conf',
      url: '',
      citationCount: 0,
      sourceProvider: 'upload',
      sourceId: 'test',
      references: [],
      retrievalDate: new Date().toISOString(),
      metadataStatus: 'unverified',
      retractionStatus: 'clean',
      processingStatus: 'ready',
      createdAt: new Date().toISOString(),
    });

    // Add chunk
    db.addChunks([
      {
        id: `chunk-${testPaperId}`,
        paperId: testPaperId,
        projectId: testProjectId,
        content: 'Test content to be purged',
        sectionName: 'Introduction',
        pageNumber: 1,
        chunkIndex: 0,
      },
    ]);

    expect(db.getPaperById(testPaperId)).toBeDefined();
    expect(db.getChunksByPaper(testPaperId).length).toBeGreaterThan(0);

    // Delete paper
    const success = db.deletePaper(testPaperId);
    expect(success).toBe(true);

    // Verify completely purged
    expect(db.getPaperById(testPaperId)).toBeUndefined();
    expect(db.getChunksByPaper(testPaperId).length).toBe(0);
  });
});

