import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/lib/db';
import { GET } from '../src/app/api/knowledge-graph/route';

describe('Knowledge Graph API & Relational Topology Suite', () => {
  const projectId = 'proj_chatgaiya_sentiment_01';

  it('rejects requests without projectId parameter', async () => {
    const req = new Request('http://localhost:3000/api/knowledge-graph');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('projectId is required');
  });

  it('retrieves project-isolated knowledge graph with nodes and edges', async () => {
    const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.nodes).toBeDefined();
    expect(data.edges).toBeDefined();
    expect(data.nodes.length).toBeGreaterThan(0);
    expect(data.edges.length).toBeGreaterThan(0);
    expect(data.totalNodes).toBe(data.nodes.length);
    expect(data.totalEdges).toBe(data.edges.length);
  });

  it('verifies entity schema types and non-empty metadata', async () => {
    const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
    const res = await GET(req);
    const data = await res.json();

    const allowedTypes = new Set(['topic', 'paper', 'author', 'dataset', 'model', 'gap', 'finding', 'method']);
    const nodeIds = new Set<string>();

    data.nodes.forEach((node: any) => {
      expect(node.id).toBeDefined();
      expect(node.label).toBeTruthy();
      expect(allowedTypes.has(node.type)).toBe(true);
      expect(nodeIds.has(node.id)).toBe(false); // IDs must be unique
      nodeIds.add(node.id);

      // Verify type-specific real data integrity
      if (node.type === 'paper') {
        expect(node.paperId).toBeDefined();
        expect(Array.isArray(node.authors)).toBe(true);
        expect(node.publicationYear).toBeDefined();
      } else if (node.type === 'finding') {
        expect(node.evidenceId).toBeDefined();
        expect(node.paperId).toBeDefined();
        expect(node.details).toBeTruthy();
      } else if (node.type === 'gap') {
        expect(node.gapId).toBeDefined();
        expect(node.details).toBeTruthy();
      }
    });
  });

  it('enforces referential integrity on all edges', async () => {
    const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
    const res = await GET(req);
    const data = await res.json();

    const nodeIds = new Set(data.nodes.map((n: any) => n.id));
    const allowedRelationships = new Set([
      'includes_paper',
      'authored_by',
      'evaluates_on_dataset',
      'implements_model',
      'supported_by_limitation',
      'reports_finding',
      'investigates_question',
    ]);

    data.edges.forEach((edge: any) => {
      // Source and target must exist in the node set
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
      expect(allowedRelationships.has(edge.relationship)).toBe(true);
    });
  });

  it('guarantees project isolation and boundary enforcement', async () => {
    // Request graph for Project A
    const reqA = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
    const resA = await GET(reqA);
    const dataA = await resA.json();

    // Request graph for a non-existent or separate project
    const reqB = new Request('http://localhost:3000/api/knowledge-graph?projectId=proj_isolated_empty_999');
    const resB = await GET(reqB);
    const dataB = await resB.json();

    expect(resB.status).toBe(200);
    // Non-existent project has 0 nodes and 0 edges
    expect(dataB.nodes.length).toBe(0);
    expect(dataB.edges.length).toBe(0);

    // Nodes in Project A must only reference entities from Project A
    const projectPapers = db.getPapers(projectId).map((p) => p.id);
    dataA.nodes
      .filter((n: any) => n.type === 'paper')
      .forEach((n: any) => {
        expect(projectPapers.includes(n.paperId)).toBe(true);
      });
  });

  it('validates paper provenance and source traceability on findings and datasets', async () => {
    const req = new Request(`http://localhost:3000/api/knowledge-graph?projectId=${projectId}`);
    const res = await GET(req);
    const data = await res.json();

    // Findings must link to a valid paper node in the graph
    const findingNodes = data.nodes.filter((n: any) => n.type === 'finding');
    expect(findingNodes.length).toBeGreaterThan(0);

    findingNodes.forEach((fn: any) => {
      const parentPaperNode = data.nodes.find((n: any) => n.id === `node-paper-${fn.paperId}`);
      expect(parentPaperNode).toBeDefined();

      // There must be an edge connecting the paper to the finding
      const edge = data.edges.find((e: any) => e.source === parentPaperNode.id && e.target === fn.id);
      expect(edge).toBeDefined();
      expect(edge.relationship).toBe('reports_finding');
    });
  });
});
