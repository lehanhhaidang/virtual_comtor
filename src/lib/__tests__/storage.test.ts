import { describe, it, expect } from 'vitest';
import { getStoragePath } from '@/lib/storage';

describe('Storage Helpers', () => {
  describe('getStoragePath', () => {
    it('should build path from userId, projectId, meetingId', () => {
      const path = getStoragePath('user1', 'project1', 'meeting1');
      expect(path).toContain('user1');
      expect(path).toContain('project1');
      expect(path).toContain('meeting1');
    });

    it('should append subdir when provided', () => {
      const path = getStoragePath('u1', 'p1', 'm1', 'audio');
      expect(path).toContain('audio');
    });

    it('should not have subdir in path when not provided', () => {
      const path = getStoragePath('u1', 'p1', 'm1');
      expect(path).not.toContain('audio');
      expect(path).not.toContain('transcripts');
      expect(path).not.toContain('exports');
    });

    it('should support all subdirs', () => {
      const audioPath = getStoragePath('u', 'p', 'm', 'audio');
      const transcriptsPath = getStoragePath('u', 'p', 'm', 'transcripts');
      const exportsPath = getStoragePath('u', 'p', 'm', 'exports');

      expect(audioPath).toContain('audio');
      expect(transcriptsPath).toContain('transcripts');
      expect(exportsPath).toContain('exports');
    });
  });
});
