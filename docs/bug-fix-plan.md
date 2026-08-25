# Muffin PWA — Bug Fix Plan

All 17 issues from the analysis, grouped by file for efficient editing. Critical fixes first.

---

## 🔴 Fix 1 — Allow negative opening balance

**Files:** [`shared/recipe.ts`](file:///c:/Codes/MuffinPWA/shared/recipe.ts) · [`shared/sheets.ts`](file:///c:/Codes/MuffinPWA/shared/sheets.ts)

#### `shared/recipe.ts` — `sanitizeRecipe` (L92)
```diff
- openingBalance: Number.isFinite(openingBalance) ? Math.max(0, openingBalance) : fallback.openingBalance,
+ openingBalance: Number.isFinite(openingBalance) ? openingBalance : fallback.openingBalance,
```

#### `shared/sheets.ts` — `serializeRecipeToRows` (L97)
```diff
- Amount: Number.isFinite(config.openingBalance) ? Math.max(0, config.openingBalance) : 0,
+ Amount: Number.isFinite(config.openingBalance) ? config.openingBalance : 0,
```

#### `shared/sheets.ts` — `parseRecipeFromRows` (L156)
```diff
- if (Number.isFinite(amount)) {
-   openingBalance = Math.max(0, amount);
- }
+ if (Number.isFinite(amount)) {
+   openingBalance = amount;
+ }
```

---

## 🔴 Fix 2 — Pass recipe config into `buildFinancialMetrics` explicitly

**Files:** [`src/domain/metrics.ts`](file:///c:/Codes/MuffinPWA/src/domain/metrics.ts) · [`src/App.tsx`](file:///c:/Codes/MuffinPWA/src/App.tsx)

#### `src/domain/metrics.ts`
Add a config parameter to `buildFinancialMetrics`, `buildMonthlyKPIs`, and `buildInvestmentBreakup` instead of calling the global getters:

```diff
- export function buildMonthlyKPIs(transactions: Transaction[]): MonthlyKPI[] {
+ export function buildMonthlyKPIs(
+   transactions: Transaction[],
+   openingBalance: number
+ ): MonthlyKPI[] {
```
Inside, replace `getOpeningBalance()` call (L95) with the `openingBalance` parameter.

```diff
- export function buildInvestmentBreakup(transactions: Transaction[]): Record<string, number> {
+ export function buildInvestmentBreakup(
+   transactions: Transaction[],
+   initialInvestments: RecipeInvestment[]
+ ): Record<string, number> {
```
Inside, replace `getInitialInvestments()` call (L121) with the `initialInvestments` parameter.

```diff
- export function buildFinancialMetrics(transactions: Transaction[]): FinancialMetrics {
+ export function buildFinancialMetrics(
+   transactions: Transaction[],
+   config: { openingBalance: number; investments: RecipeInvestment[] }
+ ): FinancialMetrics {
```
Inside, replace:
- `getOpeningBalance()` → `config.openingBalance`
- `getInitialInvestments()` → `config.investments`
- `getInitialInvestmentTotal()` → `config.investments.reduce((s, r) => s + r.amount, 0)`
- Pass through to sub-functions: `buildMonthlyKPIs(transactions, config.openingBalance)` and `buildInvestmentBreakup(transactions, config.investments)`

#### `src/App.tsx` (L155)
```diff
  useEffect(() => {
-   setMetrics(buildFinancialMetrics(sheetTransactions));
+   setMetrics(buildFinancialMetrics(sheetTransactions, {
+     openingBalance: recipeConfig.openingBalance,
+     investments: recipeConfig.investments,
+   }));
  }, [sheetTransactions, recipeConfig]);
```

---

## 🔴 Fix 3 — Fix stale `pullDistance` in `usePullToRefresh`

**File:** [`src/hooks/usePullToRefresh.ts`](file:///c:/Codes/MuffinPWA/src/hooks/usePullToRefresh.ts)

Add a ref to track the previous distance, and remove `pullDistance` from the useEffect deps:

```diff
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
+ const prevDistanceRef = useRef(0);
```

In `onTouchMove`, replace the vibration logic:
```diff
  setPullDistance(dampened);
- if (dampened >= threshold && pullDistance < threshold) {
+ if (dampened >= threshold && prevDistanceRef.current < threshold) {
    navigator.vibrate?.(8);
  }
+ prevDistanceRef.current = dampened;
```

In `onTouchEnd`, reset the ref when pull resets:
```diff
+ prevDistanceRef.current = 0;
  setPullDistance(0);
```

Remove `pullDistance` from the useEffect dependency array (L85):
```diff
- }, [onRefresh, threshold, disabled, refreshing, pullDistance]);
+ }, [onRefresh, threshold, disabled, refreshing]);
```

---

## 🔴 Fix 4 — Accurate count in `logAllDue` success message

**File:** [`src/hooks/useRecurringAutomation.ts`](file:///c:/Codes/MuffinPWA/src/hooks/useRecurringAutomation.ts)

Track actually-created items separately:

```diff
  const successfullyLoggedIds: string[] = [];
+ let actuallyCreatedCount = 0;
  let latestTransactions: Transaction[] = [];
```

In the loop, after `createTransaction`:
```diff
  const res = await createTransaction(tabName, rowData);
  successfullyLoggedIds.push(rule.id);
+ actuallyCreatedCount++;
```

(The skip-as-duplicate branch already pushes to `successfullyLoggedIds` without incrementing.)

Fix the message:
```diff
- onStatusMessage?.(`Logged ${due.length} recurring item${due.length === 1 ? '' : 's'}.`);
+ const skipped = successfullyLoggedIds.length - actuallyCreatedCount;
+ const msg = skipped > 0
+   ? `Logged ${actuallyCreatedCount} recurring item${actuallyCreatedCount === 1 ? '' : 's'} (${skipped} already existed).`
+   : `Logged ${actuallyCreatedCount} recurring item${actuallyCreatedCount === 1 ? '' : 's'}.`;
+ onStatusMessage?.(msg);
```

---

## 🔴 Fix 5 — Fix rule expiry comparison

**File:** [`src/domain/recurring.ts`](file:///c:/Codes/MuffinPWA/src/domain/recurring.ts)

Replace the `YYYY-MM-DD` branch to compare against the current date, not the scheduled log date:

```diff
  // "YYYY-MM-DD" or full date string
- const scheduledDate = getRecurringRuleLogDate(rule, refDate);
- return scheduledDate > rawEnd;
+ const refIso = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}-${String(refDate.getDate()).padStart(2, '0')}`;
+ return refIso > rawEnd;
```

---

## 🟠 Fix 6 — Don't close confirm modal on delete failure

**File:** [`src/App.tsx`](file:///c:/Codes/MuffinPWA/src/App.tsx)

```diff
  const ok = await executeDelete(pendingConfirm.tx);
- if (ok) closeModal();
- else closeModal();
+ if (ok) closeModal();
+ // On failure, executeDelete already sets the error state — keep modal open
```

---

## 🟠 Fix 7 — Surface `persistConfig` API errors

**File:** [`src/hooks/useRecipeConfig.tsx`](file:///c:/Codes/MuffinPWA/src/hooks/useRecipeConfig.tsx)

Re-throw the error so callers can handle it (or at minimum, log a warning):

```diff
  const persistConfig = useCallback(async (next: RecipeConfig) => {
    saveRecipeConfig(next);
    try {
      const saved = await saveRecipe(next);
      return hydrateRecipeConfig(saved);
    } catch {
-     return next;
+     console.warn('[muffin] Recipe API save failed — local-only until next sync');
+     return next;
    }
  }, []);
```

> [!NOTE]
> A full fix would propagate the error to the UI as a toast. The `console.warn` is the minimal change; a follow-up could add an `onError` callback.

---

## 🟠 Fix 8 — Make `updateOpeningBalance` / `updateInvestments` persist to API

**File:** [`src/hooks/useRecipeConfig.tsx`](file:///c:/Codes/MuffinPWA/src/hooks/useRecipeConfig.tsx)

Change both to use `persistConfig` like the recurring rule methods:

```diff
- const updateOpeningBalance = useCallback((amount: number) => {
+ const updateOpeningBalance = useCallback(async (amount: number) => {
    const current = getRecipeConfig();
-   saveRecipeConfig({ ...current, openingBalance: amount });
-  }, []);
+   await persistConfig({ ...current, openingBalance: amount });
+ }, [persistConfig]);

- const updateInvestments = useCallback((investments: RecipeInvestment[]) => {
+ const updateInvestments = useCallback(async (investments: RecipeInvestment[]) => {
    const current = getRecipeConfig();
-   saveRecipeConfig({ ...current, investments });
-  }, []);
+   await persistConfig({ ...current, investments });
+ }, [persistConfig]);
```

Update the `RecipeConfigContextValue` interface to match:
```diff
- updateOpeningBalance: (amount: number) => void;
- updateInvestments: (investments: RecipeInvestment[]) => void;
+ updateOpeningBalance: (amount: number) => Promise<void>;
+ updateInvestments: (investments: RecipeInvestment[]) => Promise<void>;
```

> [!IMPORTANT]
> Check all call sites of `updateOpeningBalance` and `updateInvestments` — they will need to handle the returned Promise (either `await` or `void`).

---

## 🟠 Fix 9 — Prevent stale-closure double-logging race

**File:** [`src/hooks/useRecurringAutomation.ts`](file:///c:/Codes/MuffinPWA/src/hooks/useRecurringAutomation.ts)

Add a ref to track in-flight rule IDs:

```diff
  const [logging, setLogging] = useState(false);
+ const inFlightIdsRef = useRef<Set<string>>(new Set());
```

At the start of `logSingleRule`:
```diff
  const logSingleRule = useCallback(async (rule: RecurringRule): Promise<boolean> => {
+   if (inFlightIdsRef.current.has(rule.id)) return false;
+   inFlightIdsRef.current.add(rule.id);
    setLogging(true);
    try {
```

In the `finally`:
```diff
    } finally {
+     inFlightIdsRef.current.delete(rule.id);
      setLogging(false);
    }
```

---

## 🟠 Fix 10 — Tighten `matchesExistingTransaction` duplicate detection

**File:** [`src/hooks/useRecurringAutomation.ts`](file:///c:/Codes/MuffinPWA/src/hooks/useRecurringAutomation.ts)

Require category match **plus** at least one other signal:

```diff
- return catMatch || commentMatch || invMatch;
+ // Require category match as a baseline, plus at least one other signal
+ if (!catMatch) return false;
+ return commentMatch || invMatch || true;
```

Actually, a cleaner approach — require category AND amount AND month (which are already checked above), which is already a strong match. The issue is the `||` lets a comment-only or invType-only match slip through with a *different* category. Fix:

```diff
- return catMatch || commentMatch || invMatch;
+ // Category must match. Comment or investment type match is a bonus confirmation.
+ return catMatch;
```

This is stricter: same type + same amount (±0.01) + same month + same category = duplicate. Comment and investment type matching without category is too loose.

---

## 🟠 Fix 11 — Fix `createId` to use prefix consistently

**File:** [`src/domain/parseSheet.ts`](file:///c:/Codes/MuffinPWA/src/domain/parseSheet.ts)

```diff
  export function createId(prefix: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
-     return crypto.randomUUID();
+     return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
```

---

## 🟡 Fix 12 — Show decimals in currency formatting (optional)

**File:** [`src/config.ts`](file:///c:/Codes/MuffinPWA/src/config.ts)

If you want to show paise for non-round amounts:

```diff
  export function formatCurrency(amount: number): string {
-   return CURRENCY.symbol + Math.round(amount).toLocaleString(CURRENCY.locale);
+   const rounded = Math.round(amount * 100) / 100;
+   const formatted = Number.isInteger(rounded)
+     ? rounded.toLocaleString(CURRENCY.locale)
+     : rounded.toLocaleString(CURRENCY.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
+   return CURRENCY.symbol + formatted;
  }
```

> [!NOTE]
> If you prefer always-rounded display (no paise), skip this fix — it's a design choice.

---

## 🟡 Fix 13 — Reject zero/negative amounts in expression evaluator

**File:** [`src/domain/evaluateAmount.ts`](file:///c:/Codes/MuffinPWA/src/domain/evaluateAmount.ts)

After the final rounding (L149-L151):

```diff
  const rounded = Math.round(value * 100) / 100;
  if (!Number.isFinite(rounded)) {
    return { ok: false, error: 'Invalid amount expression.' };
  }
+ if (rounded <= 0) {
+   return { ok: false, error: 'Amount must be greater than zero.' };
+ }
  return { ok: true, value: rounded };
```

---

## 🟡 Fix 14 — Increase undo toast duration

**File:** [`src/hooks/useAuthSession.ts`](file:///c:/Codes/MuffinPWA/src/hooks/useAuthSession.ts)

Use a longer timeout when the toast contains an undo action:

```diff
- const STATUS_TOAST_MS = 5_000;
+ const STATUS_TOAST_MS = 5_000;
+ const UNDO_TOAST_MS = 8_000;
```

```diff
  useEffect(() => {
    if (!statusMessage) return;
+   const hasUndo = typeof statusMessage === 'object' && statusMessage?.undoFn;
+   const duration = hasUndo ? UNDO_TOAST_MS : STATUS_TOAST_MS;
    const timer = window.setTimeout(() => {
      setStatusMessage(null);
-   }, STATUS_TOAST_MS);
+   }, duration);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);
```

---

## 🟡 Fix 15 — Remove dead `|| existingRecord` fallback

**File:** [`netlify/functions/sheet-link.ts`](file:///c:/Codes/MuffinPWA/netlify/functions/sheet-link.ts)

```diff
- await getOrMigrateUserRecipe(session, record || existingRecord);
+ await getOrMigrateUserRecipe(session, record);
```

---

## 🟡 Fix 16 — Add safety logging for non-atomic sheet writes

**File:** [`netlify/lib/recipeStore.ts`](file:///c:/Codes/MuffinPWA/netlify/lib/recipeStore.ts)

Wrap in try/catch to restore on failure:

```diff
+ const existingRecipeRows = await recipeSheet.getRows();
  await recipeSheet.clearRows();
  const recipeRows = serializeRecipeToRows(recipe);
  if (recipeRows.length > 0) {
-   await recipeSheet.addRows(recipeRows as unknown as Record<string, string | number>[]);
+   try {
+     await recipeSheet.addRows(recipeRows as unknown as Record<string, string | number>[]);
+   } catch (err) {
+     console.error('[muffin] Failed to write recipe rows after clearing — data may be lost', err);
+     throw err;
+   }
  }
```

Same pattern for the rules sheet block.

> [!NOTE]
> A fully atomic approach is impossible with the Google Sheets API. This just adds better error logging.

---

## 🟡 Fix 17 — Sort ledger descending (newest first)

**File:** [`src/hooks/useSheetTransactions.ts`](file:///c:/Codes/MuffinPWA/src/hooks/useSheetTransactions.ts)

```diff
- () => [...sheetTransactions].sort((a, b) => a.date.localeCompare(b.date)),
+ () => [...sheetTransactions].sort((a, b) => b.date.localeCompare(a.date)),
```

> [!NOTE]
> Skip if ascending is intentional for your ledger UI.

---

## Verification Plan

After applying all fixes:

1. **Build check** — `npm run build` must pass with no TypeScript errors
2. **Manual test: negative opening balance** — Set opening balance to `-50000` in Recipe, verify metrics show correctly
3. **Manual test: recurring rules** — Add, edit, toggle, delete rules → refresh the page → verify they persist
4. **Manual test: pull-to-refresh** — Test on mobile, verify single haptic vibration at threshold
5. **Manual test: rule expiry** — Create a rule with an end date in the past, verify it shows as expired
6. **Manual test: delete undo** — Delete a transaction, verify undo button appears for 8 seconds
7. **Manual test: log all due** — Have a mix of due and already-logged items, verify accurate count message
