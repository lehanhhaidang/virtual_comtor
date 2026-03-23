/**
 * Tests for SpeakerBadge component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpeakerBadge } from '../SpeakerBadge';

describe('SpeakerBadge', () => {
  describe('rendering', () => {
    it('renders the speaker label text', () => {
      render(<SpeakerBadge label="Speaker 1" language="ja" speakerNumber={1} />);
      expect(screen.getByText('Speaker 1')).toBeInTheDocument();
    });

    it('renders Vietnamese speaker label', () => {
      render(<SpeakerBadge label="Speaker 2" language="vi" speakerNumber={2} />);
      expect(screen.getByText('Speaker 2')).toBeInTheDocument();
    });
  });

  describe('color scheme', () => {
    it('applies sky color for speaker 1', () => {
      render(<SpeakerBadge label="Speaker 1" language="ja" speakerNumber={1} />);
      const badge = screen.getByText('Speaker 1');
      expect(badge.className).toContain('text-sky-400');
      expect(badge.className).toContain('bg-sky-500/15');
    });

    it('applies violet color for speaker 2', () => {
      render(<SpeakerBadge label="Speaker 2" language="vi" speakerNumber={2} />);
      const badge = screen.getByText('Speaker 2');
      expect(badge.className).toContain('text-violet-400');
      expect(badge.className).toContain('bg-violet-500/15');
    });

    it('cycles colors after 8 speakers (speaker 9 = same as speaker 1)', () => {
      render(<SpeakerBadge label="Speaker 9" language="ja" speakerNumber={9} />);
      const badge = screen.getByText('Speaker 9');
      expect(badge.className).toContain('text-sky-400');
    });
  });

  describe('tooltip via title', () => {
    it('does not set title when sonioxSpeakerId is omitted', () => {
      render(<SpeakerBadge label="Speaker 1" language="ja" />);
      const badge = screen.getByText('Speaker 1');
      expect(badge).not.toHaveAttribute('title');
    });

    it('sets title attribute including Soniox ID and language when provided', () => {
      render(
        <SpeakerBadge label="Speaker 1" language="ja" sonioxSpeakerId="spk-001" />
      );
      const badge = screen.getByText('Speaker 1');
      expect(badge).toHaveAttribute('title', 'Soniox ID: spk-001 · JA');
    });
  });

  describe('accessibility', () => {
    it('has aria-label containing the speaker label', () => {
      render(<SpeakerBadge label="Speaker 2" language="ja" speakerNumber={2} />);
      expect(screen.getByRole('generic', { name: /Speaker: Speaker 2/i })).toBeInTheDocument();
    });
  });
});
