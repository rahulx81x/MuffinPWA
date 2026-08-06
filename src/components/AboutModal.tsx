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
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]"
        aria-label="Dismiss about dialog"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        style={{ animation: 'aboutFade 180ms ease-out' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              About
            </p>
            <h2
              id="about-title"
              className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Muffin
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Vibe Coded by Rahul Gouri, 2026
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700 transition active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
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

        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          A personal finance PWA that turns your Google Sheet into a live
          dashboard for income, expenses, investments, and net worth — built for
          the phone, installable as an app.
        </p>

        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Stack: React, TypeScript, Vite, Tailwind CSS, Netlify Functions, Google
          Sheets (published CSV), with PWA support via Workbox. Built with Cursor
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
