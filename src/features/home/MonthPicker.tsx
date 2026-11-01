import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { currentMonthKey, monthLabel } from '../../domain/metrics';

interface MonthPickerProps {
  selectedMonth: string;
  availableMonths: string[];
  onMonthChange: (monthKey: string) => void;
}

const MONTHS = [
  { num: '01', name: 'Jan', full: 'January' },
  { num: '02', name: 'Feb', full: 'February' },
  { num: '03', name: 'Mar', full: 'March' },
  { num: '04', name: 'Apr', full: 'April' },
  { num: '05', name: 'May', full: 'May' },
  { num: '06', name: 'Jun', full: 'June' },
  { num: '07', name: 'Jul', full: 'July' },
  { num: '08', name: 'Aug', full: 'August' },
  { num: '09', name: 'Sep', full: 'September' },
  { num: '10', name: 'Oct', full: 'October' },
  { num: '11', name: 'Nov', full: 'November' },
  { num: '12', name: 'Dec', full: 'December' },
];

function stepMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function MonthPicker({
  selectedMonth,
  availableMonths,
  onMonthChange,
}: MonthPickerProps) {
  const currentKey = currentMonthKey();
  const isCurrentMonth = selectedMonth === currentKey;
  const isPast = selectedMonth < currentKey;
  const isFuture = selectedMonth > currentKey;

  const [selectedYear, selectedMonthNum] = useMemo(() => {
    const parts = selectedMonth.split('-');
    return [parts[0] || currentKey.slice(0, 4), parts[1] || currentKey.slice(5, 7)];
  }, [selectedMonth, currentKey]);

  const years = useMemo(() => {
    const set = new Set<string>();
    set.add(currentKey.slice(0, 4));
    set.add(selectedYear);
    availableMonths.forEach((m) => {
      if (m && m.length >= 4) {
        set.add(m.slice(0, 4));
      }
    });
    return Array.from(set).sort().reverse();
  }, [availableMonths, currentKey, selectedYear]);

  const handleYearChange = (newYear: string) => {
    onMonthChange(`${newYear}-${selectedMonthNum}`);
  };

  const handleMonthNumChange = (newMonthNum: string) => {
    onMonthChange(`${selectedYear}-${newMonthNum}`);
  };

  const handlePrev = () => {
    onMonthChange(stepMonth(selectedMonth, -1));
  };

  const handleNext = () => {
    onMonthChange(stepMonth(selectedMonth, 1));
  };

  const handleResetToCurrent = () => {
    onMonthChange(currentKey);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {/* Header Label & Badge */}
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
          {isCurrentMonth ? 'This Month' : monthLabel(selectedMonth)}
        </h3>
        {isPast && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
            Historical
          </span>
        )}
        {isFuture && (
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-400">
            Upcoming
          </span>
        )}
      </div>

      {/* Controls Container */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Quick Back to Current Month Pill (Visible only when on historical month) */}
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={handleResetToCurrent}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary shadow-xs transition hover:bg-primary/20 active:scale-95"
            title="Snap back to current month"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>Current Month</span>
          </button>
        )}

        {/* Prev Month Button */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous month"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface-strong text-text-secondary shadow-warm-sm transition hover:bg-surface-muted hover:text-text active:scale-95"
          title="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Month Selector */}
        <div className="relative">
          <select
            value={selectedMonthNum}
            onChange={(e) => handleMonthNumChange(e.target.value)}
            className="h-8 rounded-xl border border-border bg-surface-strong px-2.5 py-1 pr-6 text-xs font-bold text-text shadow-warm-sm transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
            aria-label="Select month"
          >
            {MONTHS.map((m) => {
              const key = `${selectedYear}-${m.num}`;
              const hasData = availableMonths.includes(key);
              return (
                <option key={m.num} value={m.num}>
                  {m.name} {!hasData && '(empty)'}
                </option>
              );
            })}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-text-muted">
            <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        {/* Year Selector */}
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="h-8 rounded-xl border border-border bg-surface-strong px-2.5 py-1 pr-6 text-xs font-bold text-text shadow-warm-sm transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
            aria-label="Select year"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-text-muted">
            <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        {/* Next Month Button */}
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next month"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface-strong text-text-secondary shadow-warm-sm transition hover:bg-surface-muted hover:text-text active:scale-95"
          title="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

