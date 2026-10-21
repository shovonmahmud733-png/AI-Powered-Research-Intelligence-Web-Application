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
  chunk_id?: string;
  user_id?: string;
  userId?: string;
  project_id?: string;
  projectId?: string;
  paper_id?: string;
  paperId: string;
  document_id?: string;
  documentId?: string;
  page_number?: number;
  pageNumber: number;
  section?: string;
  sectionName: string;
  chunkIndex: number;
  content: string;
  source_filename?: string;
  sourceFilename?: string;
  doi?: string;
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
  authors?: string[];
  journalOrConference?: string;
  doi?: string;
  sampleSize?: string;
  researchProblem?: string;
  researchObjective?: string;
  futureWork?: string;
  evidenceSnippet?: string;
  evidenceLocation?: string;
  analysisStatus?: 'completed' | 'pending' | 'not_analyzed';
}

export interface Evidence {
  id: string;
  projectId: string;
  paperId: string;
  paperTitle: string;
  claim: string;
  page?: number;
  section?: string;
  snippet: string;
  evidenceType: 'empirical' | 'theoretical' | 'benchmark' | 'qualitative' | 'methodological' | 'contextual';
  confidence?: number;
  verificationStatus: 'supported' | 'partially_supported' | 'contradicted' | 'insufficient_evidence' | 'requires_verification';
  location: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  researcherNotes?: string;
  topic?: string;
  researchQuestion?: string;
  sourceType?: 'verbatim_extract' | 'ai_synthesized' | 'manual_annotation';
  isResearcherVerified?: boolean;
  relationship?: 'supports' | 'opposes' | 'contextual' | 'methodological';
  extractionQuality?: 'verified' | 'approximate' | 'uncertain';
  chunkId?: string;
  tags?: string[];
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
  sectionA?: string;
  paperBId: string;
  paperBTitle: string;
  claimB: string;
  evidenceB: string;
  pageB: number;
  sectionB?: string;
  potentialReasons: string[];
  notes?: string;
  status?: 'detected' | 'under_review' | 'researcher_reviewed';
  conflictCategory?: 'direct_empirical' | 'methodological_divergence' | 'dataset_variation' | 'scope_difference' | 'theoretical';
  createdAt?: string;
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
  whyItMatters?: string;
  researcherNotes?: string;
  directionStatus?: 'ai_suggested' | 'researcher_approved';
  evidenceSnippets?: {
    paperId: string;
    paperTitle: string;
    snippet: string;
    page?: number;
    section?: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'paper' | 'author' | 'dataset' | 'model' | 'method' | 'topic' | 'gap' | 'finding';
  details?: string;
  count?: number;
  paperId?: string;
  paperTitle?: string;
  authors?: string[];
  publicationYear?: number;
  venue?: string;
  doi?: string;
  citationCount?: number;
  gapId?: string;
  evidenceId?: string;
  confidence?: number;
  evidenceType?: string;
  location?: string;
  projectId?: string;
}

export interface KnowledgeGraphEdge {
  id?: string;
  source: string;
  target: string;
  relationship: string;
  confidence?: number;
  label?: string;
  paperId?: string;
  paperTitle?: string;
  evidenceSnippet?: string;
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

export interface ChatSourceItem {
  paperId?: string;
  paper_id?: string;
  paperTitle?: string;
  page?: number;
  page_number?: number;
  section?: string;
  snippet?: string;
  noteTitle?: string;
  sourceType: 'paper_chunk' | 'chunk' | 'evidence' | 'note' | 'gap' | 'memory' | 'contradiction';
  similarityScore?: number;
  userId?: string;
  user_id?: string;
  projectId?: string;
  project_id?: string;
  documentId?: string;
  document_id?: string;
  chunkId?: string;
  chunk_id?: string;
  sourceFilename?: string;
  source_filename?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  projectId?: string;
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  sources?: ChatSourceItem[];
  interpretationNotes?: string;
  unverifiedWarnings?: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  projectId: string;
  title: string;
  scope: 'project' | 'paper';
  paperId?: string;
  paperTitle?: string;
  searchAcrossLibrary?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaperComparisonItem {
  paperId: string;
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  doi?: string;
  hasStructuredAnalysis: boolean;
  analysisStatus: 'extracted' | 'pending' | 'unextracted';
  problem: string | null;
  researchQuestions: string[];
  contributions: string[];
  dataset: string | null;
  datasetSize: string | null;
  model: string | null;
  methodology: string | string[] | null;
  trainingSetup: string | null;
  metrics: string | string[] | null;
  results: Record<string, string | number> | null;
  limitations: string[];
  researchDirection: string[];
  evidenceSnippets?: {
    id: string;
    claim: string;
    page?: number;
    section?: string;
    snippet: string;
    evidenceType: string;
    verificationStatus: string;
  }[];
  gapsAddressed?: {
    id: string;
    title: string;
    category: string;
    confidence: string;
  }[];
}

export interface PaperComparisonSynthesis {
  papersCompared: number;
  comparisons: PaperComparisonItem[];
  sharedCharacteristics: {
    dimension: string;
    description: string;
    papersInvolved: string[];
  }[];
  contrastingDimensions: {
    dimension: string;
    description: string;
    details: { paperTitle: string; value: string }[];
  }[];
  comparabilityNotes: {
    level: 'warning' | 'info' | 'caution';
    title: string;
    note: string;
  }[];
  synthesisNote: string;
}

