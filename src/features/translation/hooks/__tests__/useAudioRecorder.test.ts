// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioRecorder } from '../useAudioRecorder';

// Mock MediaRecorder
class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  static isTypeSupported(_mimeType: string): boolean {
    return true;
  }

  start(_timeslice?: number): void {
    this.state = 'recording';
  }

  stop(): void {
    this.state = 'inactive';
    // Simulate data available
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['test-audio-data'], { type: 'audio/webm' }) });
    }
    // Simulate stop
    if (this.onstop) {
      this.onstop();
    }
  }
}

function createMockStream(): MediaStream {
  return {
    getTracks: () => [],
    getAudioTracks: () => [],
    getVideoTracks: () => [],
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    clone: vi.fn(),
    active: true,
    id: 'mock-stream-id',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onaddtrack: null,
    onremovetrack: null,
  } as unknown as MediaStream;
}

describe('useAudioRecorder', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Install MockMediaRecorder globally
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).MediaRecorder = MockMediaRecorder;

    createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).MediaRecorder;
  });

  it('has correct initial state', () => {
    const { result } = renderHook(() => useAudioRecorder());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.hasRecording).toBe(false);
    expect(result.current.duration).toBe(0);
  });

  it('isRecording is true after startRecording', () => {
    const { result } = renderHook(() => useAudioRecorder());
    const mockStream = createMockStream();

    act(() => {
      result.current.startRecording(mockStream);
    });

    expect(result.current.isRecording).toBe(true);
  });

  it('tracks duration while recording', () => {
    const { result } = renderHook(() => useAudioRecorder());
    const mockStream = createMockStream();

    act(() => {
      result.current.startRecording(mockStream);
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.duration).toBe(3);
  });

  it('isRecording is false and hasRecording is true after stopRecording', () => {
    const { result } = renderHook(() => useAudioRecorder());
    const mockStream = createMockStream();

    act(() => {
      result.current.startRecording(mockStream);
    });

    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.hasRecording).toBe(true);
  });

  it('downloadRecording creates object URL and triggers click', () => {
    const { result } = renderHook(() => useAudioRecorder());
    const mockStream = createMockStream();

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    act(() => {
      result.current.startRecording(mockStream);
    });

    act(() => {
      result.current.stopRecording();
    });

    act(() => {
      result.current.downloadRecording('test-meeting');
    });

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});
