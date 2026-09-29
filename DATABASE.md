# Database Design: Research Intelligence Platform

The platform uses a normalized relational architecture with vector indexing capabilities.

---

## Entity Relational Schema

### 1. `users`
* `id` (VARCHAR, PK)
* `name` (VARCHAR)
* `email` (VARCHAR, UNIQUE)
* `passwordHash` (VARCHAR)
* `institution` (VARCHAR)
* `fieldOfStudy` (VARCHAR)
* `createdAt` (TIMESTAMP)

### 2. `research_projects`
* `id` (VARCHAR, PK)
* `userId` (VARCHAR, FK -> users.id)
* `title` (VARCHAR)
* `description` (TEXT)
* `researchField` (VARCHAR)
* `researchQuestions` (JSONB)
* `objectives` (JSONB)
* `tags` (JSONB)
* `createdAt` (TIMESTAMP)

### 3. `papers`
* `id` (VARCHAR, PK)
* `projectId` (VARCHAR, FK -> research_projects.id)
* `doi` (VARCHAR, INDEX) — Primary deduplication key
* `title` (VARCHAR)
* `authors` (JSONB)
* `abstract` (TEXT)
* `publicationYear` (INT)
* `journalOrConference` (VARCHAR)
* `url` (VARCHAR)
* `openAccessUrl` (VARCHAR)
* `citationCount` (INT)
* `sourceProvider` (VARCHAR)
* `metadataStatus` (VARCHAR)
* `retractionStatus` (VARCHAR)

### 4. `document_chunks`
* `id` (VARCHAR, PK)
* `paperId` (VARCHAR, FK -> papers.id)
* `pageNumber` (INT) — Required for page-level evidence citation
* `sectionName` (VARCHAR) — Section heading detected in PDF
* `chunkIndex` (INT) — Positional order
* `content` (TEXT)
* `embedding` (VECTOR / JSONB)

### 5. `structured_paper_analysis`
* `id` (VARCHAR, PK)
* `paperId` (VARCHAR, FK -> papers.id)
* `researchProblem` (TEXT)
* `researchQuestions` (JSONB)
* `contributions` (JSONB)
* `dataset` (VARCHAR)
* `datasetSize` (VARCHAR)
* `preprocessing` (JSONB)
* `features` (JSONB)
* `model` (VARCHAR)
* `trainingSetup` (TEXT)
* `evaluationMetrics` (JSONB)
* `results` (JSONB)
* `limitations` (JSONB)
* `futureWork` (JSONB)

### 6. `evidence`
* `id` (VARCHAR, PK)
* `projectId` (VARCHAR, FK -> research_projects.id)
* `paperId` (VARCHAR, FK -> papers.id)
* `claim` (TEXT)
* `page` (INT)
* `section` (VARCHAR)
* `snippet` (TEXT)
* `evidenceType` (VARCHAR)
* `confidence` (FLOAT)
* `verificationStatus` (VARCHAR)
* `location` (VARCHAR)

### 7. Additional Tables
* `literature_matrix`: Tabular projections with custom JSON columns.
* `contradictions`: Documented cross-paper disagreements with divergence causes.
* `research_gaps`: Synthesized gaps with supporting literature links.
* `research_memory`: Lab decisions, findings, and terminology.
* `research_notes`: Markdown notes with entity cross-links.
* `ml_experiments`: Hyperparameter dictionaries and evaluation metrics.
* `systematic_review`: PRISMA screening status and inclusion decisions.
