/**
 * Tests for SpeakerBadge component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpeakerBadge } from '../SpeakerBadge';

describe('SpeakerBadge', () => {
  describe('rendering', () => {
    it('renders the speaker label text', () => {
      render(<SpeakerBadge label="Customer 1" language="ja" />);
      expect(screen.getByText('Customer 1')).toBeInTheDocument();
    });

    it('renders Vietnamese speaker label', () => {
      render(<SpeakerBadge label="Our 1" language="vi" />);
      expect(screen.getByText('Our 1')).toBeInTheDocument();
    });
  });

  describe('color scheme', () => {
    it('applies japanese color classes for ja language', () => {
      render(<SpeakerBadge label="Customer 1" language="ja" />);
      const badge = screen.getByText('Customer 1');
      expect(badge.className).toContain('text-japanese');
      expect(badge.className).toContain('bg-japanese/10');
    });

    it('applies vietnamese color classes for vi language', () => {
      render(<SpeakerBadge label="Our 1" language="vi" />);
      const badge = screen.getByText('Our 1');
      expect(badge.className).toContain('text-vietnamese');
      expect(badge.className).toContain('bg-vietnamese/10');
    });
  });

  describe('tooltip via title', () => {
    it('does not set title when sonioxSpeakerId is omitted', () => {
      render(<SpeakerBadge label="Customer 1" language="ja" />);
      const badge = screen.getByText('Customer 1');
      expect(badge).not.toHaveAttribute('title');
    });

    it('sets title attribute when sonioxSpeakerId is provided', () => {
      render(
        <SpeakerBadge label="Customer 1" language="ja" sonioxSpeakerId="spk-001" />
      );
      const badge = screen.getByText('Customer 1');
      expect(badge).toHaveAttribute('title', 'Soniox ID: spk-001');
    });
  });

  describe('accessibility', () => {
    it('has aria-label containing the speaker label', () => {
      render(<SpeakerBadge label="Customer 2" language="ja" />);
      expect(screen.getByRole('generic', { name: /Speaker: Customer 2/i })).toBeInTheDocument();
    });
  });
});
