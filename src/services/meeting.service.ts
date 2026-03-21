import { meetingRepository } from '@/repositories/meeting.repository';
import { projectRepository } from '@/repositories/project.repository';
import type { IMeeting } from '@/models/Meeting';
import type { CreateMeetingInput, UpdateMeetingInput } from '@/validations/meeting.schema';

/**
 * Meeting service — business logic for meeting management.
 */
export const meetingService = {
  /**
   * Create meeting — verifies project ownership first.
   */
  async create(
    userId: string,
    projectId: string,
    data: CreateMeetingInput
  ): Promise<IMeeting> {
    // Verify project belongs to user
    const project = await projectRepository.findByIdAndUser(projectId, userId);
    if (!project) {
      throw new Error('Project not found');
    }
    return meetingRepository.create(userId, projectId, data);
  },

  async getByProjectId(projectId: string, userId: string): Promise<IMeeting[]> {
    return meetingRepository.findByProjectId(projectId, userId);
  },

  async getById(meetingId: string, userId: string): Promise<IMeeting | null> {
    return meetingRepository.findByIdAndUser(meetingId, userId);
  },

  async update(
    meetingId: string,
    userId: string,
    data: UpdateMeetingInput
  ): Promise<IMeeting | null> {
    // Handle status transitions
    const updateData: UpdateMeetingInput & { startedAt?: Date; endedAt?: Date } = { ...data };

    if (data.status === 'in_progress') {
      updateData.startedAt = new Date();
    } else if (data.status === 'completed') {
      updateData.endedAt = new Date();
    }

    return meetingRepository.update(meetingId, userId, updateData);
  },

  async delete(meetingId: string, userId: string): Promise<boolean> {
    return meetingRepository.delete(meetingId, userId);
  },
};
