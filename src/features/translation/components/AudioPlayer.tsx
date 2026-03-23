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
 * Returns null (hidden) if no audio is available for this meeting.
 */
export function AudioPlayer({
  meetingId,
  dataKey,
  onTimeUpdate,
  seekRef,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Keep objectUrl in a ref AND state — ref survives cleanup, state drives render
  const objectUrlRef = useRef<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-audio'>('loading');
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  // Decrypt audio and create a stable object URL
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/audio`);
        if (res.status === 404) {
          if (!cancelled) setStatus('no-audio');
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const encrypted = new Uint8Array(await res.arrayBuffer());
        const iv = encrypted.slice(0, 12);
        const ciphertext = encrypted.slice(12);

        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          dataKey,
          ciphertext
        );

        if (cancelled) return;

        const url = URL.createObjectURL(new Blob([decrypted], { type: 'audio/webm' }));
        objectUrlRef.current = url;
        setObjectUrl(url);
        setStatus('ready');
      } catch (err) {
        console.error('[AudioPlayer] load error', err);
        if (!cancelled) setStatus('error');
      }
    };

    load();

    // Only revoke on full unmount — NOT on every re-run
    return () => {
      cancelled = true;
    };
  }, [meetingId, dataKey]);

  // Revoke object URL only when component fully unmounts
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // Wire seekTo ref so parent can seek programmatically
  useEffect(() => {
    if (!seekRef) return;
    seekRef.current = (ms: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = ms / 1000;
      audio.play().catch(() => null);
      setPlaying(true);
    };
  }, [seekRef]);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || status !== 'ready') return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => null);
      setPlaying(true);
    }
  }, [playing, status]);

  const handleSeekBar = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const ms = Number(e.target.value);
    audio.currentTime = ms / 1000;
    setCurrentMs(ms);
  }, []);

  // Not available → render nothing
  if (status === 'no-audio' || status === 'error') return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/80 px-4 py-3">
      {/* Audio element — mounted as soon as URL is ready */}
      {objectUrl && (
        <audio
          ref={audioRef}
          src={objectUrl}
          preload="auto"
          onTimeUpdate={(e) => {
            const ms = (e.currentTarget.currentTime * 1000) | 0;
            setCurrentMs(ms);
            onTimeUpdate?.(ms);
          }}
          onDurationChange={(e) => {
            const dur = e.currentTarget.duration;
            if (isFinite(dur)) setDurationMs((dur * 1000) | 0);
          }}
          onEnded={() => setPlaying(false)}
        />
      )}

      {/* Play / Pause button */}
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

      {/* Progress bar + timestamps */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {formatTime(currentMs)}
        </span>
        <input
          type="range"
          min={0}
          max={durationMs || 1}
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
