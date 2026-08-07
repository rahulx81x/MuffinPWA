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
  const color = hero
    ? 'text-primary-foreground/75'
    : 'text-text-muted';

  if (hint === 'list') {
    return <List className={`h-3.5 w-3.5 ${color}`} strokeWidth={2} />;
  }

  return (
    <ChartNoAxesCombined
      className={`h-3.5 w-3.5 ${color}`}
      strokeWidth={2}
    />
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
    ? 'bg-gradient-to-br from-primary-muted to-primary border-primary/80 text-primary-foreground shadow-glow'
    : 'cozy-card border-border';

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`text-[11px] font-semibold uppercase tracking-wide ${
            isHero ? 'text-primary-foreground/80' : 'text-text-muted'
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
              ? 'font-display text-2xl tracking-tight text-primary-foreground'
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
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.015, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={springSoft}
        className={`w-full rounded-2xl border p-4 text-left shadow-warm-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${base} ${className}`}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={springSoft}
      className={`w-full rounded-2xl border p-4 text-left shadow-warm-sm ${base} ${className}`}
    >
      {content}
    </motion.div>
  );
}
