export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  institution: string;
  fieldOfStudy: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchQuestion {
  id: string;
  question: string;
  status: 'active' | 'answered' | 'exploring';
  notes?: string;
}

export interface ResearchProject {
  id: string;
  userId: string;
  title: string;
  description: string;
  researchField: string;
  researchQuestions: ResearchQuestion[];
  objectives: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface Paper {
  id: string;
  projectId: string;
  doi?: string;
  title: string;
  authors: string[];
  abstract: string;
  publicationYear: number;
  journalOrConference: string;
  url: string;
  openAccessUrl?: string;
  citationCount: number;
  sourceProvider: 'crossref' | 'semanticscholar' | 'upload' | 'demo';
  sourceId: string;
  references: string[];
  retrievalDate: string;
  metadataStatus: 'verified' | 'unverified' | 'partial';
  retractionStatus: 'clean' | 'retracted' | 'corrected' | 'under_review';
  retractionDetails?: string;
  pdfFileName?: string;
  pdfFileSize?: number;
  processingStatus: 'uploading' | 'extracting' | 'indexing' | 'analyzing' | 'ready' | 'error';
  isDemo?: boolean;
  createdAt: string;
}

export interface DocumentChunk {
  id: string;
  paperId: string;
  pageNumber: number;
  sectionName: string;
  chunkIndex: number;
  content: string;
  embedding?: number[];
}

export interface StructuredPaperAnalysis {
  id: string;
  paperId: string;
  researchProblem: string;
  researchQuestions: string[];
  contributions: string[];
  dataset: string;
  datasetSize: string;
  preprocessing: string[];
  features: string[];
  model: string;
  trainingSetup: string;
  evaluationMetrics: string[];
  results: Record<string, string | number>;
  limitations: string[];
  futureWork: string[];
}

export interface LiteratureMatrixRow {
  id: string;
  projectId: string;
  paperId: string;
  paperTitle: string;
  year: number;
  dataset: string;
  model: string;
  language: string;
  method: string;
  metric: string;
  result: string;
  limitation: string;
  customColumns: Record<string, string>;
}

export interface Evidence {
  id: string;
  projectId: string;
  paperId: string;
  paperTitle: string;
  claim: string;
  page: number;
  section: string;
  snippet: string;
  evidenceType: 'empirical' | 'theoretical' | 'benchmark' | 'qualitative';
  confidence: number;
  verificationStatus: 'supported' | 'partially_supported' | 'contradicted' | 'insufficient_evidence' | 'requires_verification';
  location: string;
  createdBy: string;
  createdAt: string;
}

export interface ClaimVerificationRecord {
  id: string;
  projectId: string;
  claimText: string;
  status: 'Supported' | 'Partially Supported' | 'Contradicted' | 'Insufficient Evidence' | 'Requires Verification';
  sourcePaperId?: string;
  sourcePaperTitle?: string;
  location?: string;
  evidenceSnippet?: string;
  explanation: string;
  checkedAt: string;
}

export interface Contradiction {
  id: string;
  projectId: string;
  topic: string;
  paperAId: string;
  paperATitle: string;
  claimA: string;
  evidenceA: string;
  pageA: number;
  paperBId: string;
  paperBTitle: string;
  claimB: string;
  evidenceB: string;
  pageB: number;
  potentialReasons: string[];
  notes?: string;
}

export interface ResearchGap {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: 'repeated_limitation' | 'missing_dataset' | 'underexplored_population' | 'language_coverage' | 'methodological' | 'evaluation';
  supportingPaperIds: string[];
  supportingPaperTitles: string[];
  contraryEvidence?: string;
  confidence: 'high' | 'moderate' | 'exploratory';
  verificationStatus: 'Researcher Verified' | 'Under Investigation' | 'Dismissed';
  proposedDirection: string;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'paper' | 'author' | 'dataset' | 'model' | 'method' | 'topic' | 'gap';
  details?: string;
  count?: number;
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  relationship: string;
  confidence?: number;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface ResearchMemoryItem {
  id: string;
  projectId: string;
  category: 'finding' | 'decision' | 'terminology' | 'hypothesis' | 'methodology' | 'constraint';
  content: string;
  context?: string;
  date: string;
}

export interface ResearchNote {
  id: string;
  projectId: string;
  title: string;
  content: string;
  tags: string[];
  linkedPaperId?: string;
  linkedEvidenceId?: string;
  linkedGapId?: string;
  linkedExperimentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MLExperiment {
  id: string;
  projectId: string;
  name: string;
  model: string;
  dataset: string;
  version: string;
  hyperparameters: Record<string, string | number>;
  metrics: Record<string, number>;
  status: 'running' | 'completed' | 'failed';
  notes: string;
  linkedPaperId?: string;
  createdAt: string;
}

export interface SystematicReviewItem {
  id: string;
  projectId: string;
  paperId: string;
  paperTitle: string;
  screeningStatus: 'unscreened' | 'included' | 'excluded' | 'maybe';
  exclusionReason?: string;
  criteriaMatches: Record<string, boolean>;
  fullTextReviewed: boolean;
  reviewerNotes?: string;
}
