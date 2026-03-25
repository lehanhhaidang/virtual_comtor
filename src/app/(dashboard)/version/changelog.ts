export type ChangeType = 'bug' | 'feature' | 'improvement';

export type ChangeItem = {
  version: string; // SemVer: MAJOR.MINOR.PATCH
  date: string; // ISO date (YYYY-MM-DD)
  type: ChangeType;
  title: string;
  description?: string;
};

/**
 * Changelog entries.
 *
 * Notes:
 * - One shared SemVer across the whole app.
 * - Filtered by tab: bugs / features / improvements.
 */
export const CHANGELOG: ChangeItem[] = [
  {
    version: '1.0.0',
    date: '2026-03-23',
    type: 'feature',
    title: 'Initial release',
    description: 'First public version of Virtual Comtor.',
  },
  {
    version: '1.0.1',
    date: '2026-03-23',
    type: 'bug',
    title: 'Fix minor UI glitches',
  },
  {
    version: '1.0.1',
    date: '2026-03-23',
    type: 'improvement',
    title: 'Improve loading states',
  },
  {
    version: '1.1.0',
    date: '2026-03-25',
    type: 'feature',
    title: 'Import cũ vào cuộc họp mới',
    description: 'Thêm nút Import cạnh Start Meeting. Hỗ trợ upload audio nhiều định dạng (mp3/wav/m4a/aac/flac/ogg/webm…) và file transcript XLSX export. Nếu chỉ import audio, Soniox sẽ tự chạy lại để tạo transcript mới.',
  },
  {
    version: '1.1.0',
    date: '2026-03-25',
    type: 'bug',
    title: 'Fix upload audio fail sau cuộc họp dài (>30 phút)',
    description: 'Đổi sang chunked upload 5MB thay vì upload 1 blob lớn, tránh timeout/OOM khi audio lớn.',
  },
  {
    version: '1.1.0',
    date: '2026-03-25',
    type: 'improvement',
    title: 'Mở rộng MIME type cho AudioPlayer',
    description: 'Audio player hỗ trợ thêm mp3, wav, mp4, aac, flac ngoài webm/ogg.',
  },
];
