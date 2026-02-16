import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingIndexerService } from './embedding-indexer.service';

/**
 * Cron job that automatically syncs unindexed records to the AI embeddings table.
 *
 * Runs every 6 hours. On each run it:
 * 1. Finds all care recipients across all families
 * 2. For each, checks for timeline entries / medications / appointments
 *    that don't yet have a row in ai_embeddings
 * 3. Enqueues the missing ones for embedding via BullMQ
 *
 * Also does a one-time sync 30 seconds after startup so that fresh deploys
 * pick up any existing data immediately.
 */
@Injectable()
export class EmbeddingSyncCron implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingSyncCron.name);
  private isEnabled = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly embeddingIndexer: EmbeddingIndexerService,
  ) {}

  onModuleInit() {
    this.isEnabled = !!this.configService.get<string>('ai.geminiApiKey');
    if (this.isEnabled) {
      this.logger.log('Embedding sync cron enabled — will auto-index unindexed records');
      // Run once 30s after startup to catch any records from before AI was enabled
      setTimeout(() => this.syncUnindexedRecords(), 30_000);
    }
  }

  /**
   * Runs every 6 hours.
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleCron() {
    if (!this.isEnabled) return;
    await this.syncUnindexedRecords();
  }

  private async syncUnindexedRecords() {
    this.logger.log('Starting auto-sync of unindexed records...');

    try {
      // Check if ai_embeddings table exists
      const tableExists = await this.checkTableExists();
      if (!tableExists) {
        this.logger.warn('ai_embeddings table does not exist — skipping sync');
        return;
      }

      // Get all existing embedded resource IDs in one query
      let existingIds: Set<string>;
      try {
        const rows = await this.prisma.$queryRawUnsafe<{ resource_id: string }[]>(
          `SELECT resource_id FROM "public"."ai_embeddings"`,
        );
        existingIds = new Set(rows.map((r) => r.resource_id));
      } catch {
        existingIds = new Set();
      }

      // Get all care recipients
      const careRecipients = await this.prisma.careRecipient.findMany({
        select: { id: true, familyId: true },
      });

      let totalEnqueued = 0;

      for (const cr of careRecipients) {
        // Timeline entries not yet embedded
        const entries = await this.prisma.timelineEntry.findMany({
          where: { careRecipientId: cr.id },
          select: {
            id: true, title: true, description: true,
            type: true, severity: true, careRecipientId: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });

        for (const entry of entries) {
          if (!existingIds.has(entry.id)) {
            await this.embeddingIndexer.indexTimelineEntry(entry);
            totalEnqueued++;
          }
        }

        // Medications not yet embedded
        const meds = await this.prisma.medication.findMany({
          where: { careRecipientId: cr.id, isActive: true },
          select: {
            id: true, name: true, dosage: true,
            frequency: true, instructions: true, careRecipientId: true,
          },
        });

        for (const med of meds) {
          if (!existingIds.has(med.id)) {
            await this.embeddingIndexer.indexMedication(med);
            totalEnqueued++;
          }
        }

        // Appointments not yet embedded
        const apts = await this.prisma.appointment.findMany({
          where: { careRecipientId: cr.id },
          select: {
            id: true, title: true, type: true,
            notes: true, location: true, careRecipientId: true, startTime: true,
          },
          orderBy: { startTime: 'desc' },
          take: 100,
        });

        for (const apt of apts) {
          if (!existingIds.has(apt.id)) {
            await this.embeddingIndexer.indexAppointment(apt);
            totalEnqueued++;
          }
        }
      }

      if (totalEnqueued > 0) {
        this.logger.log(`Auto-sync complete — enqueued ${totalEnqueued} new records for embedding`);
      } else {
        this.logger.debug('Auto-sync complete — all records already indexed');
      }
    } catch (error) {
      this.logger.error({ error }, 'Embedding auto-sync failed');
    }
  }

  private async checkTableExists(): Promise<boolean> {
    try {
      await this.prisma.$queryRawUnsafe(
        `SELECT 1 FROM "public"."ai_embeddings" LIMIT 1`,
      );
      return true;
    } catch {
      return false;
    }
  }
}
