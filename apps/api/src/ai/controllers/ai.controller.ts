import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CareSummaryService } from '../services/care-summary.service';
import { SmartEntryService, ParsedTimelineEntry } from '../services/smart-entry.service';
import { RagService, RagAnswer } from '../services/rag.service';
import { FamilyAccessGuard } from '../../system/guard/family-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly careSummaryService: CareSummaryService,
    private readonly smartEntryService: SmartEntryService,
    private readonly ragService: RagService,
    private readonly prisma: PrismaService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CARE SUMMARIES
  // ═══════════════════════════════════════════════════════════════

  @Get('summary/daily/:careRecipientId')
  @ApiOperation({ summary: 'Generate daily care summary' })
  async getDailySummary(
    @Param('careRecipientId') careRecipientId: string,
    @Query('date') dateStr?: string,
    @CurrentUser() user?: any,
  ) {
    await this.verifyAccess(careRecipientId, user?.id);
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.careSummaryService.generateDailySummary(careRecipientId, date);
  }

  @Get('summary/weekly/:careRecipientId')
  @ApiOperation({ summary: 'Generate weekly care summary' })
  async getWeeklySummary(
    @Param('careRecipientId') careRecipientId: string,
    @Query('date') dateStr?: string,
    @CurrentUser() user?: any,
  ) {
    await this.verifyAccess(careRecipientId, user?.id);
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.careSummaryService.generateWeeklySummary(careRecipientId, date);
  }

  // ═══════════════════════════════════════════════════════════════
  // SMART DATA ENTRY
  // ═══════════════════════════════════════════════════════════════

  @Post('smart-entry/parse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parse natural language into a structured timeline entry' })
  async parseSmartEntry(
    @Body() body: { text: string },
  ): Promise<ParsedTimelineEntry> {
    if (!body.text || body.text.trim().length === 0) {
      throw new BadRequestException('Text is required');
    }
    if (body.text.length > 2000) {
      throw new BadRequestException('Text must be under 2000 characters');
    }
    return this.smartEntryService.parseNaturalLanguage(body.text.trim());
  }

  // ═══════════════════════════════════════════════════════════════
  // RAG - ASK QUESTIONS
  // ═══════════════════════════════════════════════════════════════

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask a question about care history (RAG)' })
  async askQuestion(
    @Body() body: { question: string; careRecipientId: string },
    @CurrentUser() user?: any,
  ): Promise<RagAnswer> {
    if (!body.question || body.question.trim().length === 0) {
      throw new BadRequestException('Question is required');
    }
    if (body.question.length > 500) {
      throw new BadRequestException('Question must be under 500 characters');
    }

    const careRecipient = await this.verifyAccess(body.careRecipientId, user?.id);

    return this.ragService.ask({
      question: body.question.trim(),
      familyId: careRecipient.familyId,
      careRecipientId: body.careRecipientId,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async verifyAccess(careRecipientId: string, userId?: string) {
    if (!userId) throw new BadRequestException('User not authenticated');

    const careRecipient = await this.prisma.careRecipient.findUnique({
      where: { id: careRecipientId },
      select: { id: true, familyId: true },
    });

    if (!careRecipient) {
      throw new BadRequestException('Care recipient not found');
    }

    // Verify user is a member of this family
    const membership = await this.prisma.familyMember.findFirst({
      where: {
        familyId: careRecipient.familyId,
        userId,
        isActive: true,
      },
    });

    if (!membership) {
      throw new BadRequestException('Access denied');
    }

    return careRecipient;
  }
}
