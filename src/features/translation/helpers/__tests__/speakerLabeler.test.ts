/**
 * @vitest-environment node
 * Full coverage of SpeakerLabeler.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpeakerLabeler } from '../speakerLabeler';

describe('SpeakerLabeler', () => {
  let labeler: SpeakerLabeler;

  beforeEach(() => {
    labeler = new SpeakerLabeler();
  });

  describe('getLabel', () => {
    it('assigns "Speaker 1" to the first speaker regardless of language', () => {
      expect(labeler.getLabel('spk-A', 'ja')).toBe('Speaker 1');
    });

    it('assigns "Speaker 1" to the first Vietnamese speaker', () => {
      expect(labeler.getLabel('spk-B', 'vi')).toBe('Speaker 1');
    });

    it('returns the same label on repeated calls for the same speakerId', () => {
      labeler.getLabel('spk-A', 'ja');
      expect(labeler.getLabel('spk-A', 'ja')).toBe('Speaker 1');
    });

    it('first language wins — second call with different language returns original label', () => {
      labeler.getLabel('spk-A', 'ja');
      expect(labeler.getLabel('spk-A', 'vi')).toBe('Speaker 1');
    });

    it('increments counter for each new speaker regardless of language', () => {
      expect(labeler.getLabel('spk-A', 'ja')).toBe('Speaker 1');
      expect(labeler.getLabel('spk-B', 'ja')).toBe('Speaker 2');
      expect(labeler.getLabel('spk-C', 'vi')).toBe('Speaker 3');
    });

    it('does not re-increment when same speaker appears with different language', () => {
      labeler.getLabel('spk-A', 'ja'); // Speaker 1
      labeler.getLabel('spk-B', 'vi'); // Speaker 2

      expect(labeler.getLabel('spk-A', 'vi')).toBe('Speaker 1');
      expect(labeler.getLabel('spk-B', 'ja')).toBe('Speaker 2');
    });

    it('supports en, zh, ko languages', () => {
      expect(labeler.getLabel('spk-A', 'en')).toBe('Speaker 1');
      expect(labeler.getLabel('spk-B', 'zh')).toBe('Speaker 2');
      expect(labeler.getLabel('spk-C', 'ko')).toBe('Speaker 3');
    });
  });

  describe('getInfo', () => {
    it('returns undefined for an unknown speaker', () => {
      expect(labeler.getInfo('unknown')).toBeUndefined();
    });

    it('returns correct info after registration', () => {
      labeler.getLabel('spk-A', 'ja');
      const info = labeler.getInfo('spk-A');
      expect(info).toBeDefined();
      expect(info?.label).toBe('Speaker 1');
      expect(info?.language).toBe('ja');
      expect(info?.number).toBe(1);
    });
  });

  describe('getSpeakerNumber', () => {
    it('returns 1 for first registered speaker', () => {
      labeler.getLabel('spk-A', 'ja');
      expect(labeler.getSpeakerNumber('spk-A')).toBe(1);
    });

    it('returns correct number for each speaker', () => {
      labeler.getLabel('spk-A', 'ja');
      labeler.getLabel('spk-B', 'vi');
      labeler.getLabel('spk-C', 'en');
      expect(labeler.getSpeakerNumber('spk-A')).toBe(1);
      expect(labeler.getSpeakerNumber('spk-B')).toBe(2);
      expect(labeler.getSpeakerNumber('spk-C')).toBe(3);
    });

    it('returns 1 (default) for unknown speaker', () => {
      expect(labeler.getSpeakerNumber('unknown')).toBe(1);
    });
  });

  describe('getMapping', () => {
    it('returns empty object when no speakers registered', () => {
      expect(labeler.getMapping()).toEqual({});
    });

    it('returns all registered speakers', () => {
      labeler.getLabel('spk-A', 'ja');
      labeler.getLabel('spk-B', 'vi');

      const mapping = labeler.getMapping();
      expect(mapping['spk-A']).toEqual({ label: 'Speaker 1', language: 'ja' });
      expect(mapping['spk-B']).toEqual({ label: 'Speaker 2', language: 'vi' });
    });
  });

  describe('reset', () => {
    it('clears all speaker registrations', () => {
      labeler.getLabel('spk-A', 'ja');
      labeler.reset();
      expect(labeler.getMapping()).toEqual({});
    });

    it('resets counters so numbers start from 1 again after reset', () => {
      labeler.getLabel('spk-A', 'ja'); // Speaker 1
      labeler.getLabel('spk-B', 'vi'); // Speaker 2
      labeler.reset();

      expect(labeler.getLabel('spk-NEW', 'ja')).toBe('Speaker 1');
      expect(labeler.getLabel('spk-NEW2', 'vi')).toBe('Speaker 2');
    });

    it('does not affect new speakers registered after reset', () => {
      labeler.getLabel('spk-A', 'ja');
      labeler.reset();

      expect(labeler.getInfo('spk-A')).toBeUndefined();

      const label = labeler.getLabel('spk-A', 'vi');
      expect(label).toBe('Speaker 1');
    });
  });
});
