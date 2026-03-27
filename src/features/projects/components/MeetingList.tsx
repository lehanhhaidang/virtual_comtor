'use client';

import { Video } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Meeting } from '@/features/meetings/api/meetingApi';
import { MeetingCard } from './MeetingCard';

interface MeetingListProps {
  meetings: Meeting[];
  onDelete: (id: string) => void;
}

export function MeetingList({ meetings, onDelete }: MeetingListProps) {
  const { t } = useI18n();

  return (
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
          {meetings.map((meeting) => (
            <MeetingCard key={meeting._id} meeting={meeting} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
