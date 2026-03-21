/**
 * Tests for useSpeakerMapping hook.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeakerMapping } from '../useSpeakerMapping';

describe('useSpeakerMapping', () => {
  describe('getLabel', () => {
    it('assigns Customer label to Japanese speakers', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      let label = '';
      act(() => {
        label = result.current.getLabel('spk-1', 'ja');
      });
      expect(label).toBe('Customer 1');
    });

    it('assigns Our label to Vietnamese speakers', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      let label = '';
      act(() => {
        label = result.current.getLabel('spk-1', 'vi');
      });
      expect(label).toBe('Our 1');
    });

    it('returns the same label on repeated calls', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      let first = '';
      let second = '';
      act(() => {
        first = result.current.getLabel('spk-A', 'ja');
        second = result.current.getLabel('spk-A', 'ja');
      });
      expect(first).toBe(second);
      expect(first).toBe('Customer 1');
    });

    it('increments counter for each unique speaker', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      let labels: string[] = [];
      act(() => {
        labels = [
          result.current.getLabel('spk-1', 'ja'),
          result.current.getLabel('spk-2', 'ja'),
          result.current.getLabel('spk-3', 'vi'),
        ];
      });
      expect(labels[0]).toBe('Customer 1');
      expect(labels[1]).toBe('Customer 2');
      expect(labels[2]).toBe('Our 1');
    });
  });

  describe('getMapping', () => {
    it('returns empty mapping initially', () => {
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
      expect(mapping['spk-A']).toEqual({ label: 'Customer 1', language: 'ja' });
      expect(mapping['spk-B']).toEqual({ label: 'Our 1', language: 'vi' });
    });
  });

  describe('reset', () => {
    it('clears mapping on reset', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      act(() => {
        result.current.getLabel('spk-A', 'ja');
        result.current.reset();
      });
      expect(result.current.getMapping()).toEqual({});
    });

    it('restarts counter numbering after reset', () => {
      const { result } = renderHook(() => useSpeakerMapping());
      let label = '';
      act(() => {
        result.current.getLabel('spk-A', 'ja'); // Customer 1
        result.current.reset();
        label = result.current.getLabel('spk-NEW', 'ja'); // Should be Customer 1 again
      });
      expect(label).toBe('Customer 1');
    });
  });

  describe('stable callbacks', () => {
    it('getLabel, getMapping, reset are stable across renders', () => {
      const { result, rerender } = renderHook(() => useSpeakerMapping());
      const { getLabel: gl1, getMapping: gm1, reset: r1 } = result.current;
      rerender();
      const { getLabel: gl2, getMapping: gm2, reset: r2 } = result.current;
      expect(gl1).toBe(gl2);
      expect(gm1).toBe(gm2);
      expect(r1).toBe(r2);
    });
  });
});
