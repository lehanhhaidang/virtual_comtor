'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { SONIOX_CONFIG, SONIOX_WS_URL, type SonioxLanguage } from '@/lib/soniox';
import type { SonioxResponse } from '@/types/transcript.types';

interface UseSonioxRealtimeOptions {
  onFinalTokens: (
    speakerId: string,
    language: SonioxLanguage,
    originalText: string,
    translatedText: string,
    startMs: number,
    endMs: number,
    confidence: number
  ) => void;
  onInterimTokens: (text: string, speakerId: string, language: SonioxLanguage) => void;
  onTranslationOnly: (translatedText: string) => void;
  onError: (error: string) => void;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * useSonioxRealtime — WebSocket connection to Soniox for real-time STT.
 * Handles: mic access, audio streaming, response parsing, speaker/language extraction.
 */
export function useSonioxRealtime(options: UseSonioxRealtimeOptions) {
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  const [state, setState] = useState<ConnectionState>('disconnected');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  /**
   * Get temporary API key from our server.
   */
  const getTempKey = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/soniox/temp-key', { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        console.error('[Soniox] Temp key error:', res.status, text);
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

  /**
   * Parse Soniox response: group tokens by speaker, extract final/interim.
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const response: SonioxResponse = JSON.parse(event.data);

        if (!response.tokens?.length) {
          return;
        }

        // Check if this is a translation-only message (all tokens are translations)
        // This happens when Soniox sends translations in a separate WS message
        const allTranslation = response.tokens.every(
          (t) => t.translation_status === 'translation'
        );
        if (allTranslation) {
          const translatedText = response.tokens.map((t) => t.text).join('').trim();
          if (translatedText) {
            optionsRef.current.onTranslationOnly(translatedText);
          }
          return;
        }

        // Soniox sends tokens as: [original...] [translation...] [original...] [translation...]
        // Original tokens have: translation_status = "original" or "none", speaker, language
        // Translation tokens have: translation_status = "translation", source_language, language (of translation)
        // Group: collect originals → attach following translations to that group

        let currentOriginal: {
          speakerId: string;
          language: SonioxLanguage;
          texts: string[];
          startMs: number;
          endMs: number;
          isFinal: boolean;
          totalConfidence: number;
          confidenceCount: number;
        } | null = null;

        let translationTexts: string[] = [];

        const flush = () => {
          if (!currentOriginal) return;

          const originalText = currentOriginal.texts.join('').trim();
          const translatedText = translationTexts.join('').trim();

          if (!originalText) {
            currentOriginal = null;
            translationTexts = [];
            return;
          }

          const avgConfidence =
            currentOriginal.confidenceCount > 0
              ? currentOriginal.totalConfidence / currentOriginal.confidenceCount
              : 0.5;

          if (currentOriginal.isFinal) {
            optionsRef.current.onFinalTokens(
              currentOriginal.speakerId,
              currentOriginal.language,
              originalText,
              translatedText,
              currentOriginal.startMs,
              currentOriginal.endMs,
              avgConfidence
            );
          } else {
            optionsRef.current.onInterimTokens(originalText, currentOriginal.speakerId, currentOriginal.language);
          }

          currentOriginal = null;
          translationTexts = [];
        };

        for (const token of response.tokens) {
          const status = token.translation_status || 'none';

          if (status === 'translation') {
            // Translation token — attach to current original group
            translationTexts.push(token.text);
          } else {
            // Original or none — this is a source token
            // If we encounter a new original and there's a pending group, flush it
            const speakerId = token.speaker || '0';
            const rawLang = token.language || 'ja';
            const language: SonioxLanguage = rawLang === 'vi' ? 'vi' : 'ja';

            if (currentOriginal && currentOriginal.speakerId !== speakerId) {
              // Speaker changed — flush previous group
              flush();
            }

            if (!currentOriginal) {
              currentOriginal = {
                speakerId,
                language,
                texts: [],
                startMs: token.start_ms || 0,
                endMs: token.end_ms || 0,
                isFinal: false,
                totalConfidence: 0,
                confidenceCount: 0,
              };
            }

            currentOriginal.texts.push(token.text);
            if (token.end_ms) currentOriginal.endMs = token.end_ms;
            if (token.is_final) currentOriginal.isFinal = true;
            if (token.confidence) {
              currentOriginal.totalConfidence += token.confidence;
              currentOriginal.confidenceCount++;
            }
          }
        }

        // Flush last group
        flush();

      } catch (err) {
        console.error('[Soniox] Parse error:', err, 'Raw:', String(event.data).slice(0, 300));
      }
    },
    []
  );

  const sendPcmAsInt16 = useCallback((ws: WebSocket, float32: Float32Array) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    ws.send(int16.buffer);
  }, []);

  const connect = useCallback(async (tempKey: string, sampleRate: number) => {
    const ws = new WebSocket(SONIOX_WS_URL);
    wsRef.current = ws;

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        const config = {
          api_key: tempKey,
          model: SONIOX_CONFIG.model,
          audio_format: 'pcm_s16le',
          sample_rate: sampleRate,
          num_channels: 1,
          language_hints: SONIOX_CONFIG.languageHints,
          enable_speaker_diarization: SONIOX_CONFIG.enableSpeakerDiarization,
          enable_language_identification: SONIOX_CONFIG.enableLanguageIdentification,
          translation: {
            type: SONIOX_CONFIG.translation.type,
            language_a: SONIOX_CONFIG.translation.language_a,
            language_b: SONIOX_CONFIG.translation.language_b,
          },
        };
        ws.send(JSON.stringify(config));
        setState('connected');
        resolve();
      };
      ws.onerror = () => reject(new Error('WebSocket connection error'));
    });

    ws.onmessage = handleMessage;
    ws.onclose = () => setState('disconnected');

    return ws;
  }, [handleMessage]);

  /**
   * Start real-time transcription from microphone.
   */
  const start = useCallback(async () => {
    setState('connecting');

    try {
      const tempKey = await getTempKey();
      if (!tempKey) {
        setState('error');
        return;
      }

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = micStream;
      setStream(micStream);

      const audioContext = new AudioContext();
      contextRef.current = audioContext;

      const ws = await connect(tempKey, audioContext.sampleRate);

      const source = audioContext.createMediaStreamSource(micStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        sendPcmAsInt16(ws, inputData);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (err) {
      setState('error');
      optionsRef.current.onError(
        err instanceof Error ? err.message : 'Failed to start transcription'
      );
    }
  }, [connect, getTempKey, sendPcmAsInt16]);

  /**
   * Start transcription from an imported audio file.
   * Browser decodes audio → we stream PCM to Soniox over WebSocket.
   */
  const startFromFile = useCallback(async (file: File): Promise<void> => {
    setState('connecting');

    try {
      const tempKey = await getTempKey();
      if (!tempKey) {
        setState('error');
        return;
      }

      // No mic stream in file mode
      streamRef.current = null;
      setStream(null);

      const audioContext = new AudioContext();
      contextRef.current = audioContext;

      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

      const ws = await connect(tempKey, audioContext.sampleRate);

      // Resolve when WS closes (Soniox flush finished)
      const closed = new Promise<void>((resolve) => {
        ws.addEventListener('close', () => resolve(), { once: true });
      });

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        sendPcmAsInt16(ws, inputData);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Start playback (real-time streaming)
      source.start(0);
      source.onended = () => {
        // Allow Soniox to flush remaining tokens, then close
        setTimeout(() => {
          ws.close();
        }, 800);
      };

      await closed;
    } catch (err) {
      setState('error');
      optionsRef.current.onError(
        err instanceof Error ? err.message : 'Failed to start file transcription'
      );
    }
  }, [connect, getTempKey, sendPcmAsInt16]);

  /**
   * Stop transcription.
   */
  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    contextRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();

    processorRef.current = null;
    contextRef.current = null;
    streamRef.current = null;
    wsRef.current = null;

    setState('disconnected');
    setStream(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return useMemo(() => ({ state, start, startFromFile, stop, stream }), [state, start, startFromFile, stop, stream]);
}
