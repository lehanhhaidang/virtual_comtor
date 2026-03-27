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
  Languages,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import { projectApi, type Project } from '@/features/projects/api/projectApi';
import { meetingApi, type Meeting, type CreateMeetingData } from '@/features/meetings/api/meetingApi';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SONIOX_LANGUAGES, LANGUAGE_PAIRS, langLabel, pairId, parsePairId, DEFAULT_LANG_A, DEFAULT_LANG_B } from '@/lib/soniox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Chỉ hiển thị những ngôn ngữ có trong các cặp đã define
const DEFINED_LANG_CODES = [...new Set(LANGUAGE_PAIRS.flatMap((p) => [p.langA, p.langB]))];
const DEFINED_LANGUAGES = SONIOX_LANGUAGES.filter((l) => DEFINED_LANG_CODES.includes(l.code));

// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  scheduled:   { icon: Clock,        color: 'text-muted-foreground', bg: 'bg-muted/50',        label: 'Scheduled'    },
  in_progress: { icon: Play,         color: 'text-japanese',         bg: 'bg-japanese/10',     label: 'In Progress'  },
  completed:   { icon: CheckCircle,  color: 'text-vietnamese',       bg: 'bg-vietnamese/10',   label: 'Completed'    },
};

// ---------------------------------------------------------------------------

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const { t } = useI18n();

  const [project, setProject]   = useState<Project | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading]   = useState(true);

  // Create-meeting modal state
  const [showCreate,    setShowCreate]    = useState(false);
  const [creating,      setCreating]      = useState(false);
  const [title,         setTitle]         = useState('');
  const [mode,          setMode]          = useState<'standard' | 'private'>('standard');
  const [langA,         setLangA]         = useState(DEFAULT_LANG_A);
  const [langB,         setLangB]         = useState(DEFAULT_LANG_B);
  const [error,         setError]         = useState('');

  const selectedPair = `${langLabel(langA)} ↔ ${langLabel(langB)}`;

  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    const [projRes, meetRes] = await Promise.all([
      projectApi.getById(projectId),
      meetingApi.getByProject(projectId),
    ]);
    if (projRes.success && 'project' in projRes.data) setProject(projRes.data.project);
    if (meetRes.success && 'meetings' in meetRes.data) setMeetings(meetRes.data.meetings);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setTitle('');
    setMode('standard');
    setLangA(DEFAULT_LANG_A);
    setLangB(DEFAULT_LANG_B);
    setError('');
  };

  const handleOpenCreate = () => { resetForm(); setShowCreate(true); };
  const handleCloseCreate = () => setShowCreate(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    setError('');
    try {
      const data: CreateMeetingData = { title: title.trim(), mode, languagePair: pairId(langA, langB) };
      const res = await meetingApi.create(projectId, data);
      if (res.success && 'meeting' in res.data) {
        const newMeetingId = res.data.meeting._id;
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

  // ---------------------------------------------------------------------------

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

      {/* ── Header ── */}
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

          <Button onClick={handleOpenCreate} className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            {t.dashboard.newMeeting}
          </Button>
        </div>
      </div>

      {/* ── Create meeting modal overlay ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-border/60 bg-card shadow-2xl sm:rounded-3xl">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
              <h2 className="text-base font-semibold">{t.dashboard.newMeeting}</h2>
              <button
                onClick={handleCloseCreate}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t.dashboard.meetingTitle} *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Cuộc họp Sprint Review..."
                  className="h-11 rounded-xl"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>

              {/* Language pair — 2 dropdowns */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Cặp ngôn ngữ</Label>
                </div>
                <div className="flex items-center gap-2">
                  {/* Lang A */}
                  <Select value={langA} onValueChange={setLangA}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFINED_LANGUAGES.map((l) => (
                        <SelectItem key={l.code} value={l.code} disabled={l.code === langB}>
                          {l.flag ? `${l.flag} ` : ''}{l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Swap button */}
                  <button
                    type="button"
                    title="Swap languages"
                    onClick={() => { setLangA(langB); setLangB(langA); }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    ⇄
                  </button>

                  {/* Lang B */}
                  <Select value={langB} onValueChange={setLangB}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFINED_LANGUAGES.map((l) => (
                        <SelectItem key={l.code} value={l.code} disabled={l.code === langA}>
                          {l.flag ? `${l.flag} ` : ''}{l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mode */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Chế độ</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    {
                      id: 'standard',
                      icon: BarChart3,
                      title: t.meeting.modeStandard ?? 'Standard',
                      desc: t.meeting.modeStandardDesc ?? 'Transcript được mã hoá & lưu lại',
                    },
                    {
                      id: 'private',
                      icon: Shield,
                      title: t.meeting.modePrivate ?? 'Private',
                      desc: t.meeting.modePrivateDesc ?? 'Không lưu dữ liệu sau cuộc họp',
                    },
                  ] as const).map(({ id, icon: Icon, title: mTitle, desc }) => {
                    const isSelected = mode === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMode(id)}
                        className={`flex flex-col items-start gap-1.5 rounded-2xl border px-4 py-3 text-left transition-all ${
                          isSelected
                            ? 'border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/30'
                            : 'border-border/50 bg-card/60 text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="h-4 w-4" />
                          {mTitle}
                        </span>
                        <span className="text-xs leading-snug text-muted-foreground">{desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
              {/* Selection summary */}
              <p className="text-xs text-muted-foreground">
                {selectedPair}
                <span className="mx-1.5 opacity-40">·</span>
                {mode === 'standard' ? '📊 Standard' : '🔒 Private'}
              </p>

              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={handleCloseCreate} className="rounded-xl">
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

          </div>
        </div>
      )}

      {/* ── Meetings list ── */}
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
              const cfg = STATUS_CONFIG[meeting.status];
              const StatusIcon = cfg.icon;

              return (
                <div
                  key={meeting._id}
                  className="group flex items-center gap-4 rounded-xl border border-border/40 bg-card/80 p-4 transition-all hover:border-primary/30"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                    <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{meeting.title}</h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className={cfg.color}>{cfg.label}</span>
                      {meeting.languagePair && (
                        <span className="flex items-center gap-1">
                          <Languages className="h-3 w-3" />
                          {(() => {
                            const { langA: a, langB: b } = parsePairId(meeting.languagePair);
                            return `${langLabel(a)} ↔ ${langLabel(b)}`;
                          })()}
                        </span>
                      )}
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
                          <Play className="h-3 w-3" /> {t.dashboard.startMeeting}
                        </Button>
                      </Link>
                    )}
                    {meeting.status === 'in_progress' && (
                      <Link href={`/meetings/${meeting._id}`}>
                        <Button size="sm" variant="outline" className="gap-1 rounded-lg border-japanese/30 text-japanese">
                          <Play className="h-3 w-3" /> Đang diễn ra
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
