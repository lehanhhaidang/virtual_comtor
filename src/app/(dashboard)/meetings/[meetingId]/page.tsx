'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { AuthProvider } from '@/features/auth/hooks/useAuth';
import { MeetingRoom } from '@/features/translation/components/MeetingRoom';
import { TranscriptViewer } from '@/features/translation/components/TranscriptViewer';
import { meetingApi, type Meeting } from '@/features/meetings/api/meetingApi';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Shield, Play } from 'lucide-react';

/**
 * Meeting page — routes based on meeting status and mode:
 * - in_progress → MeetingRoom
 * - completed + standard → TranscriptViewer
 * - completed + private → "No data saved"
 * - scheduled → Start button
 */
export default function MeetingPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = use(params);

  return (
    <I18nProvider>
      <AuthProvider>
        <MeetingPageContent meetingId={meetingId} />
      </AuthProvider>
    </I18nProvider>
  );
}

function MeetingPageContent({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    meetingApi.getById(meetingId).then((res) => {
      if (res.success && 'meeting' in res.data) {
        setMeeting(res.data.meeting);
      }
      setLoading(false);
    });
  }, [meetingId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Meeting not found</p>
      </div>
    );
  }

  // In progress → live meeting room
  if (meeting.status === 'in_progress') {
    return (
      <div className="min-h-screen bg-background p-4 lg:p-6">
        <MeetingRoom
          meetingId={meetingId}
          meetingTitle={meeting.title}
          projectId={meeting.projectId}
          mode={meeting.mode ?? 'standard'}
          languagePairId={meeting.languagePair ?? 'ja:vi'}
        />
      </div>
    );
  }

  // Completed + standard → transcript viewer
  if (meeting.status === 'completed' && (meeting.mode ?? 'standard') === 'standard') {
    return (
      <div className="min-h-screen bg-background p-4 lg:p-6">
        <TranscriptViewer
          meetingId={meetingId}
          meetingTitle={meeting.title}
          projectId={meeting.projectId}
        />
      </div>
    );
  }

  // Completed + private → no data saved
  if (meeting.status === 'completed' && meeting.mode === 'private') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Shield className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">
          {t.meeting.noTranscriptSaved ?? 'No data saved (private meeting)'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t.meeting.dataLostWarning ?? 'This was a private meeting — transcript was not saved.'}
        </p>
        <Button
          variant="ghost"
          onClick={() => router.push(meeting.projectId ? `/projects/${meeting.projectId}` : '/projects')}
        >
          ← {t.common.back}
        </Button>
      </div>
    );
  }

  // Scheduled → show start button
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <h1 className="text-2xl font-bold">{meeting.title}</h1>
      <p className="text-muted-foreground">
        {meeting.mode === 'private' ? '🔒 Private' : '📊 Standard'}
      </p>
      <Button
        size="lg"
        onClick={async () => {
          await meetingApi.update(meetingId, { status: 'in_progress' });
          // Refresh to switch to MeetingRoom
          setMeeting({ ...meeting, status: 'in_progress' });
        }}
        className="gap-2"
      >
        <Play className="h-5 w-5" />
        {t.meeting.startMeeting}
      </Button>
    </div>
  );
}
