import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { meetingApi, type CreateMeetingData } from '@/features/meetings/api/meetingApi';
import { pairId, DEFAULT_LANG_A, DEFAULT_LANG_B } from '@/lib/soniox';

export function useCreateMeeting(projectId: string) {
  const router = useRouter();

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'standard' | 'private'>('standard');
  const [langA, setLangA] = useState(DEFAULT_LANG_A);
  const [langB, setLangB] = useState(DEFAULT_LANG_B);
  const [error, setError] = useState('');

  const resetForm = () => {
    setTitle('');
    setMode('standard');
    setLangA(DEFAULT_LANG_A);
    setLangB(DEFAULT_LANG_B);
    setError('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const handleCloseCreate = () => setShowCreate(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    setError('');
    try {
      const data: CreateMeetingData = {
        title: title.trim(),
        mode,
        languagePair: pairId(langA, langB),
      };
      const res = await meetingApi.create(projectId, data);
      if (res.success && 'meeting' in res.data) {
        const newMeetingId = res.data.meeting._id;
        await meetingApi.update(newMeetingId, { status: 'in_progress' });
        router.push(`/meetings/${newMeetingId}`);
      } else {
        setError('message' in res ? res.message : 'Failed');
      }
    } catch {
      setError('Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  const swapLanguages = () => {
    setLangA(langB);
    setLangB(langA);
  };

  return {
    showCreate,
    setShowCreate,
    creating,
    title,
    setTitle,
    mode,
    setMode,
    langA,
    setLangA,
    langB,
    setLangB,
    error,
    handleOpenCreate,
    handleCloseCreate,
    handleCreate,
    swapLanguages,
  };
}
