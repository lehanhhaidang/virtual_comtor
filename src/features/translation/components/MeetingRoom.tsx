'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wifi, WifiOff, AlertCircle, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { useSonioxRealtime } from '../hooks/useSonioxRealtime';
import { useTranscript } from '../hooks/useTranscript';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { exportToXLSX } from '../helpers/exportTranscript';
import { TranscriptPanel } from './TranscriptPanel';
import { MeetingControls } from './MeetingControls';
import { MeetingSummary } from './MeetingSummary';
import { AudioPlayer } from './AudioPlayer';
import { ImportMeetingDialog } from './ImportMeetingDialog';
import { meetingApi } from '@/features/meetings/api/meetingApi';
import { useAuth } from '@/features/auth/hooks/useAuth';
import * as XLSX from 'xlsx';
import type { TranscriptEntry } from '@/types/transcript.types';

interface MeetingRoomProps {
  meetingId: string;
  meetingTitle: string;
  projectId?: string;
  mode?: 'standard' | 'private';
}

const STATUS_COLORS = {
  disconnected: 'text-muted-foreground',
  connecting: 'text-yellow-500',
  connected: 'text-vietnamese',
  error: 'text-destructive',
} as const;

/**
 * MeetingRoom — main translation interface.
 * Composes MeetingControls + TranscriptPanel with Soniox real-time STT.
 */
export function MeetingRoom({ meetingId, meetingTitle, projectId, mode = 'standard' }: MeetingRoomProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { getDataKey } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [dataKeyRef, setDataKeyRef] = useState<CryptoKey | null>(null);
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);
  // Import background job state
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'transcribing' | 'saving' | 'done' | 'error'>('idle');
  const [importProgress, setImportProgress] = useState('');
  const isImporting = importStatus !== 'idle' && importStatus !== 'done' && importStatus !== 'error';
  // Audio playback sync (post-meeting)
  const [currentMs, setCurrentMs] = useState(0);
  const seekToRef = useRef<((ms: number) => void) | null>(null);

  const transcript = useTranscript(meetingId);
  const { isRecording, duration, hasRecording, startRecording, stopRecording, downloadRecording, waitForBlob } = useAudioRecorder();

  const soniox = useSonioxRealtime({
    onFinalTokens: transcript.addEntry,
    onInterimTokens: transcript.updateInterim,
    onTranslationOnly: transcript.updateLastTranslation,
    onError: (err) => setError(err),
  });

  const statusLabels = useMemo(() => ({
    disconnected: t.meeting.disconnected,
    connecting: t.meeting.connecting,
    connected: t.meeting.connected,
    error: t.common.error,
  }), [t]);

  const encryptAudioToBytes = useCallback(async (blob: Blob, dataKey: CryptoKey) => {
    const arrayBuffer = await blob.arrayBuffer();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dataKey, arrayBuffer);
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    return combined;
  }, []);

  const parseImportedXlsx = useCallback((buffer: ArrayBuffer): TranscriptEntry[] => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const parseTimeToMs = (value: unknown): number => {
      if (typeof value !== 'string') return 0;
      const parts = value.split(':').map((p) => Number(p));
      if (parts.some((n) => Number.isNaN(n))) return 0;
      if (parts.length === 2) {
        const [m, s] = parts;
        return ((m * 60 + s) * 1000) | 0;
      }
      if (parts.length === 3) {
        const [h, m, s] = parts;
        return ((h * 3600 + m * 60 + s) * 1000) | 0;
      }
      return 0;
    };

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
  }, [meetingId]);

  /**
   * Start meeting — update status in DB and begin transcription.
   */
  const handleStart = useCallback(async () => {
    setError('');
    setIsActive(true);
    await soniox.start();
  }, [soniox]);

  // Only start recording when in live mic mode (stream exists)
  useEffect(() => {
    if (isActive && soniox.stream && !isRecording) {
      startRecording(soniox.stream);
    }
  }, [isActive, soniox.stream, isRecording, startRecording]);

  const handlePause = useCallback(() => {
    soniox.stop();
    setIsPaused(true);
  }, [soniox]);

  const handleResume = useCallback(async () => {
    setIsPaused(false);
    await soniox.start();
  }, [soniox]);

  /**
   * Stop meeting — stop transcription, stop recording, save encrypted transcript + audio,
   * and update status in DB.
   */
  const handleStop = useCallback(async () => {
    soniox.stop();
    stopRecording();
    transcript.clearInterim();
    setIsActive(false);

    if (mode === 'standard') {
      try {
        const dataKey = await getDataKey();
        if (!dataKey) {
          setError('Encryption key not available. Data was not saved.');
          await meetingApi.update(meetingId, { status: 'completed' });
          setIsEnded(true);
          return;
        }
        setDataKeyRef(dataKey);

        // Save transcript (encrypted)
        await transcript.saveToServer(() => Promise.resolve(dataKey));

        // Wait for MediaRecorder.onstop to fire and blob to finalize
        const blob = await waitForBlob();

        if (blob && blob.size > 0) {
          const combined = await encryptAudioToBytes(blob, dataKey);
          // Chunked upload
          const CHUNK_SIZE = 5 * 1024 * 1024;
          let offset = 0;
          while (offset < combined.length) {
            const end = Math.min(combined.length, offset + CHUNK_SIZE);
            const chunk = combined.slice(offset, end);
            const isFinal = end >= combined.length;
            const res = await fetch(`/api/meetings/${meetingId}/audio/chunk`, {
              method: 'POST',
              headers: {
                'x-upload-offset': String(offset),
                'x-upload-final': isFinal ? '1' : '0',
              },
              body: chunk,
            });
            if (!res.ok) throw new Error(`Audio upload failed (${res.status})`);
            offset = end;
          }
        }
      } catch {
        setError('Failed to save meeting data.');
      }
    }

    await meetingApi.update(meetingId, { status: 'completed' });
    setIsEnded(true);
  }, [meetingId, soniox, stopRecording, waitForBlob, transcript, mode, getDataKey, encryptAudioToBytes]);

  /**
   * Navigate back; prompts confirmation when a meeting is active.
   */
  const handleBack = useCallback(() => {
    if (isActive) {
      if (!confirm(t.meeting.confirmLeave)) return;
      soniox.stop();
    }
    router.push(projectId ? `/projects/${projectId}` : '/projects');
  }, [isActive, soniox, projectId, router, t]);

  return (
    <div className="flex h-[100dvh] flex-col gap-2 lg:h-[calc(100vh-4rem)] lg:gap-4">
      {/* Top bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <h1 className="text-lg font-bold">{meetingTitle}</h1>
            <span className={`flex items-center gap-1 text-xs ${STATUS_COLORS[soniox.state]}`}>
              {soniox.state === 'connected' ? (
                <Wifi className="h-3 w-3" />
              ) : soniox.state === 'error' ? (
                <AlertCircle className="h-3 w-3" />
              ) : soniox.state === 'connecting' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {statusLabels[soniox.state]}
            </span>
          </div>
        </div>

        <MeetingControls
          isActive={isActive}
          isPaused={isPaused}
          isEnded={isEnded}
          connectionState={soniox.state}
          onStart={handleStart}
          onImport={() => { if (!isImporting) setShowImport(true); }}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      )}

      {/* Import progress banner */}
      {isImporting && (
        <div className="flex items-center gap-3 rounded-xl border border-vietnamese/30 bg-vietnamese/10 px-4 py-3 text-sm text-vietnamese">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span className="flex-1 truncate">{importProgress || 'Đang import...'}</span>
        </div>
      )}

      <ImportMeetingDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={async ({ audioFile, xlsxArrayBuffer }) => {
          setError('');
          if (isActive) throw new Error('Meeting is active');

          const dataKey = await getDataKey();
          if (!dataKey) throw new Error('Encryption key not available');
          setDataKeyRef(dataKey);

          // Close dialog immediately — run import in background
          setShowImport(false);

          // Run async in background (fire-and-forget, state updates drive UI)
          (async () => {
            try {
              // --- XLSX import: stream entries in small batches so UI updates gradually ---
              if (xlsxArrayBuffer) {
                setImportStatus('transcribing');
                setImportProgress('Đang load transcript...');
                const allEntries = parseImportedXlsx(xlsxArrayBuffer);
                const BATCH = 20;
                for (let i = 0; i < allEntries.length; i += BATCH) {
                  const slice = allEntries.slice(0, i + BATCH);
                  transcript.replaceEntries(slice);
                  setImportProgress(`Đang load transcript… ${Math.min(i + BATCH, allEntries.length)}/${allEntries.length}`);
                  // Yield to React to re-render
                  await new Promise((r) => setTimeout(r, 30));
                }
              }

              // --- Audio upload ---
              if (audioFile) {
                setImportStatus('uploading');
                const totalMB = (audioFile.size / 1024 / 1024).toFixed(1);
                setImportProgress(`Đang upload audio (${totalMB}MB)…`);
                const combined = await encryptAudioToBytes(audioFile, dataKey);

                // Chunked upload with progress
                const CHUNK_SIZE = 5 * 1024 * 1024;
                let offset = 0;
                while (offset < combined.length) {
                  const end = Math.min(combined.length, offset + CHUNK_SIZE);
                  const chunk = combined.slice(offset, end);
                  const isFinal = end >= combined.length;
                  const res = await fetch(`/api/meetings/${meetingId}/audio/chunk`, {
                    method: 'POST',
                    headers: {
                      'x-upload-offset': String(offset),
                      'x-upload-final': isFinal ? '1' : '0',
                    },
                    body: chunk,
                  });
                  if (!res.ok) {
                    const txt = await res.text().catch(() => '');
                    throw new Error(`Audio upload failed (${res.status}) ${txt}`);
                  }
                  offset = end;
                  const pct = Math.round((offset / combined.length) * 100);
                  setImportProgress(`Đang upload audio… ${pct}%`);
                }
              }

              // --- Audio-only: re-transcribe via Soniox (entries stream in real-time) ---
              if (audioFile && !xlsxArrayBuffer) {
                setImportStatus('transcribing');
                setImportProgress('Đang phân tích audio qua Soniox…');
                setIsActive(true);
                await soniox.startFromFile(audioFile);
                setIsActive(false);
                transcript.clearInterim();
              }

              // --- Save transcript to server ---
              if (transcript.entries.length > 0 || xlsxArrayBuffer) {
                setImportStatus('saving');
                setImportProgress('Đang lưu transcript…');
                await transcript.saveToServer(() => Promise.resolve(dataKey));
              }

              await meetingApi.update(meetingId, { status: 'completed' });
              setIsEnded(true);
              setImportStatus('done');
              setImportProgress('');
            } catch (e) {
              setImportStatus('error');
              setImportProgress('');
              setError(e instanceof Error ? e.message : 'Import thất bại');
            }
          })();
        }}
      />

      {/* Export/Recording toolbar */}
      {(isActive || hasRecording || transcript.entries.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/30 bg-card/40 px-3 py-2 lg:px-4">
          {isRecording && (
            <span className="mr-2 text-xs font-medium text-destructive">
              ⏱ {String(Math.floor(duration / 60)).padStart(2, '0')}:
              {String(duration % 60).padStart(2, '0')}
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            disabled={!hasRecording}
            onClick={() => downloadRecording(meetingTitle)}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            {t.meeting.downloadAudio}
          </Button>

          {/* CSV export (commented out)
          <Button
            variant="ghost"
            size="sm"
            disabled={transcript.entries.length === 0}
            onClick={() => exportToCSV(transcript.entries, meetingTitle)}
            className="gap-1.5 text-xs"
          >
            <FileText className="h-3.5 w-3.5" />
            {t.meeting.exportCSV}
          </Button>
          */}

          <Button
            variant="ghost"
            size="sm"
            disabled={transcript.entries.length === 0}
            onClick={() => exportToXLSX(transcript.entries, meetingTitle)}
            className="gap-1.5 text-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {t.meeting.exportXLSX}
          </Button>
        </div>
      )}

      {/* Audio player — shown right above transcript after meeting ends */}
      {isEnded && mode === 'standard' && dataKeyRef && (
        <AudioPlayer
          meetingId={meetingId}
          meetingTitle={meetingTitle}
          dataKey={dataKeyRef}
          onTimeUpdate={setCurrentMs}
          seekRef={seekToRef}
        />
      )}

      {/* Transcript */}
      <div className="flex-1 overflow-hidden">
        <TranscriptPanel
          entries={transcript.entries}
          currentText={transcript.currentText}
          currentSpeaker={transcript.currentSpeaker}
          currentMs={isEnded ? currentMs : 0}
          onSeek={isEnded && seekToRef.current ? (ms) => seekToRef.current!(ms) : undefined}
        />
      </div>

      {/* AI Summary */}
      {isEnded && mode === 'standard' && transcript.entries.length > 0 && (
        <MeetingSummary
          meetingId={meetingId}
          entries={transcript.entries}
          dataKey={dataKeyRef}
        />
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-between rounded-xl border border-border/30 bg-card/40 px-4 py-2 text-xs text-muted-foreground">
        <span>{transcript.entries.length} entries</span>
        <span>
          🇯🇵 {transcript.entries.filter((e) => e.language === 'ja').length} •{' '}
          🇻🇳 {transcript.entries.filter((e) => e.language === 'vi').length}
        </span>
      </div>
    </div>
  );
}

export default MeetingRoom;
