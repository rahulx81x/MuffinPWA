import { motion } from 'framer-motion';
import { ChartNoAxesCombined, List } from 'lucide-react';
import type { ReactNode } from 'react';
import type { KpiIconHint } from '../../domain/types';
import { springSoft } from '../../lib/motion';

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
  subtext?: ReactNode;
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

const glowClass: Record<KpiTone, string> = {
  default: '',
  success: 'before:absolute before:-inset-px before:rounded-2xl before:bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_65%)] before:pointer-events-none',
  destructive: 'before:absolute before:-inset-px before:rounded-2xl before:bg-[radial-gradient(ellipse_at_top_right,rgba(244,63,94,0.15),transparent_65%)] before:pointer-events-none',
  teal: 'before:absolute before:-inset-px before:rounded-2xl before:bg-[radial-gradient(ellipse_at_top_right,rgba(217,119,6,0.15),transparent_65%)] before:pointer-events-none',
  violet: 'before:absolute before:-inset-px before:rounded-2xl before:bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.15),transparent_65%)] before:pointer-events-none',
  hero: 'before:absolute before:-inset-px before:rounded-2xl before:bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.22),transparent_70%)] before:pointer-events-none',
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
  subtext,
  tone = 'default',
  iconHint,
  interactive = false,
  children,
  className = '',
  onClick,
}: KpiCardProps) {
  const isHero = tone === 'hero';
  const base = isHero
    ? `hero-card relative overflow-hidden p-5 ${glowClass[tone]}`
    : `cozy-card relative overflow-hidden border-border p-4 ${glowClass[tone]}`;

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
      {subtext !== undefined && (
        <div
          className={`mt-0.5 text-xs font-semibold tabular-nums ${
            isHero ? 'text-primary-foreground/80' : 'text-text-muted'
          }`}
        >
          {subtext}
        </div>
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
