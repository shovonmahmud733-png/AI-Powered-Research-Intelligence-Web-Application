# Contributing to Research Intelligence Platform

We welcome contributions from researchers, academic developers, and open science advocates!

## Development Guidelines

1. **Maintain Scientific Rigor**: Never introduce heuristic mock calculations that pretend to be real models. Always cite sources and explain assumptions.
2. **Preserve Exact Citations**: Any change to PDF parsing or RAG retrieval must retain physical `pageNumber` and `sectionName` mappings.
3. **Run Test Suites Before Submitting**:
   ```bash
   npm test
   npm run build
   ```
4. **Follow Semantic Commit Messages**:
   * `feat: add RIS export bundle support`
   * `fix: correct Crossref JATS XML tag stripping`
   * `test: add unit tests for claim verification engine`
