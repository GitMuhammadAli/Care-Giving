import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CareSummaryService } from '../services/care-summary.service';
import { SmartEntryService, ParsedTimelineEntry } from '../services/smart-entry.service';
import { RagService, RagAnswer } from '../services/rag.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ParseSmartEntryDto } from '../dto/parse-smart-entry.dto';
import { AskQuestionDto } from '../dto/ask-question.dto';

/**
 * AI Controller
 *
 * Rate limits:
 * - Summaries: 5 per minute (they call Gemini and are expensive)
 * - Smart Entry: 10 per minute
 * - RAG Ask: 8 per minute (embedding + Gemini text)
 *
 * Gemini free tier allows 15 RPM total, so these limits protect against
 * a single user exhausting the quota for everyone.
 */
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
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Generate daily care summary' })
  @ApiParam({ name: 'careRecipientId', description: 'Care recipient ID' })
  @ApiQuery({ name: 'date', required: false, description: 'Date (YYYY-MM-DD), defaults to today' })
  async getDailySummary(
    @Param('careRecipientId') careRecipientId: string,
    @Query('date') dateStr?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    await this.verifyAccess(careRecipientId, user?.id);
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.careSummaryService.generateDailySummary(careRecipientId, date);
  }

  @Get('summary/weekly/:careRecipientId')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Generate weekly care summary' })
  @ApiParam({ name: 'careRecipientId', description: 'Care recipient ID' })
  @ApiQuery({ name: 'date', required: false, description: 'Date within the week (YYYY-MM-DD), defaults to this week' })
  async getWeeklySummary(
    @Param('careRecipientId') careRecipientId: string,
    @Query('date') dateStr?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    await this.verifyAccess(careRecipientId, user?.id);
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.careSummaryService.generateWeeklySummary(careRecipientId, date);
  }

  // ═══════════════════════════════════════════════════════════════
  // SMART DATA ENTRY
  // ═══════════════════════════════════════════════════════════════

  @Post('smart-entry/parse')
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parse natural language into a structured timeline entry' })
  async parseSmartEntry(
    @Body() dto: ParseSmartEntryDto,
  ): Promise<ParsedTimelineEntry> {
    return this.smartEntryService.parseNaturalLanguage(dto.text.trim());
  }

  // ═══════════════════════════════════════════════════════════════
  // RAG - ASK QUESTIONS
  // ═══════════════════════════════════════════════════════════════

  @Post('ask')
  @Throttle({ short: { ttl: 60000, limit: 8 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask a question about care history (RAG)' })
  async askQuestion(
    @Body() dto: AskQuestionDto,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<RagAnswer> {
    const careRecipient = await this.verifyAccess(dto.careRecipientId, user?.id);

    return this.ragService.ask({
      question: dto.question.trim(),
      familyId: careRecipient.familyId,
      careRecipientId: dto.careRecipientId,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async verifyAccess(careRecipientId: string, userId?: string) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const careRecipient = await this.prisma.careRecipient.findUnique({
      where: { id: careRecipientId },
      select: { id: true, familyId: true },
    });

    if (!careRecipient) {
      throw new NotFoundException('Care recipient not found');
    }

    // Verify user is an active member of this family
    const membership = await this.prisma.familyMember.findFirst({
      where: {
        familyId: careRecipient.familyId,
        userId,
        isActive: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this care recipient');
    }

    return careRecipient;
  }
}
