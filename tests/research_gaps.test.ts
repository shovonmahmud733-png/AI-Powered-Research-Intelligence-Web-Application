import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../src/lib/db';
import { ResearchGap } from '../src/lib/db/types';

describe('QA Suite: Research Gap Engine & Academic Vacancy Discovery', () => {
  const testProjectId = 'proj_chatgaiya_sentiment_01';
  let initialGaps: ResearchGap[] = [];

  beforeEach(() => {
    // Preserve initial state
    initialGaps = JSON.parse(JSON.stringify(db.getGaps(testProjectId)));
  });

  afterEach(() => {
    // Restore state
    const current = db.getGaps(testProjectId);
    current.forEach((g) => db.deleteGap(g.id));
    initialGaps.forEach((g) => db.createGap(g));
  });

  it('1. BASIC RETRIEVAL: Retrieves registered research gaps for active project', () => {
    const gaps = db.getGaps(testProjectId);
    expect(gaps.length).toBeGreaterThanOrEqual(1);

    const gap1 = gaps.find((g) => g.id === 'gap-1');
    expect(gap1).toBeDefined();
    expect(gap1?.title).toContain('Dual-Script');
    expect(gap1?.projectId).toBe(testProjectId);
  });

  it('2. EVIDENTIARY GROUNDING: Confirms supporting papers link to valid indexed manuscripts', () => {
    const gaps = db.getGaps(testProjectId);
    const gap1 = gaps.find((g) => g.id === 'gap-1')!;

    expect(Array.isArray(gap1.supportingPaperIds)).toBe(true);
    expect(gap1.supportingPaperIds.length).toBeGreaterThanOrEqual(1);

    // Verify paper exists and has metadata
    const paperA = db.getPaperById(gap1.supportingPaperIds[0]);
    expect(paperA).toBeDefined();
    expect(paperA?.title).toBeDefined();
    expect(paperA?.authors).toBeDefined();
  });

  it('3. EPISTEMIC DISTINCTION: Differentiates candidate gaps from researcher verified status', () => {
    const gaps = db.getGaps(testProjectId);

    // Find candidate gap under investigation
    const candidateGap = gaps.find((g) => g.verificationStatus === 'Under Investigation');
    expect(candidateGap).toBeDefined();
    expect(candidateGap?.verificationStatus).toBe('Under Investigation');

    // Confirm that it is not falsely pre-verified
    expect(candidateGap?.verificationStatus).not.toBe('Researcher Verified');
  });

  it('4. REVIEW ACTIONS & PERSISTENCE: Updates review status and researcher lab notes', () => {
    const gap = db.getGaps(testProjectId)[0];
    const originalStatus = gap.verificationStatus;
    const testNotes = 'Lab note: Verified against low-resource Indic literature benchmark.';

    const updated = db.updateGap(gap.id, {
      verificationStatus: 'Researcher Verified',
      researcherNotes: testNotes,
      directionStatus: 'researcher_approved',
    });

    expect(updated).toBeDefined();
    expect(updated?.verificationStatus).toBe('Researcher Verified');
    expect(updated?.researcherNotes).toBe(testNotes);
    expect(updated?.directionStatus).toBe('researcher_approved');

    // Re-query from DB to verify actual persistence
    const reloaded = db.getGaps(testProjectId).find((g) => g.id === gap.id);
    expect(reloaded?.verificationStatus).toBe('Researcher Verified');
    expect(reloaded?.researcherNotes).toBe(testNotes);
  });

  it('5. CREATE AND DELETE LIFECYCLE: Successfully records and deletes new research gaps', () => {
    const newId = `gap-qa-${Date.now()}`;
    const created = db.createGap({
      id: newId,
      projectId: testProjectId,
      title: 'Morphology-Guided Token Pruning in Indic Transformers',
      description: 'Standard tokenizers segment dialectal morphemes into arbitrary subwords.',
      category: 'methodological',
      supportingPaperIds: ['paper-demo-01'],
      supportingPaperTitles: ['Evaluating Multilingual Transformers'],
      confidence: 'high',
      verificationStatus: 'Under Investigation',
      proposedDirection: 'Implement a morpheme boundary constraint during byte-pair encoding.',
      directionStatus: 'ai_suggested',
      whyItMatters: 'Preserves root semantics in morphologically rich dialects.',
      researcherNotes: 'Needs ablation testing.',
    });

    expect(created.id).toBe(newId);
    expect(created.whyItMatters).toContain('root semantics');

    // Verify presence in project
    const afterCreate = db.getGaps(testProjectId);
    expect(afterCreate.some((g) => g.id === newId)).toBe(true);

    // Delete record
    const deleted = db.deleteGap(newId);
    expect(deleted).toBe(true);

    // Verify deletion
    const afterDelete = db.getGaps(testProjectId);
    expect(afterDelete.some((g) => g.id === newId)).toBe(false);
  });

  it('6. CONTEXT ISOLATION: Does not leak gaps into unrelated or empty project scopes', () => {
    const isolated = db.getGaps('proj_isolated_empty_corpus');
    expect(isolated.length).toBe(0);

    const otherProjectGaps = db.getGaps('proj_bio_project_B');
    expect(otherProjectGaps.some((g) => g.id === 'gap-1')).toBe(false);
  });
});
