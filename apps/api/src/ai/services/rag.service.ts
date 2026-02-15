import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { EmbeddingService, EmbeddingRecord } from './embedding.service';

export interface RagAnswer {
  answer: string;
  sources: {
    type: string;
    title: string;
    date: string;
    id: string;
    similarity: number;
  }[];
}

/** Minimum cosine similarity to include a record as a source citation. */
const MIN_SOURCE_SIMILARITY = 0.3;

/** Minimum cosine similarity to include a record in the LLM context. */
const MIN_CONTEXT_SIMILARITY = 0.15;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Answer a question using RAG over the family's care data.
   *
   * Pipeline:
   * 1. Embed the question via Gemini
   * 2. Search ai_embeddings (cosine similarity, family-scoped)
   * 3. Build context from top results
   * 4. Send context + question to Gemini for a grounded answer
   * 5. Return answer + source citations
   */
  async ask(params: {
    question: string;
    familyId: string;
    careRecipientId?: string;
  }): Promise<RagAnswer> {
    const { question, familyId, careRecipientId } = params;

    if (!this.geminiService.enabled) {
      return {
        answer:
          'AI features are not configured. Please set up the GEMINI_API_KEY to enable AI-powered answers.',
        sources: [],
      };
    }

    // 1. Search for relevant context
    const results = await this.embeddingService.search({
      query: question,
      familyId,
      careRecipientId,
      limit: 10,
    });

    // Filter out very low similarity results (noise)
    const relevantResults = results.filter(
      (r) => (r.similarity ?? 0) >= MIN_CONTEXT_SIMILARITY,
    );

    if (relevantResults.length === 0) {
      return {
        answer:
          "I don't have enough care records to answer this question yet. " +
          "As more timeline entries, medications, and appointments are logged, I'll be able to help better.",
        sources: [],
      };
    }

    // 2. Build context from retrieved chunks
    const context = this.buildContext(relevantResults);

    // 3. Generate answer using Gemini
    const systemPrompt = `You are CareCircle AI, a helpful assistant for family caregivers.
Answer the question using ONLY the provided context from the family's care records.
If you cannot answer from the context, say so honestly.
Always cite which record you used (e.g., "According to the timeline entry from Jan 15...").
Be compassionate and use plain language — the user may not be medically trained.
Keep answers concise but thorough.
Do not make up information that is not in the provided context.`;

    const prompt = `Context from care records:
${context}

Question: ${question}`;

    try {
      const answer = await this.geminiService.generateText(prompt, systemPrompt);

      // Build source citations (only include records above the source threshold)
      const sources = relevantResults
        .filter((r) => (r.similarity ?? 0) >= MIN_SOURCE_SIMILARITY)
        .slice(0, 5)
        .map((r) => ({
          type: r.resourceType,
          title: r.metadata?.title || r.content.slice(0, 60),
          date: this.safeISODate(r.createdAt),
          id: r.resourceId,
          similarity: Math.round((r.similarity ?? 0) * 100) / 100,
        }));

      return { answer, sources };
    } catch (error) {
      this.logger.error({ error }, 'Failed to generate RAG answer');
      return {
        answer: 'I encountered an error while processing your question. Please try again.',
        sources: [],
      };
    }
  }

  /**
   * Build a numbered context string from embedding records.
   */
  private buildContext(records: EmbeddingRecord[]): string {
    return records
      .map((r, i) => {
        const date = this.safeLocalDate(r.createdAt);
        return `[${i + 1}] ${r.resourceType} (${date}): ${r.content}`;
      })
      .join('\n\n');
  }

  /**
   * Safely convert a date value (Date object or ISO string from raw SQL) to a locale date string.
   */
  private safeLocalDate(value: Date | string | null): string {
    if (!value) return 'Unknown date';
    try {
      const date = value instanceof Date ? value : new Date(value);
      return date.toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  }

  /**
   * Safely convert a date value to an ISO string (for API responses).
   */
  private safeISODate(value: Date | string | null): string {
    if (!value) return new Date().toISOString();
    try {
      const date = value instanceof Date ? value : new Date(value);
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
}
