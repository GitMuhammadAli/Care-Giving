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
  private model: GenerativeModel | null = null;
  private embeddingModelName: string;
  private isEnabled = false;

  constructor(private readonly configService: ConfigService) {
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
    const modelName = this.configService.get<string>('ai.model') || 'gemini-2.0-flash';
    this.model = this.genAI.getGenerativeModel({ model: modelName });
    this.isEnabled = true;
    this.logger.log(`Gemini AI initialized (model: ${modelName})`);
  }

  get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Generate free-form text from a prompt.
   */
  async generateText(
    prompt: string,
    systemInstruction?: string,
  ): Promise<string> {
    if (!this.genAI || !this.isEnabled) {
      throw new Error('Gemini AI is not configured');
    }

    const modelName = this.configService.get<string>('ai.model') || 'gemini-2.0-flash';
    const model = systemInstruction
      ? this.genAI.getGenerativeModel({ model: modelName, systemInstruction })
      : this.model!;

    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  /**
   * Generate a structured JSON response matching the given schema.
   */
  async generateStructuredOutput<T>(
    prompt: string,
    schema: Record<string, any>,
    systemInstruction?: string,
  ): Promise<T> {
    if (!this.genAI || !this.isEnabled) {
      throw new Error('Gemini AI is not configured');
    }

    const modelName = this.configService.get<string>('ai.model') || 'gemini-2.0-flash';
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: schema,
        },
      },
      ...(systemInstruction ? { systemInstruction } : {}),
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text) as T;
  }

  /**
   * Generate an embedding vector for a single text.
   * Returns a 768-dimensional float array (gemini-embedding-001).
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.genAI || !this.isEnabled) {
      throw new Error('Gemini AI is not configured');
    }

    const embeddingModel = this.genAI.getGenerativeModel({
      model: this.embeddingModelName,
    });

    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  }

  /**
   * Generate embeddings for multiple texts in batch.
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.genAI || !this.isEnabled) {
      throw new Error('Gemini AI is not configured');
    }

    const embeddingModel = this.genAI.getGenerativeModel({
      model: this.embeddingModelName,
    });

    const result = await embeddingModel.batchEmbedContents({
      requests: texts.map((text) => ({
        content: { role: 'user', parts: [{ text }] },
      })),
    });

    return result.embeddings.map((e) => e.values);
  }
}
