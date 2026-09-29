export interface ScholarlySearchParams {
  query: string;
  author?: string;
  doi?: string;
  year?: number;
  field?: string;
  openAccessOnly?: boolean;
  minCitations?: number;
  limit?: number;
  offset?: number;
  // Project context for calculating relevance breakdown
  projectContext?: {
    field?: string;
    questions?: string[];
    objectives?: string[];
    tags?: string[];
  };
}

export interface RelevanceBreakdown {
  score: number; // 0 to 100
  reasons: string[];
  mismatches: string[];
  confidence: 'high' | 'moderate' | 'low';
}

export interface SearchResultPaper {
  id: string;
  doi?: string;
  title: string;
  authors: string[];
  abstract: string;
  publicationYear: number;
  journalOrConference: string;
  url: string;
  openAccessUrl?: string;
  citationCount: number;
  sourceProvider: 'crossref' | 'semanticscholar' | 'curated_demo';
  sourceId: string;
  references: string[];
  retrievalDate: string;
  metadataStatus: 'verified' | 'unverified' | 'partial';
  retractionStatus: 'clean' | 'retracted' | 'corrected' | 'under_review';
  retractionDetails?: string;
  relevance: RelevanceBreakdown;
  isDemo?: boolean;
}

export interface ScholarlyProvider {
  name: string;
  search(params: ScholarlySearchParams): Promise<{ papers: SearchResultPaper[]; total: number }>;
  getByDoi(doi: string): Promise<SearchResultPaper | null>;
}
