import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileText,
  Info,
  LogOut,
  Palette,
  Settings2,
  ShieldCheck,
  Type,
  UtensilsCrossed,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFont } from '../../hooks/useFont';
import { useMask } from '../../hooks/useMask';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useTheme } from '../../hooks/useTheme';
import { FONTS, type FontDefinition, type FontId } from '../../lib/fonts';
import {
  popoverVariants,
  springSnappy,
  springSoft,
} from '../../lib/motion';
import {
  DARK_THEMES,
  LIGHT_THEMES,
  type ThemeDefinition,
  type ThemeId,
} from '../../lib/themes';
import { SoftButton } from '../../components/ui/SoftButton';

interface HeaderMenuProps {
  buttonClassName: string;
  userName?: string;
  userEmail?: string;
  userPicture?: string;
  onAbout: () => void;
  onRecipe: () => void;
  onGuide?: () => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
  onLogout: () => void;
  onInstallGuide?: () => void;
}

function ThemeSwatch({ theme }: { theme: ThemeDefinition }) {
  return (
    <span
      className="relative inline-flex h-6 w-9 shrink-0 overflow-hidden rounded-full border border-black/5 shadow-warm-sm dark:border-white/10"
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

export function HeaderMenu({
  buttonClassName,
  userName,
  userEmail,
  userPicture,
  onAbout,
  onRecipe,
  onGuide,
  onPrivacy,
  onTerms,
  onLogout,
  onInstallGuide,
}: HeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<'main' | 'theme' | 'font' | 'guides'>(
    'main'
  );
  const [installHint, setInstallHint] = useState<string | null>(null);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { masked, toggleMask } = useMask();
  const { themeId, setTheme } = useTheme();
  const { fontId, setFont } = useFont();
  const { state: installState, install, canPrompt } = usePwaInstall();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (panel !== 'main') setPanel('main');
        else setOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, panel]);

  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      if (rootRef.current) {
        const rect = rootRef.current.getBoundingClientRect();
        setMenuCoords({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    } else {
      document.body.style.overflow = '';
      setPanel('main');
      setInstallHint(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  function handleSelectTheme(id: ThemeId) {
    setTheme(id);
    window.setTimeout(() => {
      setPanel('main');
      setOpen(false);
    }, 160);
  }

  function handleSelectFont(id: FontId) {
    setFont(id);
    window.setTimeout(() => {
      setPanel('main');
      setOpen(false);
    }, 160);
  }

  async function handleInstall() {
    if (canPrompt) {
      const result = await install();
      if (result === 'accepted' || result === 'installed') {
        setInstallHint('App installed.');
        window.setTimeout(closeMenu, 700);
        return;
      }
    }

    // If native prompt is not available, dismissed, or iOS/desktop browser menu fallback,
    // open the interactive PWA install modal guide.
    closeMenu();
    if (onInstallGuide) {
      onInstallGuide();
    }
  }

  const installLabel =
    installState === 'installed' ? 'App installed' : 'Download App';

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-text outline-none transition-colors hover:bg-surface-muted/60';

  return (
    <div className="relative" ref={rootRef}>
      <SoftButton
        onClick={() => setOpen((prev) => !prev)}
        className={buttonClassName}
        title="Settings"
        aria-label="Open settings menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <Settings2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </SoftButton>

      {createPortal(
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-[100] touch-none">
              {/* Full-screen backdrop overlay to block all background app clicks */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                }}
              />

              {/* Floating settings menu popover */}
              <motion.div
                id={menuId}
                role="menu"
                aria-label="Settings"
                variants={popoverVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={springSoft}
                style={{
                  position: 'fixed',
                  top: menuCoords ? menuCoords.top : 60,
                  right: menuCoords ? menuCoords.right : 16,
                }}
                className="z-[101] w-[15.5rem] origin-top-right rounded-2xl border border-border bg-surface-strong p-1.5 shadow-elevate"
              >
                {panel === 'main' ? (
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={masked}
                      className={itemClass}
                      onClick={() => {
                        toggleMask();
                        closeMenu();
                      }}
                    >
                      {masked ? (
                        <EyeOff className="h-4 w-4 shrink-0 text-text-secondary" />
                      ) : (
                        <Eye className="h-4 w-4 shrink-0 text-text-secondary" />
                      )}
                      <span className="min-w-0 flex-1">
                        {masked ? 'Unmask amounts' : 'Mask amounts'}
                      </span>
                      {masked && (
                        <Check
                          className="h-4 w-4 shrink-0 text-primary"
                          strokeWidth={2.5}
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className={itemClass}
                      onClick={() => setPanel('theme')}
                    >
                      <Palette className="h-4 w-4 shrink-0 text-text-secondary" />
                      <span className="min-w-0 flex-1">Theme</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className={itemClass}
                      onClick={() => setPanel('font')}
                    >
                      <Type className="h-4 w-4 shrink-0 text-text-secondary" />
                      <span className="min-w-0 flex-1">Font</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className={itemClass}
                      onClick={() => {
                        closeMenu();
                        onAbout();
                      }}
                    >
                      <Info className="h-4 w-4 shrink-0 text-text-secondary" />
                      <span className="min-w-0 flex-1">About</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className={itemClass}
                      onClick={() => {
                        closeMenu();
                        onRecipe();
                      }}
                    >
                      <UtensilsCrossed className="h-4 w-4 shrink-0 text-text-secondary" />
                      <span className="min-w-0 flex-1">Recipe</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className={itemClass}
                      onClick={() => setPanel('guides')}
                    >
                      <BookOpen className="h-4 w-4 shrink-0 text-text-secondary" />
                      <span className="min-w-0 flex-1">Guides</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                    </button>

                    {onPrivacy && (
                      <button
                        type="button"
                        role="menuitem"
                        className={itemClass}
                        onClick={() => {
                          closeMenu();
                          onPrivacy();
                        }}
                      >
                        <ShieldCheck className="h-4 w-4 shrink-0 text-text-secondary" />
                        <span className="min-w-0 flex-1">Privacy Policy</span>
                      </button>
                    )}

                    {onTerms && (
                      <button
                        type="button"
                        role="menuitem"
                        className={itemClass}
                        onClick={() => {
                          closeMenu();
                          onTerms();
                        }}
                      >
                        <FileText className="h-4 w-4 shrink-0 text-text-secondary" />
                        <span className="min-w-0 flex-1">Terms of Service</span>
                      </button>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      className={`${itemClass} disabled:opacity-55`}
                      disabled={installState === 'installed'}
                      onClick={() => void handleInstall()}
                    >
                      <Download className="h-4 w-4 shrink-0 text-text-secondary" />
                      <span className="min-w-0 flex-1">{installLabel}</span>
                    </button>

                    {installHint && (
                      <p className="px-2.5 pb-1.5 text-[11px] leading-snug text-text-muted">
                        {installHint}
                      </p>
                    )}

                    {(installState === 'ios-hint' ||
                      installState === 'browser-menu') &&
                      !installHint && (
                        <p className="px-2.5 pb-1.5 text-[11px] leading-snug text-text-muted">
                          {installState === 'ios-hint'
                            ? 'On iOS: Share → Add to Home Screen.'
                            : 'Or use your browser menu → Install app.'}
                        </p>
                      )}

                    <div className="my-1 border-t border-divider" />

                    {(userName || userEmail) && (
                      <div className="mb-0.5 flex items-center gap-2.5 rounded-xl px-2.5 py-2">
                        {userPicture ? (
                          <img
                            src={userPicture}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
                          />
                        ) : (
                          <span
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/25"
                            aria-hidden="true"
                          >
                            {(userName || userEmail || '?')
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          {userName ? (
                            <p className="truncate text-xs font-semibold text-text">
                              {userName}
                            </p>
                          ) : null}
                          {userEmail ? (
                            <p className="truncate text-[11px] text-text-muted">
                              {userEmail}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      className={`${itemClass} text-destructive hover:bg-destructive/10`}
                      onClick={() => {
                        closeMenu();
                        onLogout();
                      }}
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">Log out</span>
                    </button>
                  </div>
                ) : panel === 'theme' ? (
                  <div>
                    <button
                      type="button"
                      className="mb-1 flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-[12px] font-semibold uppercase tracking-[0.1em] text-text-muted outline-none hover:bg-surface-muted/50"
                      onClick={() => setPanel('main')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Theme
                    </button>

                    <p className="px-2.5 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Light
                    </p>
                    <div className="space-y-0.5">
                      {LIGHT_THEMES.map((theme) => (
                        <ThemeOption
                          key={theme.id}
                          theme={theme}
                          active={themeId === theme.id}
                          onSelect={handleSelectTheme}
                        />
                      ))}
                    </div>

                    <div className="my-1.5 border-t border-divider" />

                    <p className="px-2.5 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Dark
                    </p>
                    <div className="space-y-0.5">
                      {DARK_THEMES.map((theme) => (
                        <ThemeOption
                          key={theme.id}
                          theme={theme}
                          active={themeId === theme.id}
                          onSelect={handleSelectTheme}
                        />
                      ))}
                    </div>
                  </div>
                ) : panel === 'font' ? (
                  <div>
                    <button
                      type="button"
                      className="mb-1 flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-[12px] font-semibold uppercase tracking-[0.1em] text-text-muted outline-none hover:bg-surface-muted/50"
                      onClick={() => setPanel('main')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Font
                    </button>

                    <div className="space-y-0.5">
                      {FONTS.map((font) => (
                        <FontOption
                          key={font.id}
                          font={font}
                          active={fontId === font.id}
                          onSelect={handleSelectFont}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      className="mb-1 flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-[12px] font-semibold uppercase tracking-[0.1em] text-text-muted outline-none hover:bg-surface-muted/50"
                      onClick={() => setPanel('main')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Guides
                    </button>

                    <div className="space-y-0.5 pt-1">
                      <button
                        type="button"
                        role="menuitem"
                        className={itemClass}
                        onClick={() => {
                          closeMenu();
                          if (onGuide) {
                            onGuide();
                          } else {
                            window.open('/guide.html', '_blank');
                          }
                        }}
                      >
                        <BookOpen className="h-4 w-4 shrink-0 text-text-secondary" />
                        <span className="min-w-0 flex-1">User Guide</span>
                      </button>

                      <a
                        href="/technical-guide.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={itemClass}
                        onClick={closeMenu}
                      >
                        <FileText className="h-4 w-4 shrink-0 text-text-secondary" />
                        <span className="min-w-0 flex-1">Technical Guide</span>
                      </a>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
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

function FontOption({
  font,
  active,
  onSelect,
}: {
  font: FontDefinition;
  active: boolean;
  onSelect: (id: FontId) => void;
}) {
  return (
    <motion.button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={() => onSelect(font.id)}
      whileHover={{ scale: 1.015, x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={springSnappy}
      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left outline-none transition-colors duration-theme ease-cozy ${
        active
          ? 'bg-primary/15 text-text ring-1 ring-primary/35 shadow-glow'
          : 'text-text-secondary hover:bg-surface-muted/60 hover:text-text'
      }`}
    >
      <span
        className="min-w-0 flex-1 text-[13px] font-medium leading-tight"
        style={{ fontFamily: font.display }}
      >
        {font.name}
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
