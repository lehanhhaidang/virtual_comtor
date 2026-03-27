'use client';

import { useMemo } from 'react';
import { AlertCircle, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useI18n } from '@/lib/i18n';
import { exportToXLSX } from '../helpers/exportTranscript';
import { AudioPlayer } from './AudioPlayer';
import { ImportMeetingDialog } from './ImportMeetingDialog';
import { MeetingControls } from './MeetingControls';
import { MeetingSummary } from './MeetingSummary';
import { TranscriptPanel } from './TranscriptPanel';
import { MeetingHeader } from './MeetingHeader';
import { MeetingStatusBar } from './MeetingStatusBar';
import { useMeetingRoom } from '../hooks/useMeetingRoom';

// ---------------------------------------------------------------------------

interface MeetingRoomProps {
  meetingId: string;
  meetingTitle: string;
  projectId?: string;
  mode?: 'standard' | 'private';
  languagePairId?: string;
}

// ---------------------------------------------------------------------------

/**
 * MeetingRoom — thin orchestrator.
 * All state and handlers live in useMeetingRoom.
 */
export function MeetingRoom({ meetingId, meetingTitle, projectId, mode = 'standard', languagePairId = 'ja-vi' }: MeetingRoomProps) {
  const { t } = useI18n();

  const {
    isActive,
    isPaused,
    isEnded,
    error,
    dataKey,
    currentMs,
    setCurrentMs,
    seekToRef,
    showImport,
    setShowImport,
    showLeaveConfirm,
    setShowLeaveConfirm,
    transcript,
    soniox,
    isRecording,
    duration,
    hasRecording,
    downloadRecording,
    importJob,
    handleStart,
    handlePause,
    handleResume,
    handleStop,
    handleBack,
    confirmLeave,
  } = useMeetingRoom({ meetingId, meetingTitle, projectId, mode, languagePairId });

  const statusLabels = useMemo(
    () => ({
      disconnected: t.meeting.disconnected,
      connecting: t.meeting.connecting,
      connected: t.meeting.connected,
      error: t.common.error,
    }),
    [t],
  );

  return (
    <div className="flex h-[100dvh] flex-col gap-2 lg:h-[calc(100vh-4rem)] lg:gap-4">

      {/* ── Top bar ── */}
      <MeetingHeader
        title={meetingTitle}
        connectionState={soniox.state}
        statusLabel={statusLabels[soniox.state]}
        onBack={handleBack}
        controls={
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
        }
      />

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
      <MeetingStatusBar entryCount={transcript.entries.length} entries={transcript.entries} />

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
