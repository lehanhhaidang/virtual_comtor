// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mongoose / TranscriptEntry model
const mockInsertMany = vi.fn();
const mockFind = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock('@/models/TranscriptEntry', () => ({
  default: {
    insertMany: (...args: unknown[]) => mockInsertMany(...args),
    find: (...args: unknown[]) => mockFind(...args),
    deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
  },
}));

vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

import { transcriptRepository } from '../transcript.repository';

describe('transcriptRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bulkCreate calls insertMany with ordered: false', async () => {
    mockInsertMany.mockResolvedValue([]);

    const entries = [
      {
        meetingId: 'meeting-1',
        speakerId: 'spk-0',
        speakerLabel: 'Customer 1',
        language: 'ja' as const,
        originalText: 'encrypted-text-1',
        translatedText: 'encrypted-translation-1',
        startMs: 1000,
        endMs: 2000,
        confidence: 0.95,
        isReply: false,
      },
      {
        meetingId: 'meeting-1',
        speakerId: 'spk-1',
        speakerLabel: 'Our 1',
        language: 'vi' as const,
        originalText: 'encrypted-text-2',
        translatedText: 'encrypted-translation-2',
        startMs: 3000,
        endMs: 4000,
        confidence: 0.87,
        isReply: false,
      },
    ];

    await transcriptRepository.bulkCreate(entries);

    expect(mockInsertMany).toHaveBeenCalledOnce();
    expect(mockInsertMany).toHaveBeenCalledWith(entries, { ordered: false });
  });

  it('findByMeetingId returns sorted results', async () => {
    const mockSort = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { meetingId: 'm1', startMs: 1000 },
        { meetingId: 'm1', startMs: 2000 },
      ]),
    });
    mockFind.mockReturnValue({ sort: mockSort });

    const result = await transcriptRepository.findByMeetingId('m1');

    expect(mockFind).toHaveBeenCalledWith({ meetingId: 'm1' });
    expect(mockSort).toHaveBeenCalledWith({ startMs: 1 });
    expect(result).toHaveLength(2);
    expect(result[0].startMs).toBeLessThan(result[1].startMs);
  });

  it('deleteByMeetingId returns deleted count', async () => {
    mockDeleteMany.mockResolvedValue({ deletedCount: 5 });

    const count = await transcriptRepository.deleteByMeetingId('m1');

    expect(mockDeleteMany).toHaveBeenCalledWith({ meetingId: 'm1' });
    expect(count).toBe(5);
  });
});
