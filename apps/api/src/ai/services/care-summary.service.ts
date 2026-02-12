import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';

export interface CareSummary {
  summary: string;
  highlights: string[];
  concerns: string[];
  medications: { total: number; given: number; missed: number; skipped: number };
  period: string;
  generatedAt: string;
}

@Injectable()
export class CareSummaryService {
  private readonly logger = new Logger(CareSummaryService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  async generateDailySummary(careRecipientId: string, date: Date = new Date()): Promise<CareSummary> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const [careRecipient, timelineEntries, medicationLogs, appointments, shifts] =
      await Promise.all([
        this.prisma.careRecipient.findUnique({
          where: { id: careRecipientId },
          select: { fullName: true, preferredName: true, conditions: true },
        }),
        this.prisma.timelineEntry.findMany({
          where: { careRecipientId, occurredAt: { gte: dayStart, lte: dayEnd } },
          orderBy: { occurredAt: 'asc' },
          include: { createdBy: { select: { fullName: true } } },
        }),
        this.prisma.medicationLog.findMany({
          where: {
            medication: { careRecipientId },
            scheduledTime: { gte: dayStart, lte: dayEnd },
          },
          include: {
            medication: { select: { name: true, dosage: true } },
            givenBy: { select: { fullName: true } },
          },
        }),
        this.prisma.appointment.findMany({
          where: { careRecipientId, startTime: { gte: dayStart, lte: dayEnd } },
          include: { doctor: { select: { name: true, specialty: true } } },
        }),
        this.prisma.caregiverShift.findMany({
          where: { careRecipientId, startTime: { gte: dayStart, lte: dayEnd } },
          include: { caregiver: { select: { fullName: true } } },
        }),
      ]);

    const name = careRecipient?.preferredName || careRecipient?.fullName || 'the care recipient';
    const dateStr = format(date, 'MMMM d, yyyy');

    // Build context for the LLM
    const context = this.buildDayContext(name, dateStr, timelineEntries, medicationLogs, appointments, shifts);

    // Calculate medication stats
    const medStats = {
      total: medicationLogs.length,
      given: medicationLogs.filter((l) => l.status === 'GIVEN').length,
      missed: medicationLogs.filter((l) => l.status === 'MISSED').length,
      skipped: medicationLogs.filter((l) => l.status === 'SKIPPED').length,
    };

    if (!this.geminiService.enabled) {
      return {
        summary: `Daily summary for ${name} on ${dateStr}: ${medStats.given}/${medStats.total} medications given, ${timelineEntries.length} timeline entries, ${appointments.length} appointments.`,
        highlights: [],
        concerns: [],
        medications: medStats,
        period: dateStr,
        generatedAt: new Date().toISOString(),
      };
    }

    const systemPrompt = `You are CareCircle AI, a compassionate care summary assistant. Generate a warm, clear daily care summary for a family caregiver. Use plain language. Be concise but thorough. Focus on what matters most: medication adherence, health changes, and anything that needs attention.`;

    const prompt = `Generate a daily care summary for ${name} on ${dateStr}.

${context}

Respond in this JSON format:
{
  "summary": "A 2-3 sentence overview of the day",
  "highlights": ["Array of positive things that happened"],
  "concerns": ["Array of things that need attention or follow-up"]
}`;

    try {
      const result = await this.geminiService.generateStructuredOutput<{
        summary: string;
        highlights: string[];
        concerns: string[];
      }>(prompt, {
        summary: { type: 'STRING', description: 'A 2-3 sentence overview' },
        highlights: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Positive things',
        },
        concerns: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Things needing attention',
        },
      }, systemPrompt);

      return {
        ...result,
        medications: medStats,
        period: dateStr,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to generate daily summary');
      return {
        summary: `Daily summary for ${name} on ${dateStr}: ${medStats.given}/${medStats.total} medications given, ${timelineEntries.length} timeline entries.`,
        highlights: [],
        concerns: [],
        medications: medStats,
        period: dateStr,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  async generateWeeklySummary(careRecipientId: string, date: Date = new Date()): Promise<CareSummary> {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

    const [careRecipient, timelineEntries, medicationLogs, appointments] = await Promise.all([
      this.prisma.careRecipient.findUnique({
        where: { id: careRecipientId },
        select: { fullName: true, preferredName: true },
      }),
      this.prisma.timelineEntry.findMany({
        where: { careRecipientId, occurredAt: { gte: weekStart, lte: weekEnd } },
        orderBy: { occurredAt: 'asc' },
      }),
      this.prisma.medicationLog.findMany({
        where: {
          medication: { careRecipientId },
          scheduledTime: { gte: weekStart, lte: weekEnd },
        },
      }),
      this.prisma.appointment.findMany({
        where: { careRecipientId, startTime: { gte: weekStart, lte: weekEnd } },
        include: { doctor: { select: { name: true, specialty: true } } },
      }),
    ]);

    const name = careRecipient?.preferredName || careRecipient?.fullName || 'the care recipient';
    const periodStr = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

    const medStats = {
      total: medicationLogs.length,
      given: medicationLogs.filter((l) => l.status === 'GIVEN').length,
      missed: medicationLogs.filter((l) => l.status === 'MISSED').length,
      skipped: medicationLogs.filter((l) => l.status === 'SKIPPED').length,
    };

    if (!this.geminiService.enabled) {
      return {
        summary: `Weekly summary for ${name} (${periodStr}): ${medStats.given}/${medStats.total} medications given, ${timelineEntries.length} timeline entries, ${appointments.length} appointments.`,
        highlights: [],
        concerns: [],
        medications: medStats,
        period: periodStr,
        generatedAt: new Date().toISOString(),
      };
    }

    const adherenceRate = medStats.total > 0
      ? Math.round((medStats.given / medStats.total) * 100)
      : 100;

    const prompt = `Generate a weekly care summary for ${name} for the week of ${periodStr}.

Data:
- ${timelineEntries.length} timeline entries logged
- Medication adherence: ${adherenceRate}% (${medStats.given} given, ${medStats.missed} missed, ${medStats.skipped} skipped out of ${medStats.total})
- ${appointments.length} appointments${appointments.length > 0 ? ': ' + appointments.map((a) => `${a.title} with ${a.doctor?.name || 'doctor'}`).join(', ') : ''}
- Incident count: ${timelineEntries.filter((e) => e.type === 'INCIDENT').length}
- Vitals logged: ${timelineEntries.filter((e) => e.type === 'VITALS').length} times

Respond in JSON:
{
  "summary": "A 3-4 sentence weekly overview",
  "highlights": ["Positive trends or events"],
  "concerns": ["Things needing attention"]
}`;

    try {
      const result = await this.geminiService.generateStructuredOutput<{
        summary: string;
        highlights: string[];
        concerns: string[];
      }>(prompt, {
        summary: { type: 'STRING' },
        highlights: { type: 'ARRAY', items: { type: 'STRING' } },
        concerns: { type: 'ARRAY', items: { type: 'STRING' } },
      }, 'You are CareCircle AI, a compassionate care summary assistant for family caregivers.');

      return {
        ...result,
        medications: medStats,
        period: periodStr,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to generate weekly summary');
      return {
        summary: `Weekly summary for ${name} (${periodStr}).`,
        highlights: [],
        concerns: [],
        medications: medStats,
        period: periodStr,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  private buildDayContext(
    name: string,
    dateStr: string,
    timelineEntries: any[],
    medicationLogs: any[],
    appointments: any[],
    shifts: any[],
  ): string {
    const parts: string[] = [];

    if (timelineEntries.length > 0) {
      parts.push(`Timeline entries (${timelineEntries.length}):`);
      for (const entry of timelineEntries.slice(0, 20)) {
        const time = format(new Date(entry.occurredAt), 'h:mm a');
        parts.push(`  - [${time}] ${entry.type}: ${entry.title}${entry.description ? ' — ' + entry.description.slice(0, 100) : ''}`);
      }
    }

    if (medicationLogs.length > 0) {
      const given = medicationLogs.filter((l) => l.status === 'GIVEN').length;
      const missed = medicationLogs.filter((l) => l.status === 'MISSED').length;
      parts.push(`\nMedications: ${given} given, ${missed} missed out of ${medicationLogs.length} scheduled`);
      for (const log of medicationLogs.slice(0, 15)) {
        parts.push(`  - ${log.medication?.name} ${log.medication?.dosage}: ${log.status}${log.givenBy ? ' by ' + log.givenBy.fullName : ''}`);
      }
    }

    if (appointments.length > 0) {
      parts.push(`\nAppointments (${appointments.length}):`);
      for (const apt of appointments) {
        parts.push(`  - ${apt.title} with ${apt.doctor?.name || 'doctor'} (${apt.status})`);
      }
    }

    if (shifts.length > 0) {
      parts.push(`\nCaregiver shifts (${shifts.length}):`);
      for (const shift of shifts) {
        const caregiver = shift.caregiver?.fullName || 'Caregiver';
        parts.push(`  - ${caregiver}: ${shift.status}${shift.checkedInAt ? ' (checked in)' : ''}`);
      }
    }

    if (parts.length === 0) {
      parts.push('No activity was recorded today.');
    }

    return parts.join('\n');
  }
}
