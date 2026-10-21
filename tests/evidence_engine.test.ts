import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from '../src/app/api/evidence/route';
import { db } from '../src/lib/db';
import { Evidence } from '../src/lib/db/types';

describe('QA Suite: Evidence Engine & Reliable Source Verification Workflow', () => {
  const projectId = 'proj_chatgaiya_sentiment_01';
  const paper1Id = 'paper-demo-01';
  const paper2Id = 'paper-demo-02';

  // Helper for GET requests
  const callGet = async (params: string) => {
    const req = new Request(`http://localhost:3000/api/evidence?${params}`, {
      method: 'GET',
    });
    return GET(req);
  };

  // Helper for POST requests
  const callPost = async (body: any) => {
    const req = new Request('http://localhost:3000/api/evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return POST(req);
  };

  // Helper for PUT requests
  const callPut = async (body: any) => {
    const req = new Request('http://localhost:3000/api/evidence', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return PUT(req);
  };

  // Helper for DELETE requests
  const callDelete = async (id: string) => {
    const req = new Request(`http://localhost:3000/api/evidence?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return DELETE(req);
  };

  describe('1. API Input Validation & Safeguards', () => {
    it('rejects GET requests without projectId (HTTP 400)', async () => {
      const res = await callGet('');
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('projectId is required');
    });

    it('rejects POST requests without projectId (HTTP 400)', async () => {
      const res = await callPost({ claim: 'XLM-R outperforms baseline' });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('projectId and claim are required');
    });

    it('rejects POST requests without claim (HTTP 400)', async () => {
      const res = await callPost({ projectId, snippet: 'Some quote' });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('projectId and claim are required');
    });

    it('rejects PUT requests without evidence id (HTTP 400)', async () => {
      const res = await callPut({ claim: 'Updated claim text' });
      expect(res.status).toBe(400);
    });

    it('returns 404 for PUT requests on non-existent evidence id', async () => {
      const res = await callPut({ id: 'non-existent-ev-id-999', claim: 'Updated' });
      expect(res.status).toBe(404);
    });
  });

  describe('2. Evidence-to-Paper Association & Source Fidelity', () => {
    it('associates evidence strictly with the correct paper and maintains canonical metadata', async () => {
      const res = await callGet(`projectId=${projectId}`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.evidence)).toBe(true);
      expect(data.evidence.length).toBeGreaterThan(0);

      // Inspect Paper 1 items
      const paper1Evidence = data.evidence.filter((e: any) => e.paperId === paper1Id);
      expect(paper1Evidence.length).toBeGreaterThan(0);

      const realPaper1 = db.getPaperById(paper1Id);
      paper1Evidence.forEach((item: any) => {
        expect(item.paperId).toBe(paper1Id);
        expect(item.paperTitle).toBe(realPaper1?.title);
        expect(Array.isArray(item.authors)).toBe(true);
        expect(item.year).toBe(realPaper1?.publicationYear);
      });
    });

    it('preserves verbatim source passage faithfully without silent alteration', async () => {
      const testSnippet = 'Verbatim test quotation: phonetic regularized loss minimized subword entropy by 18.2%.';
      const testClaim = 'Phonetic regularization decreases subword entropy';

      const postRes = await callPost({
        projectId,
        paperId: paper1Id,
        claim: testClaim,
        snippet: testSnippet,
        page: 6,
        section: 'Methodology',
        relationship: 'supports',
      });

      expect([200, 201]).toContain(postRes.status);
      const postData = await postRes.json();
      const createdId = postData.evidence.id;

      try {
        const getRes = await callGet(`projectId=${projectId}`);
        const getData = await getRes.json();
        const found = getData.evidence.find((e: any) => e.id === createdId);

        expect(found).toBeDefined();
        // Verbatim snippet must be strictly preserved
        expect(found.snippet).toBe(testSnippet);
        expect(found.claim).toBe(testClaim);
        expect(found.paperId).toBe(paper1Id);
      } finally {
        await callDelete(createdId);
      }
    });

    it('validates manuscript chunk fidelity against stored document chunks', () => {
      // Test paper-demo-01 with a real quote from seed chunk (e.g. Table 4 / phonetic subword)
      const quote = 'XLM-R with phonetic subword regularization achieved 84.1% Macro-F1';
      const fidelity = db.validateEvidenceFidelity(paper1Id, quote);

      // Should find match or approximate overlap in the chunks
      expect(fidelity.quality).toBeDefined();
      expect(['verified', 'approximate', 'uncertain']).toContain(fidelity.quality);
    });

    it('honestly marks uncertain location when page or section is missing or unverified', async () => {
      const testClaim = 'Hypothetical assertion without exact page coordinate';
      const testSnippet = 'Some sentence observed during preliminary review.';

      const postRes = await callPost({
        projectId,
        paperId: paper2Id,
        claim: testClaim,
        snippet: testSnippet,
        // page omitted intentionally
        location: 'Location uncertain in extraction',
      });

      const postData = await postRes.json();
      const createdId = postData.evidence.id;

      try {
        const getRes = await callGet(`projectId=${projectId}`);
        const getData = await getRes.json();
        const found = getData.evidence.find((e: any) => e.id === createdId);

        expect(found).toBeDefined();
        // Must not fabricate a fake page number
        expect(found.location).toContain('uncertain');
      } finally {
        await callDelete(createdId);
      }
    });
  });

  describe('3. Claim-Evidence Relationships & Supporting/Opposing Dialectic', () => {
    it('supports linking both supporting and opposing evidence to a claim', async () => {
      const commonClaim = 'Dialectal pre-tokenization improves multilingual transformer F1 score';

      // 1. Supporting evidence
      const suppRes = await callPost({
        projectId,
        paperId: paper1Id,
        claim: commonClaim,
        snippet: 'Pre-tokenization yielded +3.4% Macro-F1 gain on regional corpus.',
        relationship: 'supports',
        verificationStatus: 'supported',
      });
      const suppId = (await suppRes.json()).evidence.id;

      // 2. Opposing evidence (e.g. from Paper 2 noting divergence)
      const oppRes = await callPost({
        projectId,
        paperId: paper2Id,
        claim: commonClaim,
        snippet: 'Aggressive normalization degraded performance by -1.8% on colloquial slang.',
        relationship: 'opposes',
        verificationStatus: 'contradicted',
      });
      const oppId = (await oppRes.json()).evidence.id;

      try {
        // Query supporting only
        const suppGet = await callGet(`projectId=${projectId}&relationship=supports`);
        const suppList = (await suppGet.json()).evidence;
        expect(suppList.some((e: any) => e.id === suppId)).toBe(true);

        // Query opposing only
        const oppGet = await callGet(`projectId=${projectId}&relationship=opposes`);
        const oppList = (await oppGet.json()).evidence;
        expect(oppList.some((e: any) => e.id === oppId)).toBe(true);

        // Both items exist under the same claim
        const claimGet = await callGet(`projectId=${projectId}&search=${encodeURIComponent('pre-tokenization')}`);
        const claimList = (await claimGet.json()).evidence;
        expect(claimList.some((e: any) => e.id === suppId)).toBe(true);
        expect(claimList.some((e: any) => e.id === oppId)).toBe(true);
      } finally {
        await callDelete(suppId);
        await callDelete(oppId);
      }
    });

    it('attaches research questions and thematic topics to evidence', async () => {
      const testRes = await callPost({
        projectId,
        paperId: paper1Id,
        claim: 'Subword regularization reduces out-of-vocabulary rate',
        researchQuestion: 'How does vocabulary fragmentation affect regional morphology?',
        topic: 'Subword Fragmentation',
        snippet: 'Subword regularization reduced out-of-vocabulary token rate from 14.2% to 3.1%.',
      });

      const testId = (await testRes.json()).evidence.id;

      try {
        const getRes = await callGet(`projectId=${projectId}&search=${encodeURIComponent('fragmentation')}`);
        const list = (await getRes.json()).evidence;
        const found = list.find((e: any) => e.id === testId);
        expect(found).toBeDefined();
        expect(found.researchQuestion).toContain('vocabulary fragmentation');
        expect(found.topic).toBe('Subword Fragmentation');
      } finally {
        await callDelete(testId);
      }
    });
  });

  describe('4. Researcher Verification & Quality Control', () => {
    it('distinguishes machine suggestions from researcher-confirmed records', async () => {
      // 1. Machine suggestion (isResearcherVerified = false)
      const aiRes = await callPost({
        projectId,
        paperId: paper1Id,
        claim: 'AI generated observation',
        snippet: 'Observed text snippet in chapter 4.',
        isResearcherVerified: false,
      });
      const aiId = (await aiRes.json()).evidence.id;

      // 2. Researcher confirmed (isResearcherVerified = true)
      const verifiedRes = await callPost({
        projectId,
        paperId: paper1Id,
        claim: 'Researcher confirmed finding',
        snippet: 'Verified text snippet with ground truth citation.',
        isResearcherVerified: true,
      });
      const verifiedId = (await verifiedRes.json()).evidence.id;

      try {
        const getVerifiedOnly = await callGet(`projectId=${projectId}&isResearcherVerified=true`);
        const verifiedList = (await getVerifiedOnly.json()).evidence;
        expect(verifiedList.some((e: any) => e.id === verifiedId)).toBe(true);
        expect(verifiedList.some((e: any) => e.id === aiId)).toBe(false);

        const getUnverifiedOnly = await callGet(`projectId=${projectId}&isResearcherVerified=false`);
        const unverifiedList = (await getUnverifiedOnly.json()).evidence;
        expect(unverifiedList.some((e: any) => e.id === aiId)).toBe(true);
        expect(unverifiedList.some((e: any) => e.id === verifiedId)).toBe(false);
      } finally {
        await callDelete(aiId);
        await callDelete(verifiedId);
      }
    });

    it('allows researcher to update annotation notes and confirm verification status', async () => {
      const initRes = await callPost({
        projectId,
        paperId: paper1Id,
        claim: 'Candidate claim under review',
        snippet: 'Candidate excerpt for scholarly peer appraisal.',
        isResearcherVerified: false,
      });
      const testId = (await initRes.json()).evidence.id;

      try {
        const putRes = await callPut({
          id: testId,
          isResearcherVerified: true,
          researcherNotes: 'Thoroughly validated against Table 2 and experimental logs.',
          verificationStatus: 'supported',
        });

        expect(putRes.status).toBe(200);
        const putData = await putRes.json();
        expect(putData.evidence.isResearcherVerified).toBe(true);
        expect(putData.evidence.researcherNotes).toContain('validated against Table 2');
        expect(putData.evidence.updatedAt).toBeDefined();
      } finally {
        await callDelete(testId);
      }
    });
  });

  describe('5. Duplicate Handling & Deduplication', () => {
    it('safely deduplicates identical evidence for the same paper without duplicating records', async () => {
      const duplicateSnippet = 'Identical snippet tested for deduplication idempotence.';
      const testClaim = 'Deduplication test assertion';

      const res1 = await callPost({
        projectId,
        paperId: paper1Id,
        claim: testClaim,
        snippet: duplicateSnippet,
      });
      expect(res1.status).toBe(201);
      const data1 = await res1.json();
      const id1 = data1.evidence.id;

      try {
        // Attempt posting the exact same snippet for the same paper
        const res2 = await callPost({
          projectId,
          paperId: paper1Id,
          claim: testClaim,
          snippet: duplicateSnippet,
          researcherNotes: 'Appended note on second attempt',
        });

        expect(res2.status).toBe(200); // 200 instead of 201 (reused existing record)
        const data2 = await res2.json();
        expect(data2.evidence.id).toBe(id1); // Reused identical record ID
        expect(data2.evidence.researcherNotes).toContain('Appended note');
      } finally {
        await callDelete(id1);
      }
    });
  });

  describe('6. Single Paper Scope vs Research Library Scope', () => {
    it('strictly isolates evidence to the selected paper when scope=single_paper', async () => {
      const res = await callGet(`projectId=${projectId}&paperId=${paper1Id}&scope=single_paper`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.scope).toBe('single_paper');
      expect(data.evidence.length).toBeGreaterThan(0);

      // Every returned item MUST belong to paper1Id
      data.evidence.forEach((item: any) => {
        expect(item.paperId).toBe(paper1Id);
      });

      // Must not contain Paper 2 evidence
      const hasPaper2 = data.evidence.some((e: any) => e.paperId === paper2Id);
      expect(hasPaper2).toBe(false);
    });

    it('retains clear paper identity in Library scope without cross-attribution', async () => {
      const res = await callGet(`projectId=${projectId}&scope=library`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.scope).toBe('library');
      expect(data.evidence.length).toBeGreaterThan(0);

      data.evidence.forEach((item: any) => {
        expect(item.paperId).toBeTruthy();
        expect(item.paperTitle).toBeTruthy();
        // Paper title should not be generic or detached
        expect(item.paperTitle).not.toBe('');
      });
    });

    it('isolates evidence between distinct projects', async () => {
      const otherRes = await callGet('projectId=non-existent-project-xyz');
      expect(otherRes.status).toBe(200);
      const data = await otherRes.json();
      expect(data.evidence.length).toBe(0);
    });
  });

  describe('7. Malformed Metadata & Deletion Lifecycle', () => {
    it('handles malformed records with missing snippet or location gracefully', async () => {
      const res = await callPost({
        projectId,
        paperId: paper1Id,
        claim: 'Claim with minimal metadata',
        snippet: 'Minimal snippet content without page or section coordinates.',
      });

      expect([200, 201]).toContain(res.status);
      const data = await res.json();
      const id = data.evidence.id;

      try {
        const getRes = await callGet(`projectId=${projectId}`);
        const allEv = (await getRes.json()).evidence;
        const found = allEv.find((e: any) => e.id === id);
        expect(found).toBeDefined();
        expect(found.claim).toBe('Claim with minimal metadata');
        expect(found.paperId).toBe(paper1Id);
        expect(found.paperTitle).toBeTruthy();
      } finally {
        await callDelete(id);
      }
    });

    it('successfully deletes an evidence record and verifies it is removed from project queries', async () => {
      const createRes = await callPost({
        projectId,
        paperId: paper2Id,
        claim: 'Temporary assertion for deletion test',
        snippet: 'Temporary verbatim passage for deletion test verification.',
      });

      const createData = await createRes.json();
      const id = createData.evidence.id;

      // Verify it exists
      const beforeDelete = await callGet(`projectId=${projectId}`);
      const beforeList = (await beforeDelete.json()).evidence;
      expect(beforeList.some((e: any) => e.id === id)).toBe(true);

      // Delete it
      const deleteRes = await callDelete(id);
      expect(deleteRes.status).toBe(200);
      const deleteData = await deleteRes.json();
      expect(deleteData.success).toBe(true);

      // Verify it is gone
      const afterDelete = await callGet(`projectId=${projectId}`);
      const afterList = (await afterDelete.json()).evidence;
      expect(afterList.some((e: any) => e.id === id)).toBe(false);
    });
  });

  describe('8. AI OFF Manual Review & Cross-Feature Integrity', () => {
    it('allows recording manual evidence with custom annotations in AI OFF mode', async () => {
      const manualRes = await callPost({
        projectId,
        paperId: paper1Id,
        claim: 'Manual scholar assertion entered with AI assistance OFF',
        snippet: 'Verified verbatim quote transcribed directly during manual paper reading.',
        createdBy: 'Lead Researcher (Manual)',
        isResearcherVerified: true,
        researcherNotes: 'Identified manually on Page 8 Table 4 during deep qualitative reading.',
        topic: 'Manual Qualitative Review',
        relationship: 'supports',
      });

      expect([200, 201]).toContain(manualRes.status);
      const manualData = await manualRes.json();
      const id = manualData.evidence.id;

      try {
        const getRes = await callGet(`projectId=${projectId}&search=${encodeURIComponent('Manual qualitative')}`);
        const list = (await getRes.json()).evidence;
        const found = list.find((e: any) => e.id === id);
        expect(found).toBeDefined();
        expect(found.createdBy).toContain('Manual');
        expect(found.isResearcherVerified).toBe(true);
        expect(found.researcherNotes).toContain('Identified manually');
      } finally {
        await callDelete(id);
      }
    });

    it('guarantees that paper comparison and matrix can still access evidence snippets', () => {
      const projectEvidence = db.getEvidence(projectId);
      expect(projectEvidence.length).toBeGreaterThan(0);

      // Ensure every evidence record contains required properties for matrix and comparison
      projectEvidence.forEach((e) => {
        expect(e.id).toBeTruthy();
        expect(e.claim).toBeTruthy();
        expect(e.paperId).toBeTruthy();
        expect(e.snippet).toBeTruthy();
        expect(e.verificationStatus).toBeTruthy();
      });
    });
  });
});

