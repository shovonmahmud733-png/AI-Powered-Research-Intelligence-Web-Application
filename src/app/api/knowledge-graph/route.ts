import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { KnowledgeGraphNode, KnowledgeGraphEdge } from '../../../lib/db/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const project = db.getProjectById(projectId);
  const papers = db.getPapers(projectId);
  const gaps = db.getGaps(projectId);
  const evidence = db.getEvidence(projectId);

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
      label: project.title,
      type: 'topic',
      details: project.description,
      projectId: project.id,
    });

    // Research Questions
    project.researchQuestions?.forEach((q) => {
      const qNodeId = `node-${q.id}`;
      addNode({
        id: qNodeId,
        label: `RQ: ${q.question.length > 44 ? q.question.substring(0, 42) + '...' : q.question}`,
        type: 'method',
        details: q.question + (q.notes ? `\n\nNotes: ${q.notes}` : ''),
        projectId: project.id,
      });
      edges.push({
        id: `edge-${project.id}-${qNodeId}`,
        source: project.id,
        target: qNodeId,
        relationship: 'investigates_question',
        label: 'Investigates Question',
      });
    });
  }

  // 2. Paper Nodes and interconnected entities
  papers.forEach((p) => {
    const pNodeId = `node-paper-${p.id}`;
    const cleanTitle = p.title.replace(/^\[DEMO.*?\]\s*/i, '').trim();
    addNode({
      id: pNodeId,
      label: cleanTitle,
      type: 'paper',
      details: `Published in ${p.journalOrConference || 'Academic Venue'} (${p.publicationYear || 'N/A'}). Citations: ${p.citationCount || 0}`,
      paperId: p.id,
      paperTitle: cleanTitle,
      authors: p.authors,
      publicationYear: p.publicationYear,
      venue: p.journalOrConference,
      doi: p.doi,
      citationCount: p.citationCount,
      projectId: p.projectId,
    });

    if (project) {
      edges.push({
        id: `edge-${project.id}-${pNodeId}`,
        source: project.id,
        target: pNodeId,
        relationship: 'includes_paper',
        label: 'Includes Paper',
        paperId: p.id,
        paperTitle: cleanTitle,
      });
    }

    // Authors (up to 4 per paper)
    p.authors.slice(0, 4).forEach((author) => {
      const aNodeId = `node-author-${encodeURIComponent(author.trim().toLowerCase())}`;
      addNode({
        id: aNodeId,
        label: author.trim(),
        type: 'author',
        details: `Scholar author of "${cleanTitle}" (${p.publicationYear || 'N/A'})`,
        authors: [author.trim()],
        paperId: p.id,
        paperTitle: cleanTitle,
      });
      edges.push({
        id: `edge-${pNodeId}-${aNodeId}`,
        source: pNodeId,
        target: aNodeId,
        relationship: 'authored_by',
        label: 'Authored By',
        paperId: p.id,
        paperTitle: cleanTitle,
      });
    });

    // Analysis entities: Dataset, Model
    const analysis = db.getAnalysisByPaper(p.id);
    if (analysis) {
      if (analysis.dataset && analysis.dataset !== 'Not specified') {
        const dNodeId = `node-data-${encodeURIComponent(analysis.dataset.trim().toLowerCase())}`;
        addNode({
          id: dNodeId,
          label: analysis.dataset,
          type: 'dataset',
          details: `Benchmark dataset: ${analysis.dataset} (${analysis.datasetSize || 'Empirical Corpus'})`,
          paperId: p.id,
          paperTitle: cleanTitle,
        });
        edges.push({
          id: `edge-${pNodeId}-${dNodeId}`,
          source: pNodeId,
          target: dNodeId,
          relationship: 'evaluates_on_dataset',
          label: 'Evaluates on Dataset',
          paperId: p.id,
          paperTitle: cleanTitle,
        });
      }

      if (analysis.model && analysis.model !== 'Not specified') {
        const mNodeId = `node-model-${encodeURIComponent(analysis.model.trim().toLowerCase())}`;
        addNode({
          id: mNodeId,
          label: analysis.model,
          type: 'model',
          details: `Neural architecture: ${analysis.model}`,
          paperId: p.id,
          paperTitle: cleanTitle,
        });
        edges.push({
          id: `edge-${pNodeId}-${mNodeId}`,
          source: pNodeId,
          target: mNodeId,
          relationship: 'implements_model',
          label: 'Implements Model',
          paperId: p.id,
          paperTitle: cleanTitle,
        });
      }
    }
  });

  // 3. Research Gaps
  gaps.forEach((g) => {
    const gNodeId = `node-gap-${g.id}`;
    addNode({
      id: gNodeId,
      label: `Gap: ${g.title}`,
      type: 'gap',
      details: g.description + (g.proposedDirection ? `\n\nProposed Direction: ${g.proposedDirection}` : ''),
      gapId: g.id,
      projectId: g.projectId,
    });

    g.supportingPaperIds?.forEach((pid) => {
      const pNodeId = `node-paper-${pid}`;
      if (addedNodes.has(pNodeId)) {
        edges.push({
          id: `edge-${gNodeId}-${pNodeId}`,
          source: gNodeId,
          target: pNodeId,
          relationship: 'supported_by_limitation',
          label: 'Supported by Limitation',
          paperId: pid,
        });
      }
    });
  });

  // 4. Empirical Findings (from evidence)
  evidence.forEach((ev) => {
    const evNodeId = `node-finding-${ev.id}`;
    const pNodeId = `node-paper-${ev.paperId}`;
    addNode({
      id: evNodeId,
      label: `Finding: ${ev.claim.length > 50 ? ev.claim.substring(0, 48) + '...' : ev.claim}`,
      type: 'finding',
      details: `Empirical finding: "${ev.snippet}" (${ev.location || ev.section || 'Manuscript'})`,
      evidenceId: ev.id,
      paperId: ev.paperId,
      paperTitle: ev.paperTitle,
      confidence: ev.confidence,
      evidenceType: ev.evidenceType,
      location: ev.location || ev.section,
      projectId: ev.projectId,
    });

    if (addedNodes.has(pNodeId)) {
      edges.push({
        id: `edge-${pNodeId}-${evNodeId}`,
        source: pNodeId,
        target: evNodeId,
        relationship: 'reports_finding',
        label: 'Reports Finding',
        paperId: ev.paperId,
        paperTitle: ev.paperTitle,
        confidence: ev.confidence,
        evidenceSnippet: ev.snippet,
      });
    }
  });

  return NextResponse.json({
    nodes,
    edges,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    projectTitle: project?.title || 'Research Project',
    projectId: project?.id || projectId,
  });
}
