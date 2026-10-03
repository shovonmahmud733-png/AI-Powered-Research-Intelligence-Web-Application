import { CrossrefProvider } from './crossref';
import { ScholarlySearchParams, SearchResultPaper } from './provider';
import { initialPapers } from '../db/seedData';
import { calculateTransparentRelevance } from './relevance';

export class ScholarlySearchService {
  private crossref = new CrossrefProvider();

  async search(params: ScholarlySearchParams): Promise<{ papers: SearchResultPaper[]; total: number; source: string }> {
    const qLower = params.query.toLowerCase().trim();

    // 1. Try Live Crossref API first
    let liveResult: { papers: SearchResultPaper[]; total: number } = { papers: [], total: 0 };
    try {
      liveResult = await this.crossref.search(params);
    } catch (e) {
      console.warn('Live Crossref search failed, proceeding with curated fallback:', e);
    }

    // 2. Curated papers matching query (clearly marked if demo)
    const curatedMatches: SearchResultPaper[] = initialPapers
      .filter((p) => {
        const text = `${p.title} ${p.abstract} ${p.authors.join(' ')} ${p.journalOrConference}`.toLowerCase();
        const matchesQuery = qLower ? qLower.split(/\s+/).some((term) => text.includes(term)) : true;
        const matchesYear = params.year ? p.publicationYear === params.year : true;
        const matchesAuthor = params.author ? p.authors.some((a) => a.toLowerCase().includes(params.author!.toLowerCase())) : true;
        const matchesDoi = params.doi ? p.doi?.toLowerCase().includes(params.doi.toLowerCase()) : true;
        return matchesQuery && matchesYear && matchesAuthor && matchesDoi;
      })
      .map((p) => ({
        id: p.id,
        doi: p.doi,
        title: p.title,
        authors: p.authors,
        abstract: p.abstract,
        publicationYear: p.publicationYear,
        journalOrConference: p.journalOrConference,
        url: p.url,
        openAccessUrl: p.openAccessUrl,
        citationCount: p.citationCount,
        sourceProvider: 'curated_demo',
        sourceId: p.sourceId,
        references: p.references,
        retrievalDate: p.retrievalDate,
        metadataStatus: p.metadataStatus,
        retractionStatus: p.retractionStatus,
        retractionDetails: p.retractionDetails,
        relevance: calculateTransparentRelevance(p, params),
        isDemo: p.isDemo,
      }));

    // Deduplicate by DOI or normalized Title
    const seenDois = new Set<string>();
    const seenTitles = new Set<string>();
    const combined: SearchResultPaper[] = [];

    // Prioritize high-scoring live or curated papers
    let all = [...curatedMatches, ...liveResult.papers];
    if (params.author) {
      const aLower = params.author.toLowerCase().trim();
      all = all.filter((p) => p.authors.some((a) => a.toLowerCase().includes(aLower)));
    }
    if (params.doi) {
      const dLower = params.doi.toLowerCase().trim();
      all = all.filter((p) => p.doi?.toLowerCase().includes(dLower));
    }
    if (params.year) {
      all = all.filter((p) => p.publicationYear === params.year);
    }
    if (params.openAccessOnly) {
      all = all.filter((p) => Boolean(p.openAccessUrl));
    }
    all.sort((a, b) => b.relevance.score - a.relevance.score);

    for (const paper of all) {
      const doiNorm = paper.doi?.toLowerCase().trim();
      const titleNorm = paper.title.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (doiNorm && seenDois.has(doiNorm)) continue;
      if (titleNorm && seenTitles.has(titleNorm)) continue;

      if (doiNorm) seenDois.add(doiNorm);
      if (titleNorm) seenTitles.add(titleNorm);

      combined.push(paper);
    }

    const source = liveResult.papers.length > 0 ? 'Crossref API (Live) + Curated Research Repository' : 'Curated Research Benchmark Database';

    return {
      papers: combined,
      total: liveResult.total > 0 ? liveResult.total : combined.length,
      source,
    };
  }

  async getPaperByDoi(doi: string): Promise<SearchResultPaper | null> {
    const curated = initialPapers.find((p) => p.doi?.toLowerCase() === doi.toLowerCase().trim());
    if (curated) {
      return {
        id: curated.id,
        doi: curated.doi,
        title: curated.title,
        authors: curated.authors,
        abstract: curated.abstract,
        publicationYear: curated.publicationYear,
        journalOrConference: curated.journalOrConference,
        url: curated.url,
        openAccessUrl: curated.openAccessUrl,
        citationCount: curated.citationCount,
        sourceProvider: 'curated_demo',
        sourceId: curated.sourceId,
        references: curated.references,
        retrievalDate: curated.retrievalDate,
        metadataStatus: curated.metadataStatus,
        retractionStatus: curated.retractionStatus,
        retractionDetails: curated.retractionDetails,
        relevance: { score: 98, reasons: ['Exact DOI Match'], mismatches: [], confidence: 'high' },
        isDemo: curated.isDemo,
      };
    }
    return this.crossref.getByDoi(doi);
  }
}

export const scholarlySearch = new ScholarlySearchService();
