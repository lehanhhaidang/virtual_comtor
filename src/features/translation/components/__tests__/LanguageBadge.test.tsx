/**
 * Tests for LanguageBadge component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageBadge } from '../LanguageBadge';

describe('LanguageBadge', () => {
  describe('rendering', () => {
    it('renders 🇯🇵 flag for Japanese', () => {
      render(<LanguageBadge language="ja" />);
      expect(screen.getByRole('img', { name: /japanese/i })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /japanese/i }).textContent).toBe('🇯🇵');
    });

    it('renders 🇻🇳 flag for Vietnamese', () => {
      render(<LanguageBadge language="vi" />);
      expect(screen.getByRole('img', { name: /vietnamese/i })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /vietnamese/i }).textContent).toBe('🇻🇳');
    });
  });

  describe('accessibility', () => {
    it('has role="img" for Japanese flag', () => {
      render(<LanguageBadge language="ja" />);
      const badge = screen.getByRole('img');
      expect(badge).toHaveAttribute('aria-label', 'Japanese');
    });

    it('has role="img" for Vietnamese flag', () => {
      render(<LanguageBadge language="vi" />);
      const badge = screen.getByRole('img');
      expect(badge).toHaveAttribute('aria-label', 'Vietnamese');
    });

    it('has a title attribute matching the language name', () => {
      render(<LanguageBadge language="ja" />);
      expect(screen.getByRole('img')).toHaveAttribute('title', 'Japanese');
    });
  });

  describe('className prop', () => {
    it('merges custom className', () => {
      render(<LanguageBadge language="ja" className="extra-class" />);
      const badge = screen.getByRole('img');
      expect(badge.className).toContain('extra-class');
    });

    it('keeps default classes when no extra className given', () => {
      render(<LanguageBadge language="vi" />);
      const badge = screen.getByRole('img');
      expect(badge.className).toContain('text-base');
    });
  });
});
