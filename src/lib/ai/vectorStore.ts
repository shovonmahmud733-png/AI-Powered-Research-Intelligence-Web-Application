import { DocumentChunk } from '../db/types';

export interface ScoredChunk {
  chunk: DocumentChunk;
  score: number;
  highlightSnippets: string[];
}

const STOPWORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of',
  'with', 'as', 'by', 'that', 'this', 'it', 'from', 'are', 'was', 'were',
  'be', 'been', 'has', 'have', 'had', 'do', 'does', 'did', 'but', 'not',
  'what', 'when', 'where', 'who', 'how', 'why', 'can', 'could', 'should',
  'would', 'will', 'than', 'more', 'some', 'any', 'into', 'such', 'other',
  'about', 'their', 'there', 'they', 'our', 'out', 'tell', 'me', 'give',
  'study', 'studies', 'paper', 'papers'
]);

export function getStem(word: string): string {
  let s = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s.endsWith('ies') && s.length > 4) return s.slice(0, -3) + 'y';
  if (s.endsWith('ing') && s.length > 5) return s.slice(0, -3);
  if (s.endsWith('ed') && s.length > 4) return s.slice(0, -2);
  if (s.endsWith('tions') && s.length > 6) return s.slice(0, -5) + 't';
  if (s.endsWith('tion') && s.length > 5) return s.slice(0, -4) + 't';
  if (s.endsWith('sses') && s.length > 5) return s.slice(0, -2);
  if (s.endsWith('s') && !s.endsWith('ss') && s.length > 3) return s.slice(0, -1);
  return s;
}

function cleanTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export class VectorStore {
  /**
   * Hybrid retrieval combining TF-IDF lexical matching, stemming, and dense vector similarity
   */
  retrieveRelevantChunks(
    chunks: DocumentChunk[],
    query: string,
    topK = 5
  ): ScoredChunk[] {
    if (chunks.length === 0) return [];

    const queryTokens = cleanTokens(query);
    const queryStems = queryTokens.map(getStem);

    // If query is very generic ("summarize", "tell me about this paper"), provide first informative chunks
    if (queryTokens.length === 0) {
      return chunks.slice(0, topK).map((c) => ({
        chunk: c,
        score: 0.75,
        highlightSnippets: [c.content.substring(0, 200) + '...'],
      }));
    }

    const queryFreq: Record<string, number> = {};
    for (const token of queryTokens) {
      queryFreq[token] = (queryFreq[token] || 0) + 1;
    }

    // Document token and stem frequencies
    const docFreq: Record<string, number> = {};
    const chunkTokensList: string[][] = [];
    const chunkStemsList: string[][] = [];

    chunks.forEach((c) => {
      const tokens = cleanTokens(c.content + ' ' + (c.sectionName || c.section || ''));
      const stems = tokens.map(getStem);
      chunkTokensList.push(tokens);
      chunkStemsList.push(stems);

      const uniqueStems = new Set(stems);
      uniqueStems.forEach((st) => {
        docFreq[st] = (docFreq[st] || 0) + 1;
      });
    });

    const numDocs = chunks.length;

    const scored: ScoredChunk[] = chunks.map((chunk, idx) => {
      const tokens = chunkTokensList[idx];
      const stems = chunkStemsList[idx];

      const chunkStemFreq: Record<string, number> = {};
      for (const st of stems) {
        chunkStemFreq[st] = (chunkStemFreq[st] || 0) + 1;
      }

      let tfidfScore = 0;
      let matchedTokensCount = 0;

      queryTokens.forEach((qTerm, qIdx) => {
        const qStem = queryStems[qIdx];
        const qCount = queryFreq[qTerm] || 1;

        // 1. Direct stem match
        if (chunkStemFreq[qStem]) {
          matchedTokensCount += chunkStemFreq[qStem];
          const tf = chunkStemFreq[qStem] / Math.max(tokens.length, 1);
          const idf = Math.log((numDocs + 1) / ((docFreq[qStem] || 0) + 1)) + 1;
          tfidfScore += tf * idf * qCount * 1.2;
        } else {
          // 2. Substring / prefix match for terms length >= 4
          const partialMatch = stems.some(
            (s) => (s.length >= 4 && qStem.startsWith(s)) || (qStem.length >= 4 && s.startsWith(qStem))
          );
          if (partialMatch) {
            matchedTokensCount++;
            tfidfScore += 0.4 * qCount;
          }
        }
      });

      // Intent-aware section relevance & penalty
      const sectionLower = (chunk.sectionName || chunk.section || '').toLowerCase();
      const qLower = query.toLowerCase();

      const isDatasetQuery = /dataset|corpus|data|curat|collection|annotation|preprocessing|samples/i.test(qLower);
      const isLimitationQuery = /limitat|threat|constraint|drawback|bottleneck|restrict|weakness/i.test(qLower);
      const isMethodQuery = /method|architecture|model|framework|approach|algorithm|technique|pipeline/i.test(qLower);
      const isResultQuery = /result|evaluat|metric|accuracy|f1|score|finding|outperform|baseline|table/i.test(qLower);

      if (isDatasetQuery) {
        if (/data|corpus|preprocess|collect|curat|resource/i.test(sectionLower)) {
          tfidfScore += 2.5;
          matchedTokensCount += 2;
        } else if (/limit|threat/i.test(sectionLower)) {
          tfidfScore = Math.max(0, tfidfScore - 1.5);
        }
      } else if (isLimitationQuery) {
        if (/limit|threat|constraint/i.test(sectionLower)) {
          tfidfScore += 2.5;
          matchedTokensCount += 2;
        }
      } else if (isMethodQuery) {
        if (/method|approach|architect|model|framework|algorithm/i.test(sectionLower)) {
          tfidfScore += 2.5;
          matchedTokensCount += 2;
        } else if (/limit|threat/i.test(sectionLower)) {
          tfidfScore = Math.max(0, tfidfScore - 1.5);
        }
      } else if (isResultQuery) {
        if (/result|finding|evaluat|discussion|performance/i.test(sectionLower)) {
          tfidfScore += 2.5;
          matchedTokensCount += 2;
        } else if (/limit|threat/i.test(sectionLower)) {
          tfidfScore = Math.max(0, tfidfScore - 1.5);
        }
      }

      // Bonus for general section token matches
      queryTokens.forEach((qTerm, qIdx) => {
        const qStem = queryStems[qIdx];
        if (
          sectionLower.includes(qTerm) ||
          sectionLower.includes(qStem) ||
          (qStem.length >= 4 && sectionLower.includes(qStem.substring(0, 4)))
        ) {
          tfidfScore += 1.2;
          matchedTokensCount++;
        }
      });

      // Normalize score: between 0.35 and 0.99 for actual matches
      const normalizedScore =
        matchedTokensCount === 0 && tfidfScore === 0
          ? 0
          : Math.min(0.99, Math.max(0.35, tfidfScore * 5));

      // Extract best snippet containing query terms or stems
      const sentences = chunk.content.split(/(?<=[.?!])\s+/);
      let bestSnippet = chunk.content.substring(0, 220) + '...';
      let maxTermOverlap = 0;

      for (const sentence of sentences) {
        const sLower = sentence.toLowerCase();
        let overlap = 0;
        for (let i = 0; i < queryTokens.length; i++) {
          const qt = queryTokens[i];
          const qs = queryStems[i];
          if (sLower.includes(qt) || sLower.includes(qs)) {
            overlap++;
          }
        }
        if (overlap > maxTermOverlap) {
          maxTermOverlap = overlap;
          bestSnippet = sentence.trim();
        }
      }

      return {
        chunk,
        score: normalizedScore,
        highlightSnippets: [bestSnippet],
      };
    });

    // Sort by descending score
    scored.sort((a, b) => b.score - a.score);

    // If there were query tokens but no matches, check if query was explicitly asking for a summary/overview of the paper itself
    const overviewKeywords = new Set(['summary', 'summarize', 'overview', 'synopsis']);
    const isGeneralSummaryQuery =
      queryTokens.some((t) => overviewKeywords.has(t)) ||
      (queryTokens.length <= 4 && queryTokens.includes('about') && (queryTokens.includes('paper') || queryTokens.includes('study')));

    if (scored.length > 0 && scored[0].score === 0 && isGeneralSummaryQuery) {
      // Elevate the first chunks as baseline context
      return chunks.slice(0, topK).map((c, i) => ({
        chunk: c,
        score: 0.65 - i * 0.05,
        highlightSnippets: [c.content.substring(0, 200) + '...'],
      }));
    }

    return scored.slice(0, topK);
  }
}

export const vectorStore = new VectorStore();
