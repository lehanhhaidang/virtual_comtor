'use client';

import type { TranscriptEntry } from '@/types/transcript.types';
import { SpeakerBadge } from './SpeakerBadge';
import { LanguageBadge } from './LanguageBadge';

interface TranscriptEntryItemProps {
  /** Finalized transcript entry to render. */
  entry: TranscriptEntry;
}

/**
 * Format milliseconds to mm:ss string.
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * TranscriptEntryItem — renders a single finalized transcript line.
 *
 * Shows:
 * - Language flag badge (🇯🇵 / 🇻🇳)
 * - Speaker badge with color coded by language group
 * - Timestamp
 * - Original text (colored by language)
 * - Translation (when available)
 */
export function TranscriptEntryItem({ entry }: TranscriptEntryItemProps) {
  const isJapanese = entry.language === 'ja';
  const textColor = isJapanese ? 'text-japanese' : 'text-vietnamese';
  const timeStr = formatTime(entry.startMs);

  return (
    <div className="group rounded-xl px-4 py-3 transition-colors hover:bg-background/30">
      {/* Speaker header: flag + label + time */}
      <div className="mb-1 flex items-center gap-2">
        <LanguageBadge language={entry.language} />
        <SpeakerBadge
          label={entry.speakerLabel}
          language={entry.language}
          sonioxSpeakerId={entry.speakerId}
        />
        <span className="text-[10px] text-muted-foreground/50">{timeStr}</span>
      </div>

      {/* Original text */}
      <p className={`text-sm font-medium ${textColor}`}>{entry.originalText}</p>

      {/* Translation */}
      {entry.translatedText && (
        <p className="mt-1 text-sm text-muted-foreground">
          → {entry.translatedText}
        </p>
      )}
    </div>
  );
}

export default TranscriptEntryItem;
