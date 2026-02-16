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
    staleTime: 30 * 60 * 1000, // 30 minutes — avoid hitting Gemini on every page visit
    gcTime: 60 * 60 * 1000, // 1 hour cache
    retry: 1,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

export function useWeeklySummary(careRecipientId: string | undefined, date?: string) {
  return useQuery<CareSummary>({
    queryKey: ['ai', 'summary', 'weekly', careRecipientId, date],
    queryFn: () => getWeeklySummary(careRecipientId!, date),
    enabled: !!careRecipientId,
    staleTime: 60 * 60 * 1000, // 1 hour — weekly data doesn't change often
    gcTime: 2 * 60 * 60 * 1000, // 2 hour cache
    retry: 1,
    refetchOnMount: false,
    refetchOnReconnect: false,
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
