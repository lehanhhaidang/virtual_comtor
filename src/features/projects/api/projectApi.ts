import type { ApiResponse } from '@/types/api.types';

const API_BASE = '/api/projects';

export interface Project {
  _id: string;
  userId: string;
  name: string;
  description: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  clientName?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  clientName?: string;
}

export const projectApi = {
  async getAll(): Promise<ApiResponse<{ projects: Project[] }>> {
    const res = await fetch(API_BASE);
    return res.json();
  },

  async getById(id: string): Promise<ApiResponse<{ project: Project }>> {
    const res = await fetch(`${API_BASE}/${id}`);
    return res.json();
  },

  async create(data: CreateProjectData): Promise<ApiResponse<{ project: Project }>> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async update(id: string, data: UpdateProjectData): Promise<ApiResponse<{ project: Project }>> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    return res.json();
  },
};
