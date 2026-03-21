import type { ApiResponse } from '@/types/api.types';

export interface Meeting {
  _id: string;
  projectId: string;
  userId: string;
  title: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  mode: 'standard' | 'private';
  duration?: number;
  entryCount?: number;
  startedAt?: string;
  endedAt?: string;
  audioPath?: string;
  speakerMapping: Record<string, { label: string; language: 'ja' | 'vi' }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingData {
  title: string;
  mode?: 'standard' | 'private';
}

export interface UpdateMeetingData {
  title?: string;
  status?: 'scheduled' | 'in_progress' | 'completed';
}

export const meetingApi = {
  async getByProject(projectId: string): Promise<ApiResponse<{ meetings: Meeting[] }>> {
    const res = await fetch(`/api/projects/${projectId}/meetings`);
    return res.json();
  },

  async getById(meetingId: string): Promise<ApiResponse<{ meeting: Meeting }>> {
    const res = await fetch(`/api/meetings/${meetingId}`);
    return res.json();
  },

  async create(projectId: string, data: CreateMeetingData): Promise<ApiResponse<{ meeting: Meeting }>> {
    const res = await fetch(`/api/projects/${projectId}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async update(meetingId: string, data: UpdateMeetingData): Promise<ApiResponse<{ meeting: Meeting }>> {
    const res = await fetch(`/api/meetings/${meetingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async delete(meetingId: string): Promise<ApiResponse<null>> {
    const res = await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
    return res.json();
  },
};
