import { LayoutGroup, motion } from 'framer-motion';
import {
  BarChart3,
  Home,
  NotebookTabs,
  Plus,
  Settings,
} from 'lucide-react';
import type { AppTab } from '../../domain/types';
import { springLayout, springSoft } from '../../lib/motion';

interface FloatingNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onAdd?: () => void;
  showAdd?: boolean;
}

const leftTabs: { id: AppTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'insights', label: 'Insights' },
];

const rightTabs: { id: AppTab; label: string }[] = [
  { id: 'ledger', label: 'Ledger' },
  { id: 'settings', label: 'Settings' },
];

function TabIcon({ id, active }: { id: AppTab; active: boolean }) {
  const className = `h-5 w-5 ${active ? 'text-primary-foreground' : 'text-text-secondary group-hover:text-text'}`;
  const stroke = active ? 2.4 : 2;

  if (id === 'home') return <Home className={className} strokeWidth={stroke} />;
  if (id === 'ledger')
    return <NotebookTabs className={className} strokeWidth={stroke} />;
  if (id === 'insights')
    return <BarChart3 className={className} strokeWidth={stroke} />;
  return <Settings className={className} strokeWidth={stroke} />;
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
    <motion.button
      type="button"
      onClick={() => {
        onSelect(id);
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      transition={springSoft}
      className="group relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:px-3"
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <motion.span
          layoutId="activeTab"
          className="nav-tab-indicator absolute inset-0 rounded-full"
          transition={springLayout}
          aria-hidden="true"
        />
      )}
      <span className="relative z-10 flex flex-col items-center gap-0.5">
        <TabIcon id={id} active={active} />
        <span
          className={`text-[11px] font-bold tracking-tight ${
            active ? 'text-primary-foreground' : 'text-text-secondary group-hover:text-text'
          }`}
        >
          {label}
        </span>
      </span>
    </motion.button>
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
      className="pointer-events-none fixed inset-x-0 bottom-3 z-40 mb-safe sm:bottom-5"
      aria-label="Primary"
    >
      <div className="mx-auto max-w-lg px-4 sm:max-w-xl">
        <LayoutGroup id="muffin-nav">
          <div className="nav-glass pointer-events-auto flex w-full items-center gap-1 rounded-full border p-2 transition-theme sm:gap-1.5 sm:p-2.5">
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
              <motion.button
                type="button"
                onClick={() => {
                  onAdd();
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                transition={springSoft}
                className="soft-glow pulse-glow-btn mx-1 inline-flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full bg-gradient-to-br from-primary-muted via-primary to-primary text-primary-foreground shadow-glow outline-none ring-4 ring-canvas/90 focus-visible:ring-2 focus-visible:ring-primary sm:mx-1.5"
                aria-label="Add transaction"
                title="Add transaction"
              >
                <Plus className="h-6 w-6" strokeWidth={2.8} aria-hidden="true" />
              </motion.button>
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
        </LayoutGroup>
      </div>
    </nav>
  );
}
