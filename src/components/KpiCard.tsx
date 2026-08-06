import type { ReactNode } from 'react';
import type { KpiIconHint } from '../types';

export type KpiTone =
  | 'default'
  | 'success'
  | 'destructive'
  | 'teal'
  | 'violet'
  | 'hero';

interface KpiCardProps {
  label: string;
  value?: string;
  tone?: KpiTone;
  iconHint?: KpiIconHint;
  interactive?: boolean;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

const toneClass: Record<KpiTone, string> = {
  default: 'text-text',
  success: 'text-emerald-600 dark:text-emerald-400',
  destructive: 'text-rose-600 dark:text-rose-400',
  teal: 'text-amber-700 dark:text-amber-400',
  violet: 'text-amber-800 dark:text-amber-300',
  hero: 'text-white',
};

function HintIcon({
  hint,
  hero,
}: {
  hint: KpiIconHint;
  hero: boolean;
}) {
  const color = hero
    ? 'text-amber-100/80 dark:text-amber-200/70'
    : 'text-text-muted';

  if (hint === 'list') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`h-3.5 w-3.5 ${color}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 ${color}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 19V5M4 19h16M8 15v4M12 11v8M16 7v12"
      />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  tone = 'default',
  iconHint,
  interactive = false,
  children,
  className = '',
  onClick,
}: KpiCardProps) {
  const isHero = tone === 'hero';
  const base = isHero
    ? 'bg-gradient-to-br from-amber-600 to-amber-500 border-amber-500 text-white dark:from-amber-700 dark:to-amber-600 dark:border-amber-600'
    : 'bg-surface-strong dark:bg-surface border-border';

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`text-[11px] font-semibold uppercase tracking-wide ${
            isHero
              ? 'text-amber-100 dark:text-amber-100/90'
              : 'text-text-muted'
          }`}
        >
          {label}
        </h3>
        {interactive && iconHint && <HintIcon hint={iconHint} hero={isHero} />}
      </div>
      {value !== undefined && (
        <p
          className={`mt-2 font-bold tabular-nums ${
            isHero
              ? 'font-display text-2xl tracking-tight text-white'
              : `text-xl ${toneClass[tone]}`
          }`}
        >
          {value}
        </p>
      )}
      {children}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-2xl border p-4 text-left shadow-warm-sm transition-colors duration-200 active:scale-[0.97] ${base} ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`w-full rounded-2xl border p-4 text-left shadow-warm-sm transition-colors duration-200 ${base} ${className}`}
    >
      {content}
    </div>
  );
}
