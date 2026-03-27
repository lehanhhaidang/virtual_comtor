'use client';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useProjects } from '../hooks/useProjects';
import { useCreateProject } from '../hooks/useCreateProject';
import { ProjectsHeader } from './ProjectsHeader';
import { CreateProjectDialog } from './CreateProjectDialog';
import { ProjectList } from './ProjectList';

export function ProjectsView() {
  const {
    projects,
    loading,
    fetchProjects,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    confirmDelete,
  } = useProjects();

  const {
    showCreate,
    setShowCreate,
    creating,
    error,
    name,
    setName,
    clientName,
    setClientName,
    description,
    setDescription,
    handleCreate,
  } = useCreateProject(fetchProjects);

  return (
    <div className="space-y-6">
      <ProjectsHeader
        projectCount={projects.length}
        onNewProject={() => setShowCreate(true)}
      />

      <CreateProjectDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        name={name}
        onNameChange={setName}
        clientName={clientName}
        onClientNameChange={setClientName}
        description={description}
        onDescriptionChange={setDescription}
        creating={creating}
        error={error}
        onCreate={handleCreate}
      />

      <ProjectList
        projects={projects}
        loading={loading}
        onDelete={handleDelete}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Xóa dự án?"
        description="Tất cả cuộc họp trong dự án này sẽ bị xóa theo. Hành động này không thể hoàn tác."
        confirmLabel="Xóa dự án"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
