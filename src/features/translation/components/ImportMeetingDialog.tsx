'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h3 className="mb-1 text-lg font-semibold">Import cuộc họp cũ</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Upload audio (nhiều định dạng) và/hoặc file transcript XLSX export.
          Nếu chỉ có audio, hệ thống sẽ chạy Soniox để tạo lại transcript.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Audio file</label>
            <input
              type="file"
              accept="audio/*,.webm,.wav,.mp3,.m4a,.aac,.flac,.ogg,.mp4"
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              disabled={busy}
            />
            {audioLabel && <div className="text-xs text-muted-foreground">{audioLabel}</div>}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Transcript XLSX (optional)</label>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={async (e) => {
                const f = e.target.files?.[0] ?? null;
                setXlsxFile(f);
                setXlsxBuffer(f ? await f.arrayBuffer() : null);
              }}
              disabled={busy}
            />
            {xlsxLabel && <div className="text-xs text-muted-foreground">{xlsxLabel}</div>}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
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
            {busy ? 'Đang import…' : 'Import'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ImportMeetingDialog;
