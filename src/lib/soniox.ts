/**
 * Soniox API configuration for real-time speech-to-text and translation.
 * Used by both the backend (temp key generation) and frontend (SDK config).
 */

// ---------------------------------------------------------------------------
// Language pair definitions
// ---------------------------------------------------------------------------

export interface LanguagePair {
  id: string;
  label: string;
  langA: string;
  langB: string;
  hints: string[];
}

/** All supported language pairs for meetings */
export const LANGUAGE_PAIRS: LanguagePair[] = [
  { id: 'ja-vi', label: '🇯🇵 日本語 ↔ 🇻🇳 Tiếng Việt', langA: 'ja', langB: 'vi', hints: ['ja', 'vi'] },
  { id: 'en-vi', label: '🇬🇧 English ↔ 🇻🇳 Tiếng Việt',  langA: 'en', langB: 'vi', hints: ['en', 'vi'] },
  { id: 'ko-vi', label: '🇰🇷 한국어 ↔ 🇻🇳 Tiếng Việt',   langA: 'ko', langB: 'vi', hints: ['ko', 'vi'] },
  { id: 'zh-vi', label: '🇨🇳 中文 ↔ 🇻🇳 Tiếng Việt',     langA: 'zh', langB: 'vi', hints: ['zh', 'vi'] },
  { id: 'ja-en', label: '🇯🇵 日本語 ↔ 🇬🇧 English',       langA: 'ja', langB: 'en', hints: ['ja', 'en'] },
];

export const DEFAULT_LANGUAGE_PAIR_ID = 'ja-vi';

export function getLanguagePair(id: string): LanguagePair {
  return LANGUAGE_PAIRS.find((p) => p.id === id) ?? LANGUAGE_PAIRS[0];
}

// ---------------------------------------------------------------------------

export type SonioxLanguage = 'ja' | 'vi' | 'en' | 'zh' | 'ko';

export const SONIOX_CONFIG = {
  /** Real-time model — stt-rt-v4 (latest, Feb 2026) */
  model: 'stt-rt-v4',
  enableSpeakerDiarization: true,
  enableLanguageIdentification: false, // disabled — use strict hints per pair instead
} as const;

/**
 * Build Soniox session config for a given language pair.
 * Uses language_hints_strict to prevent drift into other languages.
 */
export function buildSonioxConfig(pair: LanguagePair, sampleRate: number) {
  return {
    model: SONIOX_CONFIG.model,
    audio_format: 'pcm_s16le',
    sample_rate: sampleRate,
    num_channels: 1,
    language_hints: pair.hints,
    language_hints_strict: true,
    enable_speaker_diarization: SONIOX_CONFIG.enableSpeakerDiarization,
    enable_language_identification: SONIOX_CONFIG.enableLanguageIdentification,
    translation: {
      type: 'two_way' as const,
      language_a: pair.langA,
      language_b: pair.langB,
    },
  };
}

/** Soniox REST API base URL for server-side calls */
export const SONIOX_API_URL = 'https://api.soniox.com/v1';

/** Soniox WebSocket endpoint for real-time streaming */
export const SONIOX_WS_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';
