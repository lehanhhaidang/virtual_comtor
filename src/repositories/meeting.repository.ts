import Meeting, { type IMeeting } from '@/models/Meeting';
import connectDB from '@/lib/db';
import type { CreateMeetingInput, UpdateMeetingInput } from '@/validations/meeting.schema';

/**
 * Meeting repository — all database operations for Meeting model.
 */
export const meetingRepository = {
  /**
   * Create a new meeting.
   */
  async create(
    userId: string,
    projectId: string,
    data: CreateMeetingInput
  ): Promise<IMeeting> {
    await connectDB();
    const meeting = new Meeting({ ...data, userId, projectId });
    return meeting.save();
  },

  /**
   * Find all meetings for a project, sorted by newest first.
   */
  async findByProjectId(projectId: string, userId: string): Promise<IMeeting[]> {
    await connectDB();
    return Meeting.find({ projectId, userId }).sort({ createdAt: -1 }).lean();
  },

  /**
   * Find a meeting by ID and verify ownership.
   */
  async findByIdAndUser(meetingId: string, userId: string): Promise<IMeeting | null> {
    await connectDB();
    return Meeting.findOne({ _id: meetingId, userId }).lean();
  },

  /**
   * Update a meeting.
   */
  async update(
    meetingId: string,
    userId: string,
    data: UpdateMeetingInput & { startedAt?: Date; endedAt?: Date }
  ): Promise<IMeeting | null> {
    await connectDB();
    return Meeting.findOneAndUpdate(
      { _id: meetingId, userId },
      { $set: data },
      { new: true }
    ).lean();
  },

  /**
   * Delete a meeting.
   */
  async delete(meetingId: string, userId: string): Promise<boolean> {
    await connectDB();
    const result = await Meeting.deleteOne({ _id: meetingId, userId });
    return result.deletedCount > 0;
  },

  /**
   * Delete all meetings for a project.
   */
  async deleteByProjectId(projectId: string, userId: string): Promise<number> {
    await connectDB();
    const result = await Meeting.deleteMany({ projectId, userId });
    return result.deletedCount;
  },

  /**
   * Count meetings for a project.
   */
  async countByProjectId(projectId: string): Promise<number> {
    await connectDB();
    return Meeting.countDocuments({ projectId });
  },
};
