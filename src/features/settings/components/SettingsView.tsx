'use client';

import { Globe, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '../hooks/useSettings';
import { ProfileForm } from './ProfileForm';
import { LanguageSelector } from './LanguageSelector';

export function SettingsView() {
  const {
    user,
    t,
    name,
    setName,
    selectedLocale,
    setSelectedLocale,
    isSaving,
    saveSuccess,
    error,
    handleSave,
  } = useSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.settings.title}</h1>
      </div>

      {/* Profile section */}
      <ProfileForm
        t={t}
        name={name}
        onNameChange={setName}
        email={user?.email ?? ''}
      />

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

        <LanguageSelector value={selectedLocale} onChange={setSelectedLocale} />
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
