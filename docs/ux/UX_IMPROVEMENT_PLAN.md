# Muffin PWA — Strategic UI/UX Improvement Plan

> **Authored:** August 2026  
> **Context:** Principal UI/UX architectural analysis of the Muffin PWA  
> **Platform priority:** 📱 Mobile-first (Android PWA installed via "Install App" is the primary use case)  
> **Reference site:** [muffin-ledger.netlify.app](https://muffin-ledger.netlify.app/)

---

## App Overview

| Field | Value |
|---|---|
| **Product** | Muffin — Personal Finance Dashboard PWA |
| **Primary purpose** | Turn a Google Sheet into a live mobile dashboard tracking income, expenses, investments & net worth |
| **Target audience** | Financially-aware individuals (INR) who manage money in Google Sheets and want a cozy installable phone app |
| **Tech stack** | React 19, TypeScript, Tailwind CSS 3, Framer Motion, Vite 6, Netlify Functions, Google Sheets API |
| **Entry points** | Android PWA (primary), iOS PWA, desktop browser |

---

## 1. Heuristic Evaluation (Nielsen's 10 Usability Heuristics)

### Violation 1 — Recognition Rather Than Recall (H#6)

**Where it fails:** The `HeaderMenu` crams **13+ items** behind a single ⚙️ gear icon: Mask amounts, Theme sub-panel, Font sub-panel, About, Recipe, Guides sub-panel (User Guide + Technical Guide), Privacy Policy, Terms of Service, Download App, account chip, and Log out. Users must recall that "Recipe" means "starting balances config" and that "Guides" nests two more levels.

**Mobile impact:** On a phone, the nested sub-panel navigation inside a popover is especially painful — there is no swipe-back gesture, and the chevron affordance (`ChevronLeft`/`ChevronRight`) is easy to miss with a thumb.

**Friction impact:**
- Critical configuration (Recipe) shares overflow with legal pages
- Three sub-panels add nested navigation depth inside a popover
- "Recipe" is domain jargon with no tooltip or inline explanation

**Fix:** Promote to a dedicated Settings tab. Rename "Recipe" → "Starting Balances". Move legal pages to an About screen.

---

### Violation 2 — Visibility of System Status (H#1)

**Where it fails:**

| State | Current | Gap |
|---|---|---|
| Initial boot | Floating muffin + ambient glow `LoadingScreen` | No progress; no skeleton cards |
| Data loading | "Baking your money muffins…" text | No shimmer; content pops in abruptly |
| Mutation (add/edit/delete) | `mutating` flag exists but no inline spinner on save button | User can't tell if tap registered |
| Toast messages | Auto-dismiss but no timer indicator; no undo | User may miss transient feedback |
| Empty states | Dashed-border text boxes | No guided onboarding; no CTA |

**Mobile impact:** On mobile networks (4G/intermittent LTE), latency is real. A 1–2 second blank period after tapping "Save" with zero visual feedback causes anxiety and repeat taps — leading to duplicate transactions.

**Fix:** Button-level loading spinners. Skeleton KPI cards during load. Timed toasts (5 s) with undo for deletes.

---

### Violation 3 — Flexibility and Efficiency of Use (H#7)

**Where it fails:** Power users adding transactions daily face friction:
- Full modal with 5 fields for every add (no quick-entry)
- No swipe-to-delete on Ledger rows (mobile primary gesture)
- No swipe-to-reveal edit/delete (common fintech pattern: CRED, Jupiter, Splitwise)
- Planner and ManageTransactionModal duplicate the form with diverging behaviour
- No haptic confirmation on successful saves (only on category chip tap)

**Fix:** Swipe-to-delete gestures on Ledger. Shared `TransactionForm` component. Extend haptics to mutation success/failure.

---

## 2. Information Architecture (IA) & Navigation

### Current Tab Structure

```
Home | Planner | [+] FAB | Ledger | Months
```

With all settings, legal, account and appearance buried in the ⚙️ gear menu.

### Structural Issues

1. **Gear menu is a junk drawer** — mixes personalization, config, legal, help, account
2. **"More Details" hides 8 KPIs** — new users never discover Provident Fund, Growth, Lifetime stats
3. **Planner vs Ledger overlap** — mental model unclear for new users
4. **Monthly view is passive** — no drill-down; can't tap a month to filter Ledger

### Proposed Mobile-First IA

```
Dashboard | Ledger | [+] FAB | Insights | Settings
```

| Tab | Content |
|---|---|
| **Dashboard** (was Home) | Net Worth hero, this-month KPI strip, Investment breakup, all KPI sections without "More Details" toggle |
| **Ledger** | Date-grouped timeline, smart search, filter chips, swipe actions |
| **[+] FAB** | Opens ManageTransactionModal (unchanged) |
| **Insights** (new) | Monthly trends, category breakdowns, Planner what-if in tabbed sub-view |
| **Settings** (new tab) | Starting Balances, Appearance (Theme + Font), Privacy & Mask, Account, About & Legal |

**Key wins:**
- Primary goal (add transaction): **1 tap** from any screen via FAB
- Secondary goal (check net worth): **0 taps** — always visible on Dashboard tab
- Settings discoverability: **visible tab** instead of hidden gear menu

---

## 3. Interaction Design & Cognitive Load

### Mobile-Priority Pattern Recommendations

| Pattern | Recommendation |
|---|---|
| **Swipe-to-delete** | Ledger rows: swipe left → red Delete zone; swipe right → blue Edit zone. Native mobile gesture (most fintech apps). |
| **Pull-to-refresh** | Add pull-to-refresh on Home/Ledger to re-fetch sheet data (replaces current invisible auto-refresh on mount) |
| **Haptic feedback** | Extend `navigator.vibrate(8)` already used on chips → add `vibrate(12)` on successful save, `vibrate([20,10,20])` on error |
| **Bottom sheet modals** | Modal slide-up from bottom on mobile (already done ✅) — ensure all modals have a drag handle for dismissal |
| **Progressive disclosure** | Remove "More Details" toggle → show all KPIs in always-visible categorized sections with scroll |
| **Shared form component** | Extract `TransactionForm` shared between ManageTransactionModal + PlannerView |

### State Handling — Mobile Focused

**Empty States:**
| View | Recommended |
|---|---|
| Home (no transactions) | Illustrated card: "Add your first transaction to see your dashboard" + large FAB arrow indicator |
| Ledger (no search results) | "No transactions match. Try clearing filters." + inline Clear button |
| Planner (empty) | Brief explainer: "Add what-if entries — they don't save to your sheet" |
| Monthly (no data) | "Monthly trends appear after your first month of tracking" |

**Error States:**
| Error | Recommended |
|---|---|
| Sheet connection failed | Banner with Retry button + "Reconnect sheet" action |
| Mutation failed | Inline field error + toast; haptic error pattern |
| Auth expired | Re-auth overlay preserving scroll position |

**Loading States:**
| Loading | Recommended |
|---|---|
| Initial data | Skeleton KPI cards grid (shimmer) |
| Mutation button | Spinner + disabled state + "Saving…" text |
| Chart modal | Skeleton lines in line chart area |

---

## 4. Visual Hierarchy & Component Strategy

### Atomic Design Gap Analysis

| Level | Current | Gaps |
|---|---|---|
| **Atoms** | `SoftButton`, `field-cozy` CSS class | Missing: `Input`, `Badge`, `Avatar`, `Chip`, `Skeleton`, `Spinner` |
| **Molecules** | `KpiCard`, `TransactionIcon`, `MiniStat` | Missing: `FilterChip`, `SkeletonCard`, `EmptyState`, `TransactionRow` |
| **Organisms** | `FloatingNav`, `HeaderMenu`, `ManageTransactionModal` | `HeaderMenu` oversized (630 lines); needs decomposition |
| **Templates** | Implicit in `App.tsx` | No explicit layout template — App.tsx handles layout + logic |

### Proposed New Atoms

```
src/components/
  atoms/
    Input.tsx        ← field-cozy + label + error state
    Badge.tsx        ← income / expense / investment type badge
    Chip.tsx         ← filter/category chip with remove action
    Skeleton.tsx     ← shimmer placeholder
    Spinner.tsx      ← inline loading indicator
  molecules/
    EmptyState.tsx   ← illustration + title + description + CTA
    FilterBar.tsx    ← search + active chip row + clear all
    TransactionRow.tsx ← extracted from LedgerView inline JSX
```

### Typographic Scale (Mobile-Optimised)

| Role | Current | Recommended |
|---|---|---|
| Hero KPI amount | `text-3xl` | `text-4xl` — more legible at arm's length |
| Section heading | `text-lg` | `text-xl font-bold` |
| Card label | `text-[11px]` | `text-xs` (12px minimum) |
| Body text | `text-sm` ✅ | No change |
| Header subtitle | `text-[9px]` ⚠️ | `text-xs` minimum — below 12px fails WCAG |
| Nav label | `text-[10px]` | `text-[11px]` |

### Spacing

- Card padding: `p-4` standard, `p-5` hero ✅
- Card gap: standardise on `gap-4` (currently mixed `gap-3`/`gap-3.5`)
- Section spacing: `space-y-6` between sections (currently `space-y-4`)

---

## 5. Accessibility (WCAG 2.1) — Mobile Critical Items

### A. Contrast Ratios

| Element | Theme | Ratio | Status |
|---|---|---|---|
| `text-text-muted` labels | Double Chocolate | ~3.2:1 | ❌ AA fail |
| `text-[9px]` header subtitle | All | n/a | ❌ Below min size |
| `text-emerald-400` income | Double Chocolate | ~7.1:1 | ✅ |
| Hero card amount | All | Varies | ⚠️ Verify |

### B. Focus & Keyboard (also affects Switch Access on Android)

All 7+ portaled modals lack:
- Focus trap (keyboard/Switch Access escapes modal)
- `aria-modal="true"`, `role="dialog"`, `aria-labelledby`
- Focus restore on close
- Escape key dismiss (only HeaderMenu has this ✅)

### C. Screen Reader Labels for Charts

SVG pie/line charts lack:
- `role="img" aria-label="..."` on SVG container
- `<title>` per segment with value + percentage
- `aria-live="polite"` for selection changes
- Data table alternative for screen readers

### D. Touch Target Sizes

| Element | Current | Minimum |
|---|---|---|
| Gear icon button | 32px | 44px ❌ |
| Toast dismiss X | 32px | 44px ❌ |
| Modal close X | 36px | 44px ❌ |
| Hint icon in KpiCard | 24px (decorative) | — |
| Sheet title tap | Text-only | 44px tall ❌ |

---

## Known Strengths (Do Not Regress)

- ✅ Six-theme system with smooth CSS transitions
- ✅ Framer Motion springs + tactile card press physics
- ✅ Dynamic category chips auto-extracted from usage data
- ✅ Calculator input with BODMAS + percentage evaluation
- ✅ Safe-area padding, floating nav, PWA installability
- ✅ Privacy-first: zero financial data on servers
- ✅ Signed-in greeting, masked amounts, haptic chip feedback
- ✅ Date-grouped ledger timeline with daily totals
- ✅ First-run tour with persistent skip

---

*See `UX_IMPLEMENTATION_STRATEGY.md` for the phased execution plan.*
