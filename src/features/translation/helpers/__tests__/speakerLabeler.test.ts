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
    it('assigns "Customer 1" to the first Japanese speaker', () => {
      expect(labeler.getLabel('spk-A', 'ja')).toBe('Customer 1');
    });

    it('assigns "Our 1" to the first Vietnamese speaker', () => {
      expect(labeler.getLabel('spk-B', 'vi')).toBe('Our 1');
    });

    it('returns the same label on repeated calls for the same speakerId', () => {
      labeler.getLabel('spk-A', 'ja');
      expect(labeler.getLabel('spk-A', 'ja')).toBe('Customer 1');
    });

    it('first language wins — second call with different language returns original label', () => {
      labeler.getLabel('spk-A', 'ja'); // Registered as Customer 1
      // Even if called again with 'vi', the first registration stands
      expect(labeler.getLabel('spk-A', 'vi')).toBe('Customer 1');
    });

    it('increments customer counter independently for each new Japanese speaker', () => {
      expect(labeler.getLabel('spk-A', 'ja')).toBe('Customer 1');
      expect(labeler.getLabel('spk-B', 'ja')).toBe('Customer 2');
      expect(labeler.getLabel('spk-C', 'ja')).toBe('Customer 3');
    });

    it('increments our counter independently for each new Vietnamese speaker', () => {
      expect(labeler.getLabel('spk-X', 'vi')).toBe('Our 1');
      expect(labeler.getLabel('spk-Y', 'vi')).toBe('Our 2');
    });

    it('maintains separate counters for Japanese and Vietnamese', () => {
      labeler.getLabel('spk-A', 'ja'); // Customer 1
      labeler.getLabel('spk-B', 'vi'); // Our 1
      labeler.getLabel('spk-C', 'ja'); // Customer 2
      labeler.getLabel('spk-D', 'vi'); // Our 2

      expect(labeler.getLabel('spk-A', 'ja')).toBe('Customer 1');
      expect(labeler.getLabel('spk-B', 'vi')).toBe('Our 1');
      expect(labeler.getLabel('spk-C', 'ja')).toBe('Customer 2');
      expect(labeler.getLabel('spk-D', 'vi')).toBe('Our 2');
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
      expect(info?.label).toBe('Customer 1');
      expect(info?.language).toBe('ja');
      expect(info?.group).toBe('customer');
      expect(info?.number).toBe(1);
    });

    it('returns correct group for Vietnamese speaker', () => {
      labeler.getLabel('spk-B', 'vi');
      expect(labeler.getInfo('spk-B')?.group).toBe('our');
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
      expect(mapping['spk-A']).toEqual({ label: 'Customer 1', language: 'ja' });
      expect(mapping['spk-B']).toEqual({ label: 'Our 1', language: 'vi' });
    });
  });

  describe('reset', () => {
    it('clears all speaker registrations', () => {
      labeler.getLabel('spk-A', 'ja');
      labeler.reset();
      expect(labeler.getMapping()).toEqual({});
    });

    it('resets counters so numbers start from 1 again after reset', () => {
      labeler.getLabel('spk-A', 'ja'); // Customer 1
      labeler.getLabel('spk-B', 'vi'); // Our 1
      labeler.reset();

      expect(labeler.getLabel('spk-NEW', 'ja')).toBe('Customer 1');
      expect(labeler.getLabel('spk-NEW2', 'vi')).toBe('Our 1');
    });

    it('does not affect new speakers registered after reset', () => {
      labeler.getLabel('spk-A', 'ja');
      labeler.reset();

      // spk-A is unknown again
      expect(labeler.getInfo('spk-A')).toBeUndefined();

      // New registration starts fresh
      const label = labeler.getLabel('spk-A', 'vi');
      expect(label).toBe('Our 1');
    });
  });
});
