'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { CHANGELOG, type ChangeType } from './changelog';

type TabKey = 'bugs' | 'features' | 'improvements';

const TAB_CONFIG: { key: TabKey; label: string; types: ChangeType[] }[] = [
  { key: 'bugs', label: 'Bugs', types: ['bug'] },
  { key: 'features', label: 'Features', types: ['feature'] },
  { key: 'improvements', label: 'Improvements', types: ['improvement'] },
];

function isTabKey(x: string | null): x is TabKey {
  return x === 'bugs' || x === 'features' || x === 'improvements';
}

export default function VersionClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = isTabKey(searchParams.get('tab')) ? searchParams.get('tab') : 'features';
  const active = TAB_CONFIG.find((t) => t.key === tab) ?? TAB_CONFIG[1];

  const items = useMemo(() => {
    return CHANGELOG
      .filter((c) => active.types.includes(c.type))
      .slice()
      .sort((a, b) => {
        // Newest first: version desc, then date desc.
        if (a.version !== b.version)
          return b.version.localeCompare(a.version, undefined, { numeric: true });
        return b.date.localeCompare(a.date);
      });
  }, [active.types]);

  const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Version</h1>
        <p className="mt-1 text-muted-foreground">
          Current: <span className="font-medium text-foreground">v{currentVersion}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TAB_CONFIG.map((t) => {
          const isActive = t.key === tab;
          const href = `${pathname}?tab=${t.key}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border/50 bg-card/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Changelog list */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No entries yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c, idx) => (
            <div
              key={`${c.version}:${c.type}:${c.title}:${idx}`}
              className="rounded-2xl border border-border/40 bg-card/80 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      v{c.version}
                    </span>
                    <span className="text-xs text-muted-foreground">{c.date}</span>
                  </div>
                  <h3 className="mt-2 truncate font-semibold">{c.title}</h3>
                </div>
              </div>
              {c.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
