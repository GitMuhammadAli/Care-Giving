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

// Controllers
import { AiController } from './controllers/ai.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BullModule.registerQueue({ name: 'ai-embeddings' }),
    BullModule.registerQueue({ name: 'ai-summaries' }),
  ],
  controllers: [AiController],
  providers: [
    GeminiService,
    EmbeddingService,
    EmbeddingIndexerService,
    CareSummaryService,
    SmartEntryService,
    RagService,
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
