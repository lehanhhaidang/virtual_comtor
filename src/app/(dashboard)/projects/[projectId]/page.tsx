'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Users,
  Video,
  Calendar,
  Trash2,
  Loader2,
  Play,
  CheckCircle,
  Clock,
  Shield,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import { projectApi, type Project } from '@/features/projects/api/projectApi';
import { meetingApi, type Meeting, type CreateMeetingData } from '@/features/meetings/api/meetingApi';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LANGUAGE_PAIRS, DEFAULT_LANGUAGE_PAIR_ID } from '@/lib/soniox';

const statusConfig = {
  scheduled: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/50', label: 'Scheduled' },
  in_progress: { icon: Play, color: 'text-japanese', bg: 'bg-japanese/10', label: 'In Progress' },
  completed: { icon: CheckCircle, color: 'text-vietnamese', bg: 'bg-vietnamese/10', label: 'Completed' },
};

/**
 * Project detail page — project info + meetings list.
 */
export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const { t } = useI18n();

  const [project, setProject] = useState<Project | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'standard' | 'private'>('standard');
  const [languagePair, setLanguagePair] = useState(DEFAULT_LANGUAGE_PAIR_ID);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    const [projRes, meetRes] = await Promise.all([
      projectApi.getById(projectId),
      meetingApi.getByProject(projectId),
    ]);

    if (projRes.success && 'project' in projRes.data) {
      setProject(projRes.data.project);
    }
    if (meetRes.success && 'meetings' in meetRes.data) {
      setMeetings(meetRes.data.meetings);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    setError('');

    try {
      const data: CreateMeetingData = { title: title.trim(), mode, languagePair };
      const res = await meetingApi.create(projectId, data);
      if (res.success && 'meeting' in res.data) {
        const newMeetingId = res.data.meeting._id;
        // Set status to in_progress immediately and navigate
        await meetingApi.update(newMeetingId, { status: 'in_progress' });
        router.push(`/meetings/${newMeetingId}`);
      } else {
        setError('message' in res ? res.message : 'Failed');
      }
    } catch {
      setError('Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm('Xóa cuộc họp này?')) return;
    await meetingApi.delete(id);
    fetchData();
  };

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
      {/* Back + Header */}
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
                <Users className="h-4 w-4" />
                {project.clientName}
              </p>
            )}
            {project.description && (
              <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
          <Button
            onClick={() => setShowCreate(!showCreate)}
            className="gap-2 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            {t.dashboard.newMeeting}
          </Button>
        </div>
      </div>

      {/* Create meeting form */}
      {showCreate && (
        <div className="rounded-2xl border border-primary/20 bg-card/90 p-6 shadow-lg backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold">{t.dashboard.newMeeting}</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <div className="flex-1 space-y-2">
              <Label>{t.dashboard.meetingTitle} *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Cuộc họp Sprint Review"
                className="h-11 rounded-xl"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="flex items-end gap-2 sm:self-end">
              <Button
                variant="ghost"
                onClick={() => setShowCreate(false)}
                className="rounded-xl"
              >
                {t.common.cancel}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                className="gap-2 rounded-xl"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.common.create}
              </Button>
            </div>
          </div>

          {/* Language pair selector */}
          <div className="mt-4 space-y-2">
            <Label>Cặp ngôn ngữ</Label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_PAIRS.map((pair) => (
                <button
                  key={pair.id}
                  type="button"
                  onClick={() => setLanguagePair(pair.id)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                    languagePair === pair.id
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
                  }`}
                >
                  {pair.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meeting mode toggle */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setMode('standard')}
              className={`flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-all ${
                mode === 'standard'
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="h-4 w-4" />
                {t.meeting.modeStandard ?? 'Standard'}
              </span>
              <span className="text-xs text-muted-foreground">
                {t.meeting.modeStandardDesc ?? 'Transcript is E2E encrypted and saved'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode('private')}
              className={`flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-all ${
                mode === 'private'
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4" />
                {t.meeting.modePrivate ?? 'Private'}
              </span>
              <span className="text-xs text-muted-foreground">
                {t.meeting.modePrivateDesc ?? 'No data saved after the meeting'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Meetings list */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          {t.dashboard.meetings} ({meetings.length})
        </h2>

        {meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-16 text-center">
            <Video className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">{t.dashboard.noMeetings}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map((meeting) => {
              const status = statusConfig[meeting.status];
              const StatusIcon = status.icon;

              return (
                <div
                  key={meeting._id}
                  className="group flex items-center gap-4 rounded-xl border border-border/40 bg-card/80 p-4 transition-all hover:border-primary/30"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${status.bg}`}>
                    <StatusIcon className={`h-5 w-5 ${status.color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{meeting.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className={status.color}>{status.label}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(meeting.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {meeting.status === 'scheduled' && (
                      <Link href={`/meetings/${meeting._id}`}>
                        <Button size="sm" className="gap-1 rounded-lg">
                          <Play className="h-3 w-3" />
                          {t.dashboard.startMeeting}
                        </Button>
                      </Link>
                    )}
                    {meeting.status === 'in_progress' && (
                      <Link href={`/meetings/${meeting._id}`}>
                        <Button size="sm" variant="outline" className="gap-1 rounded-lg border-japanese/30 text-japanese">
                          <Play className="h-3 w-3" />
                          Đang diễn ra
                        </Button>
                      </Link>
                    )}
                    {meeting.status === 'completed' && (
                      <Link href={`/meetings/${meeting._id}`}>
                        <Button size="sm" variant="outline" className="gap-1 rounded-lg">
                          Xem lại
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                      onClick={() => handleDeleteMeeting(meeting._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
