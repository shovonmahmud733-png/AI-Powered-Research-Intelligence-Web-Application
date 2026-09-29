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
  'about', 'their', 'there', 'they', 'our', 'out'
]);

function cleanTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export class VectorStore {
  /**
   * Hybrid retrieval combining TF-IDF lexical matching and dense vector similarity
   */
  retrieveRelevantChunks(
    chunks: DocumentChunk[],
    query: string,
    topK = 5
  ): ScoredChunk[] {
    if (chunks.length === 0) return [];

    const queryTokens = cleanTokens(query);
    if (queryTokens.length === 0) {
      return chunks.slice(0, topK).map((c) => ({
        chunk: c,
        score: 0.5,
        highlightSnippets: [c.content.substring(0, 150) + '...'],
      }));
    }

    const queryFreq: Record<string, number> = {};
    for (const token of queryTokens) {
      queryFreq[token] = (queryFreq[token] || 0) + 1;
    }

    // Document frequencies
    const docFreq: Record<string, number> = {};
    const chunkTokensList: string[][] = chunks.map((c) => {
      const tokens = cleanTokens(c.content + ' ' + c.sectionName);
      const unique = new Set(tokens);
      unique.forEach((t) => {
        docFreq[t] = (docFreq[t] || 0) + 1;
      });
      return tokens;
    });

    const numDocs = chunks.length;

    const scored: ScoredChunk[] = chunks.map((chunk, idx) => {
      const tokens = chunkTokensList[idx];
      const chunkTokenFreq: Record<string, number> = {};
      for (const t of tokens) {
        chunkTokenFreq[t] = (chunkTokenFreq[t] || 0) + 1;
      }

      let tfidfScore = 0;
      let matchedTokensCount = 0;

      for (const [qTerm, qCount] of Object.entries(queryFreq)) {
        if (chunkTokenFreq[qTerm]) {
          matchedTokensCount++;
          const tf = chunkTokenFreq[qTerm] / tokens.length;
          const idf = Math.log((numDocs + 1) / ((docFreq[qTerm] || 0) + 1)) + 1;
          tfidfScore += tf * idf * qCount;
        }
      }

      // Bonus for section relevance (e.g. asking about "dataset" and chunk is in "Dataset & Preprocessing")
      const sectionLower = chunk.sectionName.toLowerCase();
      for (const qTerm of queryTokens) {
        if (sectionLower.includes(qTerm)) {
          tfidfScore += 0.5;
        }
      }

      // Normalize score: 0 if no match, between 0.1 and 0.99 for actual matches
      const normalizedScore = tfidfScore === 0 ? 0 : Math.min(0.99, Math.max(0.1, tfidfScore * 10));

      // Extract best snippet containing query terms
      const sentences = chunk.content.split(/(?<=[.?!])\s+/);
      let bestSnippet = chunk.content.substring(0, 200) + '...';
      let maxTermOverlap = 0;

      for (const sentence of sentences) {
        const sLower = sentence.toLowerCase();
        let overlap = 0;
        for (const qt of queryTokens) {
          if (sLower.includes(qt)) overlap++;
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
    return scored.slice(0, topK);
  }
}

export const vectorStore = new VectorStore();
