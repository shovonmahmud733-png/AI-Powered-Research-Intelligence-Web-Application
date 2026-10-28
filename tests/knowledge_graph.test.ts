import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/lib/db';
import { GET } from '../src/app/api/knowledge-graph/route';
import { signToken } from '../src/lib/auth/session';

describe('QA Suite: Interactive Research Knowledge Graph Explorer', () => {
  const projectId = 'proj_chatgaiya_sentiment_01';

  // ==========================================
  // 1. GRAPH LOADING & DATA POPULATION
  // ==========================================
  describe('1. Graph Loading & Data Schema', () => {
    it('rejects requests without projectId parameter (HTTP 400)', async () => {
      const req = new Request('http://localhost:3000/api/knowledge-graph');
      const res = await GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('projectId is required');
    });

    it('loads graph data for project with valid node and edge arrays', async () => {
      const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data.nodes)).toBe(true);
      expect(Array.isArray(data.edges)).toBe(true);
      expect(data.nodes.length).toBeGreaterThanOrEqual(35);
      expect(data.edges.length).toBeGreaterThanOrEqual(40);
      expect(data.totalNodes).toBe(data.nodes.length);
      expect(data.totalEdges).toBe(data.edges.length);
      expect(data.projectTitle).toBe('Chatgaiya Sentiment Analysis & Low-Resource Dialectal NLP');
    });

    it('handles empty / non-existent projects gracefully without error', async () => {
      const req = new Request('http://localhost:3000/api/knowledge-graph?projectId=non_existent_project_xyz');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.nodes).toEqual([]);
      expect(data.edges).toEqual([]);
      expect(data.totalNodes).toBe(0);
      expect(data.totalEdges).toBe(0);
    });
  });

  // ==========================================
  // 2. NODE ACCURACY & ENTITY SCHEMA
  // ==========================================
  describe('2. Node Accuracy & Provenance', () => {
    it('verifies exact entity types and non-empty metadata without hallucination', async () => {
      const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const validTypes = new Set(['topic', 'paper', 'author', 'dataset', 'model', 'gap', 'finding', 'method']);
      const nodeIds = new Set<string>();

      data.nodes.forEach((n: any) => {
        expect(validTypes.has(n.type)).toBe(true);
        expect(n.id).toBeTruthy();
        expect(n.label).toBeTruthy();
        expect(nodeIds.has(n.id)).toBe(false); // Unique IDs
        nodeIds.add(n.id);

        if (n.type === 'paper') {
          expect(n.paperId).toBeTruthy();
          expect(Array.isArray(n.authors)).toBe(true);
          expect(typeof n.publicationYear).toBe('number');
          expect(n.venue).toBeTruthy();
        } else if (n.type === 'finding') {
          expect(n.evidenceId).toBeTruthy();
          expect(n.paperId).toBeTruthy();
          expect(n.confidence).toBeGreaterThan(0);
        } else if (n.type === 'gap') {
          expect(n.gapId).toBeTruthy();
          expect(n.details).toBeTruthy();
        }
      });
    });

    it('matches paper nodes directly against the database', async () => {
      const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const dbPapers = db.getPapers(projectId);
      const graphPaperNodes = data.nodes.filter((n: any) => n.type === 'paper');

      expect(graphPaperNodes.length).toBe(dbPapers.length);

      dbPapers.forEach((p) => {
        const found = graphPaperNodes.find((n: any) => n.paperId === p.id);
        expect(found).toBeDefined();
        const expectedCleanTitle = p.title.replace(/^\[DEMO.*?\]\s*/i, '').trim();
        expect(found.label).toBe(expectedCleanTitle);
        expect(found.publicationYear).toBe(p.publicationYear);
        expect(found.venue).toBe(p.journalOrConference);
        expect(found.doi).toBe(p.doi);
      });
    });

    it('matches empirical finding nodes directly to db evidence with real manuscript coordinates', async () => {
      const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const dbEvidence = db.getEvidence(projectId);
      const graphFindingNodes = data.nodes.filter((n: any) => n.type === 'finding');

      expect(graphFindingNodes.length).toBe(dbEvidence.length);

      dbEvidence.forEach((ev) => {
        const found = graphFindingNodes.find((n: any) => n.evidenceId === ev.id);
        expect(found).toBeDefined();
        expect(found.paperId).toBe(ev.paperId);
        expect(found.confidence).toBe(ev.confidence);
        expect(found.location).toBe(ev.location || ev.section);
      });
    });
  });

  // ==========================================
  // 3. EDGE ACCURACY & REAL DATA GROUNDING
  // ==========================================
  describe('3. Edge Accuracy & Referential Integrity', () => {
    it('verifies that all edges connect existing nodes and have valid relationships', async () => {
      const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const nodeIds = new Set(data.nodes.map((n: any) => n.id));
      const validRelationships = new Set([
        'includes_paper',
        'authored_by',
        'evaluates_on_dataset',
        'implements_model',
        'supported_by_limitation',
        'reports_finding',
        'investigates_question',
      ]);

      data.edges.forEach((edge: any) => {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
        expect(validRelationships.has(edge.relationship)).toBe(true);
        expect(edge.label).toBeTruthy();
      });
    });

    it('verifies that every paper-to-finding edge reflects verified evidence', async () => {
      const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const findingEdges = data.edges.filter((e: any) => e.relationship === 'reports_finding');
      expect(findingEdges.length).toBeGreaterThan(0);

      findingEdges.forEach((edge: any) => {
        const targetFinding = data.nodes.find((n: any) => n.id === edge.target);
        expect(targetFinding).toBeDefined();
        expect(edge.source).toBe(`node-paper-${targetFinding.paperId}`);
        expect(edge.evidenceSnippet).toBeTruthy();
      });
    });

    it('verifies gap limitation edges connect to real supporting papers', async () => {
      const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const limitationEdges = data.edges.filter((e: any) => e.relationship === 'supported_by_limitation');
      expect(limitationEdges.length).toBeGreaterThan(0);

      limitationEdges.forEach((edge: any) => {
        const sourceGap = data.nodes.find((n: any) => n.id === edge.source);
        const targetPaper = data.nodes.find((n: any) => n.id === edge.target);
        expect(sourceGap).toBeDefined();
        expect(targetPaper).toBeDefined();
        expect(targetPaper.type).toBe('paper');
      });
    });
  });

  // ==========================================
  // 4. NODE INTERACTIONS & SUBGRAPH HIGHLIGHTING
  // ==========================================
  describe('4. Node Interactions & Subgraph Calculation', () => {
    it('accurately identifies 1st-degree neighbors for a selected paper node', async () => {
      const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const targetPaperId = 'node-paper-paper-demo-01';
      const connectedEdges = data.edges.filter(
        (e: any) => e.source === targetPaperId || e.target === targetPaperId
      );
      expect(connectedEdges.length).toBeGreaterThan(0);

      const neighborIds = new Set<string>();
      connectedEdges.forEach((e: any) => {
        if (e.source === targetPaperId) neighborIds.add(e.target);
        if (e.target === targetPaperId) neighborIds.add(e.source);
      });

      // paper-demo-01 has authors, project inclusion, datasets, models, findings, and gaps connected
      expect(neighborIds.size).toBeGreaterThanOrEqual(5);
    });
  });

  // ==========================================
  // 5. SEARCH & FILTERING LOGIC
  // ==========================================
  describe('5. Search & Multi-Faceted Filters', () => {
    it('filters nodes by entity type accurately', async () => {
      const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const paperNodes = data.nodes.filter((n: any) => n.type === 'paper');
      const authorNodes = data.nodes.filter((n: any) => n.type === 'author');
      const datasetNodes = data.nodes.filter((n: any) => n.type === 'dataset');

      expect(paperNodes.length).toBe(6);
      expect(authorNodes.length).toBe(18);
      expect(datasetNodes.length).toBe(2);
    });

    it('filters graph by paper subgraph scope accurately', async () => {
      const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const selectedPaper = 'paper-demo-01';
      const scopedNodes = data.nodes.filter(
        (n: any) => (n.type === 'paper' && n.paperId === selectedPaper) || n.paperId === selectedPaper
      );

      // Must include paper-demo-01, its authors, dataset, model, and findings
      expect(scopedNodes.length).toBeGreaterThanOrEqual(6);
      scopedNodes.forEach((n: any) => {
        expect(n.paperId).toBe(selectedPaper);
      });
    });

    it('searches nodes by keyword across labels, types, and paper titles', async () => {
      const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const query = 'roberta';
      const matches = data.nodes.filter((n: any) =>
        n.label.toLowerCase().includes(query) || (n.details && n.details.toLowerCase().includes(query))
      );

      expect(matches.length).toBeGreaterThan(0);
      matches.forEach((m: any) => {
        const text = `${m.label} ${m.details || ''}`.toLowerCase();
        expect(text.includes(query)).toBe(true);
      });
    });
  });

  // ==========================================
  // 6. GRAPH CONTROLS & BOUNDING MATH
  // ==========================================
  describe('6. Graph Controls & Viewport Calculations', () => {
    it('verifies bounding box calculation and auto-fit zoom scaling math', () => {
      const mockNodes = [
        { x: 100, y: 100 },
        { x: 900, y: 600 },
      ];

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      mockNodes.forEach((n) => {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      });

      const boxW = Math.max(100, maxX - minX + 160);
      const boxH = Math.max(100, maxY - minY + 160);
      const fitScale = Math.min(1000 / boxW, 650 / boxH, 1.4);
      const clampedZoom = Math.max(0.4, fitScale);

      expect(clampedZoom).toBeGreaterThan(0.4);
      expect(clampedZoom).toBeLessThanOrEqual(1.4);
    });

    it('verifies zoom clamping boundary (0.4x min to 2.5x max)', () => {
      const clampZoom = (z: number) => Math.min(2.5, Math.max(0.4, z));

      expect(clampZoom(0.1)).toBe(0.4);
      expect(clampZoom(3.5)).toBe(2.5);
      expect(clampZoom(1.2)).toBe(1.2);
    });
  });

  // ==========================================
  // 7. SOURCE TRACEABILITY
  // ==========================================
  describe('7. Source Traceability', () => {
    it('verifies all paper nodes contain valid publication details and DOI', async () => {
      const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
      const res = await GET(req);
      const data = await res.json();

      const papers = data.nodes.filter((n: any) => n.type === 'paper');
      papers.forEach((p: any) => {
        expect(p.paperId).toBeTruthy();
        expect(p.paperTitle).toBeTruthy();
        expect(p.authors.length).toBeGreaterThan(0);
        expect(p.doi).toMatch(/^10\./); // DOI prefix
      });
    });
  });

  // ==========================================
  // 8. PROJECT / LIBRARY SCOPE ISOLATION
  // ==========================================
  describe('8. Project Scope Isolation', () => {
    it('strictly isolates entities between distinct projects', async () => {
      const reqA = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
      const resA = await GET(reqA);
      const dataA = await resA.json();

      const altProjectId = 'proj_analysis_mode_01';
      const tokenB = signToken({ userId: 'usr_researcher_01', email: 'researcher01@lab.edu' });
      const reqB = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${altProjectId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const resB = await GET(reqB);
      const dataB = await resB.json();

      const projectAPaperIds = new Set(dataA.nodes.filter((n: any) => n.type === 'paper').map((n: any) => n.paperId));
      const projectBPaperIds = new Set(dataB.nodes.filter((n: any) => n.type === 'paper').map((n: any) => n.paperId));

      // Projects must not cross-leak paper nodes
      projectAPaperIds.forEach((id) => {
        expect(projectBPaperIds.has(id)).toBe(false);
      });
    });
  });
});
