'use client';

import { AuthProvider } from '@/features/auth/hooks/useAuth';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { AppSidebar } from '@/components/AppSidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function I18nErrorBoundary({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <ErrorBoundary
      labels={{
        title: t.common.errorTitle,
        retry: t.common.retry,
        reload: t.common.reloadPage,
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Dashboard layout — sidebar + main content area.
 * Protected by proxy.ts auth guard.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <AppSidebar />
          <main className="lg:pl-64">
            <div className="mx-auto max-w-6xl px-4 py-4 pt-14 lg:px-8 lg:py-8 lg:pt-8">
              <I18nErrorBoundary>
                {children}
              </I18nErrorBoundary>
            </div>
          </main>
        </div>
      </AuthProvider>
    </I18nProvider>
  );
}
