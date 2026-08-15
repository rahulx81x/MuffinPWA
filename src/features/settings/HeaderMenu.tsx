import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, LogOut, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMask } from '../../hooks/useMask';
import { popoverVariants, springSnappy } from '../../lib/motion';

interface HeaderMenuProps {
  buttonClassName?: string;
  userName?: string;
  userEmail?: string;
  userPicture?: string;
  onLogout: () => void;
}

export function HeaderMenu({
  userName,
  userEmail,
  userPicture,
  onLogout,
}: HeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { masked, toggleMask } = useMask();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number } | null>(
    null
  );

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
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const userInitial = (userName || userEmail || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="relative shrink-0" ref={rootRef}>
      {/* Profile Picture Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-primary/70 bg-surface-strong shadow-warm-sm transition-all duration-200 outline-none hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
        aria-label="User account menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        {userPicture ? (
          <img
            src={userPicture}
            alt={userName || 'User avatar'}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-muted via-primary to-primary font-display text-sm font-bold text-primary-foreground">
            {userInitial}
          </span>
        )}
      </button>

      {/* Popover Portal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && menuCoords && (
              <div
                className="fixed inset-0 z-[9999] overflow-hidden"
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
              >
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 bg-black/45 backdrop-blur-xs"
                  onClick={() => setOpen(false)}
                  aria-hidden="true"
                />

                {/* Popover Card */}
                <motion.div
                  id={menuId}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Account details"
                  variants={popoverVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={springSnappy}
                  style={{
                    position: 'absolute',
                    top: `${menuCoords.top}px`,
                    right: `${Math.max(16, menuCoords.right)}px`,
                  }}
                  className="w-[calc(100vw-32px)] max-w-xs overflow-hidden rounded-2xl border-2 border-border/90 bg-surface-strong p-4 text-text shadow-elevate backdrop-blur-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header / User Info */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3 min-w-0">
                      {userPicture ? (
                        <img
                          src={userPicture}
                          alt={userName || 'Avatar'}
                          className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-primary/30"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-muted via-primary to-primary text-base font-bold text-primary-foreground">
                          {userInitial}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm font-bold text-text">
                          {userName || 'Muffin User'}
                        </p>
                        {userEmail && (
                          <p className="truncate text-xs text-text-muted">
                            {userEmail}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-lg p-1 text-text-muted hover:bg-surface-muted hover:text-text"
                      aria-label="Close user menu"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 space-y-2">
                    {/* Quick Mask Amounts Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleMask();
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-surface/70 px-3 py-2.5 text-left text-xs font-semibold text-text transition-colors hover:bg-surface-muted/60 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-2">
                        {masked ? (
                          <EyeOff className="h-4 w-4 text-primary" />
                        ) : (
                          <Eye className="h-4 w-4 text-primary" />
                        )}
                        <span>{masked ? 'Amounts Hidden' : 'Amounts Visible'}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-primary">
                        {masked ? 'Unhide' : 'Hide'}
                      </span>
                    </button>

                    {/* Log Out Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onLogout();
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-xs font-bold text-destructive transition-all hover:bg-destructive/20 active:scale-[0.98]"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
