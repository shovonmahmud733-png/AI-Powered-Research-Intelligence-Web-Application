import { db } from '../db';
import { vectorStore, ScoredChunk } from './vectorStore';
import { modelRouter } from './provider';
import { ChatMessage, ChatSourceItem, Paper, DocumentChunk } from '../db/types';

export interface ChatEngineOptions {
  sessionId?: string;
  projectId: string;
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
   */
  async generateResponse(options: ChatEngineOptions): Promise<ChatEngineResult> {
    const { projectId, paperId, clientPapers, clientChunks } = options;
    const userMessage = options.userMessage || options.prompt || '';
    const scope = options.scope || 'project';
    const searchAcrossLibrary = options.searchAcrossLibrary ?? false;
    const history = options.history || [];

    const project = db.getProjectById(projectId);
    let papers = db.getPapers(projectId);
    if (papers.length === 0 && clientPapers && clientPapers.length > 0) {
      papers = clientPapers;
    }

    const allEvidence = db.getEvidence(projectId);
    const allGaps = db.getGaps(projectId);
    const allContradictions = db.getContradictions(projectId);
    const allMemory = db.getMemory(projectId);
    const allNotes = db.getNotes(projectId);

    // 1. Determine Chunks to search
    let targetChunks: DocumentChunk[] = [];
    if (scope === 'paper' && paperId && !searchAcrossLibrary) {
      targetChunks = db.getChunksByPaper(paperId);
      if (targetChunks.length === 0 && clientChunks && clientChunks.length > 0) {
        targetChunks = clientChunks.filter((c) => c.paperId === paperId);
      }
      // If paper has no chunks yet, create virtual chunk from abstract
      if (targetChunks.length === 0) {
        const singlePaper = db.getPaperById(paperId) || papers.find((p) => p.id === paperId);
        if (singlePaper) {
          targetChunks = [
            {
              id: `v-chunk-${singlePaper.id}`,
              paperId: singlePaper.id,
              pageNumber: 1,
              sectionName: 'Abstract',
              chunkIndex: 0,
              content: singlePaper.abstract,
            },
          ];
        }
      }
    } else {
      targetChunks = db.getChunksByProject(projectId);
      if (targetChunks.length === 0 && clientChunks && clientChunks.length > 0) {
        targetChunks = clientChunks;
      }
      if (targetChunks.length === 0) {
        // Fallback to paper abstracts
        targetChunks = papers.map((p, idx) => ({
          id: `v-chunk-${p.id}`,
          paperId: p.id,
          pageNumber: 1,
          sectionName: 'Abstract & Metadata',
          chunkIndex: idx,
          content: `${p.title}. Authors: ${p.authors.join(', ')} (${p.publicationYear}). ${p.abstract}`,
        }));
      }
    }

    // 2. Retrieve top-scoring document chunks using Hybrid Vector RAG
    const scoredChunks = vectorStore.retrieveRelevantChunks(targetChunks, userMessage, 5);

    // 3. Retrieve structured analysis and literature matrix
    const projectMatrix = db.getMatrixByProject(projectId);
    const paperAnalyses = (scope === 'paper' && paperId && !searchAcrossLibrary
      ? [db.getAnalysisByPaper(paperId)]
      : papers.map((p) => db.getAnalysisByPaper(p.id))
    ).filter(Boolean);

    // 4. Retrieve relevant evidence & contradictions
    const qLower = userMessage.toLowerCase();
    const isLimitationQuery =
      qLower.includes('limitation') ||
      qLower.includes('limit') ||
      qLower.includes('drawback') ||
      qLower.includes('bottleneck') ||
      qLower.includes('constraint');

    const isOverviewQuery =
      qLower.includes('about') ||
      qLower.includes('summar') ||
      qLower.includes('what') ||
      qLower.includes('overview') ||
      qLower.includes('explain') ||
      qLower.includes('describe') ||
      qLower.includes('paper');

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

    // 5. Build Structured Sources List
    const sources: ChatSourceItem[] = [];

    scoredChunks.forEach((sc) => {
      const paper = papers.find((p) => p.id === sc.chunk.paperId);
      sources.push({
        paperId: sc.chunk.paperId,
        paperTitle: paper ? paper.title : 'Research Publication',
        page: sc.chunk.pageNumber,
        section: sc.chunk.sectionName,
        snippet: sc.highlightSnippets[0] || sc.chunk.content.substring(0, 200),
        sourceType: 'paper_chunk',
        similarityScore: Math.round(sc.score * 100),
      });
    });

    // If query asks for limitations, also populate matrix/analysis limitation sources
    if (isLimitationQuery) {
      projectMatrix.forEach((m) => {
        if (m.limitation) {
          sources.push({
            paperId: m.paperId,
            paperTitle: m.paperTitle,
            page: 1,
            section: 'Limitations (Empirical Matrix)',
            snippet: m.limitation,
            sourceType: 'evidence',
            similarityScore: 94,
          });
        }
      });
      paperAnalyses.forEach((a: any) => {
        if (a && a.limitations && Array.isArray(a.limitations)) {
          const p = papers.find((paper) => paper.id === a.paperId);
          a.limitations.forEach((lim: string) => {
            sources.push({
              paperId: a.paperId,
              paperTitle: p ? p.title : 'Uploaded Research Manuscript',
              page: 1,
              section: 'Limitations (Structured Extraction)',
              snippet: lim,
              sourceType: 'evidence',
              similarityScore: 94,
            });
          });
        }
      });
    }

    relevantEvidence.slice(0, 2).forEach((ev) => {
      sources.push({
        paperId: ev.paperId,
        paperTitle: ev.paperTitle,
        page: ev.page,
        section: ev.section,
        snippet: ev.snippet,
        sourceType: 'evidence',
        similarityScore: 92,
      });
    });

    relevantContradictions.slice(0, 1).forEach((c) => {
      sources.push({
        sourceType: 'contradiction',
        snippet: `Documented Contradiction: ${c.topic} (${c.paperATitle} vs ${c.paperBTitle})`,
        similarityScore: 90,
      });
    });

    // 6. Construct System and Context Prompt
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
4. If sufficient evidence is missing in the project library to answer the user's inquiry, explicitly report:
   "Insufficient evidence in the current research library."
5. Never declare an arbitrary "superior paper" or "winner" when comparing conflicting studies; outline the factual trade-offs (datasets, preprocessing, hyperparameters, metrics).`;

    // 7. Execute through Model Router
    const promptPayload = `Project Field: ${project?.researchField || 'Scientific Research'}
Active Research Questions:
${project?.researchQuestions?.map((q) => `- [${q.status.toUpperCase()}] ${q.question}`).join('\n') || 'None recorded'}

Retrieved Paper Chunks:
${scoredChunks.map((sc) => `[Source: ${papers.find((p) => p.id === sc.chunk.paperId)?.title || 'Paper'} | Page ${sc.chunk.pageNumber} | Section: ${sc.chunk.sectionName}]\n${sc.chunk.content}`).join('\n\n---\n\n')}

Structured Literature Matrix:
${projectMatrix.map((m) => `• [${m.paperTitle}]: Dataset -> ${m.dataset} | Method -> ${m.method} | Result -> ${m.result} | Limitation -> ${m.limitation}`).join('\n')}

Relevant Evidence & Contradictions:
${relevantEvidence.map((e) => `• Evidence [${e.verificationStatus}]: "${e.claim}" (Source: ${e.paperTitle}, Page ${e.page})`).join('\n')}
${relevantContradictions.map((c) => `• Disagreement: ${c.topic} -> Reasons: ${c.potentialReasons.join(', ')}`).join('\n')}

Researcher Inquiry: ${userMessage}

Please formulate an evidence-backed, rigorous research answer citing exact pages and sections.`;

    // Check if we have chunks with sufficient semantic match or structured research context
    const hasEvidence =
      targetChunks.length > 0 &&
      (
        (scoredChunks.length > 0 && scoredChunks[0].score >= 0.15) ||
        relevantEvidence.length > 0 ||
        (isLimitationQuery && (projectMatrix.some((m) => m.limitation) || paperAnalyses.some((a: any) => a?.limitations?.length > 0))) ||
        (scoredChunks.length > 0 && isOverviewQuery)
      );

    let responseContent = '';
    let modelUsed = 'offline-academic-reasoner-v1';

    if (!hasEvidence) {
      responseContent = `Insufficient evidence in the current research library regarding this query.

None of the indexed document chunks or saved evidence records in **${project?.title || 'this project'}** contain empirical data matching your inquiry.

To ground reasoning on this topic:
1. Upload full-text academic PDFs using the **Understand** tab.
2. Search and import relevant peer-reviewed papers via **Academic Search (Crossref)**.`;
      // Clear sources when there is no matching evidence
      sources.length = 0;
    } else {
      const primaryPaper =
        scope === 'paper' && paperId
          ? papers.find((p) => p.id === paperId) || db.getPaperById(paperId)
          : (scoredChunks[0] ? papers.find((p) => p.id === scoredChunks[0].chunk.paperId) : papers[0]);

      const response = await modelRouter.execute({
        task: 'research_synthesis',
        prompt: promptPayload,
        userQuery: userMessage,
        systemPrompt,
        retrievedChunks: scoredChunks,
        paperMetadata: primaryPaper ? { title: primaryPaper.title } : undefined,
      });

      responseContent = response.answer;
      modelUsed = response.modelUsed;
    }

    return {
      content: responseContent,
      sources,
      interpretationNotes:
        sources.length > 0
          ? 'Synthesis grounded in retrieved project document chunks and evidence records. Check the source drawer below for verbatim excerpts and page numbers.'
          : undefined,
      modelUsed,
    };
  }
}

export const researchChatEngine = new ResearchChatEngine();
