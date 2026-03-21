import { projectRepository } from '@/repositories/project.repository';
import { meetingRepository } from '@/repositories/meeting.repository';
import type { IProject } from '@/models/Project';
import type { CreateProjectInput, UpdateProjectInput } from '@/validations/project.schema';

/**
 * Project service — business logic for project management.
 */
export const projectService = {
  async create(userId: string, data: CreateProjectInput): Promise<IProject> {
    return projectRepository.create(userId, data);
  },

  async getAll(userId: string): Promise<IProject[]> {
    return projectRepository.findByUserId(userId);
  },

  async getById(projectId: string, userId: string): Promise<IProject | null> {
    return projectRepository.findByIdAndUser(projectId, userId);
  },

  async update(
    projectId: string,
    userId: string,
    data: UpdateProjectInput
  ): Promise<IProject | null> {
    return projectRepository.update(projectId, userId, data);
  },

  /**
   * Delete project and all its meetings.
   */
  async delete(projectId: string, userId: string): Promise<boolean> {
    // Cascade: delete all meetings in this project
    await meetingRepository.deleteByProjectId(projectId, userId);
    return projectRepository.delete(projectId, userId);
  },
};
