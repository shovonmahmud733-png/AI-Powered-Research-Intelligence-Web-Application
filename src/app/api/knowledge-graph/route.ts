import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { KnowledgeGraphNode, KnowledgeGraphEdge } from '@/lib/db/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const project = db.getProjectById(projectId);
  const papers = db.getPapers(projectId);
  const gaps = db.getGaps(projectId);

  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];

  const addedNodes = new Set<string>();

  const addNode = (node: KnowledgeGraphNode) => {
    if (!addedNodes.has(node.id)) {
      addedNodes.add(node.id);
      nodes.push(node);
    }
  };

  // 1. Research Project Node as Central Hub
  if (project) {
    addNode({
      id: project.id,
      label: project.title.substring(0, 36) + '...',
      type: 'topic',
      details: project.description,
    });

    // Research Questions
    project.researchQuestions?.forEach((q) => {
      const qNodeId = `node-${q.id}`;
      addNode({
        id: qNodeId,
        label: `RQ: ${q.question.substring(0, 32)}...`,
        type: 'method',
        details: q.question,
      });
      edges.push({
        source: project.id,
        target: qNodeId,
        relationship: 'investigates_question',
      });
    });
  }

  // 2. Paper Nodes and interconnected entities
  papers.forEach((p) => {
    const pNodeId = `node-paper-${p.id}`;
    addNode({
      id: pNodeId,
      label: p.title.replace(/^\[DEMO.*?\]\s*/i, '').substring(0, 32) + '...',
      type: 'paper',
      details: `Published in ${p.journalOrConference} (${p.publicationYear}). Citations: ${p.citationCount}`,
    });

    if (project) {
      edges.push({
        source: project.id,
        target: pNodeId,
        relationship: 'includes_paper',
      });
    }

    // Authors
    p.authors.slice(0, 3).forEach((author) => {
      const aNodeId = `node-author-${encodeURIComponent(author.trim().toLowerCase())}`;
      addNode({
        id: aNodeId,
        label: author,
        type: 'author',
        details: `Scholar author of ${p.title.substring(0, 40)}`,
      });
      edges.push({
        source: pNodeId,
        target: aNodeId,
        relationship: 'authored_by',
      });
    });

    // Analysis entities: Dataset, Model, Methods
    const analysis = db.getAnalysisByPaper(p.id);
    if (analysis) {
      if (analysis.dataset && analysis.dataset !== 'Not specified') {
        const dNodeId = `node-data-${encodeURIComponent(analysis.dataset.trim().toLowerCase())}`;
        addNode({
          id: dNodeId,
          label: analysis.dataset,
          type: 'dataset',
          details: `Benchmark dataset (${analysis.datasetSize || 'Empirical'})`,
        });
        edges.push({
          source: pNodeId,
          target: dNodeId,
          relationship: 'evaluates_on_dataset',
        });
      }

      if (analysis.model && analysis.model !== 'Not specified') {
        const mNodeId = `node-model-${encodeURIComponent(analysis.model.trim().toLowerCase())}`;
        addNode({
          id: mNodeId,
          label: analysis.model.substring(0, 30),
          type: 'model',
          details: `Neural architecture: ${analysis.model}`,
        });
        edges.push({
          source: pNodeId,
          target: mNodeId,
          relationship: 'implements_model',
        });
      }
    }
  });

  // 3. Research Gaps
  gaps.forEach((g) => {
    const gNodeId = `node-gap-${g.id}`;
    addNode({
      id: gNodeId,
      label: `Gap: ${g.title.substring(0, 30)}...`,
      type: 'gap',
      details: g.description,
    });

    g.supportingPaperIds?.forEach((pid) => {
      const pNodeId = `node-paper-${pid}`;
      if (addedNodes.has(pNodeId)) {
        edges.push({
          source: gNodeId,
          target: pNodeId,
          relationship: 'supported_by_limitation',
        });
      }
    });
  });

  return NextResponse.json({ nodes, edges, totalNodes: nodes.length, totalEdges: edges.length });
}
