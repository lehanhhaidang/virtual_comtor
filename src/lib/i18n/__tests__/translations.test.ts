import { describe, it, expect } from 'vitest';
import { vi as viLang } from '@/lib/i18n/vi';
import { en } from '@/lib/i18n/en';
import { ja } from '@/lib/i18n/ja';
import type { TranslationSet } from '@/lib/i18n/types';

/**
 * Helper to get all leaf keys from a nested object.
 */
function getLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getLeafKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe('i18n Translations', () => {
  const locales: { name: string; data: TranslationSet }[] = [
    { name: 'Vietnamese (vi)', data: viLang },
    { name: 'English (en)', data: en },
    { name: 'Japanese (ja)', data: ja },
  ];

  it('all locales should have the same keys', () => {
    const viKeys = getLeafKeys(viLang as unknown as Record<string, unknown>).sort();
    const enKeys = getLeafKeys(en as unknown as Record<string, unknown>).sort();
    const jaKeys = getLeafKeys(ja as unknown as Record<string, unknown>).sort();

    expect(enKeys).toEqual(viKeys);
    expect(jaKeys).toEqual(viKeys);
  });

  for (const locale of locales) {
    describe(locale.name, () => {
      it('should have non-empty common.appName', () => {
        expect(locale.data.common.appName).toBe('Virtual Comtor');
      });

      it('should have non-empty auth section', () => {
        expect(locale.data.auth.login.length).toBeGreaterThan(0);
        expect(locale.data.auth.register.length).toBeGreaterThan(0);
        expect(locale.data.auth.loginTitle.length).toBeGreaterThan(0);
        expect(locale.data.auth.registerTitle.length).toBeGreaterThan(0);
        expect(locale.data.auth.email.length).toBeGreaterThan(0);
        expect(locale.data.auth.password.length).toBeGreaterThan(0);
      });

      it('should have non-empty landing section', () => {
        expect(locale.data.landing.heroTitle.length).toBeGreaterThan(0);
        expect(locale.data.landing.ctaStart.length).toBeGreaterThan(0);
      });

      it('should have non-empty dashboard section', () => {
        expect(locale.data.dashboard.projects.length).toBeGreaterThan(0);
        expect(locale.data.dashboard.meetings.length).toBeGreaterThan(0);
      });

      it('should have non-empty meeting section', () => {
        expect(locale.data.meeting.customer).toBe('Customer');
        expect(locale.data.meeting.our).toBe('Our');
      });

      it('should have footer with year placeholder', () => {
        expect(locale.data.landing.footer).toContain('{year}');
      });

      it('all string values should be non-empty', () => {
        const keys = getLeafKeys(locale.data as unknown as Record<string, unknown>);
        for (const key of keys) {
          const value = key.split('.').reduce<unknown>(
            (obj, k) => (obj as Record<string, unknown>)?.[k],
            locale.data
          );
          expect(value, `Key "${key}" should not be empty`).toBeTruthy();
        }
      });
    });
  }
});
