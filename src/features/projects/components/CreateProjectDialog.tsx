'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (v: string) => void;
  clientName: string;
  onClientNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  creating: boolean;
  error: string;
  onCreate: () => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  clientName,
  onClientNameChange,
  description,
  onDescriptionChange,
  creating,
  error,
  onCreate,
}: CreateProjectDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.dashboard.newProject}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4 py-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.dashboard.projectName} *</Label>
              <Input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Dự án ABC"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.dashboard.clientName}</Label>
              <Input
                value={clientName}
                onChange={(e) => onClientNameChange(e.target.value)}
                placeholder="Toyota Japan"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t.dashboard.description}</Label>
              <Input
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="Mô tả dự án (tùy chọn)"
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={onCreate}
            disabled={creating || !name.trim()}
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
