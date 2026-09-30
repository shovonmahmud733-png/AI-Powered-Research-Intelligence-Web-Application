import { db } from '../db';
import { vectorStore, ScoredChunk } from './vectorStore';
import { modelRouter } from './provider';
import { ChatMessage, ChatSourceItem, Paper, DocumentChunk } from '../db/types';

export interface ChatEngineOptions {
  sessionId?: string;
  projectId: string;
  userId?: string;
  scope?: 'project' | 'paper';
  paperId?: string;
  userMessage?: string;
  prompt?: string;
  searchAcrossLibrary?: boolean;
  history?: ChatMessage[];
  temperature?: number;
  clientPapers?: Paper[];
  clientChunks?: DocumentChunk[];
}

export interface ChatEngineResult {
  content: string;
  sources: ChatSourceItem[];
  interpretationNotes?: string;
  unverifiedWarnings?: string;
  modelUsed: string;
}

export class ResearchChatEngine {
  /**
   * Assembles project context and executes evidence-grounded research reasoning
   * with strict document isolation, pre-retrieval filtering, and chunk validation.
   */
  async generateResponse(options: ChatEngineOptions): Promise<ChatEngineResult> {
    const { projectId, paperId, userId, clientPapers, clientChunks } = options;
    const userMessage = options.userMessage || options.prompt || '';
    const scope = options.scope || 'project';
    const searchAcrossLibrary = options.searchAcrossLibrary ?? false;
    const history = options.history || [];

    const isSinglePaper = scope === 'paper' && Boolean(paperId) && !searchAcrossLibrary;

    const project = db.getProjectById(projectId);
    let papers = db.getPapers(projectId);

    // Merge clientPapers if provided
    if (clientPapers && Array.isArray(clientPapers) && clientPapers.length > 0) {
      const existingPaperIds = new Set(papers.map((p) => p.id));
      for (const cp of clientPapers) {
        if (!existingPaperIds.has(cp.id) && (cp.projectId === projectId || searchAcrossLibrary)) {
          papers.push(cp);
          existingPaperIds.add(cp.id);
        }
      }
    }

    // 1. Strict Candidate Pre-filtering BEFORE similarity ranking
    let candidateChunks: DocumentChunk[] = [];

    if (isSinglePaper && paperId) {
      // Single Paper Scope: Chunks MUST match paperId
      const singlePaper = papers.find((p) => p.id === paperId) || db.getPaperById(paperId);
      
      const dbChunks = db.getChunksByPaper(paperId);
      const localChunks = (clientChunks || []).filter(
        (c) => c.paperId === paperId || c.paper_id === paperId
      );

      // Merge and deduplicate by id
      const seenChunkIds = new Set<string>();
      const combined = [...dbChunks, ...localChunks];
      for (const c of combined) {
        if (!seenChunkIds.has(c.id)) {
          seenChunkIds.add(c.id);
          candidateChunks.push(c);
        }
      }

      // Hard filter: ensure user_id, project_id, and paper_id boundaries are strictly enforced
      candidateChunks = candidateChunks.filter((c) => {
        const matchesPaper = c.paperId === paperId || c.paper_id === paperId;
        const cProj = c.projectId || c.project_id;
        const matchesProject = !cProj || cProj === projectId;
        const cUser = c.userId || c.user_id;
        const matchesUser = !userId || !cUser || cUser === userId || (project?.userId && cUser === project.userId);
        return matchesPaper && matchesProject && matchesUser;
      });

      // If paper has no chunks yet, construct virtual chunk strictly from this paper's metadata
      if (candidateChunks.length === 0 && singlePaper) {
        const documentId = `doc-${singlePaper.id}`;
        candidateChunks = [
          {
            id: `v-chunk-${singlePaper.id}`,
            chunk_id: `v-chunk-${singlePaper.id}`,
            user_id: project?.userId || userId || 'usr_default',
            userId: project?.userId || userId || 'usr_default',
            project_id: projectId,
            projectId: projectId,
            paper_id: singlePaper.id,
            paperId: singlePaper.id,
            document_id: documentId,
            documentId: documentId,
            page_number: 1,
            pageNumber: 1,
            section: 'Abstract',
            sectionName: 'Abstract',
            chunkIndex: 0,
            content: singlePaper.abstract || 'Extracted PDF text document.',
            source_filename: singlePaper.pdfFileName || `${singlePaper.title}.pdf`,
            sourceFilename: singlePaper.pdfFileName || `${singlePaper.title}.pdf`,
            doi: singlePaper.doi,
          },
        ];
      }
    } else if (searchAcrossLibrary) {
      // Global Library Scope: search user's papers across projects
      candidateChunks = userId ? db.getChunksByUser(userId) : db.getChunksByProject(projectId);
      if (clientChunks && clientChunks.length > 0) {
        const existingIds = new Set(candidateChunks.map((c) => c.id));
        clientChunks.forEach((c) => {
          if (!existingIds.has(c.id)) candidateChunks.push(c);
        });
      }
    } else {
      // Project Scope: Chunks MUST belong to active projectId
      candidateChunks = db.getChunksByProject(projectId);
      if (clientChunks && clientChunks.length > 0) {
        const projectPaperIds = new Set(papers.map((p) => p.id));
        const filteredClientChunks = clientChunks.filter(
          (c) =>
            projectPaperIds.has(c.paperId) ||
            (c.paper_id && projectPaperIds.has(c.paper_id)) ||
            c.projectId === projectId ||
            c.project_id === projectId
        );
        const existingIds = new Set(candidateChunks.map((c) => c.id));
        filteredClientChunks.forEach((c) => {
          if (!existingIds.has(c.id)) candidateChunks.push(c);
        });
      }

      if (candidateChunks.length === 0) {
        candidateChunks = papers.map((p, idx) => ({
          id: `v-chunk-${p.id}`,
          chunk_id: `v-chunk-${p.id}`,
          user_id: project?.userId || userId || 'usr_default',
          userId: project?.userId || userId || 'usr_default',
          project_id: projectId,
          projectId: projectId,
          paper_id: p.id,
          paperId: p.id,
          document_id: `doc-${p.id}`,
          documentId: `doc-${p.id}`,
          page_number: 1,
          pageNumber: 1,
          section: 'Abstract & Metadata',
          sectionName: 'Abstract & Metadata',
          chunkIndex: idx,
          content: `${p.title}. Authors: ${p.authors.join(', ')} (${p.publicationYear}). ${p.abstract}`,
          source_filename: p.pdfFileName || `${p.title}.pdf`,
          sourceFilename: p.pdfFileName || `${p.title}.pdf`,
          doi: p.doi,
        }));
      }
    }

    // 2. Perform Hybrid Retrieval on candidateChunks
    const scoredChunks = vectorStore.retrieveRelevantChunks(candidateChunks, userMessage, 5);

    // 3. WRONG DOCUMENT PROTECTION: Validate every retrieved chunk before LLM
    const validatedChunks: ScoredChunk[] = [];
    const rejectedChunks: { chunk: DocumentChunk; reason: string }[] = [];

    for (const sc of scoredChunks) {
      const c = sc.chunk;
      const cPaperId = c.paperId || c.paper_id;
      const cProjectId = c.projectId || c.project_id;
      const cUserId = c.userId || c.user_id;

      // Rule 1: Single paper isolation
      if (isSinglePaper && paperId && cPaperId !== paperId) {
        rejectedChunks.push({ chunk: c, reason: `paper_id mismatch: expected ${paperId}, got ${cPaperId}` });
        continue;
      }

      // Rule 2: Project scope isolation (when not searchAcrossLibrary)
      if (!searchAcrossLibrary && cProjectId && cProjectId !== projectId) {
        rejectedChunks.push({ chunk: c, reason: `project_id mismatch: expected ${projectId}, got ${cProjectId}` });
        continue;
      }

      // Rule 3: User isolation
      if (userId && cUserId && cUserId !== userId && project?.userId !== userId && !project?.isDemo) {
        rejectedChunks.push({ chunk: c, reason: `user_id mismatch: expected ${userId}, got ${cUserId}` });
        continue;
      }

      // Rule 4: Page number validation
      const pageNum = typeof c.pageNumber === 'number' ? c.pageNumber : c.page_number;
      if (typeof pageNum !== 'number' || pageNum < 1) {
        rejectedChunks.push({ chunk: c, reason: `invalid page_number: ${c.pageNumber ?? c.page_number}` });
        continue;
      }
      sc.chunk.pageNumber = pageNum;

      // Rule 5: Section validation
      const secName = c.sectionName || c.section;
      if (!secName) {
        rejectedChunks.push({ chunk: c, reason: 'missing section name' });
        continue;
      }
      sc.chunk.sectionName = secName;

      validatedChunks.push(sc);
    }

    // DEBUG LOGGING
    console.log(`=== RESEARCH AI RETRIEVAL DEBUG ===
Question: "${userMessage}"
Active User: ${userId || project?.userId || 'usr_default'}
Active Project: ${projectId}
Selected Paper: ${paperId || 'N/A'}
Search Scope: ${searchAcrossLibrary ? 'GLOBAL_LIBRARY' : isSinglePaper ? 'SINGLE_PAPER' : 'PROJECT'}
Retrieved Chunks:
${validatedChunks.length > 0 ? validatedChunks.map((vc, i) => `${i + 1}. paper_id=${vc.chunk.paperId || vc.chunk.paper_id} document_id=${vc.chunk.documentId || vc.chunk.document_id || 'doc-' + (vc.chunk.paperId || vc.chunk.paper_id)} page=${vc.chunk.pageNumber} section=${vc.chunk.sectionName || vc.chunk.section} filename=${vc.chunk.sourceFilename || vc.chunk.source_filename || 'document.pdf'} similarity=${Math.round(vc.score * 100)}%`).join('\n') : 'None'}
Number of retrieved chunks: ${scoredChunks.length}
Number of valid chunks: ${validatedChunks.length}
Number of rejected chunks: ${rejectedChunks.length}
${rejectedChunks.length > 0 ? 'Rejection reasons: ' + rejectedChunks.map(r => r.reason).join('; ') : 'No chunks rejected'}
Final context length: ${validatedChunks.reduce((acc, c) => acc + c.chunk.content.length, 0)} characters
===================================`);

    // 4. Strict Isolation of Structured Research Artifacts
    let projectMatrix = db.getMatrixByProject(projectId);
    let paperAnalyses = papers.map((p) => db.getAnalysisByPaper(p.id)).filter(Boolean);
    let allEvidence = db.getEvidence(projectId);
    let allContradictions = db.getContradictions(projectId);
    const allGaps = db.getGaps(projectId);

    if (isSinglePaper && paperId) {
      projectMatrix = projectMatrix.filter((m) => m.paperId === paperId);
      paperAnalyses = [db.getAnalysisByPaper(paperId)].filter(Boolean);
      allEvidence = allEvidence.filter((e) => e.paperId === paperId);
      allContradictions = allContradictions.filter(
        (c) => c.paperAId === paperId || c.paperBId === paperId
      );
    }

    const qLower = userMessage.toLowerCase();
    const isLimitationQuery =
      qLower.includes('limitation') ||
      qLower.includes('limit') ||
      qLower.includes('drawback') ||
      qLower.includes('bottleneck') ||
      qLower.includes('constraint');

    const isOverviewQuery =
      (qLower.includes('summar') || qLower.includes('overview') || qLower.includes('tell me about')) &&
      !qLower.includes('quantum') &&
      !qLower.includes('temperature') &&
      !qLower.includes('dataset') &&
      !qLower.includes('method');

    const relevantEvidence = allEvidence.filter((e) => {
      const eText = `${e.claim} ${e.snippet}`.toLowerCase();
      return qLower.split(/\s+/).some((term) => term.length > 3 && eText.includes(term));
    });

    const relevantContradictions = allContradictions.filter((c) => {
      const cText = `${c.topic} ${c.claimA} ${c.claimB}`.toLowerCase();
      return qLower.split(/\s+/).some((term) => term.length > 3 && cText.includes(term));
    });

    const relevantGaps = allGaps.filter((g) => {
      const gText = `${g.title} ${g.description}`.toLowerCase();
      return qLower.split(/\s+/).some((term) => term.length > 3 && gText.includes(term));
    });

    // 5. Build Structured Sources List strictly from Validated Chunks
    const sources: ChatSourceItem[] = [];

    validatedChunks.forEach((sc) => {
      const c = sc.chunk;
      const cPaperId = c.paperId || c.paper_id;
      const paper = papers.find((p) => p.id === cPaperId);
      const cUserId = c.userId || c.user_id || userId || project?.userId;
      const cProjectId = c.projectId || c.project_id || projectId;
      const cDocId = c.documentId || c.document_id || `doc-${cPaperId}`;
      const cChunkId = c.id || c.chunk_id;
      const cFilename = c.sourceFilename || c.source_filename || paper?.pdfFileName || `${paper?.title || 'document'}.pdf`;
      const pageNum = typeof c.pageNumber === 'number' ? c.pageNumber : c.page_number || 1;
      const secName = c.sectionName || c.section || 'General';

      sources.push({
        paperId: cPaperId,
        paper_id: cPaperId,
        paperTitle: paper ? paper.title : sc.chunk.sourceFilename || 'Research Publication',
        page: pageNum,
        page_number: pageNum,
        section: secName,
        snippet: sc.highlightSnippets[0] || sc.chunk.content.substring(0, 200),
        sourceType: 'paper_chunk',
        similarityScore: Math.round(sc.score * 100),
        userId: cUserId,
        user_id: cUserId,
        projectId: cProjectId,
        project_id: cProjectId,
        documentId: cDocId,
        document_id: cDocId,
        chunkId: cChunkId,
        chunk_id: cChunkId,
        sourceFilename: cFilename,
        source_filename: cFilename,
      });
    });

    // Add structured limitation sources ONLY if matching the authorized paper/project
    if (isLimitationQuery) {
      projectMatrix.forEach((m) => {
        if (m.limitation && (!isSinglePaper || m.paperId === paperId)) {
          const p = papers.find((paper) => paper.id === m.paperId);
          sources.push({
            paperId: m.paperId,
            paper_id: m.paperId,
            paperTitle: m.paperTitle,
            page: 1,
            page_number: 1,
            section: 'Limitations (Empirical Matrix)',
            snippet: m.limitation,
            sourceType: 'evidence',
            similarityScore: 94,
            userId: project?.userId || userId,
            user_id: project?.userId || userId,
            projectId: projectId,
            project_id: projectId,
            documentId: `doc-${m.paperId}`,
            document_id: `doc-${m.paperId}`,
            chunkId: `matrix-lim-${m.id}`,
            chunk_id: `matrix-lim-${m.id}`,
            sourceFilename: p?.pdfFileName || `${m.paperTitle}.pdf`,
            source_filename: p?.pdfFileName || `${m.paperTitle}.pdf`,
          });
        }
      });
      paperAnalyses.forEach((a: any) => {
        if (a && a.limitations && Array.isArray(a.limitations) && (!isSinglePaper || a.paperId === paperId)) {
          const p = papers.find((paper) => paper.id === a.paperId);
          a.limitations.forEach((lim: string, idx: number) => {
            sources.push({
              paperId: a.paperId,
              paper_id: a.paperId,
              paperTitle: p ? p.title : 'Uploaded Research Manuscript',
              page: 1,
              page_number: 1,
              section: 'Limitations (Structured Extraction)',
              snippet: lim,
              sourceType: 'evidence',
              similarityScore: 94,
              userId: project?.userId || userId,
              user_id: project?.userId || userId,
              projectId: projectId,
              project_id: projectId,
              documentId: `doc-${a.paperId}`,
              document_id: `doc-${a.paperId}`,
              chunkId: `analysis-lim-${a.paperId}-${idx}`,
              chunk_id: `analysis-lim-${a.paperId}-${idx}`,
              sourceFilename: p?.pdfFileName || `${p?.title || 'document'}.pdf`,
              source_filename: p?.pdfFileName || `${p?.title || 'document'}.pdf`,
            });
          });
        }
      });
    }

    relevantEvidence.slice(0, 2).forEach((ev) => {
      if (!isSinglePaper || ev.paperId === paperId) {
        const p = papers.find((paper) => paper.id === ev.paperId);
        sources.push({
          paperId: ev.paperId,
          paper_id: ev.paperId,
          paperTitle: ev.paperTitle,
          page: ev.page,
          page_number: ev.page,
          section: ev.section,
          snippet: ev.snippet,
          sourceType: 'evidence',
          similarityScore: 92,
          userId: project?.userId || userId,
          user_id: project?.userId || userId,
          projectId: projectId,
          project_id: projectId,
          documentId: `doc-${ev.paperId}`,
          document_id: `doc-${ev.paperId}`,
          chunkId: `evidence-${ev.id}`,
          chunk_id: `evidence-${ev.id}`,
          sourceFilename: p?.pdfFileName || `${ev.paperTitle}.pdf`,
          source_filename: p?.pdfFileName || `${ev.paperTitle}.pdf`,
        });
      }
    });

    if (!isSinglePaper) {
      relevantContradictions.slice(0, 1).forEach((c) => {
        sources.push({
          sourceType: 'contradiction',
          snippet: `Documented Contradiction: ${c.topic} (${c.paperATitle} vs ${c.paperBTitle})`,
          similarityScore: 90,
          projectId: projectId,
          project_id: projectId,
        });
      });
    }

    // 6. Evidence Grounding Check: Ensure answer only generated when valid evidence exists
    const hasSufficientEvidence =
      validatedChunks.length > 0 &&
      (
        (validatedChunks[0].score >= 0.15) ||
        relevantEvidence.length > 0 ||
        (isLimitationQuery && (
          projectMatrix.some((m) => m.limitation) ||
          paperAnalyses.some((a: any) => a?.limitations?.length > 0) ||
          validatedChunks.some((vc) => /limit|constraint|restrict|bottleneck/i.test(vc.chunk.content) || /limit/i.test(vc.chunk.sectionName || vc.chunk.section || ''))
        )) ||
        isOverviewQuery
      );

    if (!hasSufficientEvidence) {
      const scopeLabel = isSinglePaper
        ? 'the selected paper'
        : `**${project?.title || 'this project'}**`;

      return {
        content: `Insufficient evidence in ${scopeLabel}.

No verified document passages or empirical evidence matching your inquiry were retrieved. To ground reasoning:
1. Verify the inquiry relates directly to the uploaded document content.
2. Upload the full manuscript PDF using the **Paper Library**.`,
        sources: [], // Zero sources when insufficient evidence
        modelUsed: 'offline-academic-reasoner-v1',
      };
    }

    // 7. Construct LLM Context
    const systemPrompt = `You are Research Copilot, an evidence-grounded AI research partner for academic researchers.
Your primary role is to help the researcher reason over their research project, literature, extracted PDF chunks, and evidence.
You are NOT a generic conversational chatbot.

CRITICAL OPERATIONAL RULES:
1. Base your statements strictly on the authorized project context, literature chunks, and evidence provided.
2. Clearly distinguish between:
   - Source-grounded facts (cite exact Paper Title, Page number, and Section name).
   - AI-generated interpretation / hypotheses (clearly tag as "AI Interpretation" or "Suggested Direction").
   - Researcher's own lab notes & memory (identify as "Lab Context / Researcher Note").
3. DO NOT fabricate citations, page numbers, authors, DOIs, experimental results, or evidence.
4. If sufficient evidence is missing in the paper to answer the inquiry, explicitly report:
   "Insufficient evidence in the selected paper."
5. Never retrieve or cite unrelated documents, papers from other projects, or unverified documents.
6. This is a multi-turn conversation. Use the conversation history to understand follow-up questions and resolve pronouns (e.g. "it", "they", "this", "that").`;

    // Build conversation history context (last 6 turns max)
    const recentHistory = (history || [])
      .filter((h) => h.content && h.content.trim())
      .slice(-6)
      .map((h) => `${h.role === 'user' ? 'Researcher' : 'Research Copilot'}: ${h.content.substring(0, 400)}`)
      .join('\n\n');

    const promptPayload = `Project Field: ${project?.researchField || 'Scientific Research'}
Active Research Questions:
${project?.researchQuestions?.map((q) => `- [${q.status.toUpperCase()}] ${q.question}`).join('\n') || 'None recorded'}

${recentHistory ? `Conversation History:\n${recentHistory}\n\n---\n\n` : ''}Retrieved Paper Chunks:
${validatedChunks.map((sc) => `[Source: ${papers.find((p) => p.id === (sc.chunk.paperId || sc.chunk.paper_id))?.title || sc.chunk.sourceFilename || 'Paper'} | Page ${sc.chunk.pageNumber} | Section: ${sc.chunk.sectionName || sc.chunk.section}]\n${sc.chunk.content}`).join('\n\n---\n\n')}

Structured Literature Matrix:
${projectMatrix.map((m) => `• [${m.paperTitle}]: Dataset -> ${m.dataset} | Method -> ${m.method} | Result -> ${m.result} | Limitation -> ${m.limitation}`).join('\n')}

Relevant Evidence & Contradictions:
${relevantEvidence.map((e) => `• Evidence [${e.verificationStatus}]: "${e.claim}" (Source: ${e.paperTitle}, Page ${e.page})`).join('\n')}
${relevantContradictions.map((c) => `• Disagreement: ${c.topic} -> Reasons: ${c.potentialReasons.join(', ')}`).join('\n')}

Researcher Inquiry: ${userMessage}

Please formulate an evidence-backed, rigorous research answer citing exact pages and sections.`;

    const primaryPaper = isSinglePaper && paperId
      ? papers.find((p) => p.id === paperId) || db.getPaperById(paperId)
      : (validatedChunks[0] ? papers.find((p) => p.id === (validatedChunks[0].chunk.paperId || validatedChunks[0].chunk.paper_id)) : papers[0]);

    const response = await modelRouter.execute({
      task: 'research_synthesis',
      prompt: promptPayload,
      userQuery: userMessage,
      systemPrompt,
      retrievedChunks: validatedChunks,
      paperMetadata: primaryPaper ? { title: primaryPaper.title } : undefined,
    });

    return {
      content: response.answer,
      sources,
      interpretationNotes:
        sources.length > 0
          ? 'Synthesis grounded in retrieved project document chunks and evidence records. Check the source drawer below for verbatim excerpts and page numbers.'
          : undefined,
      modelUsed: response.modelUsed,
    };
  }
}

export const researchChatEngine = new ResearchChatEngine();
