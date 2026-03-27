import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useI18n, type Locale } from '@/lib/i18n';

export function useSettings() {
  const { user, refreshUser } = useAuth();
  const { t, locale, setLocale } = useI18n();

  const [name, setName] = useState('');
  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Sync form with user data
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  // Sync locale picker with current locale
  useEffect(() => {
    setSelectedLocale(locale);
  }, [locale]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t.common.error);
      }

      setLocale(selectedLocale);

      if (refreshUser) await refreshUser();

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    user,
    t,
    name,
    setName,
    selectedLocale,
    setSelectedLocale,
    isSaving,
    saveSuccess,
    error,
    handleSave,
  };
}
