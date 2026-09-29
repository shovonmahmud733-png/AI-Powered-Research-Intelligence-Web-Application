import { Paper, DocumentChunk } from '../db/types';
import { vectorStore } from '../ai/vectorStore';

export interface AnalyzedParagraph {
  index: number;
  text: string;
  hasExistingCitation: boolean;
  needsCitation: boolean;
  reason?: string;
  suggestedPapers: Array<{
    paperId: string;
    paperTitle: string;
    page: number;
    section: string;
    snippet: string;
    confidence: number;
  }>;
}

// Empirical assertion indicators that usually demand citation in scholarly papers
const EMPIRICAL_TRIGGERS = [
  /\bstudies\s+(?:have\s+)?shown\b/i,
  /\brecent\s+(?:research|work|experiments)\b/i,
  /\bprior\s+(?:work|investigations|literature)\b/i,
  /\bhas\s+been\s+demonstrated\b/i,
  /\boutperformed\b/i,
  /\bachieved\s+(?:an?\s+)?(?:accuracy|f1|bleu|score|performance)\b/i,
  /\baccording\s+to\b/i,
  /\bconsistently\s+exhibits\b/i,
  /\bevidence\s+suggests\b/i,
  /\bdrastically\s+(?:reduces|degrades|increases)\b/i,
  /\b[0-9]{1,2}(?:\.[0-9]+)?%\s+(?:drop|increase|accuracy|f1)\b/i,
];

// Check if paragraph already has parenthetical or bracketed citation e.g. [1], (Rahman et al., 2024), etc.
const EXISTING_CITATION_REGEX = /\[(?:\d+|[A-Z][a-z]+(?:\s+et\s+al\.?)?,?\s*\d{4})\]|\([A-Z][a-z]+(?:\s+et\s+al\.?)?,?\s*\d{4}\)/;

export function analyzeDraftForMissingCitations(
  draftText: string,
  papers: Paper[],
  chunks: DocumentChunk[]
): AnalyzedParagraph[] {
  const paragraphs = draftText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  return paragraphs.map((para, idx) => {
    const hasExistingCitation = EXISTING_CITATION_REGEX.test(para);

    // Detect if empirical or comparative claim is made without citation
    let triggersMatched: string[] = [];
    EMPIRICAL_TRIGGERS.forEach((regex) => {
      if (regex.test(para)) {
        triggersMatched.push(para.match(regex)![0]);
      }
    });

    const needsCitation = !hasExistingCitation && triggersMatched.length > 0;
    const reason = needsCitation
      ? `Paragraph contains unreferenced empirical assertion(s): "${triggersMatched.join('", "')}". Academic convention requires peer-reviewed evidentiary citation.`
      : undefined;

    // If citation is needed or suggested, retrieve grounded candidate papers from the project chunks
    const suggestedPapers: AnalyzedParagraph['suggestedPapers'] = [];
    if (needsCitation && chunks.length > 0) {
      const relevant = vectorStore.retrieveRelevantChunks(chunks, para, 2);
      for (const item of relevant) {
        if (item.score >= 0.2) {
          const paper = papers.find((p) => p.id === item.chunk.paperId);
          if (paper) {
            suggestedPapers.push({
              paperId: paper.id,
              paperTitle: paper.title,
              page: item.chunk.pageNumber,
              section: item.chunk.sectionName,
              snippet: item.highlightSnippets[0] || item.chunk.content.substring(0, 180),
              confidence: Math.round(item.score * 100),
            });
          }
        }
      }
    }

    return {
      index: idx + 1,
      text: para,
      hasExistingCitation,
      needsCitation,
      reason,
      suggestedPapers,
    };
  });
}
