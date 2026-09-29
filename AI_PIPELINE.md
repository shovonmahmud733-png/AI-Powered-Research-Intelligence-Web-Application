# AI & RAG Pipeline Architecture

```
Academic PDF Upload / Search Result
               ↓
    [ Page-Aware Parser ]
  • Tracks exact physical page numbers
  • Detects standard IMRaD section headers
  • Extracts paragraph chunks (< 1,200 chars)
               ↓
     [ Vector Store Index ]
  • Lexical TF-IDF + Cosine Semantic Similarity
  • Section-weighted indexing
               ↓
   [ Multi-LLM Model Router ]
  • OpenAI / Anthropic / Gemini / Local Engine
  • Bounded context windows and strict system prompts
               ↓
   [ Evidentiary Attribution ]
  • Exact Page Number (Never Hallucinated)
  • Exact Section Name
  • Verbatim Quoted Snippet
```

## Anti-Hallucination Guarantees

1. **No Blind Full-Document Dumps**: Context is assembled strictly from top-scoring chunks retrieved via vector similarity.
2. **Mandatory Citations**: LLMs are instructed through system constraints to only state assertions that appear in the context.
3. **Deterministic Fallback**: The Local Academic Reasoning Engine extracts and cites verbatim passages without external API keys, ensuring continuous operational capability.
4. **Epistemic Classification**: The Claim Verification Agent checks for contradictory vocabulary and flags `Insufficient Evidence` whenever the semantic similarity threshold is not satisfied.
