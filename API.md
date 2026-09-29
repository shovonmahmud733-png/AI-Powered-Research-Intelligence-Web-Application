# API Documentation: Research Intelligence Platform

All endpoints return JSON responses with standardized HTTP status codes.

---

## 1. Authentication
* `POST /api/auth/register`: Create user account (`name`, `email`, `password`, `institution`, `fieldOfStudy`).
* `POST /api/auth/login`: Authenticate and issue JWT cookie (`email`, `password`).
* `GET /api/auth/me`: Retrieve currently authenticated researcher profile.
* `POST /api/auth/me`: Terminate session and clear cookie.

---

## 2. Research Projects
* `GET /api/projects`: List user projects with aggregated statistics (`paperCount`, `evidenceCount`, `gapCount`).
* `POST /api/projects`: Create project (`title`, `description`, `researchField`, `researchQuestions`, `objectives`, `tags`).
* `GET /api/projects/:id`: Get project details and counts.
* `PUT /api/projects/:id`: Update project metadata.
* `DELETE /api/projects/:id`: Delete project and cascade records.

---

## 3. Academic Paper Search & Catalog
* `GET /api/search`: Query external scholarly metadata.
  * Parameters: `q`, `author`, `doi`, `year`, `openAccess`, `projectId`.
  * Returns: List of papers with transparent `relevance` breakdown (`score`, `reasons`, `mismatches`).
* `GET /api/papers?projectId=:id`: List papers saved in project.
* `POST /api/papers`: Save paper to project (with DOI deduplication).
* `GET /api/papers/:id`: Get paper metadata, chunk counts, and structured analysis.
* `DELETE /api/papers/:id`: Remove paper from project.

---

## 4. Document Ingestion & RAG
* `POST /api/documents/upload`: Multipart upload of PDF manuscripts.
  * Validates `.pdf` extension and 25MB limit.
  * Extracts page-aware text, detects sections, chunks paragraphs, and triggers structured extraction.
* `POST /api/papers/:id/ask`: Ask grounded questions about a paper.
  * Body: `{ question: string }`.
  * Returns: Grounded answer and exact `evidence` quotes (`page`, `section`, `snippet`, `similarityScore`).
* `POST /api/papers/:id/analysis`: Trigger or view 13-dimension structured analysis.

---

## 5. Evidence & Claim Verification
* `GET /api/evidence?projectId=:id`: List project evidence tuples.
* `POST /api/evidence`: Record claim with location hierarchy (`claim`, `paperId`, `page`, `section`, `snippet`, `location`, `verificationStatus`).
* `DELETE /api/evidence?id=:id`: Delete evidence record.
* `POST /api/evidence/verify`: Verify empirical claim against project chunks.
  * Body: `{ projectId: string, claim: string }`.
  * Returns: Status (`Supported`, `Partially Supported`, `Contradicted`, `Insufficient Evidence`), location, and snippet.

---

## 6. Synthesis & Literature Matrix
* `GET /api/matrix?projectId=:id`: Retrieve literature matrix rows and custom columns.
* `POST /api/matrix`: Add row.
* `PUT /api/matrix`: Update row cells inline.
* `POST /api/comparison`: Multi-paper side-by-side comparison (`paperIds: string[]`).
* `GET /api/contradictions?projectId=:id`: List identified cross-paper contradictions.
* `GET /api/gaps?projectId=:id`: List potential research gaps.
* `POST /api/gaps/synthesize`: Trigger automated cross-paper gap synthesis.

---

## 7. Citations & Writing Tools
* `GET /api/citations?projectId=:id&style=:style`: Export citations in APA7, IEEE, MLA, Chicago, Harvard, BibTeX, or RIS.
* `POST /api/citations/detect`: Audit draft paragraphs for missing citations.
* `POST /api/paper-to-code`: Generate reference PyTorch code implementation.
* `POST /api/human-tools`: Execute Socratic inquiry (`mode`: `challenge`, `explain_methodology`, `quiz`).
* `GET /api/systematic-review?projectId=:id`: Get PRISMA screening funnel.
* `POST /api/systematic-review`: Update paper inclusion/exclusion decision.
