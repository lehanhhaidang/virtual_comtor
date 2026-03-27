'use client';

import { User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TranslationSet } from '@/lib/i18n';

interface ProfileFormProps {
  t: TranslationSet;
  name: string;
  onNameChange: (v: string) => void;
  email: string;
}

export function ProfileForm({ t, name, onNameChange, email }: ProfileFormProps) {
  return (
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
            onChange={(e) => onNameChange(e.target.value)}
            className="h-11 rounded-xl"
            placeholder={name}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">{t.settings.email}</Label>
          <Input
            value={email}
            disabled
            className="h-11 rounded-xl opacity-60 cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
