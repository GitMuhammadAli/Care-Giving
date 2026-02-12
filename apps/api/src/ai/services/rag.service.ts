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

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Answer a question using RAG over the family's care data.
   */
  async ask(params: {
    question: string;
    familyId: string;
    careRecipientId?: string;
  }): Promise<RagAnswer> {
    const { question, familyId, careRecipientId } = params;

    if (!this.geminiService.enabled) {
      return {
        answer: 'AI features are not configured. Please set up the GEMINI_API_KEY to enable AI-powered answers.',
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

    if (results.length === 0) {
      return {
        answer: 'I don\'t have enough care records to answer this question yet. As more timeline entries, medications, and appointments are logged, I\'ll be able to help better.',
        sources: [],
      };
    }

    // 2. Build context from retrieved chunks
    const context = this.buildContext(results);

    // 3. Generate answer using Gemini
    const systemPrompt = `You are CareCircle AI, a helpful assistant for family caregivers.
Answer the question using ONLY the provided context from the family's care records.
If you cannot answer from the context, say so honestly.
Always cite which record you used (e.g., "According to the timeline entry from Jan 15...").
Be compassionate and use plain language — the user may not be medically trained.
Keep answers concise but thorough.`;

    const prompt = `Context from care records:
${context}

Question: ${question}`;

    try {
      const answer = await this.geminiService.generateText(prompt, systemPrompt);

      const sources = results
        .filter((r) => r.similarity && r.similarity > 0.3)
        .slice(0, 5)
        .map((r) => ({
          type: r.resourceType,
          title: r.metadata?.title || r.content.slice(0, 60),
          date: r.createdAt.toISOString(),
          id: r.resourceId,
          similarity: r.similarity || 0,
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

  private buildContext(records: EmbeddingRecord[]): string {
    return records
      .map((r, i) => {
        const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Unknown date';
        return `[${i + 1}] ${r.resourceType} (${date}): ${r.content}`;
      })
      .join('\n\n');
  }
}
