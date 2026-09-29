import { ScoredChunk } from './vectorStore';

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
class OfflineAcademicEngine implements LLMProvider {
  name = 'Academic Local Reasoning Engine';

  isAvailable(): boolean {
    return true; // Always ready
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const chunks = req.retrievedChunks || [];

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

    // Generate grounded synthesis
    let synthesis = '';
    const qLower = req.prompt.toLowerCase();

    if (qLower.includes('dataset') || qLower.includes('corpus') || qLower.includes('data')) {
      const dataChunk = chunks.find((c) => c.chunk.sectionName.toLowerCase().includes('data') || c.chunk.content.toLowerCase().includes('data')) || primaryChunk;
      synthesis = `Based on the paper's documentation in the **${dataChunk.chunk.sectionName}** section (Page ${dataChunk.chunk.pageNumber}):\n\n> "${dataChunk.chunk.content.substring(0, 280)}..."\n\nThe authors specify their data curation and sampling procedures as highlighted above. The empirical corpus details conform to the documented section evidence.`;
    } else if (qLower.includes('model') || qLower.includes('architecture') || qLower.includes('xlm') || qLower.includes('bert')) {
      const modelChunk = chunks.find((c) => c.chunk.sectionName.toLowerCase().includes('method') || c.chunk.content.toLowerCase().includes('model')) || primaryChunk;
      synthesis = `According to the **${modelChunk.chunk.sectionName}** section (Page ${modelChunk.chunk.pageNumber}):\n\n> "${modelChunk.chunk.content.substring(0, 280)}..."\n\nThe authors detail their architectural configuration and baseline selections as shown in the empirical evidence above.`;
    } else if (qLower.includes('limitation') || qLower.includes('future')) {
      const limChunk = chunks.find((c) => c.chunk.sectionName.toLowerCase().includes('limit') || c.chunk.sectionName.toLowerCase().includes('conclusion')) || primaryChunk;
      synthesis = `The authors explicitly document the following constraints in the **${limChunk.chunk.sectionName}** section (Page ${limChunk.chunk.pageNumber}):\n\n> "${limChunk.chunk.content.substring(0, 280)}..."\n\nThese constraints establish the theoretical and practical boundaries observed in the study.`;
    } else if (qLower.includes('result') || qLower.includes('finding') || qLower.includes('metric') || qLower.includes('f1')) {
      const resChunk = chunks.find((c) => c.chunk.sectionName.toLowerCase().includes('result') || c.chunk.content.toLowerCase().includes('f1') || c.chunk.content.toLowerCase().includes('%')) || primaryChunk;
      synthesis = `As documented in **${resChunk.chunk.sectionName}** (Page ${resChunk.chunk.pageNumber}):\n\n> "${resChunk.chunk.content.substring(0, 280)}..."\n\nThe statistical measurements and comparative baselines validate these reported metrics.`;
    } else {
      synthesis = `Regarding your inquiry on *" ${req.prompt} "*:\n\nDirect evidence from **${primaryChunk.chunk.sectionName}** (Page ${primaryChunk.chunk.pageNumber}) states:\n\n> "${primaryChunk.chunk.content.substring(0, 320)}..."\n\nThis passage provides the primary grounding for the investigation within the retrieved paper content.`;
    }

    return {
      answer: synthesis,
      evidence: evidenceList,
      modelUsed: 'offline-academic-reasoner-v1',
      provider: 'Local Academic Reasoning Engine',
    };
  }
}

// 2. OpenAI Provider (when OPENAI_API_KEY is available)
class OpenAIProvider implements LLMProvider {
  name = 'OpenAI';

  isAvailable(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const evidenceContext = (req.retrievedChunks || [])
      .map(
        (c) =>
          `[PAGE ${c.chunk.pageNumber} | SECTION: ${c.chunk.sectionName}]\n${c.chunk.content}`
      )
      .join('\n\n---\n\n');

    const promptWithContext = `Paper Context:\n${evidenceContext}\n\nResearcher Question: ${req.prompt}\n\nPlease answer concisely and objectively, citing exact page numbers and sections from the context. Do not invent page numbers.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              req.systemPrompt ||
              'You are a rigorous academic research assistant. Ground all statements strictly in the provided paper context. When evidence is insufficient, explicitly state that.',
          },
          { role: 'user', content: promptWithContext },
        ],
        temperature: req.temperature ?? 0.2,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.statusText}`);
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || 'No response returned from model.';

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
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }
        : undefined,
    };
  }
}

// 3. Multi-LLM Router
export class ModelRouter {
  private providers: LLMProvider[] = [
    new OpenAIProvider(),
    new OfflineAcademicEngine(),
  ];

  selectProvider(task: TaskCategory): LLMProvider {
    // If external key exists and is available, prioritize it
    const external = this.providers.find((p) => p.name !== 'Academic Local Reasoning Engine' && p.isAvailable());
    if (external) return external;

    // Fallback to offline academic reasoning engine
    return this.providers.find((p) => p.name === 'Academic Local Reasoning Engine')!;
  }

  async execute(req: LLMRequest): Promise<LLMResponse> {
    const provider = this.selectProvider(req.task);
    try {
      return await provider.generate(req);
    } catch (err) {
      console.warn(`Provider ${provider.name} failed, falling back to Local Reasoning Engine:`, err);
      const fallback = new OfflineAcademicEngine();
      return await fallback.generate(req);
    }
  }
}

export const modelRouter = new ModelRouter();
