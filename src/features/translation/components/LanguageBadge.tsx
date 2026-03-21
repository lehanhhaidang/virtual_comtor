'use client';

import type { SonioxLanguage } from '@/lib/soniox';

interface LanguageBadgeProps {
  /** Language to display as a flag badge. */
  language: SonioxLanguage;
  /** Optional extra CSS classes. */
  className?: string;
}

const LANGUAGE_CONFIG: Record<SonioxLanguage, { flag: string; label: string }> = {
  ja: { flag: '🇯🇵', label: 'Japanese' },
  vi: { flag: '🇻🇳', label: 'Vietnamese' },
};

/**
 * LanguageBadge — emoji flag indicating spoken language.
 *
 * - 🇯🇵 for Japanese (ja)
 * - 🇻🇳 for Vietnamese (vi)
 */
export function LanguageBadge({ language, className = '' }: LanguageBadgeProps) {
  const config = LANGUAGE_CONFIG[language];

  return (
    <span
      role="img"
      aria-label={config.label}
      className={`text-base leading-none ${className}`}
      title={config.label}
    >
      {config.flag}
    </span>
  );
}

export default LanguageBadge;
