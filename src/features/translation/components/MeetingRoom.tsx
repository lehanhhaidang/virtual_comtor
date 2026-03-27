'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wifi, WifiOff, AlertCircle, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { meetingApi } from '@/features/meetings/api/meetingApi';
import { useSonioxRealtime } from '../hooks/useSonioxRealtime';
import { useTranscript } from '../hooks/useTranscript';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useImportMeeting } from '../hooks/useImportMeeting';
import { encryptAudio, uploadAudioChunked } from '../helpers/audioUpload';
import { exportToXLSX } from '../helpers/exportTranscript';
import { AudioPlayer } from './AudioPlayer';
import { ImportMeetingDialog } from './ImportMeetingDialog';
import { MeetingControls } from './MeetingControls';
import { MeetingSummary } from './MeetingSummary';
import { TranscriptPanel } from './TranscriptPanel';

// ---------------------------------------------------------------------------

interface MeetingRoomProps {
  meetingId: string;
  meetingTitle: string;
  projectId?: string;
  mode?: 'standard' | 'private';
  languagePairId?: string;
}

const CONNECTION_STATUS_COLORS = {
  disconnected: 'text-muted-foreground',
  connecting: 'text-yellow-500',
  connected: 'text-vietnamese',
  error: 'text-destructive',
} as const;

// ---------------------------------------------------------------------------

/**
 * MeetingRoom — main translation interface.
 *
 * Responsibilities:
 *   - Compose hooks: Soniox STT, transcript, audio recorder, meeting import
 *   - Wire UI: controls, transcript panel, audio player, AI summary
 *
 * Heavy logic lives in:
 *   - useSonioxRealtime  — WebSocket lifecycle
 *   - useTranscript      — entry state + server persistence
 *   - useAudioRecorder   — MediaRecorder wrapper
 *   - useImportMeeting   — background import job
 *   - helpers/audioUpload — encrypt + chunked upload
 */
export function MeetingRoom({ meetingId, meetingTitle, projectId, mode = 'standard', languagePairId = 'ja-vi' }: MeetingRoomProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { getDataKey } = useAuth();

  // Meeting lifecycle
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [error, setError] = useState('');

  // E2EE key — resolved lazily on first Stop/Import
  const [dataKey, setDataKey] = useState<CryptoKey | null>(null);

  // Audio playback sync (post-meeting)
  const [currentMs, setCurrentMs] = useState(0);
  const seekToRef = useRef<((ms: number) => void) | null>(null);

  // Dialog
  const [showImport, setShowImport] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // ---------------------------------------------------------------------------
  // Core hooks
  // ---------------------------------------------------------------------------

  const transcript = useTranscript(meetingId);

  const soniox = useSonioxRealtime({
    languagePairId,
    onFinalTokens: transcript.addEntry,
    onInterimTokens: transcript.updateInterim,
    onTranslationOnly: transcript.updateLastTranslation,
    onError: setError,
  });

  const { isRecording, duration, hasRecording, startRecording, stopRecording, downloadRecording, waitForBlob } =
    useAudioRecorder();

  const importJob = useImportMeeting({
    meetingId,
    getDataKey,
    onDataKey: setDataKey,
    replaceEntries: transcript.replaceEntries,
    saveTranscript: transcript.saveToServer,
    entriesCount: () => transcript.entries.length,
    clearInterim: transcript.clearInterim,
    startFromFile: soniox.startFromFile,
    onComplete: () => setIsEnded(true),
    onError: setError,
  });

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Auto-start recording when mic stream is available (live mode only)
  useEffect(() => {
    if (isActive && soniox.stream && !isRecording) {
      startRecording(soniox.stream);
    }
  }, [isActive, soniox.stream, isRecording, startRecording]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleStart = useCallback(async () => {
    setError('');
    setIsActive(true);
    await soniox.start();
  }, [soniox]);

  const handlePause = useCallback(() => {
    soniox.stop();
    setIsPaused(true);
  }, [soniox]);

  const handleResume = useCallback(async () => {
    setIsPaused(false);
    await soniox.start();
  }, [soniox]);

  const handleStop = useCallback(async () => {
    soniox.stop();
    stopRecording();
    transcript.clearInterim();
    setIsActive(false);

    if (mode !== 'standard') {
      await meetingApi.update(meetingId, { status: 'completed' });
      setIsEnded(true);
      return;
    }

    try {
      const key = await getDataKey();
      if (!key) {
        setError('Encryption key not available. Data was not saved.');
        await meetingApi.update(meetingId, { status: 'completed' });
        setIsEnded(true);
        return;
      }
      setDataKey(key);

      await transcript.saveToServer(() => Promise.resolve(key));

      const blob = await waitForBlob();
      if (blob && blob.size > 0) {
        const encrypted = await encryptAudio(blob, key);
        await uploadAudioChunked(meetingId, encrypted);
      }
    } catch {
      setError('Failed to save meeting data.');
    }

    await meetingApi.update(meetingId, { status: 'completed' });
    setIsEnded(true);
  }, [meetingId, mode, soniox, stopRecording, waitForBlob, transcript, getDataKey]);

  const handleBack = useCallback(() => {
    if (isActive) {
      setShowLeaveConfirm(true);
      return;
    }
    router.push(projectId ? `/projects/${projectId}` : '/projects');
  }, [isActive, projectId, router]);

  const confirmLeave = useCallback(() => {
    soniox.stop();
    setShowLeaveConfirm(false);
    router.push(projectId ? `/projects/${projectId}` : '/projects');
  }, [soniox, projectId, router]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const statusLabels = useMemo(
    () => ({
      disconnected: t.meeting.disconnected,
      connecting: t.meeting.connecting,
      connected: t.meeting.connected,
      error: t.common.error,
    }),
    [t],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-[100dvh] flex-col gap-2 lg:h-[calc(100vh-4rem)] lg:gap-4">

      {/* ── Top bar ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <h1 className="text-lg font-bold">{meetingTitle}</h1>
            <span className={`flex items-center gap-1 text-xs ${CONNECTION_STATUS_COLORS[soniox.state]}`}>
              {soniox.state === 'connected'   && <Wifi className="h-3 w-3" />}
              {soniox.state === 'error'       && <AlertCircle className="h-3 w-3" />}
              {soniox.state === 'connecting'  && <Loader2 className="h-3 w-3 animate-spin" />}
              {soniox.state === 'disconnected'&& <WifiOff className="h-3 w-3" />}
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
          onImport={() => { if (!importJob.isImporting) setShowImport(true); }}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
        />
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      )}

      {/* ── Import progress banner ── */}
      {importJob.isImporting && (
        <div className="flex items-center gap-3 rounded-xl border border-vietnamese/30 bg-vietnamese/10 px-4 py-3 text-sm text-vietnamese">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span className="flex-1 truncate">{importJob.progress || 'Đang import...'}</span>
        </div>
      )}

      {/* ── Import dialog ── */}
      <ImportMeetingDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={async (payload) => {
          if (isActive) throw new Error('Meeting is active');
          setShowImport(false);
          importJob.run(payload);
        }}
      />

      {/* ── Toolbar (recording timer + export) ── */}
      {(isActive || hasRecording || transcript.entries.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/30 bg-card/40 px-3 py-2 lg:px-4">
          {isRecording && (
            <span className="mr-2 text-xs font-medium text-destructive">
              ⏱ {String(Math.floor(duration / 60)).padStart(2, '0')}:{String(duration % 60).padStart(2, '0')}
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

      {/* ── Audio player (post-meeting) ── */}
      {isEnded && mode === 'standard' && dataKey && (
        <AudioPlayer
          meetingId={meetingId}
          meetingTitle={meetingTitle}
          dataKey={dataKey}
          onTimeUpdate={setCurrentMs}
          seekRef={seekToRef}
        />
      )}

      {/* ── Transcript ── */}
      <div className="flex-1 overflow-hidden">
        <TranscriptPanel
          entries={transcript.entries}
          currentText={transcript.currentText}
          currentSpeaker={transcript.currentSpeaker}
          currentMs={isEnded ? currentMs : 0}
          onSeek={isEnded && seekToRef.current ? (ms) => seekToRef.current!(ms) : undefined}
        />
      </div>

      {/* ── AI Summary (post-meeting) ── */}
      {isEnded && mode === 'standard' && transcript.entries.length > 0 && (
        <MeetingSummary meetingId={meetingId} entries={transcript.entries} dataKey={dataKey} />
      )}

      {/* ── Footer stats ── */}
      <div className="flex items-center justify-between rounded-xl border border-border/30 bg-card/40 px-4 py-2 text-xs text-muted-foreground">
        <span>{transcript.entries.length} entries</span>
        <span>
          🇯🇵 {transcript.entries.filter((e) => e.language === 'ja').length} •{' '}
          🇻🇳 {transcript.entries.filter((e) => e.language === 'vi').length}
        </span>
      </div>

      <ConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        title="Rời cuộc họp?"
        description={t.meeting.confirmLeave}
        confirmLabel="Rời phòng"
        variant="default"
        onConfirm={confirmLeave}
      />
    </div>
  );
}

export default MeetingRoom;
