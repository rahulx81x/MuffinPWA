import { useMemo } from 'react';
import { getOpeningBalance } from '../../config';
import { useRecipeConfig } from '../../hooks/useRecipeConfig';
import { useMask } from '../../hooks/useMask';
import { buildMonthlyKPIs, currentMonthKey, monthKey } from '../../domain/metrics';
import { isCountedInvestment } from '../../domain/providentFund';
import type { NewTransactionInput, Transaction } from '../../domain/types';
import {
  TransactionForm,
  type TransactionFormData,
} from '../../components/molecules/TransactionForm';
import { EmptyState } from '../../components/molecules/EmptyState';
import { Sparkles } from 'lucide-react';

interface PlannerViewProps {
  sheetTransactions: Transaction[];
  plannerTransactions: Transaction[];
  onAdd: (input: NewTransactionInput) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}

export function PlannerView({
  sheetTransactions,
  plannerTransactions,
  onAdd,
  onRemove,
  onClear,
}: PlannerViewProps) {
  const { masked, formatCurrency } = useMask();
  const { config: recipeConfig } = useRecipeConfig();
  const thisMonth = currentMonthKey();

  const dynamicCategoryChips = useMemo(() => {
    if (!sheetTransactions.length) return [];
    const counts: Record<string, number> = {};
    for (const tx of sheetTransactions) {
      const cat = tx.category?.trim();
      if (!cat) continue;
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat)
      .slice(0, 8);
  }, [sheetTransactions]);

  const monthTx = useMemo(() => {
    const combined = [...sheetTransactions, ...plannerTransactions];
    return combined.filter((t) => monthKey(t.date) === thisMonth);
  }, [sheetTransactions, plannerTransactions, thisMonth]);

  const income = monthTx
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const expenses = monthTx
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const investment = monthTx
    .filter(isCountedInvestment)
    .reduce((s, t) => s + t.amount, 0);
  const liquid = income - expenses - investment;
  const savingsPct = pct(investment + liquid, income);

  const previousClose = useMemo(() => {
    const monthly = buildMonthlyKPIs(sheetTransactions);
    const prior = monthly.filter((m) => m.key < thisMonth);
    return prior.length > 0
      ? prior[prior.length - 1].closingLiquid
      : getOpeningBalance();
  }, [sheetTransactions, thisMonth, recipeConfig]);
  const closingBalance = previousClose + liquid;

  const plannerThisMonth = plannerTransactions.filter(
    (t) => monthKey(t.date) === thisMonth
  );

  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    monthTx
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTx]);

  function handleFormSubmit(data: TransactionFormData) {
    onAdd({
      date: data.date,
      type: data.type,
      category: data.category,
      amount: data.amount,
      comment: data.comment,
      investmentType: data.investmentType,
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-text">Planner</h2>
        <p className="text-sm text-text-muted">
          What-if entries for this month stay in-memory on this device only.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        <Stat
          label="Income"
          value={formatCurrency(income)}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <Stat
          label="Expenses"
          value={formatCurrency(expenses)}
          tone="text-rose-600 dark:text-rose-400"
        />
        <Stat
          label="Investment"
          value={formatCurrency(investment)}
          tone="text-violet-600 dark:text-violet-400"
        />
        <Stat
          label="Net Liquid"
          value={formatCurrency(liquid)}
          tone={liquid >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}
        />
        <Stat
          label="Savings %"
          value={`${savingsPct.toFixed(1)}%`}
          tone={savingsPct >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}
        />
        <Stat
          label="Closing Cash"
          value={formatCurrency(closingBalance)}
          tone={closingBalance >= 0 ? 'text-text' : 'text-rose-600 dark:text-rose-400'}
        />
      </div>

      <div className="cozy-card border-border p-4">
        <h3 className="mb-3 text-sm font-bold text-text">Add planning entry</h3>
        <TransactionForm
          categoryChips={dynamicCategoryChips}
          submitLabel="Add to plan"
          onSubmit={handleFormSubmit}
          layout="inline"
        />
      </div>

      <div className="cozy-card border-border p-4">
        <h3 className="mb-3 text-sm font-bold text-text">Expense categories</h3>
        {expenseBreakdown.length === 0 ? (
          <p className="text-sm text-text-muted">No expenses this month yet.</p>
        ) : (
          <ul className="space-y-2">
            {expenseBreakdown.map(([name, amount]) => (
              <li
                key={name}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-medium text-text">{name}</span>
                <span className="tabular-nums text-rose-600 dark:text-rose-400">
                  {masked ? (
                    <span className="text-text-muted">
                      {pct(amount, expenses).toFixed(1)}%
                    </span>
                  ) : (
                    <>
                      {formatCurrency(amount)}
                      <span className="ml-2 text-text-muted">
                        {pct(amount, expenses).toFixed(1)}%
                      </span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-text">Mock entries</h3>
          {plannerThisMonth.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
        {plannerThisMonth.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-6 w-6" strokeWidth={2} />}
            title="No planning entries yet"
            description="Add what-if income, expenses, or investments above to simulate cash flow without altering your Google Sheet."
          />
        ) : (
          <ul className="space-y-2">
            {plannerThisMonth.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-strong px-3 py-2.5 shadow-warm-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">
                    {t.category}
                    <span className="ml-2 rounded-full bg-surface-muted/70 px-2 py-0.5 text-[10px] uppercase text-text-muted">
                      {t.type}
                    </span>
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatCurrency(t.amount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(t.id)}
                  className="shrink-0 text-xs font-semibold text-rose-600 active:scale-95 dark:text-rose-400 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  className = '',
}: {
  label: string;
  value: string;
  tone: string;
  className?: string;
}) {
  return (
    <div className={`cozy-card border-border p-3.5 ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className={`mt-1 font-display text-xl font-bold tabular-nums ${tone}`}>
        {value}
      </p>
    </div>
  );
}

/** Helper kept for callers that still construct planner rows. */
export { toPlannerTransaction } from '../../hooks/usePlannerStore';
