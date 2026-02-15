import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';

export interface ParsedTimelineEntry {
  type: string;
  title: string;
  description: string;
  severity: string;
  vitals?: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    oxygenLevel?: number;
    bloodSugar?: number;
    weight?: number;
  };
  occurredAt?: string;
}

@Injectable()
export class SmartEntryService {
  private readonly logger = new Logger(SmartEntryService.name);

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Parse natural language caregiver note into a structured timeline entry.
   */
  async parseNaturalLanguage(text: string): Promise<ParsedTimelineEntry> {
    if (!this.geminiService.enabled) {
      // Fallback: create a basic NOTE entry when AI is not configured
      return {
        type: 'NOTE',
        title: text.slice(0, 100),
        description: text,
        severity: 'LOW',
      };
    }

    const systemPrompt = `You are a caregiving assistant that parses caregiver notes into structured timeline entries.

Entry types: NOTE, VITALS, SYMPTOM, INCIDENT, MOOD, MEAL, ACTIVITY, SLEEP, BATHROOM, MEDICATION_CHANGE, APPOINTMENT_SUMMARY, OTHER
Severity levels: LOW, MEDIUM, HIGH, CRITICAL

Rules:
- Extract vitals only if explicitly mentioned (blood pressure, heart rate, temperature, oxygen level, blood sugar, weight)
- Default severity to LOW unless the note describes concerning symptoms, falls, or emergencies
- Set severity to HIGH or CRITICAL for falls, breathing issues, chest pain, confusion, or similar urgent concerns
- Title should be a concise 5-10 word summary
- Description should preserve the original note's meaning`;

    const prompt = `Parse this caregiver note into a structured timeline entry:

"${text}"`;

    try {
      const result = await this.geminiService.generateStructuredOutput<ParsedTimelineEntry>(
        prompt,
        {
          type: { type: 'STRING', description: 'Timeline entry type' },
          title: { type: 'STRING', description: 'Concise 5-10 word title' },
          description: { type: 'STRING', description: 'Full description' },
          severity: { type: 'STRING', description: 'LOW, MEDIUM, HIGH, or CRITICAL' },
          vitals: {
            type: 'OBJECT',
            description: 'Extracted vitals (only if mentioned)',
            properties: {
              bloodPressureSystolic: { type: 'NUMBER', nullable: true },
              bloodPressureDiastolic: { type: 'NUMBER', nullable: true },
              heartRate: { type: 'NUMBER', nullable: true },
              temperature: { type: 'NUMBER', nullable: true },
              oxygenLevel: { type: 'NUMBER', nullable: true },
              bloodSugar: { type: 'NUMBER', nullable: true },
              weight: { type: 'NUMBER', nullable: true },
            },
            nullable: true,
          },
        },
        systemPrompt,
      );

      // Clean up: remove vitals object if all values are null/undefined
      if (result.vitals) {
        const hasValues = Object.values(result.vitals).some(
          (v) => v !== null && v !== undefined && v !== 0,
        );
        if (!hasValues) {
          delete result.vitals;
        }
      }

      return result;
    } catch (error) {
      this.logger.error({ error }, 'Failed to parse natural language entry — falling back to NOTE');
      return {
        type: 'NOTE',
        title: text.slice(0, 100),
        description: text,
        severity: 'LOW',
      };
    }
  }
}
