import type { SonioxLanguage } from '@/lib/soniox';

interface SpeakerInfo {
  label: string;
  language: SonioxLanguage;
  group: 'customer' | 'our';
  number: number;
}

/**
 * SpeakerLabeler — assigns human-readable labels to speaker IDs.
 *
 * Logic:
 * - Japanese speaker → "Customer N"
 * - Vietnamese speaker → "Our N"
 * - Same speaker always gets same label (first language wins)
 */
export class SpeakerLabeler {
  private speakers = new Map<string, SpeakerInfo>();
  private customerCount = 0;
  private ourCount = 0;

  /**
   * Get label for a speaker. Creates new mapping if first time.
   */
  getLabel(speakerId: string, language: SonioxLanguage): string {
    const existing = this.speakers.get(speakerId);
    if (existing) return existing.label;

    // First time seeing this speaker — classify by language
    const isJapanese = language === 'ja';
    const group = isJapanese ? 'customer' : 'our';
    const number = isJapanese ? ++this.customerCount : ++this.ourCount;
    const prefix = isJapanese ? 'Customer' : 'Our';
    const label = `${prefix} ${number}`;

    this.speakers.set(speakerId, { label, language, group, number });
    return label;
  }

  /**
   * Get info for a speaker.
   */
  getInfo(speakerId: string): SpeakerInfo | undefined {
    return this.speakers.get(speakerId);
  }

  /**
   * Get full speaker mapping.
   */
  getMapping(): Record<string, { label: string; language: SonioxLanguage }> {
    const result: Record<string, { label: string; language: SonioxLanguage }> = {};
    this.speakers.forEach((info, id) => {
      result[id] = { label: info.label, language: info.language };
    });
    return result;
  }

  /**
   * Reset labeler (for new meeting).
   */
  reset(): void {
    this.speakers.clear();
    this.customerCount = 0;
    this.ourCount = 0;
  }
}
