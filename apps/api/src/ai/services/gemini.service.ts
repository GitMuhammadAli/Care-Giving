import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  SchemaType,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

/**
 * Safety settings for CareCircle's healthcare context.
 * Medical terms (blood pressure, medications, symptoms) can trigger
 * Gemini's default safety filters. We use BLOCK_ONLY_HIGH to allow
 * legitimate healthcare content while still blocking truly harmful output.
 */
const CARE_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

/** Max retries for transient errors (429, network) */
const MAX_RETRIES = 2;

/** Min delay between any two Gemini API calls (ms) — keeps us safely under 15 RPM */
const MIN_REQUEST_GAP_MS = 4500;

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private textModel: GenerativeModel | null = null;
  private modelName: string;
  private embeddingModelName: string;
  private isEnabled = false;

  /** Simple throttle: timestamp of last API call */
  private lastRequestTime = 0;
  /** Serialization queue: ensures only 1 Gemini call at a time */
  private requestQueue: Promise<any> = Promise.resolve();

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
    this.textModel = this.genAI.getGenerativeModel({
      model: this.modelName,
      safetySettings: CARE_SAFETY_SETTINGS,
    });
    this.isEnabled = true;
    this.logger.log(
      `Gemini AI initialized (text: ${this.modelName}, embedding: ${this.embeddingModelName})`,
    );
  }

  get enabled(): boolean {
    return this.isEnabled;
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate free-form text from a prompt.
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    this.assertEnabled();

    return this.withRetry('generateText', async () => {
      const model = systemInstruction
        ? this.genAI!.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            safetySettings: CARE_SAFETY_SETTINGS,
          })
        : this.textModel!;

      const result = await model.generateContent(prompt);
      return result.response.text();
    });
  }

  /**
   * Generate a structured JSON response matching the given schema.
   */
  async generateStructuredOutput<T>(
    prompt: string,
    schema: Record<string, any>,
    systemInstruction?: string,
  ): Promise<T> {
    this.assertEnabled();

    return this.withRetry('generateStructuredOutput', async () => {
      const model = this.genAI!.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: schema,
          },
        },
        safetySettings: CARE_SAFETY_SETTINGS,
        ...(systemInstruction ? { systemInstruction } : {}),
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(text) as T;
    });
  }

  /**
   * Generate an embedding vector for a single text.
   * Returns a 3072-dimensional float array (gemini-embedding-001).
   */
  async generateEmbedding(text: string): Promise<number[]> {
    this.assertEnabled();

    return this.withRetry('generateEmbedding', async () => {
      const embeddingModel = this.genAI!.getGenerativeModel({
        model: this.embeddingModelName,
      });
      const result = await embeddingModel.embedContent(text);
      return result.embedding.values;
    });
  }

  /**
   * Generate embeddings for multiple texts in batch.
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    this.assertEnabled();

    return this.withRetry('batchEmbed', async () => {
      const embeddingModel = this.genAI!.getGenerativeModel({
        model: this.embeddingModelName,
      });
      const result = await embeddingModel.batchEmbedContents({
        requests: texts.map((text) => ({
          content: { role: 'user', parts: [{ text }] },
        })),
      });
      return result.embeddings.map((e) => e.values);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // RETRY + THROTTLE ENGINE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Execute a Gemini API call with:
   * 1. Serialization (only 1 call at a time)
   * 2. Throttle (minimum gap between calls)
   * 3. Retry with exponential backoff for transient errors
   */
  private async withRetry<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    // Chain onto the request queue so calls are serialized
    const result = this.requestQueue.then(async () => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          await this.throttle();
          const value = await fn();
          return value;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const msg = lastError.message;
          const isRetryable =
            msg.includes('429') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('503') ||
            msg.includes('UNAVAILABLE') ||
            msg.includes('DEADLINE_EXCEEDED') ||
            msg.includes('fetch failed') ||
            msg.includes('ECONNRESET');

          if (isRetryable && attempt < MAX_RETRIES) {
            const delay = (attempt + 1) * 5000; // 5s, 10s
            this.logger.warn(
              `[${operation}] Attempt ${attempt + 1} failed (${msg.slice(0, 80)}), retrying in ${delay}ms`,
            );
            await this.sleep(delay);
            continue;
          }

          // Non-retryable or exhausted retries
          this.logger.error(`[${operation}] Failed after ${attempt + 1} attempt(s): ${msg.slice(0, 120)}`);
          break;
        }
      }

      throw this.wrapError(lastError!, operation);
    });

    // Update the queue (don't let failures break the chain)
    this.requestQueue = result.catch(() => {});
    return result;
  }

  /**
   * Enforce minimum gap between API calls to stay under rate limits.
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < MIN_REQUEST_GAP_MS) {
      await this.sleep(MIN_REQUEST_GAP_MS - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
   */
  private wrapError(error: Error, operation: string): Error {
    const message = error.message || String(error);

    if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
      return new Error(
        `Gemini rate limit exceeded during ${operation}. ` +
        'Free tier allows 15 RPM for Flash, 1500 RPM for embeddings.',
      );
    }

    if (message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')) {
      return new Error(
        `Gemini API key is invalid or has been revoked. ` +
        'Check the key at https://aistudio.google.com/apikey',
      );
    }

    if (message.includes('SAFETY') || message.includes('blocked') || message.includes('no candidates')) {
      return new Error(
        `Gemini response was blocked by safety filters during ${operation}.`,
      );
    }

    return new Error(`Gemini ${operation} failed: ${message}`);
  }
}
