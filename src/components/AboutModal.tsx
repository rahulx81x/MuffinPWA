interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-muffin-chocolate/50 backdrop-blur-[2px] transition-colors duration-200"
        aria-label="Dismiss about dialog"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface-strong p-5 shadow-warm transition-colors duration-200"
        style={{ animation: 'aboutFade 180ms ease-out' }}
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
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-canvas text-text-secondary shadow-warm-sm transition-colors duration-200 active:scale-95"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6l12 12M18 6 6 18"
              />
            </svg>
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          A cozy personal finance PWA that turns your Google Sheet into a live
          dashboard — income, expenses, investments, Provident Fund tracking,
          and net worth — baked for the phone and installable as an app.
        </p>

        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Warm light & dark themes, amount masking, ledger add/edit, and
          drill-down charts. Stack: React, TypeScript, Vite, Tailwind CSS,
          Netlify Functions, Google Sheets, and Workbox PWA. Built with Cursor
          and GitHub Copilot.
        </p>
      </div>

      <style>{`
        @keyframes aboutFade {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
