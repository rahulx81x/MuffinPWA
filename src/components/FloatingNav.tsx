import type { AppTab } from '../types';

interface FloatingNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onAdd?: () => void;
  showAdd?: boolean;
}

const leftTabs: { id: AppTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'planner', label: 'Planner' },
];

const rightTabs: { id: AppTab; label: string }[] = [
  { id: 'ledger', label: 'Ledger' },
  { id: 'monthly', label: 'Months' },
];

function TabIcon({ id, active }: { id: AppTab; active: boolean }) {
  const color = active
    ? 'text-white dark:text-muffin-chocolate'
    : 'text-text-muted';

  if (id === 'home') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${color}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"
        />
      </svg>
    );
  }

  if (id === 'planner') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${color}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 2v3M16 2v3M4 9h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 13h4M8 17h8" />
      </svg>
    );
  }

  if (id === 'ledger') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${color}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${color}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 19V5M4 19h16M8 15v4M12 11v8M16 7v12"
      />
    </svg>
  );
}

function NavTab({
  id,
  label,
  active,
  onSelect,
}: {
  id: AppTab;
  label: string;
  active: boolean;
  onSelect: (tab: AppTab) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1.5 py-2 outline-none transition-colors duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-500/50 sm:px-3 ${
        active
          ? 'bg-primary text-white shadow-warm-sm dark:text-muffin-chocolate'
          : 'text-text-muted hover:bg-surface-muted/60'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <TabIcon id={id} active={active} />
      <span
        className={`text-[10px] font-semibold ${
          active ? 'text-white dark:text-muffin-chocolate' : 'text-text-muted'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export function FloatingNav({
  activeTab,
  onTabChange,
  onAdd,
  showAdd = true,
}: FloatingNavProps) {
  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-3 z-40 mb-safe sm:bottom-4"
      aria-label="Primary"
    >
      <div className="mx-auto max-w-lg px-4">
        <div className="pointer-events-auto flex w-full items-center gap-1 rounded-full border border-border bg-muffin-cream/90 p-2 shadow-warm backdrop-blur-md transition-colors duration-200 dark:border-muffin-crustDark dark:bg-muffin-cocoa/90 sm:gap-1.5 sm:p-2.5">
          {leftTabs.map((tab) => (
            <NavTab
              key={tab.id}
              id={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onSelect={onTabChange}
            />
          ))}

          {showAdd && onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="mx-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full bg-gradient-to-br from-amber-600 to-amber-500 text-white shadow-[0_8px_20px_-4px_rgba(217,119,6,0.45)] outline-none ring-4 ring-muffin-cream transition-colors duration-200 active:scale-95 focus-visible:ring-amber-400 dark:from-amber-500 dark:to-amber-400 dark:ring-muffin-chocolate dark:shadow-[0_8px_22px_-4px_rgba(245,158,11,0.35)] dark:focus-visible:ring-amber-500 sm:mx-1"
              aria-label="Add transaction"
              title="Add transaction"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}

          {rightTabs.map((tab) => (
            <NavTab
              key={tab.id}
              id={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onSelect={onTabChange}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
