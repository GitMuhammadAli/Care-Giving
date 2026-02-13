'use client';

import { useState, useRef, useEffect } from 'react';
import { useAskAI } from '@/hooks/use-ai';
import type { RagAnswer } from '@/lib/api/ai';
import {
  Sparkles,
  Send,
  Loader2,
  X,
  FileText,
  Pill,
  Calendar,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AskAiPanelProps {
  careRecipientId: string;
  careRecipientName?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: RagAnswer['sources'];
  timestamp: Date;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  timeline_entry: <Clock className="w-3 h-3" />,
  medication: <Pill className="w-3 h-3" />,
  appointment: <Calendar className="w-3 h-3" />,
  document: <FileText className="w-3 h-3" />,
};

const SUGGESTED_QUESTIONS = [
  'How has medication adherence been this week?',
  'Were there any concerning symptoms recently?',
  'What happened at the last doctor appointment?',
  'How has mood and activity been trending?',
];

export function AskAiPanel({
  careRecipientId,
  careRecipientName,
  isOpen,
  onClose,
}: AskAiPanelProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const askMutation = useAskAI();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (question?: string) => {
    const q = question || input.trim();
    if (!q) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      const result = await askMutation.mutateAsync({
        question: q,
        careRecipientId,
      });

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right duration-300 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sage/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-sage" />
            </div>
            <div>
              <h3 className="font-medium text-sm text-foreground">Ask CareCircle AI</h3>
              <p className="text-[11px] text-muted-foreground">
                {careRecipientName
                  ? `About ${careRecipientName}'s care`
                  : 'Questions about care history'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles className="w-10 h-10 text-sage/30 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                Ask about care history
              </p>
              <p className="text-xs text-muted-foreground mb-6 max-w-[250px]">
                I can answer questions about medications, appointments, timeline entries, and more.
              </p>

              {/* Suggested questions */}
              <div className="space-y-2 w-full">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSubmit(q)}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-3 sm:px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-sage text-white'
                        : 'bg-muted/50 text-foreground border border-border'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground mb-1 font-medium">
                          Sources
                        </p>
                        <div className="space-y-1">
                          {msg.sources.map((src, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                            >
                              {SOURCE_ICONS[src.type] || <FileText className="w-3 h-3" />}
                              <span className="truncate">{src.title}</span>
                              <span className="flex-shrink-0">
                                {new Date(src.date).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {askMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 rounded-2xl px-4 py-3 border border-border">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sage" />
                      <span className="text-xs text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 min-w-0 bg-muted/50 rounded-xl px-3 sm:px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-border"
              disabled={askMutation.isPending}
              maxLength={500}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || askMutation.isPending}
              className="bg-sage hover:bg-sage-600 text-white rounded-xl h-10 w-10 p-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
