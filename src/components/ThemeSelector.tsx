import { AnimatePresence, motion } from 'framer-motion';
import { Check, Palette } from 'lucide-react';
import { useId, useState } from 'react';
import {
  backdropVariants,
  popoverVariants,
  springSnappy,
  springSoft,
} from '../lib/motion';
import {
  DARK_THEMES,
  LIGHT_THEMES,
  type ThemeDefinition,
  type ThemeId,
} from '../lib/themes';
import { SoftButton } from './SoftButton';

interface ThemeSelectorProps {
  themeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  buttonClassName: string;
}

function ThemeSwatch({ theme }: { theme: ThemeDefinition }) {
  return (
    <span
      className="relative inline-flex h-7 w-11 shrink-0 overflow-hidden rounded-full border border-black/5 shadow-warm-sm dark:border-white/10"
      aria-hidden="true"
    >
      <span
        className="h-full w-[42%]"
        style={{ backgroundColor: theme.background }}
      />
      <span
        className="h-full w-[33%]"
        style={{ backgroundColor: theme.card }}
      />
      <span
        className="h-full flex-1"
        style={{ backgroundColor: theme.accent }}
      />
    </span>
  );
}

function ThemeOption({
  theme,
  active,
  onSelect,
}: {
  theme: ThemeDefinition;
  active: boolean;
  onSelect: (id: ThemeId) => void;
}) {
  return (
    <motion.button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={() => onSelect(theme.id)}
      whileHover={{ scale: 1.015, x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={springSnappy}
      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left outline-none transition-colors duration-theme ease-cozy ${
        active
          ? 'bg-primary/15 text-text ring-1 ring-primary/35 shadow-glow'
          : 'text-text-secondary hover:bg-surface-muted/60 hover:text-text'
      }`}
    >
      <ThemeSwatch theme={theme} />
      <span className="min-w-0 flex-1 text-[13px] font-medium leading-tight">
        {theme.name}
      </span>
      <AnimatePresence initial={false}>
        {active && (
          <motion.span
            key="check"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={springSoft}
            className="inline-flex shrink-0 text-primary"
          >
            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function ThemeSelector({
  themeId,
  onThemeChange,
  buttonClassName,
}: ThemeSelectorProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  function handleSelect(id: ThemeId) {
    onThemeChange(id);
    // Keep open briefly so the checkmark animates, then close.
    window.setTimeout(() => setOpen(false), 180);
  }

  return (
    <>
      <div className="relative z-[60]">
        <SoftButton
          onClick={() => setOpen((prev) => !prev)}
          className={buttonClassName}
          title="Choose theme"
          aria-label="Choose theme"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
        >
          <Palette className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </SoftButton>

        <AnimatePresence>
          {open && (
            <motion.div
              id={menuId}
              role="menu"
              aria-label="Theme options"
              variants={popoverVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springSoft}
              className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-[16.5rem] origin-top-right rounded-2xl border border-border bg-surface-strong p-2 shadow-elevate"
            >
              <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Light Themes
              </p>
              <div className="space-y-0.5">
                {LIGHT_THEMES.map((theme) => (
                  <ThemeOption
                    key={theme.id}
                    theme={theme}
                    active={themeId === theme.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>

              <div className="my-2 border-t border-divider" />

              <p className="px-2.5 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Dark Themes
              </p>
              <div className="space-y-0.5">
                {DARK_THEMES.map((theme) => (
                  <ThemeOption
                    key={theme.id}
                    theme={theme}
                    active={themeId === theme.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label="Close theme menu"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[55] bg-black/35"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
