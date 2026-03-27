'use client';

import Link from 'next/link';
import { Play, CheckCircle, Clock, Calendar, Languages, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parsePairId, langLabel } from '@/lib/soniox';
import type { Meeting } from '@/features/meetings/api/meetingApi';

const STATUS_CONFIG = {
  scheduled:   { icon: Clock,        color: 'text-muted-foreground', bg: 'bg-muted/50',        label: 'Scheduled'    },
  in_progress: { icon: Play,         color: 'text-japanese',         bg: 'bg-japanese/10',     label: 'In Progress'  },
  completed:   { icon: CheckCircle,  color: 'text-vietnamese',       bg: 'bg-vietnamese/10',   label: 'Completed'    },
} as const;

interface MeetingCardProps {
  meeting: Meeting;
  onDelete: (id: string) => void;
}

export function MeetingCard({ meeting, onDelete }: MeetingCardProps) {
  const cfg = STATUS_CONFIG[meeting.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-border/40 bg-card/80 p-4 transition-all hover:border-primary/30">
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
              <Play className="h-3 w-3" /> Start
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
          onClick={() => onDelete(meeting._id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
