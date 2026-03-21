import { RegisterForm } from '@/features/auth/components/RegisterForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đăng ký — Virtual Comtor',
  description: 'Tạo tài khoản Virtual Comtor để dịch thuật cuộc họp Nhật - Việt.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
