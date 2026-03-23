import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import VersionClient from './version-client';

export default function VersionPage() {
  // `useSearchParams` is client-only and must be wrapped in Suspense.
  return (
    <Suspense fallback={<LoadingSpinner label="Loading version…" />}>
      <VersionClient />
    </Suspense>
  );
}
