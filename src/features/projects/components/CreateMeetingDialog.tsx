'use client';

import { Loader2, Languages, BarChart3, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { SONIOX_LANGUAGES, LANGUAGE_PAIRS, langLabel } from '@/lib/soniox';

// Only show languages that appear in defined pairs
const DEFINED_LANG_CODES = [...new Set(LANGUAGE_PAIRS.flatMap((p) => [p.langA, p.langB]))];
const DEFINED_LANGUAGES = SONIOX_LANGUAGES.filter((l) => DEFINED_LANG_CODES.includes(l.code));

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onTitleChange: (v: string) => void;
  mode: 'standard' | 'private';
  onModeChange: (v: 'standard' | 'private') => void;
  langA: string;
  onLangAChange: (v: string) => void;
  langB: string;
  onLangBChange: (v: string) => void;
  onSwapLanguages: () => void;
  creating: boolean;
  error: string;
  onCreate: () => void;
  onClose: () => void;
}

export function CreateMeetingDialog({
  open,
  onOpenChange,
  title,
  onTitleChange,
  mode,
  onModeChange,
  langA,
  onLangAChange,
  langB,
  onLangBChange,
  onSwapLanguages,
  creating,
  error,
  onCreate,
  onClose,
}: CreateMeetingDialogProps) {
  const { t } = useI18n();
  const selectedPair = `${langLabel(langA)} ↔ ${langLabel(langB)}`;

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.dashboard.newMeeting}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-6 py-4">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.dashboard.meetingTitle} *</Label>
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Cuộc họp Sprint Review..."
              className="h-11 rounded-xl"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && onCreate()}
            />
          </div>

          {/* Language pair */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Cặp ngôn ngữ</Label>
            </div>
            <div className="flex items-center gap-2">
              <Select value={langA} onValueChange={onLangAChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFINED_LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code} disabled={l.code === langB}>
                      {l.flag ? `${l.flag} ` : ''}{l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Swap languages"
                onClick={onSwapLanguages}
                className="h-9 w-9 shrink-0 rounded-xl"
              >
                ⇄
              </Button>

              <Select value={langB} onValueChange={onLangBChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFINED_LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code} disabled={l.code === langA}>
                      {l.flag ? `${l.flag} ` : ''}{l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Chế độ</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                {
                  id: 'standard' as const,
                  icon: BarChart3,
                  title: t.meeting.modeStandard ?? 'Standard',
                  desc: t.meeting.modeStandardDesc ?? 'Transcript được mã hoá & lưu lại',
                },
                {
                  id: 'private' as const,
                  icon: Shield,
                  title: t.meeting.modePrivate ?? 'Private',
                  desc: t.meeting.modePrivateDesc ?? 'Không lưu dữ liệu sau cuộc họp',
                },
              ]).map(({ id, icon: Icon, title: mTitle, desc }) => {
                const isSelected = mode === id;
                return (
                  <Button
                    key={id}
                    type="button"
                    variant="outline"
                    onClick={() => onModeChange(id)}
                    className={`h-auto w-full flex-col items-start gap-1.5 rounded-2xl px-4 py-3 text-left transition-all ${
                      isSelected
                        ? 'border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/30'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4" />
                      {mTitle}
                    </span>
                    <span className="text-xs leading-snug text-muted-foreground">{desc}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <p className="mr-auto text-xs text-muted-foreground">
            {selectedPair}
            <span className="mx-1.5 opacity-40">·</span>
            {mode === 'standard' ? '📊 Standard' : '🔒 Private'}
          </p>
          <Button variant="ghost" onClick={onClose} className="rounded-xl">
            {t.common.cancel}
          </Button>
          <Button
            onClick={onCreate}
            disabled={creating || !title.trim()}
            className="gap-2 rounded-xl"
          >
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.common.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
