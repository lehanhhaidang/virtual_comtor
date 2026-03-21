'use client';

import type { SonioxLanguage } from '@/lib/soniox';

interface SpeakerBadgeProps {
  /** Human-readable label, e.g. "Customer 1" or "Our 1". */
  label: string;
  /** Language of the speaker — determines color scheme. */
  language: SonioxLanguage;
  /** Raw Soniox speaker ID shown in tooltip on hover. */
  sonioxSpeakerId?: string;
}

/**
 * SpeakerBadge — colored badge displaying the speaker label.
 *
 * - Japanese speakers ("Customer N") → orange tones (text-japanese)
 * - Vietnamese speakers ("Our N") → mint tones (text-vietnamese)
 * - Shows Soniox speaker ID as native tooltip when provided.
 */
export function SpeakerBadge({ label, language, sonioxSpeakerId }: SpeakerBadgeProps) {
  const isJapanese = language === 'ja';
  const badgeBg = isJapanese ? 'bg-japanese/10' : 'bg-vietnamese/10';
  const badgeText = isJapanese ? 'text-japanese' : 'text-vietnamese';
  const tooltip = sonioxSpeakerId ? `Soniox ID: ${sonioxSpeakerId}` : undefined;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badgeBg} ${badgeText}`}
      title={tooltip}
      aria-label={`Speaker: ${label}`}
    >
      {label}
    </span>
  );
}

export default SpeakerBadge;
