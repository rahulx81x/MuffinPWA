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
    ? 'text-white dark:text-slate-900'
    : 'text-slate-400 dark:text-slate-500';

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
      className={`flex min-h-11 min-w-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 transition duration-200 active:scale-95 ${
        active
          ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
          : 'text-slate-500 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:bg-slate-800/80'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <TabIcon id={id} active={active} />
      <span
        className={`text-[10px] font-semibold ${
          active
            ? 'text-white dark:text-slate-900'
            : 'text-slate-400 dark:text-slate-500'
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
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center mb-safe px-3"
      aria-label="Primary"
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-slate-200/70 bg-white/65 p-1.5 shadow-xl backdrop-blur-md [scrollbar-width:none] dark:border-slate-700/70 dark:bg-slate-950/65 [&::-webkit-scrollbar]:hidden">
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
            className="mx-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-[0_8px_20px_-4px_rgba(16,185,129,0.55)] ring-4 ring-white/90 transition duration-200 active:scale-95 dark:from-emerald-500 dark:to-teal-400 dark:ring-slate-950/80 dark:shadow-[0_8px_22px_-4px_rgba(45,212,191,0.45)]"
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
    </nav>
  );
}
