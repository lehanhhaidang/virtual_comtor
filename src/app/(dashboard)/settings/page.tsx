'use client';

import { useState, useEffect } from 'react';
import { User, Globe, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useI18n, type Locale } from '@/lib/i18n';

const LANGUAGES: { code: Locale; label: string; flag: string; nativeLabel: string }[] = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', nativeLabel: 'VI' },
  { code: 'en', label: 'English', flag: '🇺🇸', nativeLabel: 'EN' },
  { code: 'ja', label: '日本語', flag: '🇯🇵', nativeLabel: 'JA' },
];

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { t, locale, setLocale } = useI18n();

  const [name, setName] = useState('');
  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Sync form with user data
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  // Sync locale picker with current locale
  useEffect(() => {
    setSelectedLocale(locale);
  }, [locale]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      // Update profile on server
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t.common.error);
      }

      // Apply language change locally
      setLocale(selectedLocale);

      // Refresh user context
      if (refreshUser) await refreshUser();

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.settings.title}</h1>
      </div>

      {/* Profile section */}
      <div className="rounded-2xl border border-border/60 bg-card/80 p-6 space-y-5">
        <div className="flex items-center gap-3 pb-1 border-b border-border/40">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">{t.settings.profile}</h2>
            <p className="text-xs text-muted-foreground">{t.settings.profileDescription}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              {t.settings.name}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl"
              placeholder={user?.name || ''}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.settings.email}</Label>
            <Input
              value={user?.email || ''}
              disabled
              className="h-11 rounded-xl opacity-60 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Language section */}
      <div className="rounded-2xl border border-border/60 bg-card/80 p-6 space-y-5">
        <div className="flex items-center gap-3 pb-1 border-b border-border/40">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">{t.settings.languageSection}</h2>
            <p className="text-xs text-muted-foreground">{t.settings.languageDescription}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <ToggleGroup
            type="single"
            value={selectedLocale}
            onValueChange={(val) => { if (val) setSelectedLocale(val as Locale); }}
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
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center justify-end gap-4">
        {saveSuccess && (
          <span className="flex items-center gap-1.5 text-sm text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            {t.settings.saveSuccess}
          </span>
        )}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="min-w-[140px] rounded-xl"
        >
          {isSaving ? t.settings.saving : t.settings.saveAll}
        </Button>
      </div>
    </div>
  );
}
