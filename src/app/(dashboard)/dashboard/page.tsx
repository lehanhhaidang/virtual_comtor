'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderOpen, Users, Calendar, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { projectApi, type Project } from '@/features/projects/api/projectApi';
import { LoadingSpinner } from '@/components/LoadingSpinner';

/**
 * Dashboard home — welcome + recent projects overview.
 */
export default function DashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectApi.getAll().then((res) => {
      if (res.success && 'projects' in res.data) {
        setProjects(res.data.projects);
      }
      setLoading(false);
    });
  }, []);

  const stats = [
    {
      label: t.dashboard.projects,
      value: projects.length,
      icon: FolderOpen,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {user?.name ? `${t.auth.loginTitle.split(' ')[0]}, ${user.name}` : 'Dashboard'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Virtual Comtor — {t.landing.tagline}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-2xl border border-border/40 bg-card/80 p-5 backdrop-blur-sm"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent projects */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.dashboard.projects}</h2>
          <Link
            href="/projects"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Xem tất cả
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner label={t.common.loading} />
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-16 text-center">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t.dashboard.noProjects}</p>
            <Link
              href="/projects"
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              {t.dashboard.newProject} →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((project) => (
              <Link
                key={project._id}
                href={`/projects/${project._id}`}
                className="group rounded-2xl border border-border/40 bg-card/80 p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
