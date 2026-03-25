/**
 * Soniox API configuration for real-time speech-to-text and translation.
 */

// ---------------------------------------------------------------------------
// Supported languages (Soniox 60+ languages, March 2026)
// ---------------------------------------------------------------------------

export interface SonioxLang {
  code: string;
  label: string;
  flag?: string;
}

export const SONIOX_LANGUAGES: SonioxLang[] = [
  { code: 'af', label: 'Afrikaans' },
  { code: 'sq', label: 'Albanian' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { code: 'az', label: 'Azerbaijani' },
  { code: 'eu', label: 'Basque' },
  { code: 'be', label: 'Belarusian' },
  { code: 'bn', label: 'Bengali' },
  { code: 'bs', label: 'Bosnian' },
  { code: 'bg', label: 'Bulgarian' },
  { code: 'ca', label: 'Catalan' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { code: 'hr', label: 'Croatian' },
  { code: 'cs', label: 'Czech' },
  { code: 'da', label: 'Danish' },
  { code: 'nl', label: 'Dutch' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'et', label: 'Estonian' },
  { code: 'fi', label: 'Finnish' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'gl', label: 'Galician' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'el', label: 'Greek' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'he', label: 'Hebrew' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'id', label: 'Indonesian', flag: '🇮🇩' },
  { code: 'it', label: 'Italian', flag: '🇮🇹' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'kn', label: 'Kannada' },
  { code: 'kk', label: 'Kazakh' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'lv', label: 'Latvian' },
  { code: 'lt', label: 'Lithuanian' },
  { code: 'mk', label: 'Macedonian' },
  { code: 'ms', label: 'Malay' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'mr', label: 'Marathi' },
  { code: 'no', label: 'Norwegian' },
  { code: 'fa', label: 'Persian' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese', flag: '🇵🇹' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'ro', label: 'Romanian' },
  { code: 'ru', label: 'Russian', flag: '🇷🇺' },
  { code: 'sr', label: 'Serbian' },
  { code: 'sk', label: 'Slovak' },
  { code: 'sl', label: 'Slovenian' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'sw', label: 'Swahili' },
  { code: 'sv', label: 'Swedish' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'th', label: 'Thai', flag: '🇹🇭' },
  { code: 'tr', label: 'Turkish', flag: '🇹🇷' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'ur', label: 'Urdu' },
  { code: 'vi', label: 'Vietnamese', flag: '🇻🇳' },
  { code: 'cy', label: 'Welsh' },
];

export function getLang(code: string): SonioxLang {
  return SONIOX_LANGUAGES.find((l) => l.code === code) ?? { code, label: code };
}

export function langLabel(code: string): string {
  const l = getLang(code);
  return l.flag ? `${l.flag} ${l.label}` : l.label;
}

// ---------------------------------------------------------------------------
// Language pair helpers (free pair — any two Soniox languages)
// ---------------------------------------------------------------------------

/** Canonical pair id: "langA:langB" */
export function pairId(langA: string, langB: string) {
  return `${langA}:${langB}`;
}

export function parsePairId(id: string): { langA: string; langB: string } {
  const [langA, langB] = id.split(':');
  return { langA: langA ?? 'ja', langB: langB ?? 'vi' };
}

export const DEFAULT_LANG_A = 'ja';
export const DEFAULT_LANG_B = 'vi';
export const DEFAULT_PAIR_ID = pairId(DEFAULT_LANG_A, DEFAULT_LANG_B);

// ---------------------------------------------------------------------------

export type SonioxLanguage = string; // open — any ISO 639-1 code

export const SONIOX_CONFIG = {
  model: 'stt-rt-v4',
  enableSpeakerDiarization: true,
} as const;

/**
 * Build Soniox session config for a free language pair.
 * Uses language_hints_strict to prevent drift.
 */
export function buildSonioxConfig(langA: string, langB: string, sampleRate: number) {
  return {
    model: SONIOX_CONFIG.model,
    audio_format: 'pcm_s16le',
    sample_rate: sampleRate,
    num_channels: 1,
    language_hints: [langA, langB],
    language_hints_strict: true,
    enable_speaker_diarization: SONIOX_CONFIG.enableSpeakerDiarization,
    enable_language_identification: false,
    translation: {
      type: 'two_way' as const,
      language_a: langA,
      language_b: langB,
    },
  };
}

/** Soniox REST API base URL for server-side calls */
export const SONIOX_API_URL = 'https://api.soniox.com/v1';

/** Soniox WebSocket endpoint for real-time streaming */
export const SONIOX_WS_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';

// ---------------------------------------------------------------------------
// Legacy pair list — kept for backward compat with old meetingApi types
// @deprecated Use langA/langB free pair instead
// ---------------------------------------------------------------------------
export const LANGUAGE_PAIRS = [
  { id: 'ja:vi', label: '🇯🇵 Japanese ↔ 🇻🇳 Vietnamese', langA: 'ja', langB: 'vi', hints: ['ja', 'vi'] },
  { id: 'en:vi', label: '🇬🇧 English ↔ 🇻🇳 Vietnamese',  langA: 'en', langB: 'vi', hints: ['en', 'vi'] },
  { id: 'ko:vi', label: '🇰🇷 Korean ↔ 🇻🇳 Vietnamese',   langA: 'ko', langB: 'vi', hints: ['ko', 'vi'] },
  { id: 'zh:vi', label: '🇨🇳 Chinese ↔ 🇻🇳 Vietnamese',  langA: 'zh', langB: 'vi', hints: ['zh', 'vi'] },
  { id: 'ja:en', label: '🇯🇵 Japanese ↔ 🇬🇧 English',    langA: 'ja', langB: 'en', hints: ['ja', 'en'] },
];
export const DEFAULT_LANGUAGE_PAIR_ID = DEFAULT_PAIR_ID;
export function getLanguagePair(id: string) {
  const { langA, langB } = parsePairId(id);
  return { id, langA, langB, hints: [langA, langB], label: `${langLabel(langA)} ↔ ${langLabel(langB)}` };
}
