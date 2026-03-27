'use client';

import { FolderOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useI18n } from '@/lib/i18n';
import type { Project } from '@/features/projects/api/projectApi';
import { ProjectCard } from './ProjectCard';

interface ProjectListProps {
  projects: Project[];
  loading: boolean;
  onDelete: (id: string) => void;
}

export function ProjectList({ projects, loading, onDelete }: ProjectListProps) {
  const { t } = useI18n();

  if (loading) {
    return <LoadingSpinner label={t.common.loading} />;
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-20 text-center">
        <FolderOpen className="mb-4 h-16 w-16 text-muted-foreground/30" />
        <p className="text-lg text-muted-foreground">{t.dashboard.noProjects}</p>
        <p className="mt-1 text-sm text-muted-foreground/60">
          Tạo dự án đầu tiên để bắt đầu
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project._id} project={project} onDelete={onDelete} />
      ))}
    </div>
  );
}
