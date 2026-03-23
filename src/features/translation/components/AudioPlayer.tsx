'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps {
  meetingId: string;
  meetingTitle: string;
  dataKey: CryptoKey;
  onTimeUpdate?: (currentMs: number) => void;
  seekRef?: React.MutableRefObject<((ms: number) => void) | null>;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Try the most compatible MIME types in order
const AUDIO_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', ''];

export function AudioPlayer({ meetingId, dataKey, onTimeUpdate, seekRef }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'no-audio' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        console.log('[AudioPlayer] fetching audio for meeting', meetingId);
        const res = await fetch(`/api/meetings/${meetingId}/audio`);

        if (res.status === 404) {
          console.log('[AudioPlayer] no audio found (404)');
          if (!cancelled) setStatus('no-audio');
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const rawBytes = new Uint8Array(await res.arrayBuffer());
        console.log('[AudioPlayer] downloaded encrypted bytes:', rawBytes.length);

        if (rawBytes.length < 13) {
          throw new Error(`Audio file too small: ${rawBytes.length} bytes`);
        }

        const iv = rawBytes.slice(0, 12);
        const ciphertext = rawBytes.slice(12);
        console.log('[AudioPlayer] IV:', iv.length, 'bytes, ciphertext:', ciphertext.length, 'bytes');

        let decrypted: ArrayBuffer;
        try {
          decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            dataKey,
            ciphertext
          );
        } catch (decryptErr) {
          console.error('[AudioPlayer] decrypt failed:', decryptErr);
          throw new Error(`Decrypt failed: ${decryptErr instanceof Error ? decryptErr.message : decryptErr}`);
        }

        console.log('[AudioPlayer] decrypted size:', decrypted.byteLength, 'bytes');

        if (cancelled) return;

        // Try MIME types to find one the browser can play
        const audio = audioRef.current;
        if (!audio) {
          throw new Error('Audio element not mounted');
        }

        // Revoke previous URL
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }

        // Try each MIME type — pick the first one browser can play
        let chosenMime = 'audio/webm';
        for (const mime of AUDIO_MIME_TYPES) {
          if (!mime || audio.canPlayType(mime) !== '') {
            chosenMime = mime || 'audio/webm';
            console.log('[AudioPlayer] using MIME type:', chosenMime, '→', audio.canPlayType(chosenMime));
            break;
          }
        }

        const blob = new Blob([decrypted], { type: chosenMime });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        console.log('[AudioPlayer] blob URL created, size:', blob.size);

        audio.src = url;
        audio.load();
        setStatus('ready');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[AudioPlayer] load error:', msg);
        if (!cancelled) {
          setErrorMsg(msg);
          setStatus('error');
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [meetingId, dataKey]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  // Wire seekTo
  useEffect(() => {
    if (!seekRef) return;
    seekRef.current = (ms: number) => {
      const audio = audioRef.current;
      if (!audio || status !== 'ready') return;
      audio.currentTime = ms / 1000;
      audio.play().catch((e) => console.error('[AudioPlayer] seek-play error:', e));
      setPlaying(true);
    };
  }, [seekRef, status]);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || status !== 'ready') return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch((e) => {
        console.error('[AudioPlayer] play error:', e);
        setErrorMsg(`Play error: ${e.message}`);
      });
      setPlaying(true);
    }
  }, [playing, status]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const ms = Number(e.target.value);
    audio.currentTime = ms / 1000;
    setCurrentMs(ms);
  }, []);

  if (status === 'no-audio') return null;

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/40 bg-card/80 px-4 py-3">
      {status === 'error' && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="truncate">{errorMsg || 'Audio unavailable'}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Always-mounted audio element */}
        <audio
          ref={audioRef}
          preload="auto"
          onTimeUpdate={(e) => {
            const ms = (e.currentTarget.currentTime * 1000) | 0;
            setCurrentMs(ms);
            onTimeUpdate?.(ms);
          }}
          onDurationChange={(e) => {
            const dur = e.currentTarget.duration;
            console.log('[AudioPlayer] duration:', dur);
            if (isFinite(dur) && dur > 0) setDurationMs((dur * 1000) | 0);
          }}
          onError={(e) => {
            const err = e.currentTarget.error;
            const msg = err ? `MediaError ${err.code}: ${err.message}` : 'Unknown media error';
            console.error('[AudioPlayer] media error:', msg);
            setErrorMsg(msg);
            setStatus('error');
          }}
          onCanPlay={() => console.log('[AudioPlayer] canPlay fired')}
          onLoadedMetadata={(e) => {
            console.log('[AudioPlayer] metadata loaded, duration:', e.currentTarget.duration);
          }}
          onEnded={() => setPlaying(false)}
        />

        {/* Play / Pause */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={status === 'loading' || status === 'error'}
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
            max={durationMs || 1}
            value={currentMs}
            onChange={handleSeek}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-primary"
          />
          <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">
            {durationMs > 0 ? formatTime(durationMs) : '--:--'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AudioPlayer;
