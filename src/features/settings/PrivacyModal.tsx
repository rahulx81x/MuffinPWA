import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  backdropVariants,
  popoverVariants,
  springSoft,
} from '../../lib/motion';
import { SoftButton } from '../../components/ui/SoftButton';

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

export function PrivacyModal({ open, onClose }: PrivacyModalProps) {
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
            aria-label="Dismiss privacy policy"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-title"
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
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Legal & Compliance
                  </p>
                  <h2
                    id="privacy-title"
                    className="font-display text-base font-bold text-text"
                  >
                    Privacy Policy
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
                At <strong>Muffin</strong>, your privacy is paramount. All your financial transactions, opening balances, and investment baselines are stored inside your own personal Google Account spreadsheet across dedicated <code>Income</code>, <code>Expense</code>, <code>Investment</code>, and <code>Recipe</code> tabs. Zero financial values are stored in central cloud databases or Blobs.
              </p>

              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3.5 text-text">
                <h3 className="font-bold text-primary mb-1 text-xs">
                  Google API Limited Use Disclosure
                </h3>
                <p className="text-[11px] leading-relaxed">
                  Muffin's use and transfer to any other app of information received from Google APIs will adhere to{' '}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline text-primary"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including Limited Use requirements.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-text mb-1">1. Information Collected</h4>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Google Account email & display name for login authentication.</li>
                  <li>Google Sheets spreadsheet data for authorized personal budget syncing.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-text mb-1">2. Zero Commercial Use or AI Training</h4>
                <p>
                  We do NOT sell, rent, trade, or share your financial data with third parties. Your data is NEVER used for advertising targeting or training artificial intelligence (AI) models.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-text mb-1">3. Full Access Control</h4>
                <p>
                  You can revoke access anytime via{' '}
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline text-primary"
                  >
                    Google Permissions Settings
                  </a>
                  .
                </p>
              </div>

              <div className="pt-2 text-center">
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  View Full External Privacy Webpage →
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
