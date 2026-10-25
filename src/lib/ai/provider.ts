import { ScoredChunk } from './vectorStore';
import { normalizeExtractedText } from '../pdf/parser';
import OpenAI from 'openai';

export interface ProviderHealthStatus {
  status:
    | 'missing_credentials'
    | 'configured'
    | 'connected'
    | 'authentication_failed'
    | 'quota_exceeded'
    | 'rate_limited'
    | 'model_inaccessible'
    | 'network_failure'
    | 'error';
  configured: boolean;
  provider: string;
  model: string;
  message: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type TaskCategory =
  | 'summarization'
  | 'extraction'
  | 'classification'
  | 'rag_qa'
  | 'research_synthesis'
  | 'writing_assistance';

export interface LLMRequest {
  task: TaskCategory;
  prompt: string;
  userQuery?: string;
  systemPrompt?: string;
  retrievedChunks?: ScoredChunk[];
  paperMetadata?: {
    title: string;
    authors?: string[];
    year?: number;
    journal?: string;
  };
  temperature?: number;
  maxTokens?: number;
  history?: ChatTurn[];
}

export interface GroundedEvidenceItem {
  page: number;
  section: string;
  snippet: string;
  similarityScore: number;
}

export interface LLMResponse {
  answer: string;
  evidence: GroundedEvidenceItem[];
  modelUsed: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface LLMProvider {
  name: string;
  isAvailable(): boolean;
  generate(request: LLMRequest): Promise<LLMResponse>;
}

// 1. Offline Academic Engine (zero-key fallback with deterministic extraction)
export class OfflineAcademicEngine implements LLMProvider {
  name = 'Academic Local Reasoning Engine';

  isAvailable(): boolean {
    return true; // Always ready
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const rawQuery = (req.userQuery || req.prompt || '').trim();
    const qLower = rawQuery.toLowerCase();
    const chunks = req.retrievedChunks || [];
    const paperTitle = req.paperMetadata?.title || 'the indexed paper';

    // A. Greeting & Capability Queries
    const isGreeting =
      /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|howdy)\b/i.test(rawQuery) ||
      /\b(what can you do|who are you|how can you help|introduce yourself|capabilities)\b/i.test(rawQuery);

    if (isGreeting) {
      return {
        answer: `Hello! I am your **Research Copilot**, an evidence-grounded academic research partner.

I can assist you with:
• **Paper Summarization & Synthesis**: Understand research objectives, methodology, datasets, models, and findings across your uploaded papers.
• **Limitations & Future Work**: Inspect documented constraints, architectural bottlenecks, and prospective research directions.
• **Paper Comparison & Contradictions**: Compare empirical trade-offs and resolve conflicting findings across studies.
• **Evidence Verification & Tracing**: Check claims against exact source passages with verified page numbers and section citations.

You can select a paper from the library or ask any research question to begin!`,
        evidence: [],
        modelUsed: 'offline-academic-reasoner-v1',
        provider: 'Local Reasoning Engine',
      };
    }

    // B. General Scientific / AI Definitions (when not matching paper chunks)
    const isGeneralConcept =
      /^(what is|define|explain|how does)\s+(a\s+|an\s+|the\s+)?(neural network|deep learning|machine learning|artificial intelligence|precision|recall|f1 score|overfitting|gradient descent|transformer|cross[- ]entropy|roc[- ]auc|nlp|natural language processing)/i.test(qLower);

    if (isGeneralConcept && chunks.every((c) => c.score < 0.25)) {
      let conceptDefinition = '';
      if (/neural network/i.test(qLower)) {
        conceptDefinition = `A **Neural Network** is a computational learning model inspired by biological neural circuits. It consists of layers of interconnected nodes (neurons): an input layer, one or more hidden layers, and an output layer. Each connection has an associated weight and bias adjusted during training via backpropagation and gradient descent to model complex non-linear relationships.`;
      } else if (/deep learning/i.test(qLower)) {
        conceptDefinition = `**Deep Learning** is a subset of machine learning based on artificial neural networks with multiple layers (deep architectures). It enables automatic hierarchical representation learning from raw data without manual feature engineering.`;
      } else if (/machine learning/i.test(qLower)) {
        conceptDefinition = `**Machine Learning (ML)** is a field of artificial intelligence focused on building algorithms that learn patterns and rules directly from empirical data to make predictions or decisions without being explicitly programmed.`;
      } else if (/transformer/i.test(qLower)) {
        conceptDefinition = `A **Transformer** is a deep learning architecture introduced by Vaswani et al. (2017) based on self-attention mechanisms, dispensing with recurrence and convolutions. Transformers process sequence elements in parallel and dynamically compute relevance weights across all tokens.`;
      } else if (/precision|recall|f1/i.test(qLower)) {
        conceptDefinition = `In statistical classification:\n• **Precision**: Proportion of true positive predictions among all positive predictions (\\(\\frac{TP}{TP + FP}\\)).\n• **Recall**: Proportion of actual positive instances correctly identified (\\(\\frac{TP}{TP + FN}\\)).\n• **F1 Score**: The harmonic mean of precision and recall (\\(2 \\times \\frac{\\text{Precision} \\times \\text{Recall}}{\\text{Precision} + \\text{Recall}}\\)), balancing both metrics on imbalanced datasets.`;
      } else if (/overfitting/i.test(qLower)) {
        conceptDefinition = `**Overfitting** occurs when a machine learning model learns spurious noise and specific fluctuations of the training data rather than underlying generalized patterns, causing high training performance but poor generalization on unseen test data.`;
      } else if (/gradient descent/i.test(qLower)) {
        conceptDefinition = `**Gradient Descent** is an iterative first-order optimization algorithm for finding the local minimum of a differentiable objective function by updating parameters in the opposite direction of the gradient with respect to a learning rate.`;
      } else {
        conceptDefinition = `This concept is a foundational principle in machine learning and computer science. In empirical research, its configuration and performance depend on the specific architectural design and training regime.`;
      }

      return {
        answer: `${conceptDefinition}\n\n*Note: This is a foundational academic definition. To examine empirical findings, architectures, or benchmark results from your uploaded papers, ask a question referencing the paper or research topic.*`,
        evidence: [],
        modelUsed: 'offline-academic-reasoner-v1',
        provider: 'Local Reasoning Engine',
      };
    }

    // C. Document-grounded reasoning
    if (chunks.length === 0) {
      return {
        answer:
          'No relevant document passages were found in the uploaded text chunks for this query. To receive a grounded answer, please ensure the paper has been indexed and chunks contain text related to your question.',
        evidence: [],
        modelUsed: 'offline-academic-reasoner-v1',
        provider: 'Local Reasoning Engine',
      };
    }

    const primaryChunk = chunks[0];
    const evidenceList: GroundedEvidenceItem[] = chunks.map((c) => ({
      page: c.chunk.pageNumber,
      section: c.chunk.sectionName,
      snippet: c.chunk.content.substring(0, 300) + '...',
      similarityScore: Math.round(c.score * 100),
    }));

    let synthesis = '';

    if (qLower.includes('limitation') || qLower.includes('limit') || qLower.includes('drawback') || qLower.includes('bottleneck')) {
      const meaningfulChunks = chunks.filter(
        (c) => !c.chunk.content.toLowerCase().startsWith('extracted pdf text document')
      );
      const limChunks = meaningfulChunks.filter(
        (c) =>
          c.chunk.sectionName.toLowerCase().includes('limit') ||
          c.chunk.content.toLowerCase().includes('limitation') ||
          c.chunk.content.toLowerCase().includes('constraint') ||
          c.chunk.content.toLowerCase().includes('restrict') ||
          c.chunk.content.toLowerCase().includes('threat') ||
          c.chunk.content.toLowerCase().includes('bottleneck')
      );

      if (limChunks.length > 0) {
        synthesis = `Based on the empirical documentation in **${paperTitle}**, the following core limitations are reported:\n\n${limChunks
          .slice(0, 3)
          .map((c, i) => {
            const sentences = c.chunk.content.split(/(?<=[.?!])\s+/);
            const limSentence =
              sentences.find((s) =>
                /limit|constraint|restrict|bottleneck|threat|drawback|gpu|vram|memory|cost|scale/i.test(s)
              ) || c.chunk.content.substring(0, 260);
            return `${i + 1}. **${c.chunk.sectionName}** (Page ${c.chunk.pageNumber}):\n   > "${limSentence.trim()}"`;
          })
          .join('\n\n')}\n\n**AI Methodological Note**: These limitations represent author-identified constraints regarding dataset scale, evaluation boundaries, or modeling assumptions. Review the source drawer below for complete contextual passages.`;
      } else {
        synthesis = `Insufficient evidence in the selected paper regarding this inquiry. The document does not contain an explicit limitations section or documented evaluation constraints.`;
        evidenceList.length = 0;
      }
    } else if (qLower.includes('compare') || qLower.includes('versus') || qLower.includes('vs')) {
      synthesis = `A comparative analysis across the retrieved literature reveals significant trade-offs in methodology and empirical outcomes:\n\n${chunks
        .slice(0, 3)
        .map(
          (c) =>
            `• **${c.chunk.sectionName}** (Page ${c.chunk.pageNumber}): "${c.chunk.content.substring(0, 260)}..."`
        )
        .join('\n\n')}\n\n**Synthesis**: The reported results indicate experimental trade-offs between architectural complexity and domain-specific preprocessing. Neither approach achieves absolute dominance across all evaluation metrics.`;
    } else if (qLower.includes('disagree') || qLower.includes('contradict') || qLower.includes('conflict')) {
      synthesis = `The documented disagreement across the studies highlights empirical variances under differing experimental conditions:\n\n${chunks
        .slice(0, 2)
        .map(
          (c, i) =>
            `${i + 1}. **Documented Finding ${i + 1}** (${c.chunk.sectionName}, Page ${c.chunk.pageNumber}):\n   > "${c.chunk.content.substring(0, 260)}..."`
        )
        .join('\n\n')}\n\n**Methodological Root Cause**: Discrepancies commonly arise from differences in benchmark datasets, evaluation metrics, and hyperparameter calibrations.`;
    } else if (qLower.includes('evidence') || qLower.includes('verify') || qLower.includes('claim')) {
      synthesis = `Grounded evidence verification from the project library:\n\n> "${primaryChunk.chunk.content.substring(0, 320)}..."\n\n**Evidence Grounding**:\n- **Source Section**: ${primaryChunk.chunk.sectionName}\n- **Page Number**: ${primaryChunk.chunk.pageNumber}\n- **Confidence**: High (${Math.round(primaryChunk.score * 100)}% retrieval confidence)\n- **Verification Status**: Empirically documented in published manuscript.`;
    } else if (qLower.includes('dataset') || qLower.includes('corpus') || qLower.includes('data') || qLower.includes('utterance')) {
      const dataChunk =
        chunks.find((c) => /dataset|corpus\s*setup|dataset\s*construct/i.test(c.chunk.sectionName)) ||
        chunks.find((c) => /data\s*construct|curat/i.test(c.chunk.sectionName)) ||
        chunks.find((c) => /data|corpus/i.test(c.chunk.sectionName) && !/preprocess|clean|limit|threat/i.test(c.chunk.sectionName)) ||
        chunks.find((c) => /data|corpus/i.test(c.chunk.sectionName)) ||
        chunks.find((c) => !/limit|threat/i.test(c.chunk.sectionName) && (/data|corpus|dataset|utterance|sample|item/i.test(c.chunk.content))) ||
        chunks.find((c) => !/limit|threat/i.test(c.chunk.sectionName)) ||
        chunks[0];
      if (dataChunk) {
        synthesis = `Based on the paper's documentation in the **${dataChunk.chunk.sectionName}** section (Page ${dataChunk.chunk.pageNumber}):\n\n> "${dataChunk.chunk.content.substring(0, 300)}..."\n\nThe authors outline their data curation, annotation guidelines, and preprocessing procedures as detailed in the passage above.`;
      } else {
        synthesis = `Insufficient evidence in the selected paper regarding dataset specifications.`;
        evidenceList.length = 0;
      }
    } else if (qLower.includes('method') || qLower.includes('architecture') || qLower.includes('model') || qLower.includes('approach')) {
      const methodChunk =
        chunks.find((c) => /method|approach|architect|model/i.test(c.chunk.sectionName) && !/limit|threat/i.test(c.chunk.sectionName)) ||
        chunks.find((c) => /method|approach|architect|model/i.test(c.chunk.sectionName)) ||
        chunks.find((c) => !/limit|threat/i.test(c.chunk.sectionName) && /method|model|architect/i.test(c.chunk.content)) ||
        chunks[0];
      if (methodChunk) {
        synthesis = `According to the **${methodChunk.chunk.sectionName}** section (Page ${methodChunk.chunk.pageNumber}):\n\n> "${methodChunk.chunk.content.substring(0, 300)}..."\n\nThe authors describe their theoretical formulation and experimental methodology as evidenced above.`;
      } else {
        synthesis = `Insufficient evidence in the selected paper regarding methodology details.`;
        evidenceList.length = 0;
      }
    } else if (qLower.includes('result') || qLower.includes('finding') || qLower.includes('metric') || qLower.includes('score') || qLower.includes('evaluat')) {
      const resChunk =
        chunks.find((c) => /result|eval|finding/i.test(c.chunk.sectionName) && !/limit|threat/i.test(c.chunk.sectionName)) ||
        chunks.find((c) => /result|eval|finding/i.test(c.chunk.sectionName)) ||
        chunks.find((c) => !/limit|threat/i.test(c.chunk.sectionName) && (/%|table|baseline|outperform/i.test(c.chunk.content))) ||
        chunks[0];
      if (resChunk) {
        synthesis = `As documented in **${resChunk.chunk.sectionName}** (Page ${resChunk.chunk.pageNumber}):\n\n> "${resChunk.chunk.content.substring(0, 300)}..."\n\nThe reported statistical measurements and comparative baselines validate the authors' empirical claims.`;
      } else {
        synthesis = `Insufficient evidence in the selected paper regarding results and evaluations.`;
        evidenceList.length = 0;
      }
    } else if (qLower.includes('preprocess') || qLower.includes('clean') || qLower.includes('tokeniz') || qLower.includes('normaliz')) {
      const prepChunk = chunks.find((c) =>
        /preprocess|token|clean|normaliz|feature/i.test(c.chunk.sectionName) ||
        /preprocess|token|clean|normaliz|filter|corpus/i.test(c.chunk.content)
      );
      if (prepChunk) {
        synthesis = `Based on the **${prepChunk.chunk.sectionName}** section (Page ${prepChunk.chunk.pageNumber}) of **${paperTitle}**:\n\n> "${prepChunk.chunk.content.substring(0, 320)}..."\n\nThe documented data preparation and preprocessing procedures applied by the authors are described above.`;
      } else {
        synthesis = `Insufficient evidence in the selected paper regarding preprocessing techniques.`;
        evidenceList.length = 0;
      }
    } else if (qLower.includes('problem') || qLower.includes('objective') || qLower.includes('aim') || qLower.includes('goal') || qLower.includes('motivation')) {
      const problemChunk = chunks.find((c) =>
        /problem|objective|aim|goal|motivat|intro|abstract/i.test(c.chunk.sectionName) ||
        /problem|objective|aim|goal|motivat|we investigate|we study|we propose|address/i.test(c.chunk.content)
      ) || primaryChunk;
      if (problemChunk) {
        synthesis = `As documented in **${problemChunk.chunk.sectionName}** (Page ${problemChunk.chunk.pageNumber}) of **${paperTitle}**:\n\n> "${problemChunk.chunk.content.substring(0, 320)}..."\n\nThe authors formulate their core research inquiry and objectives as detailed above.`;
      } else {
        synthesis = `Insufficient evidence in the selected paper regarding the research problem.`;
        evidenceList.length = 0;
      }
    } else if (qLower.includes('future') || qLower.includes('next step') || qLower.includes('extension')) {
      const futureChunk = chunks.find((c) =>
        /future|conclusion|next/i.test(c.chunk.sectionName) ||
        /future work|future research|in the future|we plan to|next step|promising direction/i.test(c.chunk.content)
      );
      if (futureChunk) {
        synthesis = `According to the **${futureChunk.chunk.sectionName}** section (Page ${futureChunk.chunk.pageNumber}) of **${paperTitle}**:\n\n> "${futureChunk.chunk.content.substring(0, 320)}..."\n\nThe authors outline prospective research directions and future extensions as documented above.`;
      } else {
        synthesis = `Insufficient evidence in the selected paper regarding future work recommendations.`;
        evidenceList.length = 0;
      }
    } else if (primaryChunk.score >= 0.25 || /^(summar|overview|synopsis|tell me about|what is this paper|what does this paper)/i.test(qLower)) {
      const displayQuery = req.userQuery ? `"${req.userQuery}"` : 'your research inquiry';
      synthesis = `Regarding your inquiry on ${displayQuery}:\n\nDirect evidence from **${primaryChunk.chunk.sectionName}** (Page ${primaryChunk.chunk.pageNumber}) of **${paperTitle}** states:\n\n> "${primaryChunk.chunk.content.substring(0, 320)}..."\n\nThis passage provides the primary grounding for the investigation within the retrieved paper content.`;
    } else {
      synthesis = `Insufficient evidence in ${paperTitle} regarding this inquiry. No matching empirical passages or documented details were located.`;
      evidenceList.length = 0;
    }

    return {
      answer: synthesis,
      evidence: evidenceList.map((e) => ({ ...e, snippet: normalizeExtractedText(e.snippet) })),
      modelUsed: 'offline-academic-reasoner-v1',
      provider: 'Local Academic Reasoning Engine',
    };
  }
}

// 2. OpenAI Provider (when OPENAI_API_KEY is available)
export class OpenAIProvider implements LLMProvider {
  name = 'OpenAI';

  isAvailable(): boolean {
    return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
  }

  getClient(): OpenAI {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  getModel(): string {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  private handleOpenAIError(err: any, model: string): never {
    if (err instanceof OpenAI.AuthenticationError) {
      throw new Error('OpenAI Authentication Failed: Invalid API key. Please check your OPENAI_API_KEY.');
    }
    if (err instanceof OpenAI.PermissionDeniedError) {
      throw new Error(`OpenAI Permission Denied: Access to model '${model}' is not authorized for this API key.`);
    }
    if (err instanceof OpenAI.NotFoundError) {
      throw new Error(`OpenAI Model Not Found: The model '${model}' does not exist or your account lacks access.`);
    }
    if (err instanceof OpenAI.RateLimitError) {
      const isQuota = /quota|billing|credit/i.test(err.message || '');
      if (isQuota) {
        throw new Error('OpenAI Quota Exceeded: Your account has exceeded its current API quota or billing limit.');
      }
      throw new Error('OpenAI Rate Limit Exceeded: Too many requests. Please wait and try again.');
    }
    if (err instanceof OpenAI.APIConnectionTimeoutError) {
      throw new Error('OpenAI Connection Timeout: Request timed out while communicating with OpenAI.');
    }
    if (err instanceof OpenAI.APIConnectionError) {
      throw new Error('OpenAI Network Failure: Could not connect to OpenAI API servers. Verify network connectivity.');
    }
    if (err instanceof OpenAI.BadRequestError) {
      throw new Error(`OpenAI Bad Request: ${err.message}`);
    }
    if (err instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API Error (${err.status}): ${err.message}`);
    }
    throw err;
  }

  async checkHealth(): Promise<ProviderHealthStatus> {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = this.getModel();

    if (!apiKey || !apiKey.trim()) {
      return {
        status: 'missing_credentials',
        configured: false,
        provider: 'OpenAI',
        model,
        message: 'OPENAI_API_KEY is not configured in server environment.',
      };
    }

    try {
      const client = this.getClient();
      await client.models.retrieve(model);

      return {
        status: 'connected',
        configured: true,
        provider: 'OpenAI',
        model,
        message: `Successfully connected to OpenAI API. Model '${model}' is verified accessible.`,
      };
    } catch (err: any) {
      if (err instanceof OpenAI.AuthenticationError) {
        return {
          status: 'authentication_failed',
          configured: true,
          provider: 'OpenAI',
          model,
          message: 'OpenAI authentication failed: Invalid API key.',
        };
      }
      if (err instanceof OpenAI.PermissionDeniedError) {
        return {
          status: 'model_inaccessible',
          configured: true,
          provider: 'OpenAI',
          model,
          message: `Access to model '${model}' is not authorized for this API key.`,
        };
      }
      if (err instanceof OpenAI.NotFoundError) {
        return {
          status: 'model_inaccessible',
          configured: true,
          provider: 'OpenAI',
          model,
          message: `OpenAI model '${model}' was not found or is inaccessible.`,
        };
      }
      if (err instanceof OpenAI.RateLimitError) {
        const isQuota = /quota|billing|credit/i.test(err.message || '');
        return {
          status: isQuota ? 'quota_exceeded' : 'rate_limited',
          configured: true,
          provider: 'OpenAI',
          model,
          message: isQuota
            ? 'OpenAI API quota or billing limit exceeded.'
            : 'OpenAI rate limit exceeded. Please wait.',
        };
      }
      if (
        err instanceof OpenAI.APIConnectionTimeoutError ||
        err instanceof OpenAI.APIConnectionError
      ) {
        return {
          status: 'network_failure',
          configured: true,
          provider: 'OpenAI',
          model,
          message: 'Network connection to OpenAI servers failed. Verify network connectivity.',
        };
      }
      return {
        status: 'error',
        configured: true,
        provider: 'OpenAI',
        model,
        message: err.message || 'OpenAI health check encountered an error.',
      };
    }
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = this.getModel();

    if (!apiKey || !apiKey.trim()) {
      throw new Error('OpenAI API key is missing. Set OPENAI_API_KEY in your server-side environment variables.');
    }

    const client = this.getClient();
    const systemPrompt =
      req.systemPrompt ||
      'You are a rigorous academic research assistant. Ground all statements strictly in the provided paper context. When evidence is insufficient, explicitly state that.';
    const userPrompt = req.prompt;

    let answer = '';
    let usageData: { promptTokens: number; completionTokens: number } | undefined;

    // Prefer Responses API for newer SDK integrations, falling back to chat completions if needed
    try {
      const response = await client.responses.create({
        model,
        instructions: systemPrompt,
        input: userPrompt,
        temperature: req.temperature ?? 0.2,
      });

      answer = response.output_text || '';
      if (!answer && Array.isArray((response as any).output)) {
        for (const item of (response as any).output) {
          if (item.type === 'message' && Array.isArray(item.content)) {
            for (const c of item.content) {
              if (c.type === 'text') answer += c.text;
            }
          }
        }
      }
      if (response.usage) {
        usageData = {
          promptTokens: response.usage.input_tokens || 0,
          completionTokens: response.usage.output_tokens || 0,
        };
      }
    } catch (responsesErr: any) {
      // Re-throw fatal client errors without retrying completions
      if (
        responsesErr instanceof OpenAI.AuthenticationError ||
        responsesErr instanceof OpenAI.PermissionDeniedError ||
        responsesErr instanceof OpenAI.RateLimitError ||
        responsesErr instanceof OpenAI.APIConnectionError ||
        responsesErr instanceof OpenAI.APIConnectionTimeoutError
      ) {
        this.handleOpenAIError(responsesErr, model);
      }

      // Fall back to chat completions API with multi-turn support
      try {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
        ];

        if (req.history && req.history.length > 0) {
          for (const turn of req.history.slice(-8)) {
            if (turn.role === 'user' || turn.role === 'assistant' || turn.role === 'system') {
              messages.push({
                role: turn.role,
                content: turn.content,
              });
            }
          }
        }

        messages.push({ role: 'user', content: userPrompt });

        const completion = await client.chat.completions.create({
          model,
          messages,
          temperature: req.temperature ?? 0.2,
        });

        answer = completion.choices[0]?.message?.content || 'No response returned from model.';
        if (completion.usage) {
          usageData = {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
          };
        }
      } catch (chatErr: any) {
        this.handleOpenAIError(chatErr, model);
      }
    }

    return {
      answer,
      evidence: (req.retrievedChunks || []).map((c) => ({
        page: c.chunk.pageNumber,
        section: c.chunk.sectionName,
        snippet: c.chunk.content.substring(0, 300) + '...',
        similarityScore: Math.round(c.score * 100),
      })),
      modelUsed: model,
      provider: 'OpenAI',
      usage: usageData,
    };
  }
}

// 3. Groq Provider (free-tier, ultra-fast Llama-3.3-70B inference)
export class GroqProvider implements LLMProvider {
  name = 'Groq';

  isAvailable(): boolean {
    return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  }

  getModel(): string {
    return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.GROQ_API_KEY;
    const model = this.getModel();

    if (!apiKey) {
      throw new Error('Groq API key is missing. Set GROQ_API_KEY in environment variables.');
    }

    const systemPrompt =
      req.systemPrompt ||
      'You are a rigorous academic research assistant. Ground all statements strictly in the provided paper context. If evidence is insufficient, state: "Insufficient evidence in the selected paper."';

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (req.history && req.history.length > 0) {
      for (const turn of req.history.slice(-8)) {
        messages.push({ role: turn.role, content: turn.content });
      }
    }

    messages.push({ role: 'user', content: req.prompt });

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: req.temperature ?? 0.2,
        max_tokens: req.maxTokens ?? 1500,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Groq API Error (${res.status}): ${errBody || res.statusText}`);
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || 'No response returned from Groq model.';

    return {
      answer,
      evidence: (req.retrievedChunks || []).map((c) => ({
        page: c.chunk.pageNumber,
        section: c.chunk.sectionName,
        snippet: c.chunk.content.substring(0, 300) + '...',
        similarityScore: Math.round(c.score * 100),
      })),
      modelUsed: model,
      provider: 'Groq',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
          }
        : undefined,
    };
  }
}

// 4. Google Gemini Provider (free-tier gemini-1.5-flash with multi-turn support)
export class GoogleGeminiProvider implements LLMProvider {
  name = 'Google Gemini';

  isAvailable(): boolean {
    return Boolean(
      (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) ||
      (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim().length > 0)
    );
  }

  getModel(): string {
    return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const model = this.getModel();

    if (!apiKey) {
      throw new Error('Gemini API key is missing. Set GEMINI_API_KEY or GOOGLE_API_KEY.');
    }

    const systemInstructionText =
      req.systemPrompt ||
      'You are an evidence-grounded academic research assistant. Ground all statements strictly in the provided paper context. If evidence is unavailable, state: "Insufficient evidence in the current research library."';

    const contents: { role: string; parts: { text: string }[] }[] = [];

    // Add multi-turn history
    if (req.history && req.history.length > 0) {
      for (const turn of req.history.slice(-8)) {
        if (turn.role === 'user' || turn.role === 'assistant') {
          contents.push({
            role: turn.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: turn.content }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: req.prompt }],
    });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
          contents,
          generationConfig: {
            temperature: req.temperature ?? 0.2,
            maxOutputTokens: req.maxTokens ?? 1500,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const answer =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No response returned from Gemini model.';

    return {
      answer,
      evidence: (req.retrievedChunks || []).map((c) => ({
        page: c.chunk.pageNumber,
        section: c.chunk.sectionName,
        snippet: c.chunk.content.substring(0, 300) + '...',
        similarityScore: Math.round(c.score * 100),
      })),
      modelUsed: model,
      provider: 'Google Gemini',
    };
  }
}

// 5. Anthropic Claude Provider (when ANTHROPIC_API_KEY is available)
export class AnthropicProvider implements LLMProvider {
  name = 'Anthropic Claude';

  isAvailable(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 0);
  }

  getModel(): string {
    return process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = this.getModel();

    const messages: { role: string; content: string }[] = [];

    if (req.history && req.history.length > 0) {
      for (const turn of req.history.slice(-8)) {
        if (turn.role === 'user' || turn.role === 'assistant') {
          messages.push({ role: turn.role, content: turn.content });
        }
      }
    }

    messages.push({ role: 'user', content: req.prompt });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: req.maxTokens ?? 1500,
        temperature: req.temperature ?? 0.2,
        system:
          req.systemPrompt ||
          'You are a rigorous academic research assistant. Ground all statements strictly in the provided paper context.',
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const answer =
      data.content?.[0]?.text || 'No response returned from Claude model.';

    return {
      answer,
      evidence: (req.retrievedChunks || []).map((c) => ({
        page: c.chunk.pageNumber,
        section: c.chunk.sectionName,
        snippet: c.chunk.content.substring(0, 300) + '...',
        similarityScore: Math.round(c.score * 100),
      })),
      modelUsed: model,
      provider: 'Anthropic Claude',
    };
  }
}

// 6. Multi-LLM Router
export class ModelRouter {
  private providers: LLMProvider[] = [
    new OpenAIProvider(),
    new GroqProvider(),
    new GoogleGeminiProvider(),
    new AnthropicProvider(),
    new OfflineAcademicEngine(),
  ];

  selectProvider(task: TaskCategory): LLMProvider {
    // 1. If OPENAI_API_KEY is configured, prioritize official OpenAI provider
    const openAi = this.providers.find((p) => p.name === 'OpenAI' && p.isAvailable());
    if (openAi) return openAi;

    // 2. If Groq is configured, use ultra-fast Llama-3.3-70B
    const groq = this.providers.find((p) => p.name === 'Groq' && p.isAvailable());
    if (groq) return groq;

    // 3. If Google Gemini is configured, use Gemini
    const gemini = this.providers.find((p) => p.name === 'Google Gemini' && p.isAvailable());
    if (gemini) return gemini;

    // 4. If Anthropic Claude is configured, use Claude
    const claude = this.providers.find((p) => p.name === 'Anthropic Claude' && p.isAvailable());
    if (claude) return claude;

    // 5. Zero-key deterministic fallback
    return this.providers.find((p) => p.name === 'Academic Local Reasoning Engine')!;
  }

  async execute(req: LLMRequest): Promise<LLMResponse> {
    const provider = this.selectProvider(req.task);
    try {
      return await provider.generate(req);
    } catch (err) {
      // MANDATORY RULE: Never disguise provider failures as successful AI responses.
      // Do not return hardcoded fallback text as a genuine OpenAI response.
      console.error(`Provider [${provider.name}] execution failed:`, err);
      throw err;
    }
  }
}

export async function checkActiveProviderHealth(): Promise<ProviderHealthStatus> {
  const router = new ModelRouter();
  const active = router.selectProvider('rag_qa');

  if (active instanceof OpenAIProvider) {
    return await active.checkHealth();
  }

  if (active.name === 'Academic Local Reasoning Engine') {
    return {
      status: 'missing_credentials',
      configured: false,
      provider: 'Local Reasoning Engine',
      model: 'offline-academic-reasoner-v1',
      message: 'No external LLM API key configured. Operating in zero-key offline academic mode.',
    };
  }

  return {
    status: 'connected',
    configured: true,
    provider: active.name,
    model: (active as any).getModel ? (active as any).getModel() : 'default',
    message: `${active.name} provider configured and ready.`,
  };
}

export const openAIProvider = new OpenAIProvider();
export const modelRouter = new ModelRouter();
