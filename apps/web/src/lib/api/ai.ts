import { api } from './client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CareSummary {
  summary: string;
  highlights: string[];
  concerns: string[];
  medications: {
    total: number;
    given: number;
    missed: number;
    skipped: number;
  };
  period: string;
  generatedAt: string;
}

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

export interface RagAnswer {
  answer: string;
  sources: {
    type: string;
    title: string;
    date: string;
    id: string;
    similarity: number;
  }[];
}

// ═══════════════════════════════════════════════════════════════
// CARE SUMMARIES
// ═══════════════════════════════════════════════════════════════

export async function getDailySummary(
  careRecipientId: string,
  date?: string,
): Promise<CareSummary> {
  const params = date ? `?date=${date}` : '';
  return api.get<CareSummary>(`/ai/summary/daily/${careRecipientId}${params}`);
}

export async function getWeeklySummary(
  careRecipientId: string,
  date?: string,
): Promise<CareSummary> {
  const params = date ? `?date=${date}` : '';
  return api.get<CareSummary>(`/ai/summary/weekly/${careRecipientId}${params}`);
}

// ═══════════════════════════════════════════════════════════════
// SMART DATA ENTRY
// ═══════════════════════════════════════════════════════════════

export async function parseSmartEntry(text: string): Promise<ParsedTimelineEntry> {
  return api.post<ParsedTimelineEntry>('/ai/smart-entry/parse', { text });
}

// ═══════════════════════════════════════════════════════════════
// RAG - ASK QUESTIONS
// ═══════════════════════════════════════════════════════════════

export async function askAI(
  question: string,
  careRecipientId: string,
): Promise<RagAnswer> {
  return api.post<RagAnswer>('/ai/ask', { question, careRecipientId });
}
