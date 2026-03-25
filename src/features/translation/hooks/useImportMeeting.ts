'use client';

import { useState, useCallback } from 'react';
import { meetingApi } from '@/features/meetings/api/meetingApi';
import { encryptAudio, uploadAudioChunked } from '../helpers/audioUpload';
import { parseXlsxTranscript } from '../helpers/parseXlsxTranscript';
import type { TranscriptEntry } from '@/types/transcript.types';

export type ImportStatus = 'idle' | 'uploading' | 'transcribing' | 'saving' | 'done' | 'error';

export interface UseImportMeetingOptions {
  meetingId: string;
  getDataKey: () => Promise<CryptoKey | null>;
  /** Called once the data key is resolved — lets parent cache it for AudioPlayer */
  onDataKey?: (key: CryptoKey) => void;
  /** Replace transcript entries in the parent transcript hook */
  replaceEntries: (entries: TranscriptEntry[]) => void;
  /** Save transcript to server */
  saveTranscript: (getKey: () => Promise<CryptoKey | null>) => Promise<number>;
  /** Current in-memory entries count — used to decide whether to save */
  entriesCount: () => number;
  clearInterim: () => void;
  /** Start Soniox from a File (returns when WS closes) */
  startFromFile: (file: File) => Promise<void>;
  onComplete: () => void;
  onError: (msg: string) => void;
}

export interface ImportPayload {
  audioFile?: File;
  xlsxArrayBuffer?: ArrayBuffer;
}

/**
 * useImportMeeting — encapsulates the entire import-meeting background job.
 *
 * Phases:
 *   1. XLSX  → parse + stream entries in batches
 *   2. Audio → encrypt + chunked upload (with % progress)
 *   3. Audio-only → re-transcribe via Soniox (entries arrive in real-time)
 *   4. Save  → persist transcript to server
 */
export function useImportMeeting({
  meetingId,
  getDataKey,
  onDataKey,
  replaceEntries,
  saveTranscript,
  entriesCount,
  clearInterim,
  startFromFile,
  onComplete,
  onError,
}: UseImportMeetingOptions) {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [progress, setProgress] = useState('');

  const isImporting = status !== 'idle' && status !== 'done' && status !== 'error';

  const run = useCallback(
    ({ audioFile, xlsxArrayBuffer }: ImportPayload) => {
      // Fire-and-forget — state drives the UI
      (async () => {
        try {
          const dataKey = await getDataKey();
          if (!dataKey) throw new Error('Encryption key not available');
          onDataKey?.(dataKey);

          // Phase 1 — XLSX transcript (streamed in batches)
          if (xlsxArrayBuffer) {
            setStatus('transcribing');
            setProgress('Đang load transcript...');
            const allEntries = parseXlsxTranscript(xlsxArrayBuffer, meetingId);
            const BATCH = 20;
            for (let i = 0; i < allEntries.length; i += BATCH) {
              replaceEntries(allEntries.slice(0, i + BATCH));
              setProgress(`Đang load transcript… ${Math.min(i + BATCH, allEntries.length)} / ${allEntries.length}`);
              await new Promise((r) => setTimeout(r, 30)); // yield to React
            }
          }

          // Phase 2 — Audio upload
          if (audioFile) {
            setStatus('uploading');
            const totalMB = (audioFile.size / 1024 / 1024).toFixed(1);
            setProgress(`Đang upload audio (${totalMB} MB)…`);
            const encrypted = await encryptAudio(audioFile, dataKey);
            await uploadAudioChunked(meetingId, encrypted, ({ pct }) => {
              setProgress(`Đang upload audio… ${pct}%`);
            });
          }

          // Phase 3 — Audio-only: re-transcribe (entries arrive in real-time via Soniox)
          if (audioFile && !xlsxArrayBuffer) {
            setStatus('transcribing');
            setProgress('Đang phân tích audio qua Soniox…');
            await startFromFile(audioFile);
            clearInterim();
          }

          // Phase 4 — Persist transcript
          if (entriesCount() > 0 || xlsxArrayBuffer) {
            setStatus('saving');
            setProgress('Đang lưu transcript…');
            await saveTranscript(() => Promise.resolve(dataKey));
          }

          await meetingApi.update(meetingId, { status: 'completed' });
          setStatus('done');
          setProgress('');
          onComplete();
        } catch (e) {
          setStatus('error');
          setProgress('');
          onError(e instanceof Error ? e.message : 'Import thất bại');
        }
      })();
    },
    [meetingId, getDataKey, onDataKey, replaceEntries, saveTranscript, entriesCount, clearInterim, startFromFile, onComplete, onError],
  );

  return { status, progress, isImporting, run };
}
