import { AnimatePresence, motion } from 'framer-motion';
import { FileText, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  backdropVariants,
  popoverVariants,
  springSoft,
} from '../lib/motion';
import { SoftButton } from './SoftButton';

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
}

export function TermsModal({ open, onClose }: TermsModalProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
          <motion.button
            type="button"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-black/50"
            aria-label="Dismiss terms of service"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-title"
            variants={popoverVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springSoft}
            className="relative z-10 max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl rounded-b-2xl border border-border bg-surface-strong p-5 shadow-elevate sm:max-w-md sm:rounded-2xl"
          >
            <div className="mx-auto -mt-1 mb-3 h-1.5 w-12 shrink-0 rounded-full bg-border/80 sm:hidden" />

            <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <FileText className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Legal & Terms
                  </p>
                  <h2
                    id="terms-title"
                    className="font-display text-base font-bold text-text"
                  >
                    Terms of Service
                  </h2>
                </div>
              </div>
              <SoftButton
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-canvas text-text-secondary shadow-warm-sm"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </SoftButton>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-text-secondary">
              <p>
                Welcome to <strong>Muffin</strong>. By authenticating with your Google Account, you agree to these Terms of Service.
              </p>

              <div>
                <h4 className="font-bold text-text mb-1">1. Personal Use Dashboard</h4>
                <p>
                  Muffin is a personal finance PWA dashboard designed to read and sync data with your user-authorized Google Sheets spreadsheets.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-text mb-1">2. Financial Disclaimer</h4>
                <p>
                  Calculations, metrics, and scenario planner estimates provided in Muffin are for personal tracking purposes only and do NOT constitute professional tax, investment, or legal advice.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-text mb-1">3. User Data Ownership</h4>
                <p>
                  You retain 100% ownership of all spreadsheets, rows, and transaction data inside your Google Account.
                </p>
              </div>

              <div className="pt-2 text-center">
                <a
                  href="/terms.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  View Full External Terms Webpage →
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
