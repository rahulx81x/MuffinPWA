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
  default: 'text-zinc-900 dark:text-zinc-50',
  success: 'text-emerald-600 dark:text-emerald-400',
  destructive: 'text-rose-600 dark:text-rose-400',
  teal: 'text-teal-600 dark:text-teal-400',
  violet: 'text-violet-600 dark:text-violet-400',
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
    ? 'text-sky-100/80 dark:text-blue-300/70'
    : 'text-zinc-400 dark:text-zinc-500';

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
    ? 'bg-sky-500 border-sky-400 text-white dark:bg-[#071428] dark:border-blue-900/80'
    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800';

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`text-[11px] font-semibold uppercase tracking-wide ${
            isHero
              ? 'text-sky-100 dark:text-blue-300/80'
              : 'text-zinc-500 dark:text-zinc-400'
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
        className={`w-full rounded-2xl border p-4 text-left shadow-sm transition duration-150 active:scale-[0.97] ${base} ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`w-full rounded-2xl border p-4 text-left shadow-sm ${base} ${className}`}
    >
      {content}
    </div>
  );
}
