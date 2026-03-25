import * as XLSX from 'xlsx';
import type { TranscriptEntry } from '@/types/transcript.types';

function parseTimeToMs(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const parts = value.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 2) {
    const [m, s] = parts;
    return ((m * 60 + s) * 1000) | 0;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return ((h * 3600 + m * 60 + s) * 1000) | 0;
  }
  return 0;
}

/**
 * Parse a transcript XLSX buffer (exported from Virtual Comtor).
 * Columns: Time, Speaker, Language, Original, Translation
 */
export function parseXlsxTranscript(buffer: ArrayBuffer, meetingId: string): TranscriptEntry[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  let idCounter = 0;
  return rows
    .map((r) => {
      const startMs = parseTimeToMs(r.Time);
      const speakerLabel = String(r.Speaker ?? '').trim() || 'Speaker';
      const languageRaw = String(r.Language ?? 'ja').trim();
      const language = languageRaw === 'vi' ? 'vi' : 'ja';
      const originalText = String(r.Original ?? '').trim();
      const translatedText = String(r.Translation ?? '').trim();
      if (!originalText && !translatedText) return null;

      const entry: TranscriptEntry = {
        id: `import-${++idCounter}`,
        meetingId,
        speakerId: speakerLabel,
        speakerLabel,
        speakerNumber: 0,
        language,
        originalText,
        translatedText,
        startMs,
        endMs: startMs,
        confidence: 0.9,
        isReply: false,
        createdAt: new Date().toISOString(),
      };
      return entry;
    })
    .filter((x): x is TranscriptEntry => Boolean(x));
}
