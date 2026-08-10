import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  backdropVariants,
  popoverVariants,
  springSoft,
} from '../lib/motion';
import { SoftButton } from './SoftButton';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
}

export function AboutModal({
  open,
  onClose,
  onPrivacy,
  onTerms,
}: AboutModalProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.button
            type="button"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-black/50"
            aria-label="Dismiss about dialog"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            variants={popoverVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springSoft}
            className="relative z-10 w-full max-w-sm sm:max-w-md rounded-2xl border border-border bg-surface-strong p-5 shadow-elevate"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  About
                </p>
                <h2
                  id="about-title"
                  className="mt-1 font-display text-base font-bold text-text"
                >
                  Muffin
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Vibe Coded by Rahul Gouri, 2026
                </p>
              </div>
              <SoftButton
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-canvas text-text-secondary shadow-warm-sm"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </SoftButton>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              A cozy personal finance PWA that turns your Google Sheet into a live
              dashboard — income, expenses, investments, Provident Fund tracking,
              and net worth — baked for the phone and installable as an app.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Six muffin themes (Classic, Blueberry, Pistachio Matcha, Double
              Chocolate, Red Velvet, Salted Caramel), soft motion and tactile UI,
              amount masking, ledger add/edit, and themed drill-down charts.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Stack: React, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide,
              Netlify Functions, Google Sheets, and Workbox PWA. Built with Cursor
              and GitHub Copilot.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-border/60 pt-3 text-xs">
              <a
                href="/guide.html"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="font-semibold text-primary hover:underline"
              >
                User Guide
              </a>
              <span className="text-text-muted">•</span>
              {onPrivacy && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPrivacy();
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Privacy Policy
                </button>
              )}
              {onPrivacy && onTerms && <span className="text-text-muted">•</span>}
              {onTerms && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTerms();
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Terms of Service
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
