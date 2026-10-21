import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { Evidence } from '../../../lib/db/types';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    const paperId = url.searchParams.get('paperId') || undefined;
    const scope = url.searchParams.get('scope') || (paperId ? 'single_paper' : 'project');
    const search = url.searchParams.get('search')?.toLowerCase();
    const status = url.searchParams.get('status');
    const relationship = url.searchParams.get('relationship');
    const isResearcherVerified = url.searchParams.get('isResearcherVerified');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    let items: Evidence[] = [];

    if (scope === 'single_paper' && paperId) {
      // Single Paper Scope: strictly isolated to the selected paper
      items = db.getEvidence(projectId, { paperId });
    } else {
      // Project Scope
      items = db.getEvidence(projectId);
      if (paperId && scope !== 'library') {
        items = items.filter((e) => e.paperId === paperId);
      }
    }

    // Apply Filters
    if (status && status !== 'all') {
      items = items.filter((e) => e.verificationStatus === status);
    }

    if (relationship && relationship !== 'all') {
      items = items.filter((e) => e.relationship === relationship);
    }

    if (isResearcherVerified !== null && isResearcherVerified !== undefined && isResearcherVerified !== 'all') {
      const targetVerified = isResearcherVerified === 'true' || isResearcherVerified === '1';
      items = items.filter((e) => Boolean(e.isResearcherVerified) === targetVerified);
    }

    if (search) {
      items = items.filter((e) => {
        const matchClaim = e.claim?.toLowerCase().includes(search);
        const matchSnippet = e.snippet?.toLowerCase().includes(search);
        const matchSection = e.section?.toLowerCase().includes(search);
        const matchPaper = e.paperTitle?.toLowerCase().includes(search);
        const matchLocation = e.location?.toLowerCase().includes(search);
        const matchNotes = e.researcherNotes?.toLowerCase().includes(search);
        const matchTopic = e.topic?.toLowerCase().includes(search);
        const matchRQ = e.researchQuestion?.toLowerCase().includes(search);
        return (
          matchClaim ||
          matchSnippet ||
          matchSection ||
          matchPaper ||
          matchLocation ||
          matchNotes ||
          matchTopic ||
          matchRQ
        );
      });
    }

    // Enrich with paper metadata and manuscript chunk fidelity checks
    const enriched = items.map((item) => {
      const paper = item.paperId ? db.getPaperById(item.paperId) : undefined;
      const fidelity = item.paperId
        ? db.validateEvidenceFidelity(item.paperId, item.snippet)
        : { matched: false, quality: 'uncertain' as const };

      return {
        ...item,
        paperTitle: paper?.title || item.paperTitle || 'External Scholarly Source',
        authors: paper?.authors || [],
        year: paper?.publicationYear,
        journal: paper?.journalOrConference,
        doi: paper?.doi,
        extractionQuality: item.extractionQuality || fidelity.quality,
        chunkMatched: fidelity.matched,
        chunkId: item.chunkId || fidelity.chunkId,
      };
    });

    return NextResponse.json({
      evidence: enriched,
      totalCount: enriched.length,
      scope,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      projectId,
      paperId,
      claim,
      page,
      section,
      snippet,
      evidenceType,
      confidence,
      verificationStatus,
      location,
      createdBy,
      researcherNotes,
      topic,
      researchQuestion,
      relationship,
      isResearcherVerified,
      tags,
    } = body;

    if (!projectId || !claim) {
      return NextResponse.json({ error: 'projectId and claim are required' }, { status: 400 });
    }

    const paper = paperId ? db.getPaperById(paperId) : undefined;
    const finalPaperTitle = paper ? paper.title : body.paperTitle || 'External Scholarly Source';

    // Validate snippet fidelity against paper's document chunks
    const fidelity = paperId && snippet
      ? db.validateEvidenceFidelity(paperId, snippet)
      : { matched: false, quality: 'uncertain' as const };

    const effectivePage = page ?? fidelity.pageNumber ?? 1;
    const effectiveSection = section || fidelity.section || 'General Content';

    // Normalize verification status
    let normalizedStatus: Evidence['verificationStatus'] = 'supported';
    if (verificationStatus) {
      if (['supported', 'partially_supported', 'contradicted', 'insufficient_evidence', 'requires_verification'].includes(verificationStatus)) {
        normalizedStatus = verificationStatus;
      } else if (verificationStatus === 'verified') {
        normalizedStatus = 'supported';
      }
    }

    const newEvidence: Evidence = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      paperId: paperId || '',
      paperTitle: finalPaperTitle,
      claim: claim.trim(),
      page: effectivePage,
      section: effectiveSection,
      snippet: snippet ? snippet.trim() : '',
      evidenceType: evidenceType || 'empirical',
      confidence: confidence ?? (fidelity.matched ? 0.95 : 0.85),
      verificationStatus: normalizedStatus,
      location: location || `${effectiveSection} → Page ${effectivePage}`,
      createdBy: createdBy || 'Lead Researcher',
      createdAt: new Date().toISOString(),
      researcherNotes: researcherNotes ? researcherNotes.trim() : undefined,
      topic: topic ? topic.trim() : undefined,
      researchQuestion: researchQuestion ? researchQuestion.trim() : undefined,
      relationship: relationship || (normalizedStatus === 'contradicted' ? 'opposes' : 'supports'),
      isResearcherVerified: Boolean(isResearcherVerified),
      sourceType: body.sourceType || 'verbatim_extract',
      extractionQuality: fidelity.quality,
      chunkId: fidelity.chunkId,
      tags: Array.isArray(tags) ? tags : [],
    };

    const saved = db.createEvidence(newEvidence, true);
    const statusCode = saved.id === newEvidence.id ? 201 : 200;

    return NextResponse.json({ evidence: saved }, { status: statusCode });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'Evidence id is required' }, { status: 400 });
    }

    const existing = db.getEvidenceById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Evidence record not found' }, { status: 404 });
    }

    // If snippet updated, re-validate fidelity
    if (updates.snippet && updates.snippet !== existing.snippet && existing.paperId) {
      const fidelity = db.validateEvidenceFidelity(existing.paperId, updates.snippet);
      updates.extractionQuality = fidelity.quality;
      updates.chunkId = fidelity.chunkId;
    }

    const updated = db.updateEvidence(id, updates);
    return NextResponse.json({ evidence: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
    }

    const success = db.deleteEvidence(id);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
