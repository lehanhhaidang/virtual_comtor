'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

interface ProjectsHeaderProps {
  projectCount: number;
  onNewProject: () => void;
}

export function ProjectsHeader({ projectCount, onNewProject }: ProjectsHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.dashboard.projects}</h1>
        <p className="text-sm text-muted-foreground">
          {projectCount} {t.dashboard.projects.toLowerCase()}
        </p>
      </div>
      <Button onClick={onNewProject} className="gap-2 rounded-xl">
        <Plus className="h-4 w-4" />
        {t.dashboard.newProject}
      </Button>
    </div>
  );
}
