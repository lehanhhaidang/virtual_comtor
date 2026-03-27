'use client';

import Link from 'next/link';
import { FolderOpen, Users, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project } from '@/features/projects/api/projectApi';

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  return (
    <div className="group relative rounded-2xl border border-border/40 bg-card/80 p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      {/* Actions */}
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(project._id)}
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
  );
}
