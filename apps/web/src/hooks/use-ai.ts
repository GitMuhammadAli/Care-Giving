'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getDailySummary,
  getWeeklySummary,
  parseSmartEntry,
  askAI,
  type CareSummary,
  type ParsedTimelineEntry,
  type RagAnswer,
} from '@/lib/api/ai';

// ═══════════════════════════════════════════════════════════════
// CARE SUMMARIES
// ═══════════════════════════════════════════════════════════════

export function useDailySummary(careRecipientId: string | undefined, date?: string) {
  return useQuery<CareSummary>({
    queryKey: ['ai', 'summary', 'daily', careRecipientId, date],
    queryFn: () => getDailySummary(careRecipientId!, date),
    enabled: !!careRecipientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useWeeklySummary(careRecipientId: string | undefined, date?: string) {
  return useQuery<CareSummary>({
    queryKey: ['ai', 'summary', 'weekly', careRecipientId, date],
    queryFn: () => getWeeklySummary(careRecipientId!, date),
    enabled: !!careRecipientId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}

// ═══════════════════════════════════════════════════════════════
// SMART DATA ENTRY
// ═══════════════════════════════════════════════════════════════

export function useSmartEntryParse() {
  return useMutation<ParsedTimelineEntry, Error, string>({
    mutationFn: (text: string) => parseSmartEntry(text),
  });
}

// ═══════════════════════════════════════════════════════════════
// RAG - ASK QUESTIONS
// ═══════════════════════════════════════════════════════════════

export function useAskAI() {
  return useMutation<RagAnswer, Error, { question: string; careRecipientId: string }>({
    mutationFn: ({ question, careRecipientId }) => askAI(question, careRecipientId),
  });
}
