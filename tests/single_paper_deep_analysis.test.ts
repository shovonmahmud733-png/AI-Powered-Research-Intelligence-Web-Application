import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/lib/db';
import { researchChatEngine } from '../src/lib/ai/chatEngine';
import { Paper, DocumentChunk } from '../src/lib/db/types';
import { normalizeExtractedText } from '../src/lib/pdf/parser';

describe('Single Paper Deep Analysis Mode Tests', () => {
  const userId = 'usr_researcher_01';
  const projectId = 'proj_analysis_mode_01';

  const paperA: Paper = {
    id: 'paper_chittagong_nlp_A',
    projectId: projectId,
    title: 'Phonetic Regularization in Chittagonian Dialect Transformers',
    authors: ['Dr. A. Rahman', 'Dr. S. Mahmud'],
    abstract: 'We introduce a phonetic regularization method for Chittagonian dialect NLP using transformer encoders.',
    publicationYear: 2024,
    journalOrConference: 'ACL Findings 2024',
    url: 'https://doi.org/10.1016/acl.2024.01',
    doi: '10.1016/acl.2024.01',
    citationCount: 22,
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
    id: 'paper_coastal_acoustics_B',
    projectId: projectId,
    title: 'Acoustic Formant Shifting in Coastal Bengali Dialects',
    authors: ['Prof. K. Das'],
    abstract: 'Investigating formant frequencies and vocalic shift patterns in coastal Bengali speakers.',
    publicationYear: 2023,
    journalOrConference: 'Speech Prosody 2023',
    url: 'https://doi.org/10.1016/sp.2023.02',
    doi: '10.1016/sp.2023.02',
    citationCount: 9,
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

  const chunksPaperA: DocumentChunk[] = [
    {
      id: 'chunk_A_problem',
      chunk_id: 'chunk_A_problem',
      userId: userId,
      user_id: userId,
      projectId: projectId,
      project_id: projectId,
      paperId: paperA.id,
      paper_id: paperA.id,
      documentId: `doc-${paperA.id}`,
      document_id: `doc-${paperA.id}`,
      pageNumber: 1,
      page_number: 1,
      sectionName: 'Introduction & Research Problem',
      section: 'Introduction & Research Problem',
      chunkIndex: 0,
      content: 'The core research problem addressed in this study is the high error rate of transformer encoders when processing phonetically non-standard Chittagonian dialect utterances. We investigate phonetic alignment techniques.',
      sourceFilename: 'paper-a.pdf',
      source_filename: 'paper-a.pdf',
    },
    {
      id: 'chunk_A_dataset',
      chunk_id: 'chunk_A_dataset',
      userId: userId,
      user_id: userId,
      projectId: projectId,
      project_id: projectId,
      paperId: paperA.id,
      paper_id: paperA.id,
      documentId: `doc-${paperA.id}`,
      document_id: `doc-${paperA.id}`,
      pageNumber: 3,
      page_number: 3,
      sectionName: 'Dataset Construction',
      section: 'Dataset Construction',
      chunkIndex: 1,
      content: 'For empirical evaluation, the authors curated the CHT-Dialect-5k corpus, comprising 5,200 manually annotated sentences recorded across 4 distinct geographic regions in southeastern Bangladesh.',
      sourceFilename: 'paper-a.pdf',
      source_filename: 'paper-a.pdf',
    },
    {
      id: 'chunk_A_preprocessing',
      chunk_id: 'chunk_A_preprocessing',
      userId: userId,
      user_id: userId,
      projectId: projectId,
      project_id: projectId,
      paperId: paperA.id,
      paper_id: paperA.id,
      documentId: `doc-${paperA.id}`,
      document_id: `doc-${paperA.id}`,
      pageNumber: 4,
      page_number: 4,
      sectionName: 'Data Preprocessing',
      section: 'Data Preprocessing',
      chunkIndex: 2,
      content: 'Preprocessing techniques applied included UTF-8 normalization, phonetic transliteration mapping via epitran-indic, and byte-pair subword tokenization with a vocabulary size of 8,000 subwords.',
      sourceFilename: 'paper-a.pdf',
      source_filename: 'paper-a.pdf',
    },
    {
      id: 'chunk_A_methodology',
      chunk_id: 'chunk_A_methodology',
      userId: userId,
      user_id: userId,
      projectId: projectId,
      project_id: projectId,
      paperId: paperA.id,
      paper_id: paperA.id,
      documentId: `doc-${paperA.id}`,
      document_id: `doc-${paperA.id}`,
      pageNumber: 5,
      page_number: 5,
      sectionName: 'Methodology & Model Architecture',
      section: 'Methodology & Model Architecture',
      chunkIndex: 3,
      content: 'The authors implemented a dual-stream cross-attention transformer architecture combining acoustic phonetic features with textual character sequences, trained using AdamW optimization.',
      sourceFilename: 'paper-a.pdf',
      source_filename: 'paper-a.pdf',
    },
    {
      id: 'chunk_A_results',
      chunk_id: 'chunk_A_results',
      userId: userId,
      user_id: userId,
      projectId: projectId,
      project_id: projectId,
      paperId: paperA.id,
      paper_id: paperA.id,
      documentId: `doc-${paperA.id}`,
      document_id: `doc-${paperA.id}`,
      pageNumber: 7,
      page_number: 7,
      sectionName: 'Results & Discussion',
      section: 'Results & Discussion',
      chunkIndex: 4,
      content: 'Empirical results demonstrate an accuracy of 89.4% and an F1 score of 87.8% on Chittagonian sentiment analysis, outperforming vanilla mBERT by 6.2 percentage points.',
      sourceFilename: 'paper-a.pdf',
      source_filename: 'paper-a.pdf',
    },
    {
      id: 'chunk_A_limitations',
      chunk_id: 'chunk_A_limitations',
      userId: userId,
      user_id: userId,
      projectId: projectId,
      project_id: projectId,
      paperId: paperA.id,
      paper_id: paperA.id,
      documentId: `doc-${paperA.id}`,
      document_id: `doc-${paperA.id}`,
      pageNumber: 8,
      page_number: 8,
      sectionName: 'Limitations',
      section: 'Limitations',
      chunkIndex: 5,
      content: 'A major limitation is the dependency on pre-aligned phonetic dictionaries which restricts generalizability to other unwritten dialects of the region.',
      sourceFilename: 'paper-a.pdf',
      source_filename: 'paper-a.pdf',
    },
    {
      id: 'chunk_A_future_work',
      chunk_id: 'chunk_A_future_work',
      userId: userId,
      user_id: userId,
      projectId: projectId,
      project_id: projectId,
      paperId: paperA.id,
      paper_id: paperA.id,
      documentId: `doc-${paperA.id}`,
      document_id: `doc-${paperA.id}`,
      pageNumber: 9,
      page_number: 9,
      sectionName: 'Future Work',
      section: 'Future Work',
      chunkIndex: 6,
      content: 'For future work, the authors propose self-supervised acoustic pretraining on raw audio broadcasts without requiring manually curated phonetic pronunciation tables.',
      sourceFilename: 'paper-a.pdf',
      source_filename: 'paper-a.pdf',
    },
  ];

  const chunksPaperB: DocumentChunk[] = [
    {
      id: 'chunk_B_dataset',
      chunk_id: 'chunk_B_dataset',
      userId: userId,
      user_id: userId,
      projectId: projectId,
      project_id: projectId,
      paperId: paperB.id,
      paper_id: paperB.id,
      documentId: `doc-${paperB.id}`,
      document_id: `doc-${paperB.id}`,
      pageNumber: 2,
      page_number: 2,
      sectionName: 'Acoustic Corpus Setup',
      section: 'Acoustic Corpus Setup',
      chunkIndex: 0,
      content: 'The dataset consists of 48 hours of studio microphone recordings from 120 native speakers across Coxs Bazar and Sandwip island, sampled at 44.1 kHz.',
      sourceFilename: 'paper-b.pdf',
      source_filename: 'paper-b.pdf',
    },
    {
      id: 'chunk_B_limitations',
      chunk_id: 'chunk_B_limitations',
      userId: userId,
      user_id: userId,
      projectId: projectId,
      project_id: projectId,
      paperId: paperB.id,
      paper_id: paperB.id,
      documentId: `doc-${paperB.id}`,
      document_id: `doc-${paperB.id}`,
      pageNumber: 6,
      page_number: 6,
      sectionName: 'Limitations',
      section: 'Limitations',
      chunkIndex: 1,
      content: 'A critical limitation of this study is the studio-only recording condition which fails to account for background environmental noise and reverberation present in field interviews.',
      sourceFilename: 'paper-b.pdf',
      source_filename: 'paper-b.pdf',
    },
  ];

  beforeEach(() => {
    // Register project and papers in DB
    if (!db.getProjectById(projectId)) {
      db.createProject({
        id: projectId,
        userId: userId,
        title: 'Chittagonian NLP & Speech Intelligence Project',
        description: 'Empirical research on dialects and acoustic representations.',
        researchField: 'Computational Linguistics',
        researchQuestions: [],
        objectives: [],
        tags: ['NLP', 'Speech'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (!db.getPaperById(paperA.id)) db.createPaper(paperA);
    if (!db.getPaperById(paperB.id)) db.createPaper(paperB);

    db.addChunks(chunksPaperA);
    db.addChunks(chunksPaperB);
  });

  // TEST A: Single Paper Paper A -> "What are the limitations?" -> verify every retrieved chunk belongs to Paper A
  it('TEST A: Scope=SINGLE_PAPER, Paper A -> "What are the limitations?" strictly retrieves Paper A only', async () => {
    const res = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What are the limitations?',
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });

    expect(res.sources.length).toBeGreaterThan(0);
    // Every single retrieved source MUST belong to Paper A
    res.sources.forEach((src) => {
      expect(src.paperId).toBe(paperA.id);
      expect(src.page).toBeDefined();
      expect(src.section).toBeDefined();
    });

    // Content mentions Paper A limitations
    expect(res.content.toLowerCase()).toContain('phonetic');
    // Content MUST NOT mention Paper B limitations (studio-only, reverberation)
    expect(res.content.toLowerCase()).not.toContain('reverberation');
    expect(res.content.toLowerCase()).not.toContain('studio-only');
  });

  // TEST B: Single Paper Paper A -> "What dataset did the authors use?" -> verify Paper A only
  it('TEST B: Scope=SINGLE_PAPER, Paper A -> "What dataset did the authors use?" retrieves Paper A dataset only', async () => {
    const res = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What dataset did the authors use?',
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });

    expect(res.sources.length).toBeGreaterThan(0);
    res.sources.forEach((src) => {
      expect(src.paperId).toBe(paperA.id);
    });

    // Paper A dataset is CHT-Dialect-5k
    expect(res.content).toMatch(/CHT-Dialect-5k|5,200/i);
    // Must NOT mention Paper B dataset (48 hours, 120 native speakers)
    expect(res.content).not.toContain('48 hours');
    expect(res.content).not.toContain('120 native speakers');
  });

  // TEST C: Single Paper Paper A -> Question whose answer does not exist in Paper A -> "Insufficient evidence in the selected paper."
  it('TEST C: Scope=SINGLE_PAPER, Paper A -> Missing evidence returns "Insufficient evidence in the selected paper."', async () => {
    const res = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What was the liquid nitrogen cooling temperature for the quantum cryostat in the laboratory?',
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });

    expect(res.content).toMatch(/insufficient evidence in the selected paper/i);
    expect(res.sources.length).toBe(0);
  });

  // TEST D: Switch to Paper B -> "What dataset did the authors use?" -> verify Paper B only
  it('TEST D: Scope=SINGLE_PAPER, Paper B -> "What dataset did the authors use?" retrieves Paper B dataset only', async () => {
    const res = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperB.id,
      searchAcrossLibrary: false,
      userMessage: 'What dataset did the authors use?',
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });

    expect(res.sources.length).toBeGreaterThan(0);
    res.sources.forEach((src) => {
      expect(src.paperId).toBe(paperB.id);
    });

    // Paper B dataset is 48 hours studio recordings
    expect(res.content).toMatch(/48 hours|studio|recordings/i);
    // Must NOT mention Paper A dataset
    expect(res.content).not.toContain('CHT-Dialect-5k');
  });

  // TEST E: Switch to All Project Papers -> "What are the common limitations across the papers?" -> verify multiple papers
  it('TEST E: Scope=PROJECT -> "What are the limitations across the papers?" retrieves multiple project papers', async () => {
    const res = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'project',
      searchAcrossLibrary: false,
      userMessage: 'What are the major limitations across the papers in my current project?',
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });

    expect(res.sources.length).toBeGreaterThan(0);
    const paperIdsInSources = new Set(res.sources.map((s) => s.paperId));
    // Should have sources from both Paper A and Paper B
    expect(paperIdsInSources.has(paperA.id)).toBe(true);
    expect(paperIdsInSources.has(paperB.id)).toBe(true);
  });

  // Additional Paper-specific question tests (Step 6)
  it('Step 6 questions on Paper A: research problem, preprocessing, methodology, results, future work', async () => {
    // 1. Research problem
    const probRes = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What is the research problem?',
      clientPapers: [paperA, paperB],
      clientChunks: chunksPaperA,
    });
    expect(probRes.sources.length).toBeGreaterThan(0);
    expect(probRes.sources.every((s) => s.paperId === paperA.id)).toBe(true);
    expect(probRes.content).toMatch(/research problem|error rate|chittagonian/i);

    // 2. Preprocessing
    const prepRes = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What preprocessing techniques were applied?',
      clientPapers: [paperA, paperB],
      clientChunks: chunksPaperA,
    });
    expect(prepRes.sources.length).toBeGreaterThan(0);
    expect(prepRes.sources.every((s) => s.paperId === paperA.id)).toBe(true);
    expect(prepRes.content).toMatch(/preprocessing|normalization|epitran|tokenization/i);

    // 3. Methodology
    const methRes = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What methodology did they use?',
      clientPapers: [paperA, paperB],
      clientChunks: chunksPaperA,
    });
    expect(methRes.sources.length).toBeGreaterThan(0);
    expect(methRes.sources.every((s) => s.paperId === paperA.id)).toBe(true);
    expect(methRes.content).toMatch(/dual-stream|cross-attention|transformer/i);

    // 4. Results
    const resRes = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What were the main results?',
      clientPapers: [paperA, paperB],
      clientChunks: chunksPaperA,
    });
    expect(resRes.sources.length).toBeGreaterThan(0);
    expect(resRes.sources.every((s) => s.paperId === paperA.id)).toBe(true);
    expect(resRes.content).toMatch(/89.4%|87.8%|f1 score/i);

    // 5. Future work
    const futRes = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What future work did the authors suggest?',
      clientPapers: [paperA, paperB],
      clientChunks: chunksPaperA,
    });
    expect(futRes.sources.length).toBeGreaterThan(0);
    expect(futRes.sources.every((s) => s.paperId === paperA.id)).toBe(true);
    expect(futRes.content).toMatch(/self-supervised|acoustic pretraining|future work/i);
  });

  // Step 7: Every source item contains complete metadata fields
  it('Step 7: Every retrieved source contains all required metadata fields', async () => {
    const res = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What methodology did the authors use?',
      clientPapers: [paperA],
      clientChunks: chunksPaperA,
    });

    expect(res.sources.length).toBeGreaterThan(0);
    res.sources.forEach((src) => {
      expect(src.paperId).toBe(paperA.id);
      expect(src.paper_id).toBe(paperA.id);
      expect(src.page).toBeGreaterThanOrEqual(1);
      expect(src.page_number).toBeGreaterThanOrEqual(1);
      expect(src.section).toBeDefined();
      expect(src.sourceFilename).toBeDefined();
      expect(src.documentId).toBeDefined();
      expect(src.chunkId).toBeDefined();
    });
  });

  // Multi-turn follow-up question maintaining Paper A context
  it('Multi-turn conversation: follow-up question maintains Paper A context', async () => {
    const history = [
      {
        id: 'msg-1',
        sessionId: 'sess-test-01',
        role: 'user' as const,
        content: 'What dataset did the authors use?',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'msg-2',
        sessionId: 'sess-test-01',
        role: 'assistant' as const,
        content: 'The authors curated the CHT-Dialect-5k corpus comprising 5,200 manually annotated sentences.',
        createdAt: new Date().toISOString(),
      },
    ];

    const res = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'How large was it and how many sentences were included?',
      history,
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });

    expect(res.sources.length).toBeGreaterThan(0);
    expect(res.sources.every((s) => s.paperId === paperA.id)).toBe(true);
    expect(res.content).toMatch(/5,200|sentences|cht-dialect-5k/i);
  });

  // FINAL VALIDATION SUITE: 3-question sequence with explicit chunk logging and word spacing verification
  it('FINAL VALIDATION: "what are the limitations??", "What dataset did the authors use?", "What methodology did the authors use?"', async () => {
    // 1. "what are the limitations??"
    console.log('\n--- FINAL VALIDATION 1: "what are the limitations??" ---');
    console.log('Selected paper_id:', paperA.id);

    const res1 = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'what are the limitations??',
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });

    console.log('Retrieved Chunks for "what are the limitations??":');
    res1.sources.forEach((s, idx) => {
      console.log(
        `  ${idx + 1}. paper_id=${s.paperId} document_id=${s.documentId} page=${s.page} section="${s.section}" filename=${s.sourceFilename}`
      );
    });

    expect(res1.sources.length).toBeGreaterThan(0);
    // Every retrieved chunk MUST belong to paperA.id
    res1.sources.forEach((s) => {
      expect(s.paperId).toBe(paperA.id);
      expect(s.documentId).toBe(`doc-${paperA.id}`);
      expect(s.sourceFilename).toBe(paperA.pdfFileName);
      expect(s.page).toBeDefined();
      expect(s.section).toBeDefined();
    });
    // Zero chunks from Paper B
    expect(res1.sources.some((s) => s.paperId === paperB.id)).toBe(false);

    // 2. "What dataset did the authors use?"
    console.log('\n--- FINAL VALIDATION 2: "What dataset did the authors use?" ---');
    console.log('Selected paper_id:', paperA.id);

    const res2 = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What dataset did the authors use?',
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });

    console.log('Retrieved Chunks for "What dataset did the authors use?":');
    res2.sources.forEach((s, idx) => {
      console.log(
        `  ${idx + 1}. paper_id=${s.paperId} document_id=${s.documentId} page=${s.page} section="${s.section}" filename=${s.sourceFilename}`
      );
    });

    expect(res2.sources.length).toBeGreaterThan(0);
    res2.sources.forEach((s) => {
      expect(s.paperId).toBe(paperA.id);
      expect(s.documentId).toBe(`doc-${paperA.id}`);
      expect(s.sourceFilename).toBe(paperA.pdfFileName);
    });
    expect(res2.sources.some((s) => s.paperId === paperB.id)).toBe(false);

    // 3. "What methodology did the authors use?"
    console.log('\n--- FINAL VALIDATION 3: "What methodology did the authors use?" ---');
    console.log('Selected paper_id:', paperA.id);

    const res3 = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What methodology did the authors use?',
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });

    console.log('Retrieved Chunks for "What methodology did the authors use?":');
    res3.sources.forEach((s, idx) => {
      console.log(
        `  ${idx + 1}. paper_id=${s.paperId} document_id=${s.documentId} page=${s.page} section="${s.section}" filename=${s.sourceFilename}`
      );
    });

    expect(res3.sources.length).toBeGreaterThan(0);
    res3.sources.forEach((s) => {
      expect(s.paperId).toBe(paperA.id);
      expect(s.documentId).toBe(`doc-${paperA.id}`);
      expect(s.sourceFilename).toBe(paperA.pdfFileName);
    });
    expect(res3.sources.some((s) => s.paperId === paperB.id)).toBe(false);
  });

  // Word spacing verification: glued run-on text is normalized across retrieval and evidence
  it('Word Spacing Verification: glued text is normalized and readable across chunks and evidence', async () => {
    const gluedChunk: DocumentChunk = {
      id: 'chunk_glued_01',
      userId: userId,
      projectId: projectId,
      paperId: paperA.id,
      documentId: `doc-${paperA.id}`,
      pageNumber: 2,
      sectionName: 'Resource Description',
      chunkIndex: 10,
      content: 'ThisresearchusesanativeChittagoniandialectresource which is collected for sentiment analysis.',
      sourceFilename: 'paper-a.pdf',
    };

    const res = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'Tell me about the native Chittagonian dialect resource',
      clientPapers: [paperA],
      clientChunks: [gluedChunk],
    });

    const resourceSource = res.sources.find((s) => s.section === 'Resource Description');
    expect(resourceSource).toBeDefined();
    expect(resourceSource!.snippet).not.toContain('ThisresearchusesanativeChittagoniandialectresource');
    expect(resourceSource!.snippet).toContain('This research uses a native Chittagonian dialect resource');
  });

  it('FINAL 5 TARGET TESTS: dataset, limitations, methodology, results, and unevidenced queries with strict section accuracy', async () => {
    // 1. Dataset query
    const datasetRes = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What dataset did the authors use?',
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });
    expect(datasetRes.sources.length).toBeGreaterThan(0);
    expect(datasetRes.content).toContain('Dataset Construction');
    expect(datasetRes.content).not.toContain('Limitations section');
    const topDatasetSource = datasetRes.sources[0];
    expect(topDatasetSource.section).toBe('Dataset Construction');
    expect(topDatasetSource.paperId).toBe(paperA.id);

    // 2. Limitations query
    const limRes = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'what are the limitations??',
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });
    expect(limRes.sources.length).toBeGreaterThan(0);
    expect(limRes.content).toContain('Limitations');
    const topLimSource = limRes.sources[0];
    expect(topLimSource.section).toContain('Limitations');
    expect(topLimSource.paperId).toBe(paperA.id);

    // 3. Methodology query
    const methodRes = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What methodology did the authors use?',
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });
    expect(methodRes.sources.length).toBeGreaterThan(0);
    expect(methodRes.content).toContain('Methodology & Model Architecture');
    const topMethodSource = methodRes.sources[0];
    expect(topMethodSource.section).toBe('Methodology & Model Architecture');
    expect(topMethodSource.paperId).toBe(paperA.id);

    // 4. Results query
    const resultRes = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What were the main results?',
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });
    expect(resultRes.sources.length).toBeGreaterThan(0);
    expect(resultRes.content).toContain('Results & Discussion');
    const topResultSource = resultRes.sources[0];
    expect(topResultSource.section).toBe('Results & Discussion');
    expect(topResultSource.paperId).toBe(paperA.id);

    // 5. Unevidenced question
    const unevidencedRes = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What quantum annealing temperature was calibrated on the D-Wave quantum annealer?',
      clientPapers: [paperA, paperB],
      clientChunks: [...chunksPaperA, ...chunksPaperB],
    });
    expect(unevidencedRes.content).toContain('Insufficient evidence in the selected paper');
    expect(unevidencedRes.sources.length).toBe(0);
  });

  it('Word Spacing Verification on multi-clause glued text: normalizes clauses with commas and periods', async () => {
    const multiClauseChunk: DocumentChunk = {
      id: 'chunk_glued_02',
      userId: userId,
      projectId: projectId,
      paperId: paperA.id,
      documentId: `doc-${paperA.id}`,
      pageNumber: 2,
      sectionName: 'Dataset Construction',
      chunkIndex: 11,
      content: 'byourresearchteam,notadaptedorreusedfromanyexistingdialectresource.Textwillbecollectedfrompubliccomments',
      sourceFilename: 'paper-a.pdf',
    };

    const res = await researchChatEngine.generateResponse({
      projectId,
      userId,
      scope: 'paper',
      paperId: paperA.id,
      searchAcrossLibrary: false,
      userMessage: 'What text was collected by our research team, not adapted or reused from any existing dialect resource?',
      clientPapers: [paperA],
      clientChunks: [multiClauseChunk],
    });

    const targetSource = res.sources.find((s) => s.chunkId === 'chunk_glued_02') || res.sources[0];
    expect(targetSource.snippet).toContain('by our research team, not adapted or reused from any existing dialect resource');
    expect(targetSource.snippet).not.toContain('byourresearchteam');
    expect(res.content).toContain('by our research team, not adapted or reused from any existing dialect resource. Text will be collected from public comments');
    expect(res.content).not.toContain('byourresearchteam');
    expect(normalizeExtractedText(multiClauseChunk.content)).toBe(
      'by our research team, not adapted or reused from any existing dialect resource. Text will be collected from public comments'
    );
  });
});
