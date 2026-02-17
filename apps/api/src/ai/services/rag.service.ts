import { Injectable, Logger } from '@nestjs/common';
import { SchemaType } from '@google/generative-ai';
import { GeminiService } from './gemini.service';
import { EmbeddingService, EmbeddingRecord } from './embedding.service';

/** Schema for RAG answer — forces Gemini to return structured JSON */
const RAG_ANSWER_SCHEMA = {
  answer: {
    type: SchemaType.STRING,
    description: 'A helpful answer to the question, based only on the provided care records. Cite which records you used.',
  },
};

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

    try {
      // 1. Search for relevant context
      this.logger.log({ question, familyId, careRecipientId }, 'RAG: starting search');

      const results = await this.embeddingService.search({
        query: question,
        familyId,
        careRecipientId,
        limit: 10,
      });

      this.logger.log(
        { totalResults: results.length, topSimilarity: results[0]?.similarity },
        'RAG: search complete',
      );

      // Filter out very low similarity results (noise)
      const relevantResults = results.filter(
        (r) => (r.similarity ?? 0) >= MIN_CONTEXT_SIMILARITY,
      );

      if (relevantResults.length === 0) {
        this.logger.log('RAG: no relevant results above threshold');
        return {
          answer:
            "I don't have enough care records to answer this question yet. " +
            "As more timeline entries, medications, and appointments are logged, I'll be able to help better.",
          sources: [],
        };
      }

      // 2. Build context from retrieved chunks
      const context = this.buildContext(relevantResults);

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

      this.logger.log(
        { relevantCount: relevantResults.length, sourceCount: sources.length, contextLength: context.length },
        'RAG: context built, calling Gemini for answer',
      );

      // 3. Generate answer using Gemini (structured output — same method that works for summaries)
      const systemPrompt = `You are CareCircle AI, a helpful assistant for family caregivers.
Answer the question using ONLY the provided context from the family's care records.
If you cannot answer from the context, say so honestly.
Always cite which record you used (e.g., "According to the timeline entry from Feb 17...").
Be compassionate and use plain language — the user may not be medically trained.
Keep answers concise but thorough.
Do not make up information that is not in the provided context.`;

      const prompt = `Context from care records:\n${context}\n\nQuestion: ${question}`;

      try {
        const result = await this.geminiService.generateStructuredOutput<{ answer: string }>(
          prompt,
          RAG_ANSWER_SCHEMA,
          systemPrompt,
        );
        const answer = result.answer || '';
        this.logger.log({ answerLength: answer.length }, 'RAG: Gemini answered successfully');
        return { answer, sources };
      } catch (genError) {
        const errMsg = genError instanceof Error ? genError.message : String(genError);
        this.logger.warn(
          { error: errMsg, relevantCount: relevantResults.length },
          'RAG: Gemini structured output failed — returning context fallback',
        );
        const fallbackAnswer = this.buildFallbackAnswer(question, relevantResults);
        return { answer: fallbackAnswer, sources };
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { error: errMsg },
        'RAG: pipeline failed (search or embedding generation)',
      );
      return {
        answer:
          "I'm having trouble searching care records right now. " +
          'This is usually temporary — please try again in a moment.',
        sources: [],
      };
    }
  }

  /**
   * Try generating text, retry once after a short delay if the first attempt fails (rate limit).
   */
  private async generateWithRetry(prompt: string, systemPrompt: string, retries = 1): Promise<string> {
    try {
      return await this.geminiService.generateText(prompt, systemPrompt);
    } catch (error) {
      if (retries > 0) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const isRateLimit = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');
        const delay = isRateLimit ? 5000 : 2000;
        this.logger.warn(
          { error: errMsg, retriesLeft: retries, delayMs: delay },
          `RAG: Gemini failed, retrying in ${delay}ms`,
        );
        await new Promise((r) => setTimeout(r, delay));
        return this.generateWithRetry(prompt, systemPrompt, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Build a plain-text fallback answer from the retrieved records when Gemini is unavailable.
   */
  private buildFallbackAnswer(question: string, records: EmbeddingRecord[]): string {
    const parts: string[] = [
      `Here's what I found in the care records (AI summary unavailable right now):`,
      '',
    ];

    for (const r of records.slice(0, 5)) {
      const date = this.safeLocalDate(r.createdAt);
      const title = r.metadata?.title || '';
      const snippet = r.content.length > 150 ? r.content.slice(0, 150) + '...' : r.content;
      parts.push(`• ${title ? title + ' — ' : ''}${snippet} (${r.resourceType}, ${date})`);
    }

    if (records.length > 5) {
      parts.push(`\n...and ${records.length - 5} more related records.`);
    }

    return parts.join('\n');
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
