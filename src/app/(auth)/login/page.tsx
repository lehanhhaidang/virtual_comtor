import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đăng nhập — Virtual Comtor',
  description: 'Đăng nhập vào Virtual Comtor để bắt đầu dịch thuật cuộc họp.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <LoginForm />
    </Suspense>
  );
}
