import { RelevanceBreakdown, ScholarlySearchParams } from './provider';

interface PaperTokens {
  titleTokens: Set<string>;
  abstractTokens: Set<string>;
  allTokens: Set<string>;
  year: number;
}

function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'which', 'using', 'based',
  'paper', 'study', 'show', 'results', 'presents', 'approach', 'proposed', 'method',
  'into', 'more', 'over', 'both', 'between', 'such', 'these', 'their', 'have', 'been'
]);

export function calculateTransparentRelevance(
  paper: {
    title: string;
    abstract: string;
    publicationYear: number;
    journalOrConference?: string;
  },
  params: ScholarlySearchParams
): RelevanceBreakdown {
  const reasons: string[] = [];
  const mismatches: string[] = [];
  let score = 50; // baseline prior

  const titleTokens = tokenize(paper.title);
  const abstractTokens = tokenize(paper.abstract);
  const allTokens = new Set([...titleTokens, ...abstractTokens]);

  const queryTokens = tokenize(params.query);

  // 1. Direct query keyword overlap in Title
  let queryTitleMatches = 0;
  queryTokens.forEach((qt) => {
    if (titleTokens.has(qt)) queryTitleMatches++;
  });

  if (queryTitleMatches > 0) {
    const fraction = queryTitleMatches / Math.max(1, queryTokens.size);
    score += Math.round(fraction * 25);
    reasons.push(`Direct query overlap: ${queryTitleMatches} key term(s) in paper title`);
  }

  // 2. Query terms in Abstract
  let queryAbstractMatches = 0;
  queryTokens.forEach((qt) => {
    if (abstractTokens.has(qt)) queryAbstractMatches++;
  });

  if (queryAbstractMatches > 1) {
    score += 10;
    reasons.push(`Abstract addresses ${queryAbstractMatches} core query search concepts`);
  }

  // 3. Project Context Alignment (Field, Questions, Tags)
  const ctx = params.projectContext;
  if (ctx) {
    // Check research field
    if (ctx.field) {
      const fieldTokens = tokenize(ctx.field);
      let fieldOverlap = 0;
      fieldTokens.forEach((ft) => {
        if (allTokens.has(ft)) fieldOverlap++;
      });
      if (fieldOverlap > 0) {
        score += 10;
        reasons.push(`Matches project research domain: "${ctx.field}"`);
      } else {
        mismatches.push(`Paper may focus on a different sub-discipline than "${ctx.field}"`);
        score -= 5;
      }
    }

    // Check project tags (e.g., 'NLP', 'Low-Resource', 'Transformers', 'Sentiment')
    if (ctx.tags && ctx.tags.length > 0) {
      let matchedTags: string[] = [];
      ctx.tags.forEach((tag) => {
        const tTokens = tokenize(tag);
        let tagFound = false;
        tTokens.forEach((tt) => {
          if (allTokens.has(tt)) tagFound = true;
        });
        if (tagFound) matchedTags.push(tag);
      });

      if (matchedTags.length > 0) {
        score += Math.min(15, matchedTags.length * 5);
        reasons.push(`Covers project focus themes: ${matchedTags.join(', ')}`);
      }
    }

    // Check project questions
    if (ctx.questions && ctx.questions.length > 0) {
      let questionMatches = 0;
      ctx.questions.forEach((q) => {
        const qTokens = tokenize(q);
        let matched = 0;
        qTokens.forEach((qt) => {
          if (allTokens.has(qt)) matched++;
        });
        if (matched >= 2) questionMatches++;
      });
      if (questionMatches > 0) {
        score += 8;
        reasons.push(`Directly touches ${questionMatches} active project research question(s)`);
      }
    }
  }

  // 4. Recency Signal
  const currentYear = new Date().getFullYear();
  if (paper.publicationYear && paper.publicationYear >= currentYear - 3) {
    score += 5;
    reasons.push(`Recent publication (${paper.publicationYear}) reflecting current state of the art`);
  } else if (paper.publicationYear && paper.publicationYear < currentYear - 10) {
    mismatches.push(`Older literature (${paper.publicationYear}) - may not reflect recent deep learning or foundational models`);
    score -= 8;
  }

  // Clamp score
  const finalScore = Math.min(99, Math.max(15, score));

  let confidence: 'high' | 'moderate' | 'low' = 'moderate';
  if (reasons.length >= 3 && queryTitleMatches > 0) confidence = 'high';
  if (reasons.length <= 1) confidence = 'low';

  if (reasons.length === 0) {
    reasons.push('Broad thematic relevance based on academic corpus indexing');
  }

  return {
    score: finalScore,
    reasons,
    mismatches,
    confidence,
  };
}
