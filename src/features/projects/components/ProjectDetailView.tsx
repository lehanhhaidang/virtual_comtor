'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useI18n } from '@/lib/i18n';
import { useProjectDetail } from '../hooks/useProjectDetail';
import { useCreateMeeting } from '../hooks/useCreateMeeting';
import { useDeleteMeeting } from '../hooks/useDeleteMeeting';
import { ProjectDetailHeader } from './ProjectDetailHeader';
import { CreateMeetingDialog } from './CreateMeetingDialog';
import { MeetingList } from './MeetingList';

interface ProjectDetailViewProps {
  projectId: string;
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const router = useRouter();
  const { t } = useI18n();

  const { project, meetings, loading, fetchData } = useProjectDetail(projectId);

  const {
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
  } = useCreateMeeting(projectId);

  const {
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDeleteMeeting,
    confirmDeleteMeeting,
  } = useDeleteMeeting(fetchData);

  if (loading) return <LoadingSpinner label={t.common.loading} />;

  if (!project) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push('/projects')}>
          ← {t.common.back}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectDetailHeader project={project} onNewMeeting={handleOpenCreate} />

      <CreateMeetingDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title={title}
        onTitleChange={setTitle}
        mode={mode}
        onModeChange={setMode}
        langA={langA}
        onLangAChange={setLangA}
        langB={langB}
        onLangBChange={setLangB}
        onSwapLanguages={swapLanguages}
        creating={creating}
        error={error}
        onCreate={handleCreate}
        onClose={handleCloseCreate}
      />

      <MeetingList meetings={meetings} onDelete={handleDeleteMeeting} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Xóa cuộc họp?"
        description="Cuộc họp và toàn bộ transcript sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa cuộc họp"
        loading={deleting}
        onConfirm={confirmDeleteMeeting}
      />
    </div>
  );
}
