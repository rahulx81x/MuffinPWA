import { motion } from 'framer-motion';
import { ChartNoAxesCombined, List } from 'lucide-react';
import type { ReactNode } from 'react';
import type { KpiIconHint } from '../types';
import { springSoft } from '../lib/motion';

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
  teal: 'text-primary',
  violet: 'text-primary-muted',
  hero: 'text-primary-foreground',
};

function HintIcon({
  hint,
  hero,
}: {
  hint: KpiIconHint;
  hero: boolean;
}) {
  const containerClass = hero
    ? 'bg-white/20 text-white'
    : 'bg-surface-muted/60 text-text-muted dark:bg-surface-muted/40';

  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full backdrop-blur-sm ${containerClass}`}
    >
      {hint === 'list' ? (
        <List className="h-3.5 w-3.5" strokeWidth={2.2} />
      ) : (
        <ChartNoAxesCombined className="h-3.5 w-3.5" strokeWidth={2.2} />
      )}
    </span>
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
    ? 'hero-card p-5'
    : 'cozy-card border-border p-4';

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h3
          className={`text-[11px] font-bold uppercase tracking-wider ${
            isHero ? 'text-primary-foreground/90' : 'text-text-muted'
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
              ? 'font-display text-3xl tracking-tight text-primary-foreground drop-shadow-sm'
              : `font-display text-2xl tracking-tight ${toneClass[tone]}`
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
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.018, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={springSoft}
        className={`w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${base} ${className}`}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={springSoft}
      className={`w-full text-left ${base} ${className}`}
    >
      {content}
    </motion.div>
  );
}
