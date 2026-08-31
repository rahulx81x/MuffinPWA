import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Type, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { FocusTrap } from '../../components/atoms/FocusTrap';
import { SoftButton } from '../../components/ui/SoftButton';
import { useFont } from '../../hooks/useFont';
import { FONTS } from '../../lib/fonts';
import { backdropVariants, popoverVariants, springSoft } from '../../lib/motion';

interface FontModalProps {
  open: boolean;
  onClose: () => void;
}

export function FontModal({ open, onClose }: FontModalProps) {
  const { fontId, setFont } = useFont();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

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
            aria-label="Dismiss typography dialog"
            onClick={onClose}
          />

          <FocusTrap active={open}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="font-modal-title"
              variants={popoverVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springSoft}
              className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl border border-border bg-canvas p-5 shadow-elevate"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-primary" />
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Typography
                    </p>
                  </div>
                  <h2
                    id="font-modal-title"
                    className="mt-1 font-display text-lg font-bold text-text"
                  >
                    Select Typography Style
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Choose font pairing for headlines and data
                  </p>
                </div>
                <SoftButton
                  onClick={onClose}
                  className="inline-flex min-h-10 min-w-10 h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary shadow-warm-sm"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </SoftButton>
              </div>

              {/* Font Options */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 pt-2">
                {FONTS.map((f) => {
                  const isSelected = fontId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFont(f.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.98] ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-text shadow-warm-sm ring-1 ring-primary/30'
                          : 'border-border/80 bg-surface/70 text-text-secondary hover:border-border hover:bg-surface-strong'
                      }`}
                      style={{ fontFamily: f.body }}
                    >
                      <div>
                        <p className="text-sm font-bold text-text">{f.name}</p>
                        <p className="text-xs text-text-muted mt-0.5" style={{ fontFamily: f.display }}>
                          The quick brown fox jumps · ₹1,23,456
                        </p>
                      </div>
                      {isSelected && (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Done Button */}
              <div className="pt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-warm-sm transition-all hover:opacity-95 active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </FocusTrap>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
