import { useMask } from '../hooks/useMask';
import type { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
}

function amountClass(type: Transaction['type']): string {
  if (type === 'income') return 'text-emerald-600 dark:text-emerald-400';
  if (type === 'expense') return 'text-rose-600 dark:text-rose-400';
  return 'text-violet-600 dark:text-violet-400';
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
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        No transactions yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {items.map((t) => (
        <li key={t.id} className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 break-words text-[15px] font-bold leading-snug text-zinc-900 dark:text-zinc-50">
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
            <p className="whitespace-normal break-words text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t.comment?.trim() ? t.comment : 'No comment'}
            </p>
            <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {formatDisplayDate(t.date)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
