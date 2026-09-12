import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { SoftButton } from './SoftButton';
import { springSoft } from '../../lib/motion';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastNotificationProps {
  message: string;
  type?: ToastType;
  durationMs?: number;
  undoFn?: () => void | Promise<void>;
  onDismiss: () => void;
}

export function detectToastType(
  text: string,
  explicitType?: ToastType
): ToastType {
  if (explicitType) return explicitType;
  const lower = text.toLowerCase();
  if (
    lower.includes('failed') ||
    lower.includes('error') ||
    lower.includes('expired') ||
    lower.includes('signed out')
  ) {
    return 'error';
  }
  if (
    lower.includes('deleted') ||
    lower.includes('unlink') ||
    lower.includes('removed')
  ) {
    return 'warning';
  }
  if (
    lower.includes('added') ||
    lower.includes('updated') ||
    lower.includes('restored') ||
    lower.includes('logged') ||
    lower.includes('linked') ||
    text.includes('✓')
  ) {
    return 'success';
  }
  return 'info';
}

function AnimatedToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') {
    return (
      <motion.div
        initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 450, damping: 22 }}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 shadow-sm dark:text-emerald-400"
        aria-hidden="true"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M20 6L9 17L4 12"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
          />
        </svg>
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full border border-emerald-500/40"
          initial={{ scale: 0.85, opacity: 0.8 }}
          animate={{ scale: 1.35, opacity: 0 }}
          transition={{
            duration: 1.1,
            ease: 'easeOut',
            repeat: Infinity,
            repeatDelay: 1.4,
          }}
        />
      </motion.div>
    );
  }

  if (type === 'warning') {
    return (
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.5, 1.12, 1], opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-600 shadow-sm dark:text-amber-400"
        aria-hidden="true"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.line
            x1="12"
            y1="8"
            x2="12"
            y2="13"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.25, delay: 0.08 }}
          />
          <motion.circle
            cx="12"
            cy="17"
            r="1"
            fill="currentColor"
            stroke="none"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.22, type: 'spring' }}
          />
        </svg>
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full border border-amber-500/40"
          initial={{ scale: 0.85, opacity: 0.8 }}
          animate={{ scale: 1.35, opacity: 0 }}
          transition={{
            duration: 1.1,
            ease: 'easeOut',
            repeat: Infinity,
            repeatDelay: 1.4,
          }}
        />
      </motion.div>
    );
  }

  if (type === 'error') {
    return (
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: [0, -10, 10, -5, 0] }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-600 shadow-sm dark:text-rose-400"
        aria-hidden="true"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M18 6L6 18M6 6l12 12"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.28, delay: 0.08 }}
          />
        </svg>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 450, damping: 22 }}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary shadow-sm"
      aria-hidden="true"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </motion.div>
  );
}

export function ToastNotification({
  message,
  type,
  durationMs = 5000,
  undoFn,
  onDismiss,
}: ToastNotificationProps) {
  const resolvedType = detectToastType(message, type);

  // Clean trailing checkmark symbol if present, since animated badge represents it
  const displayMessage = message.replace(/\s*✓\s*$/, '');

  const progressBarColor =
    resolvedType === 'success'
      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
      : resolvedType === 'warning'
        ? 'bg-gradient-to-r from-amber-500 to-orange-400'
        : resolvedType === 'error'
          ? 'bg-gradient-to-r from-rose-500 to-red-500'
          : 'bg-gradient-to-r from-primary to-accent';

  const borderAccentColor =
    resolvedType === 'success'
      ? 'border-emerald-500/25'
      : resolvedType === 'warning'
        ? 'border-amber-500/25'
        : resolvedType === 'error'
          ? 'border-rose-500/25'
          : 'border-primary/25';

  return (
    <motion.div
      key={`toast-${message}`}
      initial={{ opacity: 0, y: -14, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.94 }}
      transition={springSoft}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[calc(env(safe-area-inset-top,0px)+3.75rem)]"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto relative flex min-h-[60px] w-full max-w-sm items-center gap-3.5 overflow-hidden rounded-2xl border ${borderAccentColor} bg-surface-strong/95 px-4 py-3.5 pb-4 text-sm text-text shadow-elevate backdrop-blur-xl`}
      >
        <AnimatedToastIcon type={resolvedType} />

        <p className="min-w-0 flex-1 font-medium leading-snug text-text">
          {displayMessage}
        </p>

        {undoFn && (
          <button
            type="button"
            onClick={() => {
              void undoFn();
            }}
            className="shrink-0 rounded-xl border border-primary/30 bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary/25 active:scale-95 shadow-warm-xs"
          >
            Undo
          </button>
        )}

        <SoftButton
          onClick={onDismiss}
          className="inline-flex min-h-8 min-w-8 h-8 w-8 shrink-0 items-center justify-center rounded-xl text-text-secondary outline-none transition-colors hover:bg-surface-muted/70 hover:text-text"
          aria-label="Dismiss notification"
          glow={false}
        >
          <X className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        </SoftButton>

        {/* SweetAlert2-style timer countdown bar running down at the very bottom */}
        <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-border/40">
          <motion.div
            key={`progress-${message}`}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: durationMs / 1000, ease: 'linear' }}
            className={`h-full ${progressBarColor}`}
          />
        </div>
      </div>
    </motion.div>
  );
}
