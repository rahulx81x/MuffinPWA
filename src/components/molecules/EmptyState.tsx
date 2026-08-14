import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { springSoft } from '../../lib/motion';
import { SoftButton } from '../ui/SoftButton';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface-strong/60 px-6 py-10 text-center transition-theme ${className}`}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-warm-sm">
          {icon}
        </div>
      )}
      <div className="max-w-xs space-y-1">
        <h3 className="font-display text-base font-bold text-text">{title}</h3>
        <p className="text-xs leading-relaxed text-text-muted">{description}</p>
      </div>
      {action && (
        <SoftButton
          onClick={action.onClick}
          className="mt-1 rounded-xl bg-primary/15 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/25"
        >
          {action.label}
        </SoftButton>
      )}
    </motion.div>
  );
}
