'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { SONIOX_WS_URL, buildSonioxConfig, parsePairId, type SonioxLanguage } from '@/lib/soniox';
import type { SonioxResponse } from '@/types/transcript.types';

// ---------------------------------------------------------------------------

interface UseSonioxRealtimeOptions {
  languagePairId?: string;
  onFinalTokens: (
    speakerId: string,
    language: SonioxLanguage,
    originalText: string,
    translatedText: string,
    startMs: number,
    endMs: number,
    confidence: number,
  ) => void;
  onInterimTokens: (text: string, speakerId: string, language: SonioxLanguage) => void;
  onTranslationOnly: (translatedText: string) => void;
  onError: (error: string) => void;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// ---------------------------------------------------------------------------

/**
 * useSonioxRealtime — WebSocket lifecycle for Soniox real-time STT + translation.
 *
 * Features:
 *   - Live mic streaming with auto-reconnect on unexpected WS close
 *   - File-based streaming (for import re-transcription)
 *   - Temp key TTL: 4h (renewed on each connect)
 */
export function useSonioxRealtime(options: UseSonioxRealtimeOptions) {
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  const pair = parsePairId(options.languagePairId ?? 'ja:vi');

  const [state, setState] = useState<ConnectionState>('disconnected');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const wsRef        = useRef<WebSocket | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const contextRef   = useRef<AudioContext | null>(null);

  // Tracks whether we should be live (used to gate auto-reconnect)
  const isLiveRef          = useRef(false);
  const reconnectTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getTempKey = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/soniox/temp-key', { method: 'POST' });
      if (!res.ok) {
        optionsRef.current.onError(`Soniox key failed: ${res.status}`);
        return null;
      }
      const data = await res.json();
      if (data.success && data.data?.key) return data.data.key;
      optionsRef.current.onError('Failed to get Soniox API key');
      return null;
    } catch (err) {
      console.error('[Soniox] getTempKey error:', err);
      optionsRef.current.onError('Network error getting API key');
      return null;
    }
  }, []);

  const sendPcmAsInt16 = useCallback((ws: WebSocket, float32: Float32Array) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    ws.send(int16.buffer);
  }, []);

  /** Parse Soniox token stream and fire callbacks. */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const response: SonioxResponse = JSON.parse(event.data);
      if (!response.tokens?.length) return;

      // Translation-only message (separate WS frame from Soniox)
      if (response.tokens.every((t) => t.translation_status === 'translation')) {
        const text = response.tokens.map((t) => t.text).join('').trim();
        if (text) optionsRef.current.onTranslationOnly(text);
        return;
      }

      // Debug: log any "none" tokens (not translated) so we can trace language drift
      const noneTokens = response.tokens.filter((t) => (t.translation_status || 'none') === 'none');
      if (noneTokens.length > 0) {
        const langs = [...new Set(noneTokens.map((t) => t.language || '?'))].join(', ');
        // tokens not translated — skip silently
      }

      type TokenGroup = {
        speakerId: string;
        language: SonioxLanguage;
        texts: string[];
        startMs: number;
        endMs: number;
        isFinal: boolean;
        totalConfidence: number;
        confidenceCount: number;
      };

      let group: TokenGroup | null = null;
      let translationTexts: string[] = [];

      const flush = () => {
        if (!group) return;
        const originalText = group.texts.join('').trim();
        const translatedText = translationTexts.join('').trim();
        if (originalText) {
          const avgConf = group.confidenceCount > 0
            ? group.totalConfidence / group.confidenceCount
            : 0.5;
          if (group.isFinal) {
            optionsRef.current.onFinalTokens(
              group.speakerId, group.language,
              originalText, translatedText,
              group.startMs, group.endMs, avgConf,
            );
          } else {
            optionsRef.current.onInterimTokens(originalText, group.speakerId, group.language);
          }
        }
        group = null;
        translationTexts = [];
      };

      for (const token of response.tokens) {
        const status = token.translation_status || 'none';
        if (status === 'translation') {
          translationTexts.push(token.text);
          continue;
        }

        const speakerId = token.speaker || '0';
        const language: SonioxLanguage = (token.language || 'ja') === 'vi' ? 'vi' : 'ja';

        if (group && group.speakerId !== speakerId) flush();

        if (!group) {
          group = { speakerId, language, texts: [], startMs: token.start_ms || 0, endMs: token.end_ms || 0, isFinal: false, totalConfidence: 0, confidenceCount: 0 };
        }
        group.texts.push(token.text);
        if (token.end_ms) group.endMs = token.end_ms;
        if (token.is_final) group.isFinal = true;
        if (token.confidence) { group.totalConfidence += token.confidence; group.confidenceCount++; }
      }
      flush();
    } catch (err) {
      console.error('[Soniox] Parse error:', err, 'Raw:', String(event.data).slice(0, 300));
    }
  }, []);

  /**
   * Open a Soniox WebSocket and send the config frame.
   * Returns the WebSocket (in OPEN state with config sent).
   */
  const openWebSocket = useCallback(async (tempKey: string, sampleRate: number): Promise<WebSocket> => {
    const ws = new WebSocket(SONIOX_WS_URL);
    wsRef.current = ws;

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({
          api_key: tempKey,
          ...buildSonioxConfig(pair.langA, pair.langB, sampleRate),
        }));
        resolve();
      };
      ws.onerror = () => reject(new Error('WebSocket connection error'));
    });

    ws.onmessage = handleMessage;
    return ws;
  }, [handleMessage, pair]);

  /** Tear down audio graph + WS, without touching isLiveRef. */
  const teardown = useCallback(() => {
    processorRef.current?.disconnect();
    contextRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();
    processorRef.current = null;
    contextRef.current = null;
    streamRef.current = null;
    wsRef.current = null;
  }, []);

  /**
   * Wire mic stream → AudioContext → ScriptProcessor → Soniox WS.
   * Sets up auto-reconnect on unexpected WS close.
   */
  const connectMic = useCallback(async (micStream: MediaStream) => {
    const tempKey = await getTempKey();
    if (!tempKey) { setState('error'); return; }

    setState('connecting');
    const audioContext = new AudioContext();
    contextRef.current = audioContext;

    const ws = await openWebSocket(tempKey, audioContext.sampleRate);
    setState('connected');

    ws.onclose = () => {
      setState('disconnected');
      if (isLiveRef.current) {
        console.warn('[Soniox] WS closed unexpectedly — reconnecting in 1s…');
        setState('connecting');
        reconnectTimerRef.current = setTimeout(() => {
          if (isLiveRef.current) connectMic(micStream);
        }, 1000);
      }
    };

    const source = audioContext.createMediaStreamSource(micStream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      sendPcmAsInt16(ws, e.inputBuffer.getChannelData(0));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }, [getTempKey, openWebSocket, sendPcmAsInt16]);

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Start live mic transcription with auto-reconnect. */
  const start = useCallback(async () => {
    setState('connecting');
    isLiveRef.current = true;

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = micStream;
      setStream(micStream);
      await connectMic(micStream);
    } catch (err) {
      isLiveRef.current = false;
      setState('error');
      optionsRef.current.onError(err instanceof Error ? err.message : 'Failed to start transcription');
    }
  }, [connectMic]);

  /**
   * Stream an audio File through Soniox (for import re-transcription).
   * Resolves when WS closes (all tokens flushed).
   */
  const startFromFile = useCallback(async (file: File): Promise<void> => {
    setState('connecting');

    try {
      const tempKey = await getTempKey();
      if (!tempKey) { setState('error'); return; }

      streamRef.current = null;
      setStream(null);

      const audioContext = new AudioContext();
      contextRef.current = audioContext;

      const audioBuffer = await audioContext.decodeAudioData(await file.arrayBuffer());
      const ws = await openWebSocket(tempKey, audioContext.sampleRate);
      setState('connected');

      const closed = new Promise<void>((resolve) => {
        ws.addEventListener('close', () => resolve(), { once: true });
      });

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        sendPcmAsInt16(ws, e.inputBuffer.getChannelData(0));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      source.start(0);
      source.onended = () => setTimeout(() => ws.close(), 800);

      await closed;
    } catch (err) {
      setState('error');
      optionsRef.current.onError(err instanceof Error ? err.message : 'Failed to start file transcription');
    }
  }, [getTempKey, openWebSocket, sendPcmAsInt16]);

  /** Stop transcription and cancel any pending reconnect. */
  const stop = useCallback(() => {
    isLiveRef.current = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    teardown();
    setState('disconnected');
    setStream(null);
  }, [teardown]);

  // Cleanup on unmount
  useEffect(() => () => { stop(); }, [stop]);

  return useMemo(
    () => ({ state, start, startFromFile, stop, stream }),
    [state, start, startFromFile, stop, stream],
  );
}
