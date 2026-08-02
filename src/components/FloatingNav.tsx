import type { AppTab } from '../types';

interface FloatingNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const tabs: { id: AppTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'planner', label: 'Planner' },
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

export function FloatingNav({ activeTab, onTabChange }: FloatingNavProps) {
  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center mb-safe px-3"
      aria-label="Primary"
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-slate-200/70 bg-white/65 p-1.5 shadow-xl backdrop-blur-md [scrollbar-width:none] dark:border-slate-700/70 dark:bg-slate-950/65 [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex min-h-11 min-w-[3.85rem] flex-col items-center justify-center gap-0.5 rounded-full px-2.5 py-1.5 transition duration-200 active:scale-95 ${
                active
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:bg-slate-800/80'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <TabIcon id={tab.id} active={active} />
              <span
                className={`text-[10px] font-semibold ${
                  active
                    ? 'text-white dark:text-slate-900'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
