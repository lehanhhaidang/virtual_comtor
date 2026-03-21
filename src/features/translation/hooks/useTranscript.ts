'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import type { TranscriptEntry } from '@/types/transcript.types';
import { SpeakerLabeler } from '../helpers/speakerLabeler';
import type { SonioxLanguage } from '@/lib/soniox';
import { encrypt } from '@/lib/crypto';

/**
 * useTranscript — manages transcript entries, speaker labeling,
 * and encrypted server-side persistence.
 */
export function useTranscript(meetingId: string) {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState('');
  const labelerRef = useRef(new SpeakerLabeler());
  const entryIdRef = useRef(0);
  // Keep a ref to always have current entries (for saveToServer)
  const entriesRef = useRef<TranscriptEntry[]>([]);

  /**
   * Add a finalized transcript entry.
   */
  const addEntry = useCallback(
    (
      speakerId: string,
      language: SonioxLanguage,
      originalText: string,
      translatedText: string,
      startMs: number,
      endMs: number,
      confidence: number
    ) => {
      const label = labelerRef.current.getLabel(speakerId, language);
      const entry: TranscriptEntry = {
        id: `entry-${++entryIdRef.current}`,
        meetingId,
        speakerId,
        speakerLabel: label,
        language,
        originalText,
        translatedText,
        startMs,
        endMs,
        confidence,
        isReply: false,
        createdAt: new Date().toISOString(),
      };

      setEntries((prev) => {
        const next = [...prev, entry];
        entriesRef.current = next;
        return next;
      });
      return entry;
    },
    [meetingId]
  );

  /**
   * Update partial/interim text (not finalized yet).
   */
  const updateInterim = useCallback(
    (text: string, speakerId: string, language: SonioxLanguage) => {
      setCurrentText(text);
      setCurrentSpeaker(labelerRef.current.getLabel(speakerId, language));
    },
    []
  );

  /**
   * Update translation on the last finalized entry.
   * Used when translation tokens arrive in a separate WebSocket message.
   */
  const updateLastTranslation = useCallback((translatedText: string) => {
    setEntries((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.translatedText) return prev; // Already has translation
      return [...prev.slice(0, -1), { ...last, translatedText }];
    });
  }, []);

  /**
   * Clear interim text.
   */
  const clearInterim = useCallback(() => {
    setCurrentText('');
    setCurrentSpeaker('');
  }, []);

  /**
   * Get speaker mapping for saving to meeting document.
   */
  const getSpeakerMapping = useCallback(() => {
    return labelerRef.current.getMapping();
  }, []);

  /**
   * Reset transcript (new meeting session).
   */
  const reset = useCallback(() => {
    setEntries([]);
    setCurrentText('');
    setCurrentSpeaker('');
    labelerRef.current.reset();
    entryIdRef.current = 0;
  }, []);

  /**
   * Encrypt and save all entries to the server.
   * @param getDataKey - function that returns the E2EE data key
   * @returns number of saved entries
   */
  const saveToServer = useCallback(
    async (getDataKey: () => Promise<CryptoKey | null>): Promise<number> => {
      const dataKey = await getDataKey();
      if (!dataKey) return 0;

      const currentEntries = entriesRef.current;

      if (currentEntries.length === 0) return 0;

      // Encrypt originalText and translatedText for each entry
      const encryptedEntries = await Promise.all(
        currentEntries.map(async (entry) => ({
          speakerId: entry.speakerId,
          speakerLabel: entry.speakerLabel,
          language: entry.language,
          originalText: await encrypt(entry.originalText, dataKey),
          translatedText: entry.translatedText
            ? await encrypt(entry.translatedText, dataKey)
            : '',
          startMs: entry.startMs,
          endMs: entry.endMs,
          confidence: entry.confidence,
          isReply: entry.isReply,
        }))
      );

      const res = await fetch(`/api/meetings/${meetingId}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: encryptedEntries }),
      });

      if (!res.ok) {
        throw new Error('Failed to save transcript to server');
      }

      return encryptedEntries.length;
    },
    [meetingId]
  );

  return useMemo(() => ({
    entries,
    currentText,
    currentSpeaker,
    addEntry,
    updateLastTranslation,
    updateInterim,
    clearInterim,
    getSpeakerMapping,
    reset,
    saveToServer,
  }), [entries, currentText, currentSpeaker, addEntry, updateLastTranslation, updateInterim, clearInterim, getSpeakerMapping, reset, saveToServer]);
}
