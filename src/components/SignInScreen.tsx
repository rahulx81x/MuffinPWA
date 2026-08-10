import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Link2,
  ShieldCheck,
  Sheet,
} from 'lucide-react';
import { pageTransition, springSoft } from '../lib/motion';
import { AUTH_START_URL } from '../lib/api';

interface SignInScreenProps {
  authError?: string | null;
}

const STEPS = [
  {
    title: 'Connect your sheet',
    body: 'Link an existing Google Sheet or let Muffin create Income, Expense, and Investment tabs for you.',
    Icon: Link2,
  },
  {
    title: 'Log money your way',
    body: 'Add transactions in the app or edit the sheet directly — both stay in sync automatically.',
    Icon: Sheet,
  },
  {
    title: 'See the full picture',
    body: 'Balances, spending, and net worth on an installable PWA dashboard that works offline.',
    Icon: LayoutDashboard,
  },
] as const;

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

export function SignInScreen({ authError }: SignInScreenProps) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-canvas text-text transition-theme">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(var(--accent-rgb),0.22),transparent_68%)] blur-2xl" />
        <div className="absolute -right-16 top-40 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(var(--accent-rgb),0.12),transparent_70%)] blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-canvas-alt/80 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={pageTransition}
          className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 xl:gap-20"
        >
          {/* Hero + CTA */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Personal finance · Google Sheets
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl lg:text-[3.35rem]">
              <span className="bg-gradient-to-br from-primary-muted via-primary to-primary-muted bg-clip-text text-transparent">
                Muffin
              </span>
            </h1>
            <p className="mt-3 max-w-md font-display text-xl font-semibold leading-snug tracking-[-0.02em] text-text sm:text-2xl">
              Your sheet, baked into a live dashboard
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary sm:text-[15px]">
              Track income, expenses, and investments with a Google Sheet you
              own. Muffin turns that workbook into a cozy installable app —
              your records stay in Drive, not on our servers.
            </p>

            {authError ? (
              <p
                className="mt-5 w-full max-w-md rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-left text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
                role="alert"
              >
                {authError}
              </p>
            ) : null}

            <motion.a
              href={AUTH_START_URL}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={springSoft}
              className="soft-glow mt-7 inline-flex w-full max-w-md items-center justify-center gap-2.5 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow sm:py-4 sm:text-[15px]"
            >
              <GoogleMark className="h-5 w-5 rounded-sm bg-white p-0.5" />
              Sign in with Google
            </motion.a>
            <p className="mt-3 max-w-md text-xs text-text-muted">
              Free Google account required · Your sheet stays in your Drive
            </p>
          </div>

          {/* Informative panel */}
          <div className="w-full space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {STEPS.map((step, index) => {
                const Icon = step.Icon;
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...pageTransition, delay: 0.08 + index * 0.06 }}
                    className="cozy-card flex gap-3 p-4 text-left sm:flex-col sm:gap-2.5 lg:flex-row lg:gap-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="h-5 w-5" strokeWidth={2.1} />
                    </div>
                    <div>
                      <h2 className="font-display text-sm font-bold text-text">
                        {step.title}
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-text-secondary sm:text-[13px]">
                        {step.body}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...pageTransition, delay: 0.3 }}
              className="glass-panel rounded-2xl p-4 text-left sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success">
                  <ShieldCheck className="h-5 w-5" strokeWidth={2.1} />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-text">
                    Why Google access is needed
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-text-secondary sm:text-[13px]">
                    Sign-in authenticates you and grants access only to the
                    spreadsheet you choose. We use your email for login and
                    Sheets solely to sync personal finance entries. We don’t
                    sell your data or keep transaction history on our servers.
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">
                    Independently built by Rahul Gouri ·{' '}
                    <a
                      href="/guide.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:underline"
                    >
                      User Guide
                    </a>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <footer className="relative z-10 mt-10 border-t border-border/70 pt-5 text-center text-[11px] leading-normal text-text-muted lg:mt-12 lg:text-left">
          By signing in, you agree to Muffin’s{' '}
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            Privacy Policy
          </a>
          .
        </footer>
      </div>
    </div>
  );
}
