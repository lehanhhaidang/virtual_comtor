import { useState } from 'react';
import { projectApi, type CreateProjectData } from '@/features/projects/api/projectApi';

export function useCreateProject(onSuccess: () => void) {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError('');

    try {
      const data: CreateProjectData = { name: name.trim() };
      if (clientName.trim()) data.clientName = clientName.trim();
      if (description.trim()) data.description = description.trim();

      const res = await projectApi.create(data);
      if (res.success) {
        setName('');
        setClientName('');
        setDescription('');
        setShowCreate(false);
        onSuccess();
      } else {
        setError('message' in res ? res.message : 'Failed to create project');
      }
    } catch {
      setError('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return {
    showCreate,
    setShowCreate,
    creating,
    error,
    name,
    setName,
    clientName,
    setClientName,
    description,
    setDescription,
    handleCreate,
  };
}
