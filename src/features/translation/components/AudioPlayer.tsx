'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps {
  meetingId: string;
  meetingTitle: string;
  dataKey: CryptoKey;
  /** Fires on every timeupdate — lets parent sync transcript highlight */
  onTimeUpdate?: (currentMs: number) => void;
  /** Ref to expose seekTo() to parent */
  seekRef?: React.MutableRefObject<((ms: number) => void) | null>;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * AudioPlayer — fetches & decrypts meeting audio, renders a styled playback bar.
 * Returns null if no audio is available.
 */
export function AudioPlayer({
  meetingId,
  dataKey,
  onTimeUpdate,
  seekRef,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-audio'>('loading');
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  // Decrypt and create object URL
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;

    const load = async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/audio`);
        if (res.status === 404) { setStatus('no-audio'); return; }
        if (!res.ok) throw new Error('fetch failed');

        const encrypted = new Uint8Array(await res.arrayBuffer());
        const iv = encrypted.slice(0, 12);
        const ciphertext = encrypted.slice(12);

        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          dataKey,
          ciphertext
        );

        if (cancelled) return;
        url = URL.createObjectURL(new Blob([decrypted], { type: 'audio/webm' }));
        setObjectUrl(url);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    load();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [meetingId, dataKey]);

  // Wire seekTo ref
  useEffect(() => {
    if (seekRef) {
      seekRef.current = (ms: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = ms / 1000;
        audio.play().catch(() => null);
        setPlaying(true);
      };
    }
  }, [seekRef]);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().catch(() => null); setPlaying(true); }
  }, [playing]);

  const handleSeekBar = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const ms = Number(e.target.value);
    audio.currentTime = ms / 1000;
    setCurrentMs(ms);
  }, []);

  if (status === 'no-audio' || status === 'error') return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/80 px-4 py-3">
      {/* Hidden audio element */}
      {objectUrl && (
        <audio
          ref={audioRef}
          src={objectUrl}
          onTimeUpdate={(e) => {
            const ms = (e.currentTarget.currentTime * 1000) | 0;
            setCurrentMs(ms);
            onTimeUpdate?.(ms);
          }}
          onDurationChange={(e) => setDurationMs((e.currentTarget.duration * 1000) | 0)}
          onEnded={() => setPlaying(false)}
        />
      )}

      {/* Play / Pause */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={status === 'loading'}
        onClick={handlePlayPause}
      >
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Seek bar */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {formatTime(currentMs)}
        </span>
        <input
          type="range"
          min={0}
          max={durationMs || 100}
          value={currentMs}
          onChange={handleSeekBar}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-primary"
        />
        <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatTime(durationMs)}
        </span>
      </div>
    </div>
  );
}

export default AudioPlayer;
