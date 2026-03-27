'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface ImportMeetingDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (payload: { audioFile?: File; xlsxArrayBuffer?: ArrayBuffer }) => Promise<void>;
}

export function ImportMeetingDialog({ open, onClose, onImport }: ImportMeetingDialogProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [xlsxBuffer, setXlsxBuffer] = useState<ArrayBuffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const audioLabel = useMemo(() => (audioFile ? `${audioFile.name} (${Math.round(audioFile.size / 1024 / 1024)}MB)` : ''), [audioFile]);
  const xlsxLabel = useMemo(() => (xlsxFile ? xlsxFile.name : ''), [xlsxFile]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import cuộc họp cũ</DialogTitle>
          <DialogDescription>
            Upload audio (nhiều định dạng) và/hoặc file transcript XLSX export.
            Nếu chỉ có audio, hệ thống sẽ chạy Soniox để tạo lại transcript.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 py-4">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Audio file</label>
            <input
              type="file"
              accept="audio/*,.webm,.wav,.mp3,.m4a,.aac,.flac,.ogg,.mp4"
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              disabled={busy}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent/80"
            />
            {audioLabel && <p className="text-xs text-muted-foreground">{audioLabel}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Transcript XLSX <span className="text-muted-foreground font-normal">(tuỳ chọn)</span></label>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={async (e) => {
                const f = e.target.files?.[0] ?? null;
                setXlsxFile(f);
                setXlsxBuffer(f ? await f.arrayBuffer() : null);
              }}
              disabled={busy}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent/80"
            />
            {xlsxLabel && <p className="text-xs text-muted-foreground">{xlsxLabel}</p>}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy} className="rounded-xl">
            Huỷ
          </Button>
          <Button
            onClick={async () => {
              setError('');
              setBusy(true);
              try {
                await onImport({
                  audioFile: audioFile ?? undefined,
                  xlsxArrayBuffer: xlsxBuffer ?? undefined,
                });
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy || (!audioFile && !xlsxFile)}
            className="rounded-xl bg-vietnamese hover:bg-vietnamese/90"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Đang import…
              </span>
            ) : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportMeetingDialog;
