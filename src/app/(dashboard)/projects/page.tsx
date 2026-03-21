'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  Plus,
  Users,
  Calendar,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import { projectApi, type Project, type CreateProjectData } from '@/features/projects/api/projectApi';
import { LoadingSpinner } from '@/components/LoadingSpinner';

/**
 * Projects page — list, create, delete.
 */
export default function ProjectsPage() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Create form state
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');

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

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError('');

    try {
      const data: CreateProjectData = { name: name.trim() };
      if (clientName.trim()) data.clientName = clientName.trim();
      if (description.trim()) data.description = description.trim();

      const res = await projectApi.create(data);
      if (res.success) {
        setName('');
        setClientName('');
        setDescription('');
        setShowCreate(false);
        fetchProjects();
      } else {
        setError('message' in res ? res.message : 'Failed to create project');
      }
    } catch {
      setError('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa dự án này? Tất cả cuộc họp sẽ bị xóa theo.')) return;
    await projectApi.delete(id);
    fetchProjects();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.dashboard.projects}</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} {t.dashboard.projects.toLowerCase()}
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="gap-2 rounded-xl"
        >
          <Plus className="h-4 w-4" />
          {t.dashboard.newProject}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-2xl border border-primary/20 bg-card/90 p-6 shadow-lg backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold">{t.dashboard.newProject}</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.dashboard.projectName} *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dự án ABC"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.dashboard.clientName}</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Toyota Japan"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t.dashboard.description}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả dự án (tùy chọn)"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowCreate(false)}
              className="rounded-xl"
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="gap-2 rounded-xl"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.common.create}
            </Button>
          </div>
        </div>
      )}

      {/* Project list */}
      {loading ? (
        <LoadingSpinner label={t.common.loading} />
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-20 text-center">
          <FolderOpen className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg text-muted-foreground">{t.dashboard.noProjects}</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Tạo dự án đầu tiên để bắt đầu
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project._id}
              className="group relative rounded-2xl border border-border/40 bg-card/80 p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Actions */}
              <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(project._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <Link href={`/projects/${project._id}`}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold group-hover:text-primary">
                      {project.name}
                    </h3>
                    {project.clientName && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {project.clientName}
                      </p>
                    )}
                  </div>
                </div>
                {project.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground/60">
                  <Calendar className="h-3 w-3" />
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
