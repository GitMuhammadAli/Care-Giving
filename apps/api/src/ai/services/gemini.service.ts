import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  SchemaType,
} from '@google/generative-ai';

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private textModel: GenerativeModel | null = null;
  private modelName: string;
  private embeddingModelName: string;
  private isEnabled = false;

  constructor(private readonly configService: ConfigService) {
    this.modelName = this.configService.get<string>('ai.model') || 'gemini-2.0-flash';
    this.embeddingModelName =
      this.configService.get<string>('ai.embeddingModel') || 'gemini-embedding-001';
  }

  onModuleInit() {
    const apiKey = this.configService.get<string>('ai.geminiApiKey');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not set — AI features are disabled');
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.textModel = this.genAI.getGenerativeModel({ model: this.modelName });
    this.isEnabled = true;
    this.logger.log(
      `Gemini AI initialized (text: ${this.modelName}, embedding: ${this.embeddingModelName})`,
    );
  }

  get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Generate free-form text from a prompt.
   * Uses the cached text model or creates one with a system instruction.
   */
  async generateText(
    prompt: string,
    systemInstruction?: string,
  ): Promise<string> {
    this.assertEnabled();

    const model = systemInstruction
      ? this.genAI!.getGenerativeModel({ model: this.modelName, systemInstruction })
      : this.textModel!;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.error({ error }, 'Gemini generateText failed');
      throw this.wrapError(error, 'text generation');
    }
  }

  /**
   * Generate a structured JSON response matching the given schema.
   * A new model instance is created per call because the schema is part of the model config.
   */
  async generateStructuredOutput<T>(
    prompt: string,
    schema: Record<string, any>,
    systemInstruction?: string,
  ): Promise<T> {
    this.assertEnabled();

    const model = this.genAI!.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: schema,
        },
      },
      ...(systemInstruction ? { systemInstruction } : {}),
    });

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(text) as T;
    } catch (error) {
      this.logger.error({ error }, 'Gemini generateStructuredOutput failed');
      throw this.wrapError(error, 'structured output');
    }
  }

  /**
   * Generate an embedding vector for a single text.
   * Returns a 768-dimensional float array (gemini-embedding-001).
   */
  async generateEmbedding(text: string): Promise<number[]> {
    this.assertEnabled();

    try {
      const embeddingModel = this.genAI!.getGenerativeModel({
        model: this.embeddingModelName,
      });
      const result = await embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      this.logger.error({ error }, 'Gemini generateEmbedding failed');
      throw this.wrapError(error, 'embedding generation');
    }
  }

  /**
   * Generate embeddings for multiple texts in batch.
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    this.assertEnabled();

    try {
      const embeddingModel = this.genAI!.getGenerativeModel({
        model: this.embeddingModelName,
      });
      const result = await embeddingModel.batchEmbedContents({
        requests: texts.map((text) => ({
          content: { role: 'user', parts: [{ text }] },
        })),
      });
      return result.embeddings.map((e) => e.values);
    } catch (error) {
      this.logger.error({ error }, 'Gemini batchEmbedContents failed');
      throw this.wrapError(error, 'batch embedding');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private assertEnabled(): void {
    if (!this.genAI || !this.isEnabled) {
      throw new Error('Gemini AI is not configured. Set GEMINI_API_KEY to enable AI features.');
    }
  }

  /**
   * Wraps Gemini SDK errors with a more descriptive message.
   * Detects rate-limit (429) and quota errors for clearer logging.
   */
  private wrapError(error: unknown, operation: string): Error {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
      return new Error(
        `Gemini rate limit exceeded during ${operation}. ` +
        'Free tier allows 15 RPM for Flash, 1500 RPM for embeddings. ' +
        'The request will be retried automatically if using BullMQ.',
      );
    }

    if (message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')) {
      return new Error(
        `Gemini API key is invalid or has been revoked. ` +
        'Check the key at https://aistudio.google.com/apikey',
      );
    }

    return new Error(`Gemini ${operation} failed: ${message}`);
  }
}
