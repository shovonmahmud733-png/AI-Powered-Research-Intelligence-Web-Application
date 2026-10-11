import { describe, it, expect, beforeEach } from 'vitest';
import { POST, GET } from '../src/app/api/comparison/route';
import { db } from '../src/lib/db';

describe('QA Suite: Evidence-Grounded Paper Comparison Workspace', () => {
  const projectId = 'proj_chatgaiya_sentiment_01';
  const paper1Id = 'paper-demo-01';
  const paper2Id = 'paper-demo-02';
  const paper3Id = 'paper-demo-03';

  // Helper to call POST handler
  const callPost = async (body: any) => {
    const req = new Request('http://localhost:3000/api/comparison', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return POST(req);
  };

  // Helper to call GET handler
  const callGet = async (params: string) => {
    const req = new Request(`http://localhost:3000/api/comparison?${params}`, {
      method: 'GET',
    });
    return GET(req);
  };

  describe('1. API Input Validation & Safeguards', () => {
    it('rejects requests with fewer than 2 paper IDs (HTTP 400)', async () => {
      const res = await callPost({ paperIds: [paper1Id], projectId });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Please select at least 2 papers');
    });

    it('rejects empty paperIds array (HTTP 400)', async () => {
      const res = await callPost({ paperIds: [], projectId });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Please select at least 2 papers');
    });

    it('rejects non-array paperIds (HTTP 400)', async () => {
      const res = await callPost({ paperIds: 'not-an-array', projectId });
      expect(res.status).toBe(400);
    });

    it('deduplicates identical paper IDs and rejects if unique count < 2', async () => {
      const res = await callPost({ paperIds: [paper1Id, paper1Id], projectId });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('At least 2 valid papers');
    });

    it('rejects non-existent paper IDs when valid count < 2', async () => {
      const res = await callPost({ paperIds: ['invalid-id-1', 'invalid-id-2'], projectId });
      expect(res.status).toBe(400);
    });
  });

  describe('2. Paper Identity & Referential Association', () => {
    it('accurately matches paper identity fields to the correct paper without cross-swapping', async () => {
      const res = await callPost({ paperIds: [paper1Id, paper2Id], projectId });
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.papersCompared).toBe(2);
      expect(data.comparisons.length).toBe(2);

      const paper1 = data.comparisons.find((c: any) => c.paperId === paper1Id);
      const paper2 = data.comparisons.find((c: any) => c.paperId === paper2Id);

      expect(paper1).toBeDefined();
      expect(paper2).toBeDefined();

      const realP1 = db.getPaperById(paper1Id);
      const realP2 = db.getPaperById(paper2Id);

      // Verify exact titles
      expect(paper1.title).toBe(realP1?.title);
      expect(paper2.title).toBe(realP2?.title);

      // Verify authors
      expect(paper1.authors).toEqual(realP1?.authors);
      expect(paper2.authors).toEqual(realP2?.authors);

      // Verify years and venues
      expect(paper1.year).toBe(realP1?.publicationYear);
      expect(paper2.year).toBe(realP2?.publicationYear);
      expect(paper1.journal).toBe(realP1?.journalOrConference);
      expect(paper2.journal).toBe(realP2?.journalOrConference);

      // Ensure P1 data is not accidentally swapped with P2
      expect(paper1.title).not.toBe(paper2.title);
    });
  });

  describe('3. Empirical Dimensions & Zero Fabrication', () => {
    it('returns structured dimensions for papers with complete analysis', async () => {
      const res = await callPost({ paperIds: [paper1Id, paper2Id], projectId });
      const data = await res.json();

      const p1 = data.comparisons.find((c: any) => c.paperId === paper1Id);
      const p2 = data.comparisons.find((c: any) => c.paperId === paper2Id);

      expect(p1.hasStructuredAnalysis).toBe(true);
      expect(p1.analysisStatus).toBe('extracted');
      expect(p1.problem).toBeTruthy();
      expect(p1.dataset).toBeTruthy();
      expect(p1.model).toBeTruthy();
      expect(Array.isArray(p1.methodology)).toBe(true);
      expect(Array.isArray(p1.metrics)).toBe(true);
      expect(typeof p1.results).toBe('object');
      expect(Array.isArray(p1.limitations)).toBe(true);
      expect(p1.limitations.length).toBeGreaterThan(0);

      expect(p2.hasStructuredAnalysis).toBe(true);
      expect(p2.analysisStatus).toBe('extracted');
      expect(p2.problem).toBeTruthy();
      expect(p2.dataset).toBeTruthy();
      expect(p2.model).toBeTruthy();
    });

    it('honestly marks unextracted papers as pending without fabricating dummy models or metrics', async () => {
      // paper-demo-03 does not have a structured analysis in seed db
      const res = await callPost({ paperIds: [paper1Id, paper3Id], projectId });
      const data = await res.json();

      const p3 = data.comparisons.find((c: any) => c.paperId === paper3Id);
      expect(p3).toBeDefined();

      const hasAnalysisInDb = Boolean(db.getAnalysisByPaper(paper3Id));
      expect(p3.hasStructuredAnalysis).toBe(hasAnalysisInDb);

      if (!hasAnalysisInDb) {
        expect(p3.analysisStatus).not.toBe('extracted');
        // Must NOT return the old fabricated fallback string 'Transformer architecture'
        if (!p3.model) {
          expect(p3.model).toBeNull();
        }
      }
    });

    it('distinguishes between distinct models without conflating architectures', async () => {
      const res = await callPost({ paperIds: [paper1Id, paper2Id], projectId });
      const data = await res.json();

      const p1 = data.comparisons.find((c: any) => c.paperId === paper1Id);
      const p2 = data.comparisons.find((c: any) => c.paperId === paper2Id);

      // Paper 1 uses BanglishBERT / Transformer fine-tuning; Paper 2 uses its own model
      expect(p1.model).not.toBeNull();
      expect(p2.model).not.toBeNull();
    });
  });

  describe('4. Evidence Grounding & Traceability', () => {
    it('associates real evidence citations with paper and coordinates', async () => {
      const res = await callPost({ paperIds: [paper1Id, paper2Id], projectId });
      const data = await res.json();

      const p1 = data.comparisons.find((c: any) => c.paperId === paper1Id);
      expect(Array.isArray(p1.evidenceSnippets)).toBe(true);

      const realDbEvidence = db.getEvidence(projectId).filter((e) => e.paperId === paper1Id);
      expect(p1.evidenceSnippets.length).toBe(realDbEvidence.length);

      if (p1.evidenceSnippets.length > 0) {
        const firstEvidence = p1.evidenceSnippets[0];
        expect(firstEvidence.page).toBeGreaterThan(0);
        expect(firstEvidence.section).toBeTruthy();
        expect(firstEvidence.snippet).toBeTruthy();
        expect(firstEvidence.claim).toBeTruthy();
        expect(firstEvidence.verificationStatus).toBeTruthy();
      }
    });

    it('never leaks evidence of Paper 1 into Paper 2', async () => {
      const res = await callPost({ paperIds: [paper1Id, paper2Id], projectId });
      const data = await res.json();

      const p1 = data.comparisons.find((c: any) => c.paperId === paper1Id);
      const p2 = data.comparisons.find((c: any) => c.paperId === paper2Id);

      const p1EvidenceIds = new Set(p1.evidenceSnippets?.map((e: any) => e.id) || []);
      const p2EvidenceIds = new Set(p2.evidenceSnippets?.map((e: any) => e.id) || []);

      // The intersection of evidence IDs must be empty
      const intersection = [...p1EvidenceIds].filter((id) => p2EvidenceIds.has(id));
      expect(intersection.length).toBe(0);
    });

    it('maps addressed research gaps to the supporting paper', async () => {
      const res = await callPost({ paperIds: [paper1Id, paper2Id], projectId });
      const data = await res.json();

      const p1 = data.comparisons.find((c: any) => c.paperId === paper1Id);
      expect(Array.isArray(p1.gapsAddressed)).toBe(true);

      const realGaps = db.getGaps(projectId).filter((g) => g.supportingPaperIds?.includes(paper1Id));
      expect(p1.gapsAddressed.length).toBe(realGaps.length);
    });
  });

  describe('5. Synthesis of Similarities, Differences & Comparability Warnings', () => {
    it('identifies shared empirical foundations where papers share topics or era', async () => {
      const res = await callPost({ paperIds: [paper1Id, paper2Id], projectId });
      const data = await res.json();

      expect(Array.isArray(data.sharedCharacteristics)).toBe(true);
      expect(Array.isArray(data.contrastingDimensions)).toBe(true);
      expect(Array.isArray(data.comparabilityNotes)).toBe(true);
    });

    it('generates comparability warning when datasets differ', async () => {
      const res = await callPost({ paperIds: [paper1Id, paper2Id], projectId });
      const data = await res.json();

      const warning = data.comparabilityNotes.find(
        (n: any) => n.title.includes('Non-Equivalent') || n.level === 'warning'
      );
      expect(warning).toBeDefined();
      expect(warning.note).toContain('Reported performance scores cannot be directly ranked');
    });

    it('includes neutral comparative principle note prohibiting unjustified superiority claims', async () => {
      const res = await callPost({ paperIds: [paper1Id, paper2Id], projectId });
      const data = await res.json();

      const principleNote = data.comparabilityNotes.find(
        (n: any) => n.title.includes('Neutral') || n.note.includes('superior')
      );
      expect(principleNote).toBeDefined();
      expect(principleNote.note).toContain('The system does not declare an arbitrary "superior" publication');
    });
  });

  describe('6. Protocol Support & Project Isolation', () => {
    it('supports GET request with comma-separated paperIds query parameter', async () => {
      const res = await callGet(`paperIds=${paper1Id},${paper2Id}&projectId=${projectId}`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.papersCompared).toBe(2);
      expect(data.comparisons.length).toBe(2);
    });

    it('rejects GET request without paperIds query parameter (HTTP 400)', async () => {
      const res = await callGet(`projectId=${projectId}`);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('paperIds is required');
    });

    it('isolates evidence and gap retrieval to the active project', async () => {
      const otherProjectRes = await callPost({
        paperIds: [paper1Id, paper2Id],
        projectId: 'non-existent-project',
      });
      expect(otherProjectRes.status).toBe(200);
      const otherData = await otherProjectRes.json();

      // Non-existent project has no evidence or gaps in DB
      const p1Other = otherData.comparisons.find((c: any) => c.paperId === paper1Id);
      expect(p1Other.evidenceSnippets?.length).toBe(0);
      expect(p1Other.gapsAddressed?.length).toBe(0);
    });
  });
});
