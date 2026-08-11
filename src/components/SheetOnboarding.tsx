import { useState, type FormEvent } from 'react';
import { SoftButton } from './SoftButton';
import { MuffinIcon } from './MuffinIcon';
import { createSheet, linkSheet } from '../lib/api';

interface SheetOnboardingProps {
  userName?: string;
  onLinked: (info: { spreadsheetId: string; spreadsheetTitle: string }) => void;
}

export function SheetOnboarding({ userName, onLinked }: SheetOnboardingProps) {
  const [mode, setMode] = useState<'choose' | 'link'>('choose');
  const [sheetInput, setSheetInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const result = await createSheet();
      onLinked(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create sheet.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLink(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await linkSheet(sheetInput.trim());
      onLinked(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link sheet.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-text transition-theme">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--accent-rgb),0.14),transparent_55%)]"
      />
      <div className="relative z-10 w-full max-w-md">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
          Almost ready{userName ? `, ${userName.split(' ')[0]}` : ''}
        </p>
        <h1 className="mt-2 flex items-center gap-2.5 font-display text-2xl font-bold tracking-[-0.02em] text-text">
          <MuffinIcon className="muffin-icon h-8 w-8 text-primary" />
          Connect your Google Sheet
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Use a workbook you already keep, or let Muffin create one with Income,
          Expense, and Investment tabs.
        </p>

        {error ? (
          <p
            className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {mode === 'choose' ? (
          <div className="mt-6 flex flex-col gap-3">
            <SoftButton
              disabled={busy}
              onClick={() => setMode('link')}
              className="rounded-2xl border border-border bg-surface-strong px-4 py-3 text-left text-sm font-semibold text-text shadow-warm-sm"
              glow={false}
            >
              I already have a sheet
              <span className="mt-1 block text-xs font-normal text-text-muted">
                Paste the spreadsheet URL or ID
              </span>
            </SoftButton>
            <SoftButton
              disabled={busy}
              onClick={() => void handleCreate()}
              className="rounded-2xl bg-primary px-4 py-3 text-left text-sm font-semibold text-on-primary shadow-glow"
            >
              {busy ? 'Creating…' : 'Create a sheet for me'}
              <span className="mt-1 block text-xs font-normal text-on-primary/80">
                New workbook in your Google Drive
              </span>
            </SoftButton>
          </div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={(e) => void handleLink(e)}>
            <label className="block text-left text-sm font-medium text-text">
              Spreadsheet URL or ID
              <input
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-strong px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
                required
                disabled={busy}
              />
            </label>
            <p className="text-xs text-text-muted">
              Tabs must be named exactly Income, Expense, and Investment.
            </p>
            <div className="flex gap-2">
              <SoftButton
                type="button"
                disabled={busy}
                onClick={() => {
                  setMode('choose');
                  setError(null);
                }}
                className="flex-1 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text"
                glow={false}
              >
                Back
              </SoftButton>
              <SoftButton
                type="submit"
                disabled={busy || !sheetInput.trim()}
                className="flex-1 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-glow"
              >
                {busy ? 'Linking…' : 'Link sheet'}
              </SoftButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
