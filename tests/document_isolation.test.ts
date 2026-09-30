import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/lib/db';
import { researchChatEngine } from '../src/lib/ai/chatEngine';
import { Paper, DocumentChunk } from '../src/lib/db/types';

describe('RAG Retrieval Isolation Tests', () => {
  const userA = 'usr_researcher_A';
  const userB = 'usr_researcher_B';
  const projectA = 'proj_nlp_project_A';
  const projectB = 'proj_bio_project_B';

  const paperA: Paper = {
    id: 'paper_dialect_nlp_01',
    projectId: projectA,
    title: 'Phonetic Regularization in Chittagonian Dialect Transformers',
    authors: ['Dr. A. Rahman', 'Dr. S. Mahmud'],
    abstract: 'We propose phonetic subword tokenization for colloquial Bengali dialect NLP.',
    publicationYear: 2024,
    journalOrConference: 'Indic NLP 2024',
    url: 'https://doi.org/10.1016/demo.nlp.01',
    doi: '10.1016/demo.nlp.01',
    citationCount: 14,
    sourceProvider: 'upload',
    sourceId: 'paper-a.pdf',
    references: [],
    retrievalDate: new Date().toISOString(),
    metadataStatus: 'verified',
    retractionStatus: 'clean',
    pdfFileName: 'paper-a.pdf',
    pdfFileSize: 1048576,
    processingStatus: 'ready',
    createdAt: new Date().toISOString(),
  };

  const paperB: Paper = {
    id: 'paper_speech_acoustics_02',
    projectId: projectA,
    title: 'Acoustic Formant Shifting in Coastal Bengali Dialects',
    authors: ['Prof. K. Das'],
    abstract: 'Investigating F1 and F2 formant variations across coastal speakers.',
    publicationYear: 2023,
    journalOrConference: 'Speech Prosody 2023',
    url: 'https://doi.org/10.1016/demo.speech.02',
    doi: '10.1016/demo.speech.02',
    citationCount: 8,
    sourceProvider: 'upload',
    sourceId: 'paper-b.pdf',
    references: [],
    retrievalDate: new Date().toISOString(),
    metadataStatus: 'verified',
    retractionStatus: 'clean',
    pdfFileName: 'paper-b.pdf',
    pdfFileSize: 2048576,
    processingStatus: 'ready',
    createdAt: new Date().toISOString(),
  };

  const ieeeTemplate: Paper = {
    id: 'paper_ieee_template_unrelated',
    projectId: projectA,
    title: 'IEEE for journals template with bibtex example files included',
    authors: ['IEEE Editorial Board'],
    abstract: 'This is a LaTeX formatting template for IEEE transactions submissions.',
    publicationYear: 2021,
    journalOrConference: 'IEEE Guidelines',
    url: 'https://ieee.org/template',
    citationCount: 0,
    sourceProvider: 'upload',
    sourceId: 'IEEE_Template.pdf',
    references: [],
    retrievalDate: new Date().toISOString(),
    metadataStatus: 'unverified',
    retractionStatus: 'clean',
    pdfFileName: 'IEEE_Template.pdf',
    pdfFileSize: 512000,
    processingStatus: 'ready',
    createdAt: new Date().toISOString(),
  };

  const paperProjB: Paper = {
    id: 'paper_genomics_proj_b',
    projectId: projectB,
    title: 'CRISPR Gene Editing Off-Target Profiles in Rice Blast Fungus',
    authors: ['Dr. Bio Researcher'],
    abstract: 'Targeted genome mutagenesis for fungal resistance.',
    publicationYear: 2024,
    journalOrConference: 'Fungal Biology',
    url: 'https://doi.org/10.1016/demo.fungal.01',
    citationCount: 22,
    sourceProvider: 'upload',
    sourceId: 'fungal_crispr.pdf',
    references: [],
    retrievalDate: new Date().toISOString(),
    metadataStatus: 'verified',
    retractionStatus: 'clean',
    pdfFileName: 'fungal_crispr.pdf',
    pdfFileSize: 1200000,
    processingStatus: 'ready',
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    // Setup projects
    db.createProject({
      id: projectA,
      userId: userA,
      title: 'Dialectal Bengali NLP Research',
      description: 'NLP and tokenization exploration',
      researchField: 'Computational Linguistics',
      researchQuestions: [],
      objectives: [],
      tags: ['NLP'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    db.createProject({
      id: projectB,
      userId: userB,
      title: 'Agricultural Genomics',
      description: 'Crop genetics and fungal pathology',
      researchField: 'Genomics',
      researchQuestions: [],
      objectives: [],
      tags: ['Bio'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Setup papers
    db.createPaper(paperA);
    db.createPaper(paperB);
    db.createPaper(ieeeTemplate);
    db.createPaper(paperProjB);

    // Setup chunks with mandatory immutable metadata
    const chunksA: DocumentChunk[] = [
      {
        id: 'chunk-a-1',
        chunk_id: 'chunk-a-1',
        user_id: userA,
        userId: userA,
        project_id: projectA,
        projectId: projectA,
        paper_id: paperA.id,
        paperId: paperA.id,
        document_id: `doc-${paperA.id}`,
        documentId: `doc-${paperA.id}`,
        page_number: 2,
        pageNumber: 2,
        section: 'Methodology',
        sectionName: 'Methodology',
        chunkIndex: 0,
        content: 'We propose phonetic subword regularization which groups morphologically contiguous Chittagonian verb endings.',
        source_filename: 'paper-a.pdf',
        sourceFilename: 'paper-a.pdf',
        doi: paperA.doi,
      },
      {
        id: 'chunk-a-2',
        chunk_id: 'chunk-a-2',
        user_id: userA,
        userId: userA,
        project_id: projectA,
        projectId: projectA,
        paper_id: paperA.id,
        paperId: paperA.id,
        document_id: `doc-${paperA.id}`,
        documentId: `doc-${paperA.id}`,
        page_number: 6,
        pageNumber: 6,
        section: 'Limitations',
        sectionName: 'Limitations',
        chunkIndex: 1,
        content: 'Limitations: Our phonetic regularizer requires curated dialectal IPA mappings, restricting scalability to non-standardized Chittagonian orthography.',
        source_filename: 'paper-a.pdf',
        sourceFilename: 'paper-a.pdf',
        doi: paperA.doi,
      },
    ];

    const chunksB: DocumentChunk[] = [
      {
        id: 'chunk-b-1',
        chunk_id: 'chunk-b-1',
        user_id: userA,
        userId: userA,
        project_id: projectA,
        projectId: projectA,
        paper_id: paperB.id,
        paperId: paperB.id,
        document_id: `doc-${paperB.id}`,
        documentId: `doc-${paperB.id}`,
        page_number: 3,
        pageNumber: 3,
        section: 'Methodology',
        sectionName: 'Methodology',
        chunkIndex: 0,
        content: 'Acoustic recordings were captured in Coxs Bazar using cardioid condenser microphones sampled at 48kHz.',
        source_filename: 'paper-b.pdf',
        sourceFilename: 'paper-b.pdf',
        doi: paperB.doi,
      },
      {
        id: 'chunk-b-2',
        chunk_id: 'chunk-b-2',
        user_id: userA,
        userId: userA,
        project_id: projectA,
        projectId: projectA,
        paper_id: paperB.id,
        paperId: paperB.id,
        document_id: `doc-${paperB.id}`,
        documentId: `doc-${paperB.id}`,
        page_number: 5,
        pageNumber: 5,
        section: 'Limitations',
        sectionName: 'Limitations',
        chunkIndex: 1,
        content: 'Limitations: Microphone placement sensitivity and background wind noise at coastal sites reduced signal-to-noise ratio.',
        source_filename: 'paper-b.pdf',
        sourceFilename: 'paper-b.pdf',
        doi: paperB.doi,
      },
    ];

    const chunksIEEE: DocumentChunk[] = [
      {
        id: 'chunk-ieee-1',
        chunk_id: 'chunk-ieee-1',
        user_id: userA,
        userId: userA,
        project_id: projectA,
        projectId: projectA,
        paper_id: ieeeTemplate.id,
        paperId: ieeeTemplate.id,
        document_id: `doc-${ieeeTemplate.id}`,
        documentId: `doc-${ieeeTemplate.id}`,
        page_number: 1,
        pageNumber: 1,
        section: 'Guidelines',
        sectionName: 'Guidelines',
        chunkIndex: 0,
        content: 'IEEE template guidelines: Authors must adhere to IEEE citation styles and column margins.',
        source_filename: 'IEEE_Template.pdf',
        sourceFilename: 'IEEE_Template.pdf',
      },
      {
        id: 'chunk-ieee-2',
        chunk_id: 'chunk-ieee-2',
        user_id: userA,
        userId: userA,
        project_id: projectA,
        projectId: projectA,
        paper_id: ieeeTemplate.id,
        paperId: ieeeTemplate.id,
        document_id: `doc-${ieeeTemplate.id}`,
        documentId: `doc-${ieeeTemplate.id}`,
        page_number: 2,
        pageNumber: 2,
        section: 'Limitations',
        sectionName: 'Limitations',
        chunkIndex: 1,
        content: 'Limitations: This template is strictly intended for IEEE transaction paper drafting and contains placeholder typography.',
        source_filename: 'IEEE_Template.pdf',
        sourceFilename: 'IEEE_Template.pdf',
      },
    ];

    const chunksProjB: DocumentChunk[] = [
      {
        id: 'chunk-proj-b-1',
        chunk_id: 'chunk-proj-b-1',
        user_id: userB,
        userId: userB,
        project_id: projectB,
        projectId: projectB,
        paper_id: paperProjB.id,
        paperId: paperProjB.id,
        document_id: `doc-${paperProjB.id}`,
        documentId: `doc-${paperProjB.id}`,
        page_number: 4,
        pageNumber: 4,
        section: 'Methodology',
        sectionName: 'Methodology',
        chunkIndex: 0,
        content: 'Cas9 ribonucleoprotein complexes were delivered into fungal protoplasts via polyethylene glycol transformation.',
        source_filename: 'fungal_crispr.pdf',
        sourceFilename: 'fungal_crispr.pdf',
        doi: paperProjB.doi,
      },
    ];

    db.addChunks([...chunksA, ...chunksB, ...chunksIEEE, ...chunksProjB]);
  });

  it('TEST 1: Paper A vs Paper B — Ask about Paper A, ONLY Paper A chunks retrieved', async () => {
    const result = await researchChatEngine.generateResponse({
      projectId: projectA,
      userId: userA,
      scope: 'paper',
      paperId: paperA.id,
      userMessage: 'What methodology did the authors use?',
    });

    expect(result.sources.length).toBeGreaterThan(0);
    // Every single retrieved source must belong to Paper A
    for (const src of result.sources) {
      expect(src.paperId).toBe(paperA.id);
      expect(src.paperTitle).toContain('Phonetic Regularization');
    }
    // Must contain Paper A content and NOT Paper B or IEEE
    expect(result.content.toLowerCase()).toContain('phonetic');
    expect(result.content.toLowerCase()).not.toContain('cardioid condenser');
    expect(result.content.toLowerCase()).not.toContain('ieee for journals template');
  });

  it('TEST 2: Paper B — Ask about Paper B, ONLY Paper B chunks retrieved', async () => {
    const result = await researchChatEngine.generateResponse({
      projectId: projectA,
      userId: userA,
      scope: 'paper',
      paperId: paperB.id,
      userMessage: 'What methodology did the authors use?',
    });

    expect(result.sources.length).toBeGreaterThan(0);
    for (const src of result.sources) {
      expect(src.paperId).toBe(paperB.id);
      expect(src.paperTitle).toContain('Acoustic Formant Shifting');
    }
    expect(result.content.toLowerCase()).toContain('acoustic');
    expect(result.content.toLowerCase()).not.toContain('phonetic regularizer');
    expect(result.content.toLowerCase()).not.toContain('ieee for journals template');
  });

  it('TEST 3: Project Scope — Project B documents NEVER appear when querying Project A', async () => {
    const result = await researchChatEngine.generateResponse({
      projectId: projectA,
      userId: userA,
      scope: 'project',
      userMessage: 'What methods are used across the project papers?',
    });

    // None of Project B's papers (CRISPR / fungus) should ever leak into Project A
    for (const src of result.sources) {
      expect(src.paperId).not.toBe(paperProjB.id);
      expect(src.paperTitle).not.toContain('CRISPR');
    }
    expect(result.content.toLowerCase()).not.toContain('cas9');
    expect(result.content.toLowerCase()).not.toContain('fungal protoplasts');
  });

  it('TEST 4: Unrelated IEEE Template — Asking "What are the limitations?" for Paper A NEVER retrieves IEEE template', async () => {
    const result = await researchChatEngine.generateResponse({
      projectId: projectA,
      userId: userA,
      scope: 'paper',
      paperId: paperA.id,
      userMessage: 'What are the limitations?',
    });

    expect(result.sources.length).toBeGreaterThan(0);
    // Every source must be Paper A
    for (const src of result.sources) {
      expect(src.paperId).toBe(paperA.id);
      expect(src.paperId).not.toBe(ieeeTemplate.id);
      expect(src.paperTitle).not.toContain('IEEE');
    }
    expect(result.content).toContain('Phonetic Regularization');
    expect(result.content).toContain('IPA mappings');
    expect(result.content).not.toContain('IEEE for journals template');
    expect(result.content).not.toContain('placeholder typography');
  });

  it('TEST 5: Missing Evidence — Asking a question whose answer does not exist in Paper A returns insufficient evidence', async () => {
    const result = await researchChatEngine.generateResponse({
      projectId: projectA,
      userId: userA,
      scope: 'paper',
      paperId: paperA.id,
      userMessage: 'What quantum annealing temperature was calibrated on the D-Wave quantum annealer?',
    });

    expect(result.content.toLowerCase()).toContain('insufficient evidence in the selected paper');
    expect(result.sources.length).toBe(0);
    expect(result.content).not.toContain('IEEE');
    expect(result.content).not.toContain('CRISPR');
  });
});
