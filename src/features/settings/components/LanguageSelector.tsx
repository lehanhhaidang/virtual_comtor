'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Locale } from '@/lib/i18n';

const LANGUAGES: { code: Locale; label: string; flag: string; nativeLabel: string }[] = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', nativeLabel: 'VI' },
  { code: 'en', label: 'English', flag: '🇺🇸', nativeLabel: 'EN' },
  { code: 'ja', label: '日本語', flag: '🇯🇵', nativeLabel: 'JA' },
];

interface LanguageSelectorProps {
  value: Locale;
  onChange: (locale: Locale) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div className="flex gap-3">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(val) => { if (val) onChange(val as Locale); }}
      >
        {LANGUAGES.map((lang) => (
          <ToggleGroupItem key={lang.code} value={lang.code}>
            <span className="text-2xl">{lang.flag}</span>
            <span className="font-semibold text-xs">{lang.nativeLabel}</span>
            <span className="text-xs opacity-70">{lang.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
