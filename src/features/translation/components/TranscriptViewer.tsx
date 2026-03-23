'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  FileSpreadsheet,
  Trash2,
  Loader2,
  Lock,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { decrypt } from '@/lib/crypto';
import { exportToXLSX } from '../helpers/exportTranscript';
import type { TranscriptEntry } from '@/types/transcript.types';
import type { ApiResponse } from '@/types/api.types';
import { TranscriptEntryItem } from './TranscriptEntryItem';
import { MeetingSummary } from './MeetingSummary';
import { AudioPlayer } from './AudioPlayer';

interface TranscriptViewerProps {
  meetingId: string;
  meetingTitle: string;
  projectId?: string;
}

/**
 * TranscriptViewer — displays encrypted transcript entries (decrypted client-side).
 * Supports search, export, and delete.
 */
export function TranscriptViewer({
  meetingId,
  meetingTitle,
  projectId,
}: TranscriptViewerProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { getDataKey } = useAuth();

  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dataKeyRef, setDataKeyRef] = useState<CryptoKey | null>(null);
  const [downloadingAudio, setDownloadingAudio] = useState(false);
  // Audio playback sync
  const [currentMs, setCurrentMs] = useState(0);
  const seekToRef = useRef<((ms: number) => void) | null>(null);
  const activeEntryRef = useRef<HTMLDivElement | null>(null);

  // Fetch data key eagerly — needed for both transcript decrypt AND audio player
  useEffect(() => {
    getDataKey().then((key) => { if (key) setDataKeyRef(key); });
  }, [getDataKey]);

  // Fetch and decrypt entries on mount
  useEffect(() => {
    let cancelled = false;
    const fetchAndDecrypt = async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/transcript`);
        const data: ApiResponse<{ entries: TranscriptEntry[] }> = await res.json();

        if (!data.success || cancelled) return;

        const rawEntries = data.data.entries;
        if (rawEntries.length === 0) {
          setEntries([]);
          setLoading(false);
          return;
        }

        // Get data key for decryption
        const dataKey = await getDataKey();
        if (!dataKey || cancelled) {
          setError(
            t.meeting.encryptionNotice ?? 'Encryption key not available. Please re-login.'
          );
          setLoading(false);
          return;
        }

        setDataKeyRef(dataKey);

        // Decrypt each entry's text fields
        const decrypted: TranscriptEntry[] = await Promise.all(
          rawEntries.map(async (entry) => {
            try {
              const originalText = await decrypt(entry.originalText, dataKey);
              const translatedText = entry.translatedText
                ? await decrypt(entry.translatedText, dataKey)
                : '';
              return { ...entry, originalText, translatedText };
            } catch {
              // If decryption fails, show the raw (encrypted) text
              return { ...entry, originalText: '[decryption failed]', translatedText: '' };
            }
          })
        );

        if (!cancelled) setEntries(decrypted);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load transcript');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAndDecrypt();
    return () => { cancelled = true; };
  }, [meetingId, getDataKey, t]);

  // Client-side search filtering
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.originalText.toLowerCase().includes(q) ||
        e.translatedText.toLowerCase().includes(q) ||
        e.speakerLabel.toLowerCase().includes(q) ||
        e.language.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await fetch(`/api/meetings/${meetingId}/transcript`, { method: 'DELETE' });
      setEntries([]);
      setShowDeleteConfirm(false);
    } catch {
      setError('Failed to delete transcript');
    } finally {
      setDeleting(false);
    }
  }, [meetingId]);

  const handleBack = useCallback(() => {
    router.push(projectId ? `/projects/${projectId}` : '/projects');
  }, [router, projectId]);

  // Auto-scroll active entry into view during playback
  useEffect(() => {
    activeEntryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentMs]);

  return (
    <div className="flex h-[100dvh] flex-col gap-2 lg:h-[calc(100vh-4rem)] lg:gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{meetingTitle}</h1>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              {t.meeting.encryptionNotice ?? 'End-to-end encrypted'}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/30 bg-card/40 px-3 py-2 lg:px-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.meeting.searchTranscript ?? 'Search transcript...'}
            className="h-9 rounded-lg pl-9 text-sm"
          />
        </div>



        <Button
          variant="ghost"
          size="sm"
          disabled={downloadingAudio}
          onClick={async () => {
            if (!dataKeyRef) return;
            setDownloadingAudio(true);
            try {
              const res = await fetch(`/api/meetings/${meetingId}/audio`);
              if (!res.ok) throw new Error('No audio');
              const encrypted = new Uint8Array(await res.arrayBuffer());
              const iv = encrypted.slice(0, 12);
              const ciphertext = encrypted.slice(12);
              const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                dataKeyRef,
                ciphertext
              );
              const blob = new Blob([decrypted], { type: 'audio/webm' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${meetingTitle}.webm`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              // No audio available or decryption failed
            } finally {
              setDownloadingAudio(false);
            }
          }}
          className="gap-1.5 text-xs"
        >
          {downloadingAudio ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {t.meeting.downloadAudio}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={entries.length === 0}
          onClick={() => exportToXLSX(entries, meetingTitle)}
          className="gap-1.5 text-xs"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          {t.meeting.exportXLSX}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={entries.length === 0}
          onClick={() => setShowDeleteConfirm(true)}
          className="gap-1.5 text-xs text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t.meeting.deleteTranscript ?? 'Delete'}
        </Button>
      </div>

      {/* Audio player — shown when data key is ready (audio may or may not exist) */}
      {dataKeyRef && (
        <AudioPlayer
          meetingId={meetingId}
          meetingTitle={meetingTitle}
          dataKey={dataKeyRef}
          onTimeUpdate={setCurrentMs}
          seekRef={seekToRef}
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="mb-2 text-sm text-destructive">
            {t.meeting.confirmDelete ?? 'Are you sure? This cannot be undone.'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {t.common.delete}
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Entries */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border/30 bg-card/40 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {entries.length === 0
                ? (t.meeting.noTranscript ?? 'No transcript')
                : 'No results found'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry) => {
              const active = currentMs >= entry.startMs && currentMs < entry.endMs;
              return (
                <div key={entry.id ?? `${entry.startMs}-${entry.speakerId}`} ref={active ? activeEntryRef : null}>
                  <TranscriptEntryItem
                    entry={entry}
                    isActive={active}
                    onSeek={seekToRef.current ? (ms) => seekToRef.current!(ms) : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Summary */}
      {entries.length > 0 && (
        <MeetingSummary
          meetingId={meetingId}
          entries={entries}
          dataKey={dataKeyRef}
        />
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-between rounded-xl border border-border/30 bg-card/40 px-4 py-2 text-xs text-muted-foreground">
        <span>{filtered.length} / {entries.length} entries</span>
        <span>
          🇯🇵 {entries.filter((e) => e.language === 'ja').length} •{' '}
          🇻🇳 {entries.filter((e) => e.language === 'vi').length}
        </span>
      </div>
    </div>
  );
}

export default TranscriptViewer;
