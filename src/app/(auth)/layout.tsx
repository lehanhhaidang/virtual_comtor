'use client';

import { AuthProvider } from '@/features/auth/hooks/useAuth';
import { I18nProvider } from '@/lib/i18n';

/**
 * Auth pages layout — wraps with AuthProvider + I18nProvider.
 * Centered, large layout.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider>
      <AuthProvider>
        <div className="relative flex min-h-screen items-center justify-center bg-background px-6 py-12">
          {/* Background gradient */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent" />

          {/* Content */}
          <div className="relative z-10 w-full max-w-lg">{children}</div>
        </div>
      </AuthProvider>
    </I18nProvider>
  );
}
