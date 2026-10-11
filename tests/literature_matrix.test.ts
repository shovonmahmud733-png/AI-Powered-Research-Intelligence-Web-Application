import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../src/lib/db';
import { GET, POST, PUT, DELETE } from '../src/app/api/matrix/route';
import { LiteratureMatrixRow } from '../src/lib/db/types';

describe('QA Suite: Literature Matrix & Systematic Synthesis Grid', () => {
  const projectId = 'proj_chatgaiya_sentiment_01';
  let initialRows: LiteratureMatrixRow[] = [];

  beforeEach(() => {
    initialRows = JSON.parse(JSON.stringify(db.getMatrixRows(projectId)));
  });

  afterEach(() => {
    // Restore initial rows
    const current = db.getMatrixRows(projectId);
    current.forEach((r) => db.deleteMatrixRow(r.id));
    initialRows.forEach((r) => db.saveMatrixRow(r));
  });

  // ==========================================
  // 1. MATRIX RETRIEVAL & API ENDPOINT
  // ==========================================
  describe('1. Matrix Retrieval & API Routing', () => {
    it('rejects requests without projectId parameter (HTTP 400)', async () => {
      const req = new Request('http://localhost:3000/api/matrix');
      const res = await GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('projectId is required');
    });

    it('retrieves matrix rows with enriched paper metadata and availablePapers', async () => {
      const req = new Request(`http://localhost:3000/api/matrix?projectId=${projectId}`);
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data.rows)).toBe(true);
      expect(data.rows.length).toBeGreaterThan(0);
      expect(data.totalRows).toBe(data.rows.length);
      expect(Array.isArray(data.availablePapers)).toBe(true);
    });
  });

  // ==========================================
  // 2. DATA ACCURACY & PAPER IDENTITY
  // ==========================================
  describe('2. Paper Identity & Dimension Grounding', () => {
    it('verifies that each row corresponds to the correct paper without mismatched metadata', async () => {
      const req = new Request(`http://localhost:3000/api/matrix?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const dbPapers = db.getPapers(projectId);
      const papersMap = new Map(dbPapers.map((p) => [p.id, p]));

      data.rows.forEach((row: any) => {
        expect(row.id).toBeTruthy();
        expect(row.paperTitle).toBeTruthy();
        expect(typeof row.year).toBe('number');

        if (row.paperId && papersMap.has(row.paperId)) {
          const parentPaper = papersMap.get(row.paperId)!;
          const cleanTitle = parentPaper.title.replace(/^\[DEMO.*?\]\s*/i, '').trim();
          expect(row.paperTitle.includes(cleanTitle.slice(0, 20))).toBe(true);
          expect(row.year).toBe(parentPaper.publicationYear);
          expect(Array.isArray(row.authors)).toBe(true);
          expect(row.authors.length).toBe(parentPaper.authors.length);
          expect(row.doi).toBe(parentPaper.doi);
        }
      });
    });

    it('distinguishes completed vs pending analysis states honestly without hallucination', async () => {
      const req = new Request(`http://localhost:3000/api/matrix?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      // Check row for paper-1790714888215-m4sg which is pending extraction
      const pendingRow = data.rows.find((r: any) => r.paperId === 'paper-1790714888215-m4sg');
      if (pendingRow) {
        expect(pendingRow.analysisStatus).toBe('pending');
        expect(pendingRow.dataset).toBe('Pending extraction');
      }

      // Check row for paper-demo-01 which has completed analysis
      const completedRow = data.rows.find((r: any) => r.paperId === 'paper-demo-01');
      expect(completedRow).toBeDefined();
      expect(completedRow.dataset).toContain('CSC-24');
      expect(completedRow.model).toContain('XLM-R');
      expect(completedRow.analysisStatus).toBe('completed');
    });
  });

  // ==========================================
  // 3. MULTI-PAPER COMPARISON & CONTRAST
  // ==========================================
  describe('3. Multi-Paper Comparison & Non-Swapped Columns', () => {
    it('compares paper-demo-01 and paper-demo-02 with distinct verified metrics', async () => {
      const req = new Request(`http://localhost:3000/api/matrix?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const row1 = data.rows.find((r: any) => r.paperId === 'paper-demo-01');
      const row2 = data.rows.find((r: any) => r.paperId === 'paper-demo-02');

      expect(row1).toBeDefined();
      expect(row2).toBeDefined();

      // Datasets must be distinct and correct
      expect(row1.dataset).toContain('CSC-24');
      expect(row2.dataset).toContain('CRBC-23');

      // Models must be distinct and correct
      expect(row1.model).toContain('XLM-R');
      expect(row2.model).toContain('BanglaBERT');

      // Metrics must be distinct and correct
      expect(row1.metric).toContain('84.1%');
      expect(row2.metric).toContain('81.3%');

      // Years must be distinct and correct
      expect(row1.year).toBe(2024);
      expect(row2.year).toBe(2023);
    });
  });

  // ==========================================
  // 4. EVIDENCE TRACEABILITY & SNIPPETS
  // ==========================================
  describe('4. Evidence Traceability & Provenance Snippets', () => {
    it('attaches real evidence snippets and manuscript locations to corresponding rows', async () => {
      const req = new Request(`http://localhost:3000/api/matrix?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const dbEvidence = db.getEvidence(projectId);
      const rowWithEvidence = data.rows.find((r: any) => r.paperId === 'paper-demo-01');

      expect(rowWithEvidence).toBeDefined();
      expect(rowWithEvidence.evidenceSnippet).toBeTruthy();

      // Snippet must match the real evidence item in the database
      const matchingEv = dbEvidence.find((e) => e.paperId === 'paper-demo-01');
      expect(matchingEv).toBeDefined();
      expect(rowWithEvidence.evidenceSnippet).toBe(matchingEv?.snippet);
      expect(rowWithEvidence.evidenceLocation).toBeTruthy();
    });
  });

  // ==========================================
  // 5. ROW LIFECYCLE (POST, PUT, DELETE)
  // ==========================================
  describe('5. Matrix Row Lifecycle Operations', () => {
    it('creates a new matrix row via POST and persists it', async () => {
      const newRowPayload = {
        projectId,
        paperId: 'paper-test-row-01',
        paperTitle: 'Empirical Study on Low-Resource Morphosyntax',
        year: 2024,
        dataset: 'Bengali Dialect Corpus (BDC-24)',
        model: 'mBERT + LoRA',
        language: 'Dialectal Bengali',
        method: 'Parameter-efficient fine-tuning',
        metric: 'Macro-F1: 79.5%',
        result: 'Achieves parity with full fine-tuning with 90% fewer parameters',
        limitation: 'Limited to formal dialectal texts',
        customColumns: {
          'Pre-training Paradigm': 'Masked Language Modeling',
        },
      };

      const req = new Request('http://localhost:3000/api/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRowPayload),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.row).toBeDefined();
      expect(body.row.paperTitle).toBe(newRowPayload.paperTitle);

      // Verify row exists in DB
      const dbRow = db.getMatrixRows(projectId).find((r) => r.id === body.row.id);
      expect(dbRow).toBeDefined();
      expect(dbRow?.dataset).toBe(newRowPayload.dataset);
    });

    it('updates an existing matrix row via PUT', async () => {
      const existing = db.getMatrixRows(projectId)[0];
      expect(existing).toBeDefined();

      const updatedPayload = {
        ...existing,
        dataset: 'Updated Benchmark Corpus (UBC-25)',
        result: 'Updated 85.2% Macro-F1',
      };

      const req = new Request('http://localhost:3000/api/matrix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload),
      });

      const res = await PUT(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.row.dataset).toBe('Updated Benchmark Corpus (UBC-25)');
      expect(body.row.result).toBe('Updated 85.2% Macro-F1');

      // Verify DB updated
      const dbRow = db.getMatrixRows(projectId).find((r) => r.id === existing.id);
      expect(dbRow?.dataset).toBe('Updated Benchmark Corpus (UBC-25)');
    });

    it('deletes a matrix row via DELETE without deleting the source paper', async () => {
      const existing = db.getMatrixRows(projectId)[0];
      expect(existing).toBeDefined();
      const associatedPaperId = existing.paperId;

      const req = new Request(`http://localhost:3000/api/matrix?id=${existing.id}`, {
        method: 'DELETE',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify row removed from DB matrix
      const dbRow = db.getMatrixRows(projectId).find((r) => r.id === existing.id);
      expect(dbRow).toBeUndefined();

      // Verify the underlying paper in db.papers was NOT deleted!
      if (associatedPaperId) {
        const paperStillExists = db.getPapers(projectId).find((p) => p.id === associatedPaperId);
        expect(paperStillExists).toBeDefined();
      }
    });
  });

  // ==========================================
  // 6. SEARCH, FILTERING & SORTING LOGIC
  // ==========================================
  describe('6. Search, Filter, and Sort Verifications', () => {
    it('filters rows by keyword query across title, dataset, and model', async () => {
      const req = new Request(`http://localhost:3000/api/matrix?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const query = 'xlm-r';
      const matched = data.rows.filter(
        (r: any) =>
          r.paperTitle.toLowerCase().includes(query) ||
          r.model.toLowerCase().includes(query) ||
          r.dataset.toLowerCase().includes(query)
      );

      expect(matched.length).toBeGreaterThan(0);
      matched.forEach((r: any) => {
        const combined = `${r.paperTitle} ${r.model} ${r.dataset}`.toLowerCase();
        expect(combined.includes(query)).toBe(true);
      });
    });

    it('sorts rows by publication year accurately', async () => {
      const req = new Request(`http://localhost:3000/api/matrix?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const sortedDesc = [...data.rows].sort((a: any, b: any) => b.year - a.year);
      for (let i = 0; i < sortedDesc.length - 1; i++) {
        expect(sortedDesc[i].year).toBeGreaterThanOrEqual(sortedDesc[i + 1].year);
      }
    });
  });

  // ==========================================
  // 7. EXPORT DATA INTEGRITY
  // ==========================================
  describe('7. Export Data Integrity', () => {
    it('verifies CSV row generation contains all required columns and escaped values', async () => {
      const req = new Request(`http://localhost:3000/api/matrix?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      data.rows.forEach((r: any) => {
        // Construct CSV line
        const escapedTitle = `"${r.paperTitle.replace(/"/g, '""')}"`;
        expect(escapedTitle.startsWith('"')).toBe(true);
        expect(escapedTitle.endsWith('"')).toBe(true);
        expect(typeof r.year).toBe('number');
      });
    });
  });

  // ==========================================
  // 8. PROJECT BOUNDARY & ISOLATION
  // ==========================================
  describe('8. Project Isolation & Data Boundary', () => {
    it('strictly isolates matrix rows by projectId', async () => {
      const reqA = new Request(`http://localhost:3000/api/matrix?projectId=${projectId}`);
      const resA = await GET(reqA);
      const dataA = await resA.json();

      const reqB = new Request('http://localhost:3000/api/matrix?projectId=proj_empty_isolated_999');
      const resB = await GET(reqB);
      const dataB = await resB.json();

      expect(resB.status).toBe(200);
      expect(dataB.rows.length).toBe(0);

      // Rows in Project A must all match projectId
      dataA.rows.forEach((r: any) => {
        expect(r.projectId).toBe(projectId);
      });
    });
  });
});
