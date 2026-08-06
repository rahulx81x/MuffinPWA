import { useMask } from '../hooks/useMask';
import type { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
}

function amountClass(type: Transaction['type']): string {
  if (type === 'income') return 'text-emerald-700 dark:text-emerald-400';
  if (type === 'expense') return 'text-rose-700 dark:text-rose-400';
  return 'text-amber-700 dark:text-amber-400';
}

function amountPrefix(type: Transaction['type'], masked: boolean): string {
  if (masked) return '';
  if (type === 'income') return '+';
  if (type === 'expense') return '−';
  return '';
}

function formatDisplayDate(iso: string): string {
  const date = new Date(iso + 'T00:00:00');
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function TransactionList({ transactions }: TransactionListProps) {
  const { masked, formatCurrency } = useMask();
  const items = [...transactions].reverse().slice(0, 50);

  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface-strong px-4 py-8 text-center text-sm text-text-muted transition-colors duration-200">
        No transactions yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-divider overflow-hidden rounded-2xl border border-border bg-surface-strong shadow-warm-sm transition-colors duration-200">
      {items.map((t) => (
        <li key={t.id} className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 break-words text-[15px] font-bold leading-snug text-text">
              {t.category || '—'}
            </h3>
            <p
              className={`shrink-0 pt-0.5 text-right text-[15px] font-bold tabular-nums leading-snug ${amountClass(t.type)}`}
            >
              {amountPrefix(t.type, masked)}
              {formatCurrency(t.amount)}
            </p>
          </div>
          <div className="mt-1.5 space-y-1.5">
            <p className="whitespace-normal break-words text-sm leading-relaxed text-text-secondary">
              {t.comment?.trim() ? t.comment : 'No comment'}
            </p>
            <span className="inline-flex rounded-full bg-surface-muted/70 px-2 py-0.5 text-[11px] font-medium tabular-nums text-text-muted">
              {formatDisplayDate(t.date)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
