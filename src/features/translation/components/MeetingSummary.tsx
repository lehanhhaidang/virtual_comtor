'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Pin,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { encrypt, decrypt } from '@/lib/crypto';
import type { TranscriptEntry } from '@/types/transcript.types';
import type { ApiResponse } from '@/types/api.types';

interface MeetingSummaryData {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}

interface MeetingSummaryProps {
  meetingId: string;
  entries: TranscriptEntry[];
  dataKey: CryptoKey | null;
}

/**
 * MeetingSummary — AI-generated meeting summary with E2EE.
 * Loads existing encrypted summary or generates a new one via OpenAI.
 */
export function MeetingSummary({ meetingId, entries, dataKey }: MeetingSummaryProps) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<MeetingSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  // Load existing encrypted summary on mount
  useEffect(() => {
    let cancelled = false;
    const loadExisting = async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/summary`);
        const json: ApiResponse<{ encryptedSummary: string | null }> = await res.json();

        if (!json.success || cancelled) return;

        const encrypted = json.data.encryptedSummary;
        if (encrypted && dataKey) {
          const decrypted = await decrypt(encrypted, dataKey);
          const parsed: MeetingSummaryData = JSON.parse(decrypted);
          if (!cancelled) setData(parsed);
        }
      } catch {
        // No existing summary — that's fine
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };

    loadExisting();
    return () => { cancelled = true; };
  }, [meetingId, dataKey]);

  /**
   * Generate summary: send decrypted transcript → OpenAI → encrypt result → save.
   */
  const handleGenerate = useCallback(async () => {
    if (!dataKey || entries.length === 0) return;

    setLoading(true);
    setError('');

    try {
      // Build plaintext transcript for OpenAI
      const transcript = entries
        .map((e) => `[${e.speakerLabel}] ${e.originalText}${e.translatedText ? ` (${e.translatedText})` : ''}`)
        .join('\n');

      // Generate via OpenAI
      const genRes = await fetch(`/api/meetings/${meetingId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, language: locale }),
      });

      const genJson: ApiResponse<MeetingSummaryData> = await genRes.json();
      if (!genJson.success) throw new Error(genJson.message);

      const summaryData = genJson.data;

      // Encrypt and save
      const encrypted = await encrypt(JSON.stringify(summaryData), dataKey);
      await fetch(`/api/meetings/${meetingId}/summary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encryptedSummary: encrypted }),
      });

      setData(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  }, [meetingId, entries, dataKey, locale]);

  // Don't render if no entries
  if (entries.length === 0) return null;

  // Still loading existing summary
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No summary yet — show generate button
  if (!data && !loading) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/40 p-6">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Sparkles className="h-8 w-8 text-primary/50" />
          <p className="text-sm text-muted-foreground">
            {t.meeting.generateSummaryHint ?? 'Use AI to generate a meeting summary'}
          </p>
          <Button
            onClick={handleGenerate}
            disabled={!dataKey}
            className="gap-2 rounded-xl"
          >
            <Sparkles className="h-4 w-4" />
            {t.meeting.generateSummary ?? 'Generate Summary'}
          </Button>

          {error && (
            <p className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/40 p-6">
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {t.meeting.generatingSummary ?? 'Generating summary...'}
          </p>
        </div>
      </div>
    );
  }

  // Show summary
  return (
    <div className="space-y-4 rounded-2xl border border-border/30 bg-card/40 p-5 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <FileText className="h-4 w-4 text-primary" />
          {t.meeting.summary ?? 'Meeting Summary'}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={loading}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t.meeting.regenerateSummary ?? 'Regenerate'}
        </Button>
      </div>

      {/* Summary text */}
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {data!.summary}
      </p>

      {/* Key Points */}
      {data!.keyPoints.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Pin className="h-3.5 w-3.5 text-primary" />
            {t.meeting.keyPoints ?? 'Key Points'}
          </h3>
          <ul className="space-y-1.5">
            {data!.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {data!.actionItems.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-vietnamese" />
            {t.meeting.actionItems ?? 'Action Items'}
          </h3>
          <ul className="space-y-1.5">
            {data!.actionItems.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/80">
                <span className="mt-1 shrink-0">☐</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}
    </div>
  );
}

export default MeetingSummary;
