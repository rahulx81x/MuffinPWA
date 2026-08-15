import {
  BookOpen,
  Check,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Info,
  LogOut,
  Palette,
  RotateCcw,
  ShieldCheck,
  Type,
  UtensilsCrossed,
} from 'lucide-react';
import { useFont } from '../../hooks/useFont';
import { useMask } from '../../hooks/useMask';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useTheme } from '../../hooks/useTheme';
import { FONTS } from '../../lib/fonts';
import {
  DARK_THEMES,
  LIGHT_THEMES,
  type ThemeDefinition,
} from '../../lib/themes';
import { SoftButton } from '../../components/ui/SoftButton';

interface SettingsViewProps {
  userName?: string;
  userEmail?: string;
  userPicture?: string;
  spreadsheetTitle?: string;
  onAbout: () => void;
  onRecipe: () => void;
  onGuide: () => void;
  onTour: () => void;
  onPrivacy: () => void;
  onTerms: () => void;
  onChangeSheet: () => void;
  onLogout: () => void;
  onInstallGuide: () => void;
}

function ThemeCard({
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

export function SettingsView({
  userName,
  userEmail,
  userPicture,
  spreadsheetTitle,
  onAbout,
  onRecipe,
  onGuide,
  onTour,
  onPrivacy,
  onTerms,
  onChangeSheet,
  onLogout,
  onInstallGuide,
}: SettingsViewProps) {
  const { masked, toggleMask } = useMask();
  const { themeId, setTheme } = useTheme();
  const { fontId, setFont } = useFont();
  const { state: installState, install, canPrompt } = usePwaInstall();

  const userInitial = (userName || userEmail || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title */}
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
          Settings
        </h2>
        <p className="text-xs text-text-muted">
          Manage your account, appearance, privacy, and preferences
        </p>
      </div>

      {/* Account Section */}
      <section aria-labelledby="settings-account-heading" className="space-y-3">
        <div className="cozy-card flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-center gap-3.5">
            {userPicture ? (
              <img
                src={userPicture}
                alt={userName || 'User avatar'}
                className="h-12 w-12 rounded-2xl object-cover ring-2 ring-primary/30 shadow-warm-sm"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-muted via-primary to-primary text-base font-bold text-primary-foreground shadow-warm-sm">
                {userInitial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-bold text-text">
                {userName || 'Muffin User'}
              </p>
              {userEmail && (
                <p className="truncate text-xs text-text-muted">{userEmail}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive transition-all hover:bg-destructive/15 active:scale-95"
              title="Sign out of Muffin"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log out</span>
            </button>
          </div>

          {/* Linked Google Sheet */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-surface/80 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Connected Sheet
                </p>
                <p className="truncate text-xs font-medium text-text">
                  {spreadsheetTitle || 'Personal Finance Sheet'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onChangeSheet}
              className="shrink-0 self-start sm:self-auto rounded-lg border border-border/80 bg-surface-strong px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:border-border hover:text-text active:scale-95"
            >
              Change Sheet
            </button>
          </div>
        </div>
      </section>

      {/* Appearance Section */}
      <section aria-labelledby="settings-appearance-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h3
            id="settings-appearance-heading"
            className="text-xs font-bold uppercase tracking-wider text-text-muted"
          >
            Appearance & Themes
          </h3>
        </div>

        {/* Theme Picker */}
        <div className="cozy-card space-y-3.5 p-4 sm:p-5">
          <div>
            <p className="text-xs font-semibold text-text-secondary">Light Themes</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {LIGHT_THEMES.map((t) => (
                <ThemeCard
                  key={t.id}
                  theme={t}
                  selected={themeId === t.id}
                  onSelect={() => setTheme(t.id)}
                />
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border/60">
            <p className="text-xs font-semibold text-text-secondary">Dark Themes</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {DARK_THEMES.map((t) => (
                <ThemeCard
                  key={t.id}
                  theme={t}
                  selected={themeId === t.id}
                  onSelect={() => setTheme(t.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Font Picker */}
        <div className="cozy-card space-y-3 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold text-text">Typography Style</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFont(f.id)}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.98] ${
                  fontId === f.id
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border/70 bg-surface/60 text-text-secondary hover:border-border hover:bg-surface-strong'
                }`}
                style={{ fontFamily: f.body }}
              >
                <span className="text-xs">{f.name}</span>
                {fontId === f.id && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Data & Privacy Section */}
      <section aria-labelledby="settings-data-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3
            id="settings-data-heading"
            className="text-xs font-bold uppercase tracking-wider text-text-muted"
          >
            Data & Privacy
          </h3>
        </div>

        <div className="cozy-card divide-y divide-border/60">
          {/* Mask Amounts Toggle */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {masked ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-text">Mask Financial Amounts</p>
                <p className="text-[11px] text-text-muted">
                  Hide account figures in public places
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={masked}
              onClick={toggleMask}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                masked ? 'bg-primary' : 'bg-surface-muted'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  masked ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Starting Balances (Recipe) */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text">Starting Balances</p>
                <p className="text-[11px] text-text-muted">
                  Configure opening liquid balance & initial investments
                </p>
              </div>
            </div>
            <SoftButton
              onClick={onRecipe}
              className="px-3 py-1.5 text-xs font-semibold"
              glow={false}
            >
              Configure
            </SoftButton>
          </div>
        </div>
      </section>

      {/* Learn & Guides Section */}
      <section aria-labelledby="settings-guides-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3
            id="settings-guides-heading"
            className="text-xs font-bold uppercase tracking-wider text-text-muted"
          >
            Guides & Help
          </h3>
        </div>

        <div className="cozy-card divide-y divide-border/60">
          <button
            type="button"
            onClick={onGuide}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-surface-strong/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text">User & Formula Guide</p>
                <p className="text-[11px] text-text-muted">
                  Formulas, sheet formatting, and best practices
                </p>
              </div>
            </div>
            <span className="text-xs text-text-muted font-medium">View &rarr;</span>
          </button>

          <button
            type="button"
            onClick={onTour}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-surface-strong/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text">Replay Onboarding Tour</p>
                <p className="text-[11px] text-text-muted">
                  Interactive walk-through of Muffin features
                </p>
              </div>
            </div>
            <span className="text-xs text-text-muted font-medium">Replay &rarr;</span>
          </button>
        </div>
      </section>

      {/* App Installation & Legal Section */}
      <section aria-labelledby="settings-about-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h3
            id="settings-about-heading"
            className="text-xs font-bold uppercase tracking-wider text-text-muted"
          >
            About & App
          </h3>
        </div>

        <div className="cozy-card divide-y divide-border/60">
          {installState !== 'installed' && (
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text">Install Muffin App</p>
                  <p className="text-[11px] text-text-muted">
                    Install to home screen for native offline experience
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={canPrompt ? () => void install() : onInstallGuide}
                className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-95"
              >
                {canPrompt ? 'Install' : 'Instructions'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onAbout}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-surface-strong/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-muted text-text-secondary">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text">About Muffin</p>
                <p className="text-[11px] text-text-muted">
                  Version, developer information & license
                </p>
              </div>
            </div>
            <span className="text-xs text-text-muted font-medium">View &rarr;</span>
          </button>

          <button
            type="button"
            onClick={onPrivacy}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-surface-strong/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-muted text-text-secondary">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text">Privacy Policy</p>
                <p className="text-[11px] text-text-muted">
                  Zero third-party trackers. Your Google Sheet is yours alone.
                </p>
              </div>
            </div>
            <span className="text-xs text-text-muted font-medium">View &rarr;</span>
          </button>

          <button
            type="button"
            onClick={onTerms}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-surface-strong/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-muted text-text-secondary">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text">Terms of Service</p>
                <p className="text-[11px] text-text-muted">
                  Terms of use for Muffin PWA
                </p>
              </div>
            </div>
            <span className="text-xs text-text-muted font-medium">View &rarr;</span>
          </button>
        </div>

        {/* Developer attribution compliance rule */}
        <p className="pt-2 text-center text-[11px] text-text-muted">
          Muffin is an independent developer project crafted with 🧁 by Rahul Gouri.
        </p>
      </section>
    </div>
  );
}
