'use client';

interface TranscriptEntry {
  language: string;
}

interface MeetingStatusBarProps {
  entryCount: number;
  entries: TranscriptEntry[];
}

export function MeetingStatusBar({ entryCount, entries }: MeetingStatusBarProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/30 bg-card/40 px-4 py-2 text-xs text-muted-foreground">
      <span>{entryCount} entries</span>
      <span>
        🇯🇵 {entries.filter((e) => e.language === 'ja').length} •{' '}
        🇻🇳 {entries.filter((e) => e.language === 'vi').length}
      </span>
    </div>
  );
}
