import { MuffinIcon } from './MuffinIcon';
import { AUTH_START_URL } from '../lib/api';

interface SignInScreenProps {
  authError?: string | null;
}

export function SignInScreen({ authError }: SignInScreenProps) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-text transition-theme">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--accent-rgb),0.16),transparent_55%)]"
      />
      <div className="relative z-10 w-full max-w-sm text-center">
        <MuffinIcon className="mx-auto h-14 w-14 text-primary" />
        <h1 className="mt-4 font-display text-3xl font-bold tracking-[-0.03em]">
          <span className="bg-gradient-to-r from-primary-muted to-primary bg-clip-text text-transparent">
            Muffin
          </span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Sign in with Google to connect your own finance spreadsheet — pick an
          existing workbook or create one in a tap.
        </p>

        {authError ? (
          <p
            className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-left text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
            role="alert"
          >
            {authError}
          </p>
        ) : null}

        <a
          href={AUTH_START_URL}
          className="soft-glow mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.97]"
        >
          Sign in with Google
        </a>
        <p className="mt-4 text-xs text-text-muted">
          Free Google account required. Your sheet stays in your Drive.
        </p>
      </div>
    </div>
  );
}
