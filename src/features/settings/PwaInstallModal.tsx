import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Download,
  Laptop,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  backdropVariants,
  popoverVariants,
  springSoft,
} from '../../lib/motion';
import { MuffinIcon } from '../../components/ui/MuffinIcon';
import { SoftButton } from '../../components/ui/SoftButton';

interface PwaInstallModalProps {
  open: boolean;
  onClose: () => void;
  canPrompt?: boolean;
  onNativeInstall?: () => void;
}

export function PwaInstallModal({
  open,
  onClose,
  canPrompt,
  onNativeInstall,
}: PwaInstallModalProps) {
  const [deviceTab, setDeviceTab] = useState<'mobile' | 'ios' | 'desktop'>(() => {
    if (typeof navigator === 'undefined') return 'desktop';
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return 'ios';
    if (/android/i.test(navigator.userAgent)) return 'mobile';
    return 'desktop';
  });

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.button
            type="button"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            aria-label="Dismiss install guide modal"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-modal-title"
            variants={popoverVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springSoft}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface-strong p-5 shadow-elevate"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
                  <MuffinIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2
                    id="install-modal-title"
                    className="font-display text-base font-bold text-text"
                  >
                    Install Muffin PWA
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Add to your home screen for an app-like experience
                  </p>
                </div>
              </div>

              <SoftButton
                onClick={onClose}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-canvas text-text-secondary shadow-warm-sm"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </SoftButton>
            </div>

            {/* Direct Native Install Action if available */}
            {canPrompt && onNativeInstall && (
              <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/10 p-3.5 text-center">
                <p className="text-xs font-medium text-text">
                  Your browser supports 1-click installation!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNativeInstall();
                  }}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-glow transition-transform active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  Install App Now
                </button>
              </div>
            )}

            {/* Device tabs */}
            <div className="mt-4 flex rounded-xl border border-border/60 bg-surface-muted/50 p-1">
              <button
                type="button"
                onClick={() => setDeviceTab('mobile')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  deviceTab === 'mobile'
                    ? 'bg-surface-strong text-text shadow-warm-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Android
              </button>
              <button
                type="button"
                onClick={() => setDeviceTab('ios')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  deviceTab === 'ios'
                    ? 'bg-surface-strong text-text shadow-warm-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <Share className="h-3.5 w-3.5" />
                iOS Safari
              </button>
              <button
                type="button"
                onClick={() => setDeviceTab('desktop')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  deviceTab === 'desktop'
                    ? 'bg-surface-strong text-text shadow-warm-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <Laptop className="h-3.5 w-3.5" />
                Desktop
              </button>
            </div>

            {/* Instructions steps */}
            <div className="mt-4 space-y-2.5 text-xs">
              {deviceTab === 'mobile' && (
                <>
                  <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                      1
                    </span>
                    <p className="pt-0.5 text-text-secondary">
                      Open Muffin in Chrome on your phone.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                      2
                    </span>
                    <p className="pt-0.5 text-text-secondary">
                      Tap the menu icon (
                      <MoreVertical className="inline h-3.5 w-3.5 text-text" />) in the top right corner.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                      3
                    </span>
                    <p className="pt-0.5 text-text-secondary">
                      Select <strong className="text-text">Add to Home screen</strong> or <strong className="text-text">Install app</strong>.
                    </p>
                  </div>
                </>
              )}

              {deviceTab === 'ios' && (
                <>
                  <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                      1
                    </span>
                    <p className="pt-0.5 text-text-secondary">
                      Open Muffin in <strong className="text-text">Safari</strong> on your iPhone or iPad.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                      2
                    </span>
                    <p className="pt-0.5 text-text-secondary">
                      Tap the <strong className="text-text">Share</strong> button (
                      <Share className="inline h-3.5 w-3.5 text-primary" />) at the bottom toolbar.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                      3
                    </span>
                    <p className="pt-0.5 text-text-secondary">
                      Scroll down and select <strong className="text-text">Add to Home Screen</strong> (
                      <PlusSquare className="inline h-3.5 w-3.5 text-text" />).
                    </p>
                  </div>
                </>
              )}

              {deviceTab === 'desktop' && (
                <>
                  <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                      1
                    </span>
                    <p className="pt-0.5 text-text-secondary">
                      Look at your browser address bar in Chrome, Edge, or Brave.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                      2
                    </span>
                    <p className="pt-0.5 text-text-secondary">
                      Click the <strong className="text-text">Install Muffin</strong> icon (
                      <Download className="inline h-3.5 w-3.5 text-primary" />) or browser menu options.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                      3
                    </span>
                    <p className="pt-0.5 text-text-secondary">
                      Confirm installation to launch Muffin in its own standalone window!
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Features list */}
            <div className="mt-4 border-t border-border/60 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Benefits of Installing
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-text-secondary">
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  Full-screen experience
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  Home screen access
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  Faster launch speeds
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  Offline cached shell
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-surface-muted px-4 py-2 text-xs font-bold text-text transition-colors hover:bg-surface-muted/80"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
