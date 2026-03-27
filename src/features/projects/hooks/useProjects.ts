import { useEffect, useState, useCallback } from 'react';
import { projectApi, type Project } from '@/features/projects/api/projectApi';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProjects = useCallback(async () => {
    const res = await projectApi.getAll();
    if (res.success && 'projects' in res.data) {
      setProjects(res.data.projects);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await projectApi.delete(deleteTarget);
    setDeleteTarget(null);
    setDeleting(false);
    fetchProjects();
  };

  return {
    projects,
    loading,
    fetchProjects,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    confirmDelete,
  };
}
