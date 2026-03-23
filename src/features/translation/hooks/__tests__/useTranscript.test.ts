/**
 * Tests for useTranscript hook.
 * Covers: addEntry, updateInterim, updateLastTranslation, clearInterim, reset.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTranscript } from '../useTranscript';

const MEETING_ID = 'meeting-test-123';

/** Build a minimal addEntry call with sensible defaults. */
function addTestEntry(
  hook: ReturnType<typeof useTranscript>,
  overrides?: Partial<{
    speakerId: string;
    language: 'ja' | 'vi';
    originalText: string;
    translatedText: string;
    startMs: number;
    endMs: number;
    confidence: number;
  }>
) {
  const args = {
    speakerId: 'spk-1',
    language: 'ja' as const,
    originalText: 'こんにちは',
    translatedText: 'Xin chào',
    startMs: 1000,
    endMs: 2000,
    confidence: 0.9,
    ...overrides,
  };
  return hook.addEntry(
    args.speakerId,
    args.language,
    args.originalText,
    args.translatedText,
    args.startMs,
    args.endMs,
    args.confidence
  );
}

describe('useTranscript', () => {
  describe('initial state', () => {
    it('starts with empty entries', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      expect(result.current.entries).toEqual([]);
    });

    it('starts with empty interim text', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      expect(result.current.currentText).toBe('');
      expect(result.current.currentSpeaker).toBe('');
    });
  });

  describe('addEntry', () => {
    it('adds an entry with correct fields', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        addTestEntry(result.current);
      });

      expect(result.current.entries).toHaveLength(1);
      const entry = result.current.entries[0];
      expect(entry.meetingId).toBe(MEETING_ID);
      expect(entry.speakerId).toBe('spk-1');
      expect(entry.language).toBe('ja');
      expect(entry.originalText).toBe('こんにちは');
      expect(entry.translatedText).toBe('Xin chào');
      expect(entry.startMs).toBe(1000);
      expect(entry.endMs).toBe(2000);
      expect(entry.confidence).toBe(0.9);
    });

    it('auto-assigns speaker label via SpeakerLabeler', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        addTestEntry(result.current, { speakerId: 'spk-1', language: 'ja' });
      });
      expect(result.current.entries[0].speakerLabel).toBe('Speaker 1');
    });

    it('assigns "Our 1" label to Vietnamese speaker', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        addTestEntry(result.current, { speakerId: 'spk-vi', language: 'vi' });
      });
      expect(result.current.entries[0].speakerLabel).toBe('Speaker 1');
    });

    it('assigns unique IDs to each entry', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        addTestEntry(result.current, { speakerId: 'spk-1', originalText: 'First' });
        addTestEntry(result.current, { speakerId: 'spk-2', originalText: 'Second' });
      });
      const [e1, e2] = result.current.entries;
      expect(e1.id).not.toBe(e2.id);
    });

    it('returns the new entry', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      let entry: ReturnType<typeof addTestEntry> | undefined;
      act(() => {
        entry = addTestEntry(result.current);
      });
      expect(entry).toBeDefined();
      expect(entry?.originalText).toBe('こんにちは');
    });
  });

  describe('updateInterim', () => {
    it('sets current interim text and speaker', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        result.current.updateInterim('Partial text...', 'spk-1', 'ja');
      });
      expect(result.current.currentText).toBe('Partial text...');
      expect(result.current.currentSpeaker).toBe('Speaker 1');
    });

    it('updates interim text on subsequent calls', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        result.current.updateInterim('Hello', 'spk-1', 'ja');
        result.current.updateInterim('Hello world', 'spk-1', 'ja');
      });
      expect(result.current.currentText).toBe('Hello world');
    });
  });

  describe('updateLastTranslation', () => {
    it('appends translation to the last entry', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        addTestEntry(result.current, { translatedText: '' });
      });
      act(() => {
        result.current.updateLastTranslation('Translated text');
      });
      expect(result.current.entries[0].translatedText).toBe('Translated text');
    });

    it('does not overwrite an existing translation', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        addTestEntry(result.current, { translatedText: 'Existing translation' });
      });
      act(() => {
        result.current.updateLastTranslation('New translation');
      });
      expect(result.current.entries[0].translatedText).toBe('Existing translation');
    });

    it('does nothing when entries list is empty', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        result.current.updateLastTranslation('Some text');
      });
      expect(result.current.entries).toHaveLength(0);
    });

    it('only updates the last entry, not others', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        addTestEntry(result.current, { originalText: 'First', translatedText: '' });
        addTestEntry(result.current, { originalText: 'Second', translatedText: '' });
      });
      act(() => {
        result.current.updateLastTranslation('Translation for second');
      });
      expect(result.current.entries[0].translatedText).toBe('');
      expect(result.current.entries[1].translatedText).toBe('Translation for second');
    });
  });

  describe('clearInterim', () => {
    it('clears current text and speaker', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        result.current.updateInterim('Some text', 'spk-1', 'ja');
        result.current.clearInterim();
      });
      expect(result.current.currentText).toBe('');
      expect(result.current.currentSpeaker).toBe('');
    });
  });

  describe('reset', () => {
    it('clears entries', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        addTestEntry(result.current);
        result.current.reset();
      });
      expect(result.current.entries).toHaveLength(0);
    });

    it('clears interim state', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        result.current.updateInterim('Partial', 'spk-1', 'ja');
        result.current.reset();
      });
      expect(result.current.currentText).toBe('');
      expect(result.current.currentSpeaker).toBe('');
    });

    it('resets speaker labeler so numbers restart from 1', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        addTestEntry(result.current, { speakerId: 'spk-1', language: 'ja' }); // Customer 1
        result.current.reset();
        addTestEntry(result.current, { speakerId: 'spk-new', language: 'ja' }); // Should be Customer 1 again
      });
      expect(result.current.entries[0].speakerLabel).toBe('Speaker 1');
    });
  });

  describe('getSpeakerMapping', () => {
    it('returns empty mapping initially', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      expect(result.current.getSpeakerMapping()).toEqual({});
    });

    it('returns mapping after entries added', () => {
      const { result } = renderHook(() => useTranscript(MEETING_ID));
      act(() => {
        addTestEntry(result.current, { speakerId: 'spk-ja', language: 'ja' });
        addTestEntry(result.current, { speakerId: 'spk-vi', language: 'vi' });
      });
      const mapping = result.current.getSpeakerMapping();
      expect(mapping['spk-ja']).toEqual({ label: 'Speaker 1', language: 'ja' });
      expect(mapping['spk-vi']).toEqual({ label: 'Speaker 2', language: 'vi' });
    });
  });
});
