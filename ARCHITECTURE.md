# Architecture Documentation: Research Intelligence Platform

```
+---------------------------------------------------------------------------------+
|                       RESEARCH WORKSPACE FRONTEND (Next.js 16)                 |
|                                                                                 |
|  [DISCOVER]         [UNDERSTAND]       [INVESTIGATE]     [BUILD]       [WRITE]  |
|  Scholarly Search   Paper Library      Evidence Engine   Matrix        Notes    |
|  Relevance Signals  RAG Q&A (Pages)    Claim Verifier    Comparisons   Citations|
|  Feed & Trends      13-Dim Analysis    Contradictions    Experiments   Detector |
|                     Reproducibility    Knowledge Graph   Paper-to-Code PRISMA   |
+---------------------------------------+-----------------------------------------+
                                        | Typed REST API / FormData
                                        v
+---------------------------------------------------------------------------------+
|                               API ROUTING & SECURITY                            |
|  Session Management (JWT / Bcrypt) · Input Sanitization · Multipart PDF Upload  |
+---------------------------------------+-----------------------------------------+
                                        |
       +--------------------------------+--------------------------------+
       v                                v                                v
+--------------+               +------------------+             +-----------------+
|  SCHOLARLY   |               |   AI AGENT &     |             |    PERSISTENT   |
|  LAYER       |               |   RAG PIPELINE   |             |    DATA STORE   |
|              |               |                  |             |                 |
|  Crossref    |               |  PDF Parser      |             |  Projects & RQ  |
|  REST API    |               |  Section Detect  |             |  Papers & DOIs  |
|  (6.5M works)|               |  Vector Store    |             |  Document Chunks|
|              |               |  (TF-IDF+Cosine) |             |  Evidence Tuples|
|  Relevance   |               |  Multi-LLM Router|             |  Contradictions |
|  Breakdown   |               |  Local / OpenAI  |             |  Research Gaps  |
+--------------+               +------------------+             +-----------------+
```

## Core Subsystems

### 1. Scholarly Integration Layer
* **CrossrefProvider**: Connects to `https://api.crossref.org/works` using asynchronous abort controllers and user-agent compliance.
* **Transparent Relevance Engine**: Heuristic scoring engine evaluating query overlap in titles, abstract semantic coverage, project field alignment, and publication recency, outputting human-readable rationale and divergence warnings.

### 2. Document Processing & RAG Pipeline
* **Page-Aware PDF Parser**: Scans document streams, tracking exact page bounds (`pageNumber`) and detecting canonical section headers via regular expressions (`Abstract`, `Introduction`, `Methodology`, `Results`, `Limitations`, `Conclusion`).
* **Paragraph Chunking**: Maintains positional order and section context for every text block.
* **Hybrid Vector Store**: Combines TF-IDF term scoring with cosine semantic similarity and section weighting.
* **Model Router**: Manages provider failover (`OpenAIProvider` → `LocalAcademicEngine`).

### 3. Specialized AI Research Agents
* **ExtractionAgent**: Deconstructs paper chunks into 13 structured dimensions.
* **VerificationAgent**: Evaluates claims against indexed document chunks and classifies verification states (`Supported`, `Partially Supported`, `Contradicted`, `Insufficient Evidence`).
* **GapAgent**: Cross-examines limitations and datasets across papers to formulate grounded potential research gaps.

### 4. Relational Knowledge Graph
* Dynamic graph generator converting stored entities (`papers`, `authors`, `datasets`, `models`, `topics`, `gaps`) into interactive topological networks.
