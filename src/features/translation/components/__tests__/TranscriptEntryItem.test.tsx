/**
 * Tests for TranscriptEntryItem component and formatTime helper.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TranscriptEntryItem, formatTime } from '../TranscriptEntryItem';
import type { TranscriptEntry } from '@/types/transcript.types';

/** Build a minimal TranscriptEntry for testing. */
function makeEntry(overrides?: Partial<TranscriptEntry>): TranscriptEntry {
  return {
    id: 'entry-1',
    meetingId: 'meeting-1',
    speakerId: 'spk-001',
    speakerLabel: 'Customer 1',
    language: 'ja',
    originalText: 'こんにちは',
    translatedText: 'Xin chào',
    startMs: 5000,
    endMs: 8000,
    confidence: 0.95,
    isReply: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('formatTime', () => {
  it('formats 0 ms as 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats 1000 ms as 00:01', () => {
    expect(formatTime(1000)).toBe('00:01');
  });

  it('formats 60000 ms as 01:00', () => {
    expect(formatTime(60000)).toBe('01:00');
  });

  it('formats 90000 ms as 01:30', () => {
    expect(formatTime(90000)).toBe('01:30');
  });

  it('formats 5000 ms as 00:05', () => {
    expect(formatTime(5000)).toBe('00:05');
  });

  it('pads single digit seconds with zero', () => {
    expect(formatTime(3000)).toBe('00:03');
  });

  it('pads single digit minutes with zero', () => {
    expect(formatTime(65000)).toBe('01:05');
  });
});

describe('TranscriptEntryItem', () => {
  describe('content rendering', () => {
    it('renders the original text', () => {
      render(<TranscriptEntryItem entry={makeEntry()} />);
      expect(screen.getByText('こんにちは')).toBeInTheDocument();
    });

    it('renders the translated text', () => {
      render(<TranscriptEntryItem entry={makeEntry({ translatedText: 'Xin chào' })} />);
      expect(screen.getByText(/Xin chào/)).toBeInTheDocument();
    });

    it('does not render translation when translatedText is empty', () => {
      render(<TranscriptEntryItem entry={makeEntry({ translatedText: '' })} />);
      expect(screen.queryByText(/→/)).not.toBeInTheDocument();
    });

    it('renders formatted timestamp', () => {
      render(<TranscriptEntryItem entry={makeEntry({ startMs: 5000 })} />);
      expect(screen.getByText('00:05')).toBeInTheDocument();
    });

    it('renders the speaker label via SpeakerBadge', () => {
      render(<TranscriptEntryItem entry={makeEntry({ speakerLabel: 'Customer 2' })} />);
      expect(screen.getByText('Customer 2')).toBeInTheDocument();
    });

    it('renders the language flag via LanguageBadge for Japanese', () => {
      render(<TranscriptEntryItem entry={makeEntry({ language: 'ja' })} />);
      expect(screen.getByRole('img', { name: /japanese/i })).toBeInTheDocument();
    });

    it('renders the language flag via LanguageBadge for Vietnamese', () => {
      render(
        <TranscriptEntryItem
          entry={makeEntry({ language: 'vi', speakerLabel: 'Our 1' })}
        />
      );
      expect(screen.getByRole('img', { name: /vietnamese/i })).toBeInTheDocument();
    });
  });

  describe('color theming', () => {
    it('applies text-japanese to original text for Japanese entries', () => {
      render(<TranscriptEntryItem entry={makeEntry({ language: 'ja' })} />);
      const originalText = screen.getByText('こんにちは');
      expect(originalText.className).toContain('text-japanese');
    });

    it('applies text-vietnamese to original text for Vietnamese entries', () => {
      render(
        <TranscriptEntryItem
          entry={makeEntry({ language: 'vi', originalText: 'Xin chào' })}
        />
      );
      const originalText = screen.getByText('Xin chào');
      expect(originalText.className).toContain('text-vietnamese');
    });
  });

  describe('SpeakerBadge integration', () => {
    it('passes sonioxSpeakerId to SpeakerBadge as tooltip', () => {
      render(
        <TranscriptEntryItem
          entry={makeEntry({ speakerId: 'spk-XYZ', speakerLabel: 'Customer 1' })}
        />
      );
      // SpeakerBadge renders with title=Soniox ID: spk-XYZ
      const badge = screen.getByText('Customer 1');
      expect(badge).toHaveAttribute('title', 'Soniox ID: spk-XYZ');
    });
  });
});
