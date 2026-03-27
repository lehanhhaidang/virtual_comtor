import { useEffect, useState, useCallback } from 'react';
import { projectApi, type Project } from '@/features/projects/api/projectApi';
import { meetingApi, type Meeting } from '@/features/meetings/api/meetingApi';

export function useProjectDetail(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [projRes, meetRes] = await Promise.all([
      projectApi.getById(projectId),
      meetingApi.getByProject(projectId),
    ]);
    if (projRes.success && 'project' in projRes.data) setProject(projRes.data.project);
    if (meetRes.success && 'meetings' in meetRes.data) setMeetings(meetRes.data.meetings);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { project, meetings, loading, fetchData };
}
