# Research Intelligence Platform

> **AI should augment the researcher, not replace the researcher.**

A production-grade, evidence-driven **Research Operating System** designed for university students, researchers, academics, and research teams.

---

## 🌟 Philosophy & Core Principles

Unlike generic AI PDF summarizers, this platform is engineered around **epistemic traceability, scientific rigor, cross-paper intelligence, and researcher control**:

1. **No Evidence, No Claim**: Never fabricates citations, DOIs, page numbers, or claims. When evidence is missing, the system explicitly reports: *"No supporting evidence was found in the available sources."*
2. **Transparent Relevance Signals**: Relevance is broken down into documented factors (task alignment, dataset similarity, model architecture, temporal recency) and flags potential domain mismatches.
3. **Epistemological Humility**: Research gaps are presented as *potential gaps* and *exploratory hypotheses*, requiring researcher verification.
4. **Researcher in the Loop**: Editable extracted values in the Literature Matrix, PRISMA-compliant manual screening decisions, and human-first Socratic reasoning tools.
5. **Multi-LLM & Zero-Key Resilience**: Swappable LLM provider abstraction (OpenAI, Anthropic, Gemini, Groq, Ollama) with a high-fidelity Local Academic Reasoning Engine that executes deterministic vector RAG out-of-the-box without external API keys.

---

## 🚀 5-Stage Research Workflow Architecture

Capabilities are organized around the canonical scientific workflow:

```
           [ 1. DISCOVER ]
Academic Paper Search · Transparent Relevance Engine · Personalized Feed · Trends
                  ↓
          [ 2. UNDERSTAND ]
Page-Aware PDF Parsing · RAG Vector Grounding · "Ask the Paper" · Structured Schema
                  ↓
          [ 3. INVESTIGATE ]
Evidence Engine · Claim Verifier · Contradictions · Gap Synthesizer · Knowledge Graph
                  ↓
            [ 4. BUILD ]
Literature Matrix · Multi-Paper Comparison · ML Experiment Tracker · Paper-to-Code
                  ↓
            [ 5. WRITE ]
Research Notes · Citation Intelligence (7 Styles) · Missing Citation Detector · PRISMA
```

---

## 🛠 Features Implemented

* **User Authentication & Isolation**: User profiles, JWT session management, bcrypt hashing, and project-level isolation.
* **Academic Paper Search Layer**: Live connection to the **Crossref REST API** (6.5M+ scholarly records), DOI lookups, and curated Indic NLP benchmarks with zero fake papers.
* **Page-Aware PDF Extraction**: Section detection (`Abstract`, `Introduction`, `Methodology`, `Results`, `Limitations`), paragraph chunking, and OCR fallback alerts.
* **Hybrid Vector RAG**: TF-IDF lexical + dense semantic similarity vector store with exact page number and section quotes.
* **Structured Paper Analysis**: Automatic 13-dimension schema extraction (Research Problem, Questions, Contributions, Dataset, Size, Preprocessing, Model, Setup, Metrics, Results, Limitations, Future Work).
* **Literature Matrix**: Full tabular matrix with inline cell editing, custom column expansion, and CSV export.
* **Paper Comparison Engine**: Neutral side-by-side dimensional comparisons without declaring arbitrary "winners".
* **Evidence Engine**: Hierarchical `Claim ↓ Evidence ↓ Paper ↓ Section ↓ Page ↓ Table/Figure` tracking with verification status.
* **Claim Verification Workflow**: Tests scientific assertions and returns `Supported`, `Partially Supported`, `Contradicted`, or `Insufficient Evidence`.
* **Cross-Paper Contradiction Detection**: Identifies conflicting findings between studies with explicit disagreement causes (dataset, preprocessing, metrics).
* **Research Gap Engine**: Cross-paper synthesis identifying repeated limitations, missing datasets, underexplored populations, and language coverage bottlenecks.
* **Interactive Research Knowledge Graph**: Dynamic SVG/Canvas force graph generated from actual database records (Papers, Authors, Models, Datasets, Gaps) with node inspection.
* **Citation Intelligence**: Citation generation in **APA 7, IEEE, MLA, Chicago, Harvard, BibTeX, and RIS** with bundle export.
* **Missing Citation Detector**: Analyzes user draft paragraphs for unreferenced empirical assertions and recommends candidate papers from the library.
* **Methodology & Reproducibility Analyzer**: Visual pipeline flow and open science checklist (data access, model weights, seeds, code).
* **ML Experiment Tracker**: Logging hyperparameters, model checkpoints, and metrics comparison linked to literature.
* **Paper-to-Code**: Generates reference starter implementations prominently marked *AI-generated reference implementation*.
* **PRISMA Systematic Review**: Multi-stage screening pipeline with criteria matching and full-text review.
* **Human-First Socratic Tools**: "Challenge my understanding", "Explain methodology", and "Quiz me on this paper".

---

## 📦 Quick Start & Local Setup

### Prerequisites
* Node.js v20.x or higher
* npm v10.x or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/shovonmahmud733-png/Aura-e-commerce.git
cd research-platform

# Install dependencies
npm install

# Run automated unit, integration, and E2E test suites
npm test

# Run development server
npm run dev
```

Visit `http://localhost:3000` to interact with the platform.

---

## 🧪 Automated Testing

The platform includes full test coverage across all layers:

```bash
npm test
```

* **Unit Tests (`tests/unit.test.ts`)**: Citation formatting, transparent relevance calculations, deduplication.
* **Integration Tests (`tests/integration.test.ts`)**: Vector chunk retrieval, verification agent, missing citation detection.
* **E2E Workflow Tests (`tests/e2e_workflow.test.ts`)**: Complete end-to-end researcher journey (Auth → Project → Search → RAG → Evidence → Matrix).

---

## 📄 License
MIT License. Built for the academic and scientific community.
