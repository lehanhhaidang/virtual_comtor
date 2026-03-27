'use client';

import { use } from 'react';
import { ProjectDetailView } from '@/features/projects/components/ProjectDetailView';

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return <ProjectDetailView projectId={projectId} />;
}
