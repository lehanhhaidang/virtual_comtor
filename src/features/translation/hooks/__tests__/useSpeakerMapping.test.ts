/**
 * @vitest-environment jsdom
 * Tests for useSpeakerMapping hook.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeakerMapping } from '../useSpeakerMapping';

describe('useSpeakerMapping', () => {
  describe('getLabel', () => {
    it('assigns Speaker 1 to the first speaker regardless of language', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      let label!: string;
      act(() => {
        label = result.current.getLabel('spk-A', 'ja');
      });
      expect(label).toBe('Speaker 1');
    });

    it('assigns Speaker 1 to Vietnamese speakers too', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      let label!: string;
      act(() => {
        label = result.current.getLabel('spk-B', 'vi');
      });
      expect(label).toBe('Speaker 1');
    });

    it('returns the same label on repeated calls', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      act(() => result.current.getLabel('spk-A', 'ja'));
      let label!: string;
      act(() => {
        label = result.current.getLabel('spk-A', 'ja');
      });
      expect(label).toBe('Speaker 1');
    });

    it('increments counter for each unique speaker', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      const labels: string[] = [];
      act(() => {
        labels.push(result.current.getLabel('spk-A', 'ja'));
        labels.push(result.current.getLabel('spk-B', 'vi'));
        labels.push(result.current.getLabel('spk-C', 'en'));
      });
      expect(labels[0]).toBe('Speaker 1');
      expect(labels[1]).toBe('Speaker 2');
      expect(labels[2]).toBe('Speaker 3');
    });
  });

  describe('getMapping', () => {
    it('returns empty object initially', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      expect(result.current.getMapping()).toEqual({});
    });

    it('reflects all registered speakers', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      act(() => {
        result.current.getLabel('spk-A', 'ja');
        result.current.getLabel('spk-B', 'vi');
      });
      const mapping = result.current.getMapping();
      expect(mapping['spk-A']).toEqual({ label: 'Speaker 1', language: 'ja' });
      expect(mapping['spk-B']).toEqual({ label: 'Speaker 2', language: 'vi' });
    });
  });

  describe('reset', () => {
    it('clears all registrations', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      act(() => {
        result.current.getLabel('spk-A', 'ja');
        result.current.reset();
      });
      expect(result.current.getMapping()).toEqual({});
    });

    it('restarts counter numbering after reset', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      let label!: string;
      act(() => {
        result.current.getLabel('spk-A', 'ja');
        result.current.reset();
        label = result.current.getLabel('spk-NEW', 'vi');
      });
      expect(label).toBe('Speaker 1');
    });
  });
});
