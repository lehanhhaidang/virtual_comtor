import { useState } from 'react';
import { meetingApi } from '@/features/meetings/api/meetingApi';

export function useDeleteMeeting(onSuccess: () => void) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteMeeting = (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDeleteMeeting = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await meetingApi.delete(deleteTarget);
    setDeleteTarget(null);
    setDeleting(false);
    onSuccess();
  };

  return {
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDeleteMeeting,
    confirmDeleteMeeting,
  };
}
