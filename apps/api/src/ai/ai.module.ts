import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';

// Services
import { GeminiService } from './services/gemini.service';
import { EmbeddingService } from './services/embedding.service';
import { EmbeddingIndexerService } from './services/embedding-indexer.service';
import { CareSummaryService } from './services/care-summary.service';
import { SmartEntryService } from './services/smart-entry.service';
import { RagService } from './services/rag.service';

// In-process processors (no separate worker deployment needed)
import { AiEmbeddingProcessor } from './processors/ai-embedding.processor';
import { AiSummaryProcessor } from './processors/ai-summary.processor';

// Controllers
import { AiController } from './controllers/ai.controller';

/**
 * AiModule — Registers all AI services, BullMQ queues, and in-process processors.
 *
 * Architecture:
 * - BullMQ queues persist jobs in Redis (retry, dead-letter, backpressure)
 * - In-process processors handle jobs inside the NestJS API process
 * - No separate worker deployment is required for single-server setups
 * - For scaled deployments, disable these processors and run standalone workers instead
 *
 * The standalone workers in apps/workers/ are kept as an alternative for
 * horizontal scaling (separate machine processes the AI queue).
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BullModule.registerQueue({ name: 'ai-embeddings' }),
    BullModule.registerQueue({ name: 'ai-summaries' }),
  ],
  controllers: [AiController],
  providers: [
    // Services
    GeminiService,
    EmbeddingService,
    EmbeddingIndexerService,
    CareSummaryService,
    SmartEntryService,
    RagService,
    // In-process processors (process BullMQ jobs inside the API)
    AiEmbeddingProcessor,
    AiSummaryProcessor,
  ],
  exports: [
    GeminiService,
    EmbeddingService,
    EmbeddingIndexerService,
    CareSummaryService,
    SmartEntryService,
    RagService,
  ],
})
export class AiModule {}
