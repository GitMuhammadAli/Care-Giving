import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { CareSummaryService } from '../services/care-summary.service';

/**
 * In-process BullMQ processor for AI summary jobs.
 *
 * Handles background summary generation (e.g., scheduled daily at 7 AM).
 * Runs inside the NestJS API process — no separate worker needed.
 *
 * Note: Most summaries are generated on-demand via the API controller.
 * This processor handles the scheduled/background case (future: email summaries).
 */
export interface AiSummaryJobData {
  careRecipientId: string;
  familyId: string;
  type: 'daily' | 'weekly';
}

@Processor('ai-summaries')
export class AiSummaryProcessor {
  private readonly logger = new Logger(AiSummaryProcessor.name);

  constructor(
    private readonly careSummaryService: CareSummaryService,
  ) {}

  @Process()
  async handleSummary(job: Job<AiSummaryJobData>): Promise<void> {
    const { careRecipientId, type } = job.data;

    this.logger.debug({ careRecipientId, type }, 'Generating background summary');

    try {
      const result = type === 'weekly'
        ? await this.careSummaryService.generateWeeklySummary(careRecipientId)
        : await this.careSummaryService.generateDailySummary(careRecipientId);

      this.logger.log(
        {
          careRecipientId,
          type,
          highlightsCount: result.highlights?.length || 0,
          concernsCount: result.concerns?.length || 0,
        },
        'Background summary generated',
      );

      // Future: store result for email delivery, cache, etc.
    } catch (error) {
      this.logger.error(
        { careRecipientId, type, error: error instanceof Error ? error.message : String(error) },
        'Background summary generation failed',
      );
      throw error; // Let BullMQ handle retry
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job<AiSummaryJobData>) {
    this.logger.debug({ jobId: job.id }, 'Summary job completed');
  }

  @OnQueueFailed()
  onFailed(job: Job<AiSummaryJobData>, error: Error) {
    this.logger.warn(
      { jobId: job.id, error: error.message },
      'Summary job failed',
    );
  }
}
