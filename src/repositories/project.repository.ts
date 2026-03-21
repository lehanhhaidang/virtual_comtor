import Project, { type IProject } from '@/models/Project';
import connectDB from '@/lib/db';
import type { CreateProjectInput, UpdateProjectInput } from '@/validations/project.schema';

/**
 * Project repository — all database operations for Project model.
 */
export const projectRepository = {
  /**
   * Create a new project.
   */
  async create(userId: string, data: CreateProjectInput): Promise<IProject> {
    await connectDB();
    const project = new Project({ ...data, userId });
    return project.save();
  },

  /**
   * Find all projects for a user, sorted by newest first.
   */
  async findByUserId(userId: string): Promise<IProject[]> {
    await connectDB();
    return Project.find({ userId }).sort({ createdAt: -1 }).lean();
  },

  /**
   * Find a project by ID and verify ownership.
   */
  async findByIdAndUser(projectId: string, userId: string): Promise<IProject | null> {
    await connectDB();
    return Project.findOne({ _id: projectId, userId }).lean();
  },

  /**
   * Update a project.
   */
  async update(
    projectId: string,
    userId: string,
    data: UpdateProjectInput
  ): Promise<IProject | null> {
    await connectDB();
    return Project.findOneAndUpdate(
      { _id: projectId, userId },
      { $set: data },
      { new: true }
    ).lean();
  },

  /**
   * Delete a project.
   */
  async delete(projectId: string, userId: string): Promise<boolean> {
    await connectDB();
    const result = await Project.deleteOne({ _id: projectId, userId });
    return result.deletedCount > 0;
  },

  /**
   * Count projects for a user.
   */
  async countByUserId(userId: string): Promise<number> {
    await connectDB();
    return Project.countDocuments({ userId });
  },
};
