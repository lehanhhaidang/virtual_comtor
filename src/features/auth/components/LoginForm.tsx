'use client';

import { useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Languages, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../hooks/useAuth';
import { useI18n, type Locale } from '@/lib/i18n';

const LANGS: { code: Locale; flag: string; label: string }[] = [
  { code: 'vi', flag: '🇻🇳', label: 'VI' },
  { code: 'en', flag: '🇺🇸', label: 'EN' },
  { code: 'ja', flag: '🇯🇵', label: 'JA' },
];

/**
 * Login form — premium, large layout with i18n.
 */
export function LoginForm() {
  const { login } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('');

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError('');
      setIsSubmitting(true);
      setStatusText(t.meeting.securingKey ?? t.auth.loggingIn);

      try {
        await login({ email, password });
      } catch (err) {
        setError(err instanceof Error ? err.message : t.auth.invalidCredentials);
      } finally {
        setIsSubmitting(false);
        setStatusText('');
      }
    },
    [email, password, login, t]
  );

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Languages className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t.auth.loginTitle}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {t.auth.loginDescription}
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border/60 bg-card/90 p-8 shadow-2xl shadow-black/20 backdrop-blur-md">
        {registered && (
          <div className="mb-6 rounded-lg border border-vietnamese/30 bg-vietnamese/10 px-5 py-4 text-sm text-vietnamese">
            {t.auth.registerSuccess}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              {t.auth.email}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t.auth.emailPlaceholder}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              className="h-12 rounded-xl text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              {t.auth.password}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={t.auth.passwordPlaceholder}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              className="h-12 rounded-xl text-base"
            />
          </div>

          {/* Lang switcher */}
          <div className="flex items-center justify-center gap-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLocale(l.code)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  locale === l.code
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {statusText || t.auth.loggingIn}
              </>
            ) : (
              <>
                {t.auth.loginButton}
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          {t.auth.noAccount}{' '}
          <Link
            href="/register"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t.auth.register}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
