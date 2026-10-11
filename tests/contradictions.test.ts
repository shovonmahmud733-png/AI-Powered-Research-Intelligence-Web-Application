import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../src/lib/db';
import { Contradiction } from '../src/lib/db/types';

describe('QA Suite: Contradiction Detector & Cross-Paper Disagreement Engine', () => {
  const testProjectId = 'proj_chatgaiya_sentiment_01';
  let initialContradictions: Contradiction[] = [];

  beforeEach(() => {
    // Capture state
    initialContradictions = JSON.parse(JSON.stringify(db.getContradictions(testProjectId)));
  });

  afterEach(() => {
    // Restore state
    const current = db.getContradictions(testProjectId);
    current.forEach((c) => db.deleteContradiction(c.id));
    initialContradictions.forEach((c) => db.createContradiction(c));
  });

  it('1. BASIC FUNCTIONALITY: Loads existing conflict records for valid project', () => {
    const records = db.getContradictions(testProjectId);
    expect(records.length).toBeGreaterThanOrEqual(1);

    const contra = records.find((c) => c.id === 'contra-1');
    expect(contra).toBeDefined();
    expect(contra?.topic).toBe('Multilingual vs Monolingual Transformer Superiority on Dialectal Text');
    expect(contra?.projectId).toBe(testProjectId);
  });

  it('2. PAPER IDENTITY: Preserves strict separation of Paper A and Paper B metadata', () => {
    const records = db.getContradictions(testProjectId);
    const contra = records.find((c) => c.id === 'contra-1')!;

    expect(contra.paperAId).not.toBe(contra.paperBId);

    const paperA = db.getPaperById(contra.paperAId);
    const paperB = db.getPaperById(contra.paperBId);

    expect(paperA).toBeDefined();
    expect(paperB).toBeDefined();

    // Verify Paper A metadata
    expect(paperA?.id).toBe('paper-demo-01');
    expect(paperA?.authors).toContain('Rahman, T.');
    expect(paperA?.doi).toBe('10.1016/demo.chatgaiya.2024.001');
    expect(paperA?.publicationYear).toBe(2024);

    // Verify Paper B metadata
    expect(paperB?.id).toBe('paper-demo-02');
    expect(paperB?.authors).toContain('Karim, S.');
    expect(paperB?.doi).toBe('10.1016/demo.chatgaiya.2023.002');
    expect(paperB?.publicationYear).toBe(2023);

    // Cross-check: Paper A authors must NOT be attributed to Paper B
    expect(paperB?.authors).not.toContain('Rahman, T.');
    expect(paperA?.authors).not.toContain('Karim, S.');
  });

  it('3. EVIDENCE ACCURACY: Accurately reflects claims, verbatim quotes, and coordinates', () => {
    const contra = db.getContradictions(testProjectId).find((c) => c.id === 'contra-1')!;

    // Position A Evidence
    expect(contra.claimA).toContain('XLM-RoBERTa (multilingual) outperforms all monolingual models');
    expect(contra.evidenceA).toContain('XLM-R with phonetic subword regularization achieved 84.1% Macro-F1');
    expect(contra.pageA).toBe(8);

    // Position B Evidence
    expect(contra.claimB).toContain('Monolingual BanglaBERT outperforms multilingual XLM-R by 2.1% Macro-F1');
    expect(contra.evidenceB).toContain('BanglaBERT achieved 81.3% Macro-F1');
    expect(contra.pageB).toBe(7);

    // Verbatim quotes must not be swapped
    expect(contra.evidenceA).not.toBe(contra.evidenceB);
    expect(contra.claimA).not.toBe(contra.claimB);
  });

  it('4. DIVERGENCE ANALYSIS: Tracks specific empirical conditions explaining divergence', () => {
    const contra = db.getContradictions(testProjectId).find((c) => c.id === 'contra-1')!;

    expect(Array.isArray(contra.potentialReasons)).toBe(true);
    expect(contra.potentialReasons.length).toBeGreaterThanOrEqual(3);

    // Explains pre-processing difference
    const hasPreprocessing = contra.potentialReasons.some((r) =>
      r.toLowerCase().includes('pre-processing') || r.toLowerCase().includes('preprocessing')
    );
    expect(hasPreprocessing).toBe(true);

    // Explains dataset difference
    const hasDataset = contra.potentialReasons.some((r) =>
      r.toLowerCase().includes('dataset') || r.toLowerCase().includes('corpus')
    );
    expect(hasDataset).toBe(true);

    // Explains hyperparameter difference
    const hasHyperparams = contra.potentialReasons.some((r) =>
      r.toLowerCase().includes('hyperparameters') || r.toLowerCase().includes('learning rate')
    );
    expect(hasHyperparams).toBe(true);
  });

  it('5. REVIEW ACTIONS & PERSISTENCE: Updates review status and persistent lab synthesis notes', () => {
    const newNote = 'Reconciled: Tokenizer vocabulary fragmentation is the root cause. Confirmed on CSC-24.';
    const updated = db.updateContradiction('contra-1', {
      notes: newNote,
      status: 'researcher_reviewed',
      conflictCategory: 'methodological_divergence',
    });

    expect(updated).toBeDefined();
    expect(updated?.notes).toBe(newNote);
    expect(updated?.status).toBe('researcher_reviewed');
    expect(updated?.conflictCategory).toBe('methodological_divergence');

    // Re-query from DB to verify real persistence
    const reloaded = db.getContradictions(testProjectId).find((c) => c.id === 'contra-1');
    expect(reloaded?.notes).toBe(newNote);
    expect(reloaded?.status).toBe('researcher_reviewed');
  });

  it('6. CREATE AND DELETE LIFECYCLE: Successfully registers and deletes new disagreements', () => {
    const newId = `contra-qa-${Date.now()}`;
    const created = db.createContradiction({
      id: newId,
      projectId: testProjectId,
      topic: 'Context Window Size Scaling in Dialect Translation',
      paperAId: 'paper-demo-01',
      paperATitle: 'Evaluating Multilingual Transformers',
      claimA: 'Short contexts (128 tokens) preserve dialect tone.',
      evidenceA: 'Truncated inputs prevented semantic drift in Chittagonian sentences.',
      pageA: 4,
      sectionA: 'Ablation Study',
      paperBId: 'paper-demo-02',
      paperBTitle: 'BanglaBERT vs XLM-R',
      claimB: 'Long contexts (512 tokens) are necessary for colloquial discourse.',
      evidenceB: 'Colloquial dialogs required 512 tokens to capture turn-taking syntax.',
      pageB: 6,
      sectionB: 'Sequence Length Evaluation',
      potentialReasons: ['Variations in utterance length distributions'],
      notes: 'Evaluating sentence segmentation in preprocessing.',
      status: 'under_review',
      conflictCategory: 'scope_difference',
      createdAt: new Date().toISOString(),
    });

    expect(created.id).toBe(newId);
    expect(created.sectionA).toBe('Ablation Study');
    expect(created.sectionB).toBe('Sequence Length Evaluation');

    // Confirm present in project query
    const inProject = db.getContradictions(testProjectId);
    expect(inProject.some((c) => c.id === newId)).toBe(true);

    // Delete record
    const deleteSuccess = db.deleteContradiction(newId);
    expect(deleteSuccess).toBe(true);

    // Confirm removed
    const afterDelete = db.getContradictions(testProjectId);
    expect(afterDelete.some((c) => c.id === newId)).toBe(false);
  });

  it('7. CONTEXT ISOLATION: Unrelated projects return zero contradiction records', () => {
    const isolatedProjectA = db.getContradictions('proj_bio_project_B');
    const isolatedProjectB = db.getContradictions('proj_nonexistent_empty_scope');

    // None should contain contra-1 from proj_chatgaiya_sentiment_01
    expect(isolatedProjectA.some((c) => c.id === 'contra-1')).toBe(false);
    expect(isolatedProjectB.length).toBe(0);
  });
});
