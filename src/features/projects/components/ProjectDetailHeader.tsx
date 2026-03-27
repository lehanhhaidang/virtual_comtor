'use client';

import Link from 'next/link';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { Project } from '@/features/projects/api/projectApi';

interface ProjectDetailHeaderProps {
  project: Project;
  onNewMeeting: () => void;
}

export function ProjectDetailHeader({ project, onNewMeeting }: ProjectDetailHeaderProps) {
  const { t } = useI18n();

  return (
    <div>
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.dashboard.projects}
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          {project.clientName && (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> {project.clientName}
            </p>
          )}
          {project.description && (
            <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>

        <Button onClick={onNewMeeting} className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" />
          {t.dashboard.newMeeting}
        </Button>
      </div>
    </div>
  );
}
