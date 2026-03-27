'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { meetingApi } from '@/features/meetings/api/meetingApi';
import { useSonioxRealtime } from './useSonioxRealtime';
import { useTranscript } from './useTranscript';
import { useAudioRecorder } from './useAudioRecorder';
import { useImportMeeting } from './useImportMeeting';
import { encryptAudio, uploadAudioChunked } from '../helpers/audioUpload';

interface UseMeetingRoomOptions {
  meetingId: string;
  meetingTitle: string;
  projectId?: string;
  mode?: 'standard' | 'private';
  languagePairId?: string;
}

export function useMeetingRoom({
  meetingId,
  meetingTitle,
  projectId,
  mode = 'standard',
  languagePairId = 'ja-vi',
}: UseMeetingRoomOptions) {
  const router = useRouter();
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

  // Dialogs
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

  const handleExport = useCallback(() => {
    downloadRecording(meetingTitle);
  }, [downloadRecording, meetingTitle]);

  return {
    // State
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
    // Hooks
    transcript,
    soniox,
    isRecording,
    duration,
    hasRecording,
    downloadRecording,
    importJob,
    // Handlers
    handleStart,
    handlePause,
    handleResume,
    handleStop,
    handleBack,
    confirmLeave,
    handleExport,
  };
}
