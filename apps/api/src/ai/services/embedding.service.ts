import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface EmbeddingRecord {
  id: string;
  content: string;
  resourceType: string;
  resourceId: string;
  familyId: string;
  careRecipientId: string | null;
  metadata: Record<string, any>;
  similarity?: number;
  createdAt: Date;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Embed text and store in the ai_embeddings table.
   */
  async storeEmbedding(params: {
    content: string;
    resourceType: string;
    resourceId: string;
    familyId: string;
    careRecipientId?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    if (!this.geminiService.enabled) {
      this.logger.debug('AI disabled — skipping embedding');
      return '';
    }

    const { content, resourceType, resourceId, familyId, careRecipientId, metadata } = params;

    // Generate embedding vector
    const embedding = await this.geminiService.generateEmbedding(content);
    const vectorStr = `[${embedding.join(',')}]`;

    // Upsert: delete existing embedding for this resource, then insert new
    try {
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM "public"."ai_embeddings" WHERE resource_type = $1 AND resource_id = $2`,
        resourceType,
        resourceId,
      );

      const result = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "public"."ai_embeddings" (content, embedding, resource_type, resource_id, family_id, care_recipient_id, metadata)
         VALUES ($1, $2::vector, $3, $4, $5, $6, $7::jsonb)
         RETURNING id`,
        content,
        vectorStr,
        resourceType,
        resourceId,
        familyId,
        careRecipientId || null,
        JSON.stringify(metadata || {}),
      );

      return result[0]?.id || '';
    } catch (error) {
      this.logger.error({ error }, 'Failed to store embedding — table may not exist or pgvector not enabled');
      return '';
    }
  }

  /**
   * Search for similar content using cosine similarity.
   * Results are scoped to the given familyId for security.
   */
  async search(params: {
    query: string;
    familyId: string;
    careRecipientId?: string;
    resourceTypes?: string[];
    limit?: number;
  }): Promise<EmbeddingRecord[]> {
    if (!this.geminiService.enabled) {
      return [];
    }

    const { query, familyId, careRecipientId, resourceTypes, limit = 10 } = params;

    // Generate query embedding
    const queryEmbedding = await this.geminiService.generateEmbedding(query);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    // Build WHERE clause
    let whereClause = `family_id = $2`;
    const queryParams: any[] = [vectorStr, familyId];
    let paramIndex = 3;

    if (careRecipientId) {
      whereClause += ` AND care_recipient_id = $${paramIndex}`;
      queryParams.push(careRecipientId);
      paramIndex++;
    }

    if (resourceTypes && resourceTypes.length > 0) {
      const placeholders = resourceTypes.map((_, i) => `$${paramIndex + i}`).join(', ');
      whereClause += ` AND resource_type IN (${placeholders})`;
      queryParams.push(...resourceTypes);
      paramIndex += resourceTypes.length;
    }

    queryParams.push(limit);

    try {
      const results = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id, content, resource_type, resource_id, family_id, care_recipient_id, metadata, created_at,
                1 - (embedding <=> $1::vector) AS similarity
         FROM "public"."ai_embeddings"
         WHERE ${whereClause}
         ORDER BY embedding <=> $1::vector
         LIMIT $${paramIndex}`,
        ...queryParams,
      );

      return results.map((row) => ({
        id: row.id,
        content: row.content,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        familyId: row.family_id,
        careRecipientId: row.care_recipient_id,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        similarity: Number(row.similarity),
        createdAt: row.created_at,
      }));
    } catch (error) {
      this.logger.error({ error }, 'Embedding search failed — table may not exist or pgvector not enabled');
      return [];
    }
  }

  /**
   * Delete embeddings for a specific resource (cleanup on delete).
   */
  async deleteByResource(resourceType: string, resourceId: string): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM "public"."ai_embeddings" WHERE resource_type = $1 AND resource_id = $2`,
        resourceType,
        resourceId,
      );
    } catch (error) {
      this.logger.error({ error }, 'Failed to delete embedding by resource');
    }
  }

  /**
   * Delete all embeddings for a family (e.g., family deleted).
   */
  async deleteByFamily(familyId: string): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM "public"."ai_embeddings" WHERE family_id = $1`,
        familyId,
      );
    } catch (error) {
      this.logger.error({ error }, 'Failed to delete embeddings by family');
    }
  }
}
