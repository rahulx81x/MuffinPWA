# Muffin PWA — UX Implementation Strategy

> **Platform priority:** 📱 Mobile-first (Android PWA installed standalone is the primary use case)  
> **Reference:** See `UX_IMPROVEMENT_PLAN.md` for the full analysis behind these decisions.  
> **Drafted:** August 2026

---

## Guiding Principles

1. **Mobile thumb-zone first.** Every touch target, gesture, and layout decision is evaluated for one-handed bottom-thumb use on a 6.6-inch Android screen.
2. **Don't break what works.** The six themes, Framer Motion physics, calculator input, category chips, and PWA install flow are strengths — no regressions.
3. **Incremental, non-breaking delivery.** Each phase is independently releasable. No phase requires completing another to be useful.
4. **Shared component reuse over copy-paste.** Every new UI piece goes through the atomic layer first.

---

## Phase 1 — Quick Wins
**Scope:** Accessibility patches, system status visibility, microcopy fixes  
**Target effort:** ~2–3 days total  
**Ship as:** A single focused PR — no structural risk

---

### 1.1 Fix minimum text size in header

**File:** [`src/App.tsx`](../../src/App.tsx) — Line 278

```tsx
// BEFORE
<p className="mt-1 flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-text-muted">

// AFTER
<p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
```

**Why:** `9px` is below the practical 12px minimum readable on a phone screen at arm's length; also fails WCAG sizing guidance.

---

### 1.2 Rename "Recipe" to "Starting Balances" with subtitle

**File:** [`src/features/settings/HeaderMenu.tsx`](../../src/features/settings/HeaderMenu.tsx)

Find the Recipe menu item and update:

```tsx
// BEFORE
<span>Recipe</span>

// AFTER
<span className="flex flex-col">
  <span>Starting Balances</span>
  <span className="text-[11px] font-normal text-text-muted leading-snug">
    Opening balance & initial investments
  </span>
</span>
```

Also update `RecipeModal` title from "Recipe" → "Starting Balances" and the `About` description.

---

### 1.3 Add Escape key dismiss to all modals

**Files:**
- [`src/features/ledger/ManageTransactionModal.tsx`](../../src/features/ledger/ManageTransactionModal.tsx)
- [`src/features/home/ChartModal.tsx`](../../src/features/home/ChartModal.tsx)
- [`src/features/settings/RecipeModal.tsx`](../../src/features/settings/RecipeModal.tsx)
- [`src/features/settings/AboutModal.tsx`](../../src/features/settings/AboutModal.tsx)
- [`src/components/ui/ConfirmModal.tsx`](../../src/components/ui/ConfirmModal.tsx)

Add to each modal's `useEffect`:

```tsx
useEffect(() => {
  if (!open) return;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [open, onClose]);
```

**Android relevance:** Android's hardware back button fires as `Escape` in some PWA contexts. This also helps Switch Access users.

---

### 1.4 Add `aria-modal`, `role`, `aria-labelledby` to all modals

**Pattern to apply to every modal sheet container:**

```tsx
<motion.div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title-id"
  // ... existing props
>
  <h2 id="modal-title-id" className="...">Modal Title</h2>
  {/* content */}
</motion.div>
```

Each modal gets a unique `useId()` for the `aria-labelledby` value.

---

### 1.5 Increase touch targets for header controls

**File:** [`src/App.tsx`](../../src/App.tsx) — Line 216–217

```tsx
// BEFORE
const headerBtnClass = 'inline-flex h-8 w-8 items-center justify-center ...';

// AFTER
const headerBtnClass = 'inline-flex h-10 w-10 items-center justify-center ...';
// Visual icon stays h-7 w-7; button container grows to 40px (acceptable on header)
```

Also increase modal close buttons from `h-9 w-9` → `h-11 w-11` in ManageTransactionModal and ChartModal.

---

### 1.6 Add `<title>` to pie chart SVG segments

**File:** [`src/features/home/ChartModal.tsx`](../../src/features/home/ChartModal.tsx)

Inside `PieChart`, for each `<path>` segment:

```tsx
<path
  d={pathData}
  fill={color}
  // ...existing props
>
  <title>{`${name}: ${formatCurrency(amount)} (${share}%)`}</title>
</path>
```

Add `role="img"` and `aria-label` to the SVG root:

```tsx
<svg
  role="img"
  aria-label={`Investment breakup pie chart. Total: ${formatCurrency(total)}`}
  viewBox="0 0 200 200"
  // ...
>
```

---

### 1.7 Fix Double Chocolate `text-muted` contrast

**File:** [`src/index.css`](../../src/index.css) — Double Chocolate theme block

```css
/* BEFORE */
[data-theme='chocolate'] {
  --color-text-muted: #9a7f6a;   /* ~3.2:1 on card — fails WCAG AA */
}

/* AFTER */
[data-theme='chocolate'] {
  --color-text-muted: #b08a72;   /* ~4.6:1 on card — passes WCAG AA */
}
```

> **Note:** Verify with a contrast checker. The adjustment should be minor enough not to affect the visual identity.

---

### 1.8 Button loading spinner for mutations

**File:** [`src/components/ui/SoftButton.tsx`](../../src/components/ui/SoftButton.tsx)

Add `loading` prop:

```tsx
interface SoftButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  glow?: boolean;
}

export function SoftButton({ loading, children, disabled, className = '', glow = true, ...props }: SoftButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`relative ${glow ? 'soft-glow' : ''} ${className}`}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
        </span>
      )}
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
    </button>
  );
}
```

Wire `loading={mutating}` to the Save button in `ManageTransactionModal`.

---

### 1.9 Timed toast auto-dismiss with undo for deletes

**File:** [`src/App.tsx`](../../src/App.tsx)

Extend the `statusMessage` state to support structured messages:

```tsx
type StatusMessage = {
  text: string;
  undoFn?: () => void;
};

const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

// Auto-dismiss after 5s
useEffect(() => {
  if (!statusMessage) return;
  const t = setTimeout(() => setStatusMessage(null), 5000);
  return () => clearTimeout(t);
}, [statusMessage]);
```

In the toast JSX, add an Undo button when `statusMessage.undoFn` is present:

```tsx
{statusMessage.undoFn && (
  <SoftButton
    onClick={() => { statusMessage.undoFn?.(); setStatusMessage(null); }}
    className="text-xs font-bold text-primary"
    glow={false}
  >
    Undo
  </SoftButton>
)}
```

---

### 1.10 Skeleton cards during data load

**New file:** `src/components/atoms/Skeleton.tsx`

```tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-muted/60 ${className}`}
      aria-hidden="true"
    />
  );
}
```

**New file:** `src/components/atoms/SkeletonKpiGrid.tsx`

```tsx
import { Skeleton } from './Skeleton';

export function SkeletonKpiGrid() {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="cozy-card p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </div>
  );
}
```

Replace the `"Baking your money muffins…"` text in `App.tsx` with `<SkeletonKpiGrid />`.

---

## Phase 2 — Structural Refactors
**Scope:** Component architecture, mobile gesture layer, IA navigation improvements  
**Target effort:** ~1–2 weeks  
**Ship as:** Multiple focused PRs, each independently mergeable

---

### 2.1 Focus trap for all modals

**New file:** `src/components/atoms/FocusTrap.tsx`

```tsx
import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'textarea:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function FocusTrap({ active, children }: { active: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const firstEl = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
    firstEl?.focus();

    function onTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !ref.current) return;
      const els = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
    document.addEventListener('keydown', onTab);
    return () => document.removeEventListener('keydown', onTab);
  }, [active]);

  return <div ref={ref}>{children}</div>;
}
```

Wrap every modal's inner content with `<FocusTrap active={open}>`.

---

### 2.2 Shared `TransactionForm` component

**New file:** `src/components/molecules/TransactionForm.tsx`

Extract the shared form fields (type toggle, date, category chips, amount input, comment, investment type) currently duplicated between:
- `ManageTransactionModal.tsx` (634 lines)
- `PlannerView.tsx` inline form

The shared component accepts:
```tsx
interface TransactionFormProps {
  mode: 'sheet' | 'planner';
  initialValues?: Partial<FormState>;
  categoryChips: string[];
  investmentTypeOptions: string[];
  onSubmit: (values: FormState) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
}
```

This reduces duplication, ensures consistent UI between Planner and Ledger add flows, and makes future form changes a single-file edit.

---

### 2.3 Swipe-to-reveal actions on Ledger rows (mobile primary gesture)

**File:** [`src/features/ledger/LedgerView.tsx`](../../src/features/ledger/LedgerView.tsx)

Implement swipe-to-reveal using Framer Motion `drag`:

```tsx
function SwipeableRow({ children, onEdit, onDelete }: {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const THRESHOLD = 72; // px

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Revealed action layer */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
        <button onClick={onEdit} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={onDelete} className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {/* Draggable row */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -THRESHOLD * 2, right: 0 }}
        dragElastic={0.1}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={(_, info) => {
          if (info.offset.x < -THRESHOLD) {
            navigator.vibrate?.(8);
            // keep revealed; tap action to confirm
          } else {
            setDragX(0);
          }
        }}
        animate={{ x: dragX < -THRESHOLD ? -THRESHOLD * 1.5 : 0 }}
        transition={springSoft}
        className="relative z-10 bg-canvas"
      >
        {children}
      </motion.div>
    </div>
  );
}
```

The `MoreVertical` (⋮) action sheet stays as fallback for users who don't discover the swipe.

---

### 2.4 Pull-to-refresh

**File:** [`src/features/ledger/LedgerView.tsx`](../../src/features/ledger/LedgerView.tsx) and [`src/features/home/HomeView.tsx`](../../src/features/home/HomeView.tsx)

Detect `touchstart`/`touchmove` on the scroll container. When the user pulls down > 64px from top, show a spinner and call `refreshTransactions()`:

```tsx
function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const onTouchStart = (e: TouchEvent) => { startY.current = e.touches[0].clientY; };
    const onTouchEnd = async (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY.current;
      if (dy > 64 && node.scrollTop === 0 && !refreshing) {
        setRefreshing(true);
        navigator.vibrate?.(8);
        await onRefresh();
        setRefreshing(false);
      }
    };
    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, refreshing]);

  return { el, refreshing };
}
```

Render a small animated spinner at the top of the scroll area when `refreshing`.

---

### 2.5 Remove "More Details" toggle — always-visible KPI sections

**File:** [`src/features/home/HomeView.tsx`](../../src/features/home/HomeView.tsx)

Replace the `showMore` state and toggle button with a natural scroll layout:

```tsx
// Section 1: This Month (income, expense, investment, savings%)
// Section 2: Balances (liquid, investment, net worth, avg savings)
// Section 3: Investment Breakup (full breakup card)
// Section 4: Lifetime & Growth (total income, spends, growth %, PF)
```

Each section has a small uppercase label header. Users scroll down to discover more data — consistent with how banking apps (GPay, Jupiter, Groww) present layered information. The `detailCards` array content gets integrated here instead of hidden.

---

### 2.6 Empty state components

**New file:** `src/components/molecules/EmptyState.tsx`

```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface-strong/60 px-6 py-10 text-center">
      {icon && <div className="mb-1 text-text-muted opacity-60">{icon}</div>}
      <h3 className="font-display text-base font-bold text-text">{title}</h3>
      <p className="max-w-xs text-sm leading-relaxed text-text-muted">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

Apply to: `LedgerView` (no results), `MonthlyView` (no data), `PlannerView` (first visit), `HomeView` (zero transactions).

---

### 2.7 Monthly view drill-down to Ledger

**Files:** `MonthlyView.tsx`, `App.tsx`, `FloatingNav.tsx`

When user taps a month card in MonthlyView, navigate to Ledger filtered to that month:

1. Add a `setLedgerFilter` callback from `App.tsx` down to `MonthlyView`
2. Tapping a month calls `setActiveTab('ledger')` + sets `monthFilter` to the tapped `m.key`
3. `LedgerView` pre-populates the month filter from the prop

This makes the Monthly tab genuinely interactive instead of read-only.

---

### 2.8 Data table alternative for screen readers in charts

**File:** [`src/features/home/ChartModal.tsx`](../../src/features/home/ChartModal.tsx)

Below each pie chart, add a visually hidden data table:

```tsx
<table className="sr-only" aria-label="Investment breakup data">
  <caption>Investment allocation by type</caption>
  <thead>
    <tr><th>Type</th><th>Amount</th><th>Share</th></tr>
  </thead>
  <tbody>
    {entries.map(([name, amount]) => (
      <tr key={name}>
        <td>{name}</td>
        <td>{formatCurrency(amount)}</td>
        <td>{Math.round((amount / total) * 100)}%</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## Phase 3 — North Star ✅ Implemented (August 2026)
**Scope:** IA restructure, new features, design system maturity  
**Status:** Core items 3.1–3.3 shipped. Items 3.4–3.7 remain future roadmap.

---

### 3.1 Dedicated Settings Tab ✅ Shipped

**File:** `src/features/settings/SettingsView.tsx`

Implemented full-featured Settings tab replacing the gear-menu sub-panels:

```
Settings
├── Account
│   ├── [Avatar] Name · email · Connected Sheet
│   └── Log out
├── Appearance & Themes
│   ├── Theme picker — 8 cards (4 light, 4 dark) in responsive 2×2 / 2×4 grid
│   └── Typography Style — 7 font-family swatches
├── Data & Privacy
│   ├── Mask Amounts toggle
│   └── Starting Balances (Recipe config)
├── Help & About
│   ├── First-Run Tour replay
│   ├── User Guide / Technical Guide links
│   ├── Privacy Policy / Terms of Service
│   └── About Muffin
└── Download App (PWA install prompt)
```

The gear icon was removed from the header. The profile avatar is the only header control, opening a quick user-info + logout popover.

**Nav change (implemented):**
```
Before: Home | Planner | [+] | Ledger | Monthly
After:  Home | Insights | [+] | Ledger | Settings
```

Updated [`src/components/ui/FloatingNav.tsx`](../../src/components/ui/FloatingNav.tsx) and [`src/domain/types.ts`](../../src/domain/types.ts) (`AppTab` type: `'home' | 'insights' | 'ledger' | 'settings'`).

---

### 3.2 Insights Tab (Monthly + Planner merged) ✅ Shipped

**File:** `src/features/insights/InsightsView.tsx`

Segmented control sub-navigation within the Insights screen:

```
Insights
├── Trends — month bar charts with MoM delta; tapping a bar navigates to Ledger filtered by month
├── Categories — SVG donut ring + ranked category breakdown list
└── Planner — what-if scenario builder with income/expense/investment toggles
```

The Trends sub-tab makes monthly analysis fully interactive. `MonthlyView` (`features/monthly/`) remains for backward compatibility but is no longer a primary tab.

---

### 3.3 Quick-Add Inline Entry on Ledger ✅ Shipped

**File:** `src/features/ledger/LedgerView.tsx` — `QuickAddStrip` component

Persistent single-line quick-entry pinned above the date-grouped timeline:

```
[ Expense ▼ ] [ Category... ] [ ₹ Amount ] [ + ]
```

- Expense/Income type switcher with animated pill
- Dynamic recent-category chips (auto-extracted from last transactions)
- Calculator-capable amount input (inherits `evaluateAmount`)
- Instant submit via `onQuickAdd` prop wired through `App.tsx`
- Falls back to full modal for Investment type (requires Investment Type field)

---

### 3.4 Budget Targets

**Status:** Planned — not yet implemented.

Per-category monthly spending limits stored in Recipe tab; progress bars on Home; alerts at 80% and 100%.

---

### 3.5 Responsive Desktop Layout

**Status:** Planned — not yet implemented.

`max-w-lg / sm:max-w-3xl / lg:max-w-5xl` constraints exist; full 2-column desktop layout not yet built.

---

### 3.6 Offline-first with IndexedDB

**Status:** Planned — not yet implemented.

PWA shell loads offline; IndexedDB caching and offline mutation queue are future work.

---

### 3.7 Keyboard Shortcut System

**Status:** Excluded from scope — power users on mobile PWA do not benefit from desktop hotkeys. Not implemented.

---

### Additional: 8 Themes & Glassmorphism ✅ Shipped

**Themes added in Phase 3:**
- 🌸 **Lavender Berry** (light) — violet pastel with `#7C3AED` accent
- 🌿 **Midnight Emerald** (dark) — deep pine with `#10B981` accent

**Glassmorphism system hardened:**
- `.nav-glass`: `backdrop-filter: blur(28px) saturate(200%)` at 88% `surface-strong` opacity
- Specular rim highlights on cards (`inset 0 1px 0 rgba(255,255,255,0.2)`)
- Ambient canvas orbs boosted to `primary/20` and `primary-muted/25` with full opacity animation
- Header: `bg-surface/75 backdrop-blur-2xl`
- Nav active tab: full solid gradient capsule with `0 4px 14px rgba(accent, 0.45)` glow

---

### Additional: Simplified Header Menu ✅ Shipped

**File:** `src/features/settings/HeaderMenu.tsx`

The gear/settings sub-panel was fully removed from the header. The header now shows only the profile avatar button (`ring-2 ring-primary/70`, gradient fill for initial letter). Clicking opens a `createPortal` popover (z-9999) with:
- Google photo / avatar initial
- User display name and email
- Log out button

All settings (themes, fonts, mask, recipe, guides) are in the Settings tab.

---

## Implementation Priority Matrix (Updated)

| Item | Phase | Status | Priority |
|---|---|---|---|
| Fix text-[9px] | 1.1 | ✅ Done | 🔴 P0 |
| Rename Recipe → Starting Balances | 1.2 | ✅ Done | 🔴 P0 |
| Escape key dismiss | 1.3 | ✅ Done | 🔴 P0 |
| aria-modal on modals | 1.4 | ✅ Done | 🔴 P0 |
| Touch target sizes | 1.5 | ✅ Done | 🔴 P0 |
| SVG chart titles | 1.6 | ✅ Done | 🟡 P1 |
| Dark theme contrast fix | 1.7 | ✅ Done | 🟡 P1 |
| Button loading spinner | 1.8 | ✅ Done | 🔴 P0 |
| Timed toast + undo | 1.9 | ✅ Done | 🟡 P1 |
| Skeleton cards | 1.10 | ✅ Done | 🟡 P1 |
| Focus trap | 2.1 | ✅ Done | 🟡 P1 |
| Shared TransactionForm | 2.2 | ✅ Done | 🟡 P1 |
| Swipe-to-reveal | 2.3 | ✅ Done | 🟡 P1 |
| Pull-to-refresh | 2.4 | ✅ Done | 🟡 P1 |
| Remove More Details toggle | 2.5 | ✅ Done | 🟡 P1 |
| Empty state components | 2.6 | ✅ Done | 🟡 P1 |
| Monthly drill-down | 2.7 | ✅ Done | 🟢 P2 |
| SR chart data table | 2.8 | ✅ Done | 🟢 P2 |
| Settings tab | 3.1 | ✅ **Shipped** | 🟢 P2 |
| Insights tab | 3.2 | ✅ **Shipped** | 🟢 P2 |
| Quick-add inline entry | 3.3 | ✅ **Shipped** | 🟢 P2 |
| 8 themes + glassmorphism | 3.x | ✅ **Shipped** | 🟢 P2 |
| Simplified header menu | 3.x | ✅ **Shipped** | 🟢 P2 |
| Budget targets | 3.4 | 🔲 Planned | 🔵 P3 |
| Desktop responsive layout | 3.5 | 🔲 Planned | 🔵 P3 |
| Offline-first IndexedDB | 3.6 | 🔲 Planned | 🔵 P3 |
| Keyboard shortcuts | 3.7 | ❌ Excluded | — |

---

## File Change Summary

### Phase 1 files touched
| File | Change |
|---|---|
| `src/App.tsx` | Text size fix, touch targets, toast timer + undo |
| `src/index.css` | Chocolate theme contrast fix |
| `src/features/settings/HeaderMenu.tsx` | Simplified to profile avatar + logout popover |
| `src/features/settings/RecipeModal.tsx` | Rename title to Starting Balances |
| `src/features/ledger/ManageTransactionModal.tsx` | Escape key, aria-modal, spinner |
| `src/features/home/ChartModal.tsx` | Escape key, aria-modal, SVG titles |
| `src/components/ui/ConfirmModal.tsx` | Escape key, aria-modal |
| `src/features/settings/AboutModal.tsx` | Escape key, aria-modal |
| `src/components/ui/SoftButton.tsx` | Add `loading` prop |
| `src/components/atoms/Skeleton.tsx` | **NEW** |
| `src/components/atoms/SkeletonKpiGrid.tsx` | **NEW** |

### Phase 2 files touched / created
| File | Change |
|---|---|
| `src/components/atoms/FocusTrap.tsx` | **NEW** |
| `src/components/molecules/TransactionForm.tsx` | **NEW** (extracted from below) |
| `src/features/ledger/ManageTransactionModal.tsx` | Refactored to use TransactionForm |
| `src/features/planner/PlannerView.tsx` | Refactored to use TransactionForm |
| `src/features/ledger/LedgerView.tsx` | Swipe-to-reveal, pull-to-refresh, QuickAddStrip |
| `src/features/home/HomeView.tsx` | Remove More Details toggle; always-visible sections |
| `src/components/molecules/EmptyState.tsx` | **NEW** |
| `src/features/monthly/MonthlyView.tsx` | Drill-down to Ledger |
| `src/features/home/ChartModal.tsx` | SR data table |

### Phase 3 files created / modified
| File | Notes |
|---|---|
| `src/features/settings/SettingsView.tsx` | **NEW** — full settings tab (8 themes, 7 fonts, account, privacy, guides) |
| `src/features/settings/HeaderMenu.tsx` | **MODIFIED** — simplified to profile avatar + logout popover only |
| `src/features/insights/InsightsView.tsx` | **NEW** — unified Trends + Categories + Planner hub |
| `src/features/ledger/LedgerView.tsx` | **MODIFIED** — added persistent `QuickAddStrip` |
| `src/domain/types.ts` | **MODIFIED** — `AppTab` is now `'home' \| 'insights' \| 'ledger' \| 'settings'` |
| `src/components/ui/FloatingNav.tsx` | **MODIFIED** — new left/right tab items and icons |
| `src/lib/themes.ts` | **MODIFIED** — `ThemeId` + `THEMES` array extended with `lavender` and `emerald` |
| `src/index.css` | **MODIFIED** — CSS blocks for `lavender`, `emerald` themes; glassmorphism tuned |
| `src/App.tsx` | **MODIFIED** — wired `insights`, `settings` tabs; `handleQuickAdd`; enhanced ambient orbs |

---

*See `UX_IMPROVEMENT_PLAN.md` for the full design rationale behind each decision.*
