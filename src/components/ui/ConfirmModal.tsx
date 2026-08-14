import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  backdropVariants,
  popoverVariants,
  springSoft,
} from '../../lib/motion';
import { SoftButton } from './SoftButton';
import { FocusTrap } from '../atoms/FocusTrap';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onCancel();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onCancel]);

  const confirmClass =
    variant === 'destructive'
      ? 'inline-flex flex-1 items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-warm-sm disabled:opacity-50'
      : 'inline-flex flex-1 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
          <motion.button
            type="button"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-black/50"
            aria-label="Dismiss confirmation"
            disabled={busy}
            onClick={() => {
              if (!busy) onCancel();
            }}
          />

          <FocusTrap active={open}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-modal-title"
              aria-describedby="confirm-modal-message"
              variants={popoverVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springSoft}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface-strong p-5 shadow-elevate"
            >
              <h2
                id="confirm-modal-title"
                className="font-display text-base font-bold text-text"
              >
                {title}
              </h2>
              <p
                id="confirm-modal-message"
                className="mt-2 text-sm leading-relaxed text-text-secondary"
              >
                {message}
              </p>

              <div className="mt-5 flex gap-2.5">
                <SoftButton
                  onClick={onCancel}
                  disabled={busy}
                  glow={false}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm font-semibold text-text-secondary shadow-warm-sm disabled:opacity-50"
                >
                  {cancelLabel}
                </SoftButton>
                <SoftButton
                  onClick={onConfirm}
                  disabled={busy}
                  className={confirmClass}
                >
                  {busy ? 'Working…' : confirmLabel}
                </SoftButton>
              </div>
            </motion.div>
          </FocusTrap>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
