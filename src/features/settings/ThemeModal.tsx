import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Moon, Palette, Sun, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { FocusTrap } from '../../components/atoms/FocusTrap';
import { SoftButton } from '../../components/ui/SoftButton';
import { useTheme } from '../../hooks/useTheme';
import { DARK_THEMES, LIGHT_THEMES, type ThemeDefinition } from '../../lib/themes';
import { backdropVariants, popoverVariants, springSoft } from '../../lib/motion';

interface ThemeModalProps {
  open: boolean;
  onClose: () => void;
}

function ThemeOptionCard({
  theme,
  selected,
  onSelect,
}: {
  theme: ThemeDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex flex-col items-start gap-2.5 rounded-2xl border p-3.5 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.98] ${
        selected
          ? 'border-primary bg-surface-strong shadow-warm-md ring-2 ring-primary/20'
          : 'border-border/80 bg-surface/70 hover:border-border hover:bg-surface-strong/60'
      }`}
    >
      <div className="flex w-full items-center justify-between">
        <span
          className="relative inline-flex h-6 w-12 shrink-0 overflow-hidden rounded-full border border-black/10 shadow-warm-sm dark:border-white/15"
          aria-hidden="true"
        >
          <span
            className="h-full w-[40%]"
            style={{ backgroundColor: theme.background }}
          />
          <span
            className="h-full w-[30%]"
            style={{ backgroundColor: theme.card }}
          />
          <span
            className="h-full flex-1"
            style={{ backgroundColor: theme.accent }}
          />
        </span>
        {selected && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-text">{theme.name}</p>
        <p className="text-[10px] capitalize text-text-muted">{theme.mode} palette</p>
      </div>
    </button>
  );
}

export function ThemeModal({ open, onClose }: ThemeModalProps) {
  const { themeId, setTheme } = useTheme();
  const [tab, setTab] = useState<'all' | 'light' | 'dark'>('all');

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
            aria-label="Dismiss theme dialog"
            onClick={onClose}
          />

          <FocusTrap active={open}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="theme-modal-title"
              variants={popoverVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springSoft}
              className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl border border-border bg-canvas p-5 shadow-elevate"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Appearance
                    </p>
                  </div>
                  <h2
                    id="theme-modal-title"
                    className="mt-1 font-display text-lg font-bold text-text"
                  >
                    Select Theme & Palette
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Choose from cozy light and dark aesthetics
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

              {/* Filter Pills */}
              <div className="my-2 flex items-center gap-1.5 rounded-xl border border-border/80 bg-surface-muted/50 p-1">
                <button
                  type="button"
                  onClick={() => setTab('all')}
                  className={`flex-1 rounded-lg py-1 text-xs font-bold transition-all ${
                    tab === 'all'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  All Themes
                </button>
                <button
                  type="button"
                  onClick={() => setTab('light')}
                  className={`flex items-center justify-center gap-1 flex-1 rounded-lg py-1 text-xs font-bold transition-all ${
                    tab === 'light'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('dark')}
                  className={`flex items-center justify-center gap-1 flex-1 rounded-lg py-1 text-xs font-bold transition-all ${
                    tab === 'dark'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  <span>Dark</span>
                </button>
              </div>

              {/* Theme Grid List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 pt-2">
                {(tab === 'all' || tab === 'light') && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                      Light Palettes
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
                      {LIGHT_THEMES.map((t) => (
                        <ThemeOptionCard
                          key={t.id}
                          theme={t}
                          selected={themeId === t.id}
                          onSelect={() => setTheme(t.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {(tab === 'all' || tab === 'dark') && (
                  <div className={tab === 'all' ? 'pt-3 border-t border-border/60' : ''}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                      Dark Palettes
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
                      {DARK_THEMES.map((t) => (
                        <ThemeOptionCard
                          key={t.id}
                          theme={t}
                          selected={themeId === t.id}
                          onSelect={() => setTheme(t.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
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
