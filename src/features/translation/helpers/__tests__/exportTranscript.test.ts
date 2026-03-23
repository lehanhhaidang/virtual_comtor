// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCSV, exportToXLSX } from '../exportTranscript';
import type { TranscriptEntry } from '@/types/transcript.types';

function makeEntry(overrides: Partial<TranscriptEntry> = {}): TranscriptEntry {
  return {
    id: '1',
    meetingId: 'm1',
    speakerId: 's1',
    speakerLabel: 'Speaker 1',
    speakerNumber: 1,
    language: 'ja',
    originalText: 'こんにちは',
    translatedText: 'Xin chào',
    startMs: 5000,
    endMs: 8000,
    confidence: 0.95,
    isReply: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('exportTranscript', () => {
  let clickedDownload = '';
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clickedDownload = '';

    revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    global.URL.revokeObjectURL = revokeObjectURLMock;

    // Mock anchor element to capture click behavior
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        const originalClick = el.click.bind(el);
        el.click = () => {
          clickedDownload = el.getAttribute('download') || '';
          originalClick();
        };
      }
      return el;
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportToCSV', () => {
    it('generates CSV with correct header and data rows', () => {
      let capturedContent = '';
      const OriginalBlob = globalThis.Blob;
      const blobSpy = vi.spyOn(globalThis, 'Blob').mockImplementation(
        function (parts?: BlobPart[], options?: BlobPropertyBag) {
          if (parts && parts.length > 0 && typeof parts[0] === 'string') {
            capturedContent = parts[0];
          }
          return new OriginalBlob(parts, options);
        } as unknown as typeof Blob
      );

      const entries = [
        makeEntry({ startMs: 5000, speakerLabel: 'Customer 1', language: 'ja', originalText: 'こんにちは', translatedText: 'Xin chào' }),
        makeEntry({ id: '2', startMs: 65000, speakerLabel: 'Our 1', language: 'vi', originalText: 'Xin chào', translatedText: 'こんにちは' }),
      ];

      exportToCSV(entries, 'Test Meeting');

      expect(capturedContent).toContain('Time,Speaker,Language,Original,Translation');
      expect(capturedContent).toContain('00:05,Customer 1,ja,こんにちは,Xin chào');
      expect(capturedContent).toContain('01:05,Our 1,vi,Xin chào,こんにちは');
      expect(clickedDownload).toMatch(/^Test_Meeting_\d{4}-\d{2}-\d{2}\.csv$/);

      blobSpy.mockRestore();
    });

    it('properly escapes fields with commas and quotes', () => {
      let capturedContent = '';
      const OriginalBlob = globalThis.Blob;
      const blobSpy = vi.spyOn(globalThis, 'Blob').mockImplementation(
        function (parts?: BlobPart[], options?: BlobPropertyBag) {
          if (parts && parts.length > 0 && typeof parts[0] === 'string') {
            capturedContent = parts[0];
          }
          return new OriginalBlob(parts, options);
        } as unknown as typeof Blob
      );

      const entries = [
        makeEntry({ originalText: 'Hello, world', translatedText: 'She said "hi"' }),
      ];

      exportToCSV(entries, 'Test');

      expect(capturedContent).toContain('"Hello, world"');
      expect(capturedContent).toContain('"She said ""hi"""');

      blobSpy.mockRestore();
    });
  });

  describe('exportToXLSX', () => {
    it('generates XLSX with correct sheet and headers', async () => {
      const XLSX = await import('xlsx');
      let capturedBuffer: ArrayBuffer | null = null;

      const OriginalBlob = globalThis.Blob;
      const blobSpy = vi.spyOn(globalThis, 'Blob').mockImplementation(
        function (parts?: BlobPart[], options?: BlobPropertyBag) {
          if (parts && parts.length > 0 && parts[0] instanceof ArrayBuffer) {
            capturedBuffer = parts[0];
          }
          return new OriginalBlob(parts, options);
        } as unknown as typeof Blob
      );

      const entries = [
        makeEntry({ startMs: 5000, speakerLabel: 'Customer 1', language: 'ja', originalText: 'こんにちは', translatedText: 'Xin chào' }),
      ];

      exportToXLSX(entries, 'Test Meeting');

      expect(capturedBuffer).not.toBeNull();

      // Parse the generated workbook
      const workbook = XLSX.read(capturedBuffer, { type: 'array' });
      expect(workbook.SheetNames).toContain('Transcript');

      const sheet = workbook.Sheets['Transcript'];
      const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        Time: '00:05',
        Speaker: 'Customer 1',
        Language: 'ja',
        Original: 'こんにちは',
        Translation: 'Xin chào',
      });

      expect(clickedDownload).toMatch(/^Test_Meeting_\d{4}-\d{2}-\d{2}\.xlsx$/);

      blobSpy.mockRestore();
    });
  });
});
