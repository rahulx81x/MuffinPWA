import { useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
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
    <div className="flex items-center justify-between gap-1.5 sm:gap-2">
      {/* Header Label & Badge */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted truncate">
          {isCurrentMonth ? 'This Month' : monthLabel(selectedMonth)}
        </h3>
        {isPast && (
          <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-400 leading-none">
            Past
          </span>
        )}
        {isFuture && (
          <span className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold text-sky-700 dark:text-sky-400 leading-none">
            Upcoming
          </span>
        )}
      </div>

      {/* Controls Container — strictly single line, never wraps */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Quick Back to Current Month Button */}
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={handleResetToCurrent}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-1.5 sm:px-2 text-[11px] font-bold text-primary shadow-xs transition hover:bg-primary/20 active:scale-95 shrink-0"
            title="Snap back to current month"
            aria-label="Snap back to current month"
          >
            <RotateCcw className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline">Current</span>
          </button>
        )}

        {/* Segmented Month Navigation Capsule */}
        <div className="inline-flex items-center rounded-xl border border-border bg-surface-strong shadow-warm-xs divide-x divide-border/60 overflow-hidden shrink-0">
          {/* Prev Month Button */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous month"
            className="inline-flex h-7 w-6 sm:w-7 items-center justify-center text-text-muted hover:bg-surface-muted hover:text-text active:scale-95 transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {/* Month Selector */}
          <div className="relative">
            <select
              value={selectedMonthNum}
              onChange={(e) => handleMonthNumChange(e.target.value)}
              className="h-7 bg-transparent pl-2 pr-4 text-[11px] sm:text-xs font-bold text-text focus:outline-none cursor-pointer appearance-none transition-colors hover:bg-surface-muted"
              aria-label="Select month"
            >
              {MONTHS.map((m) => {
                const key = `${selectedYear}-${m.num}`;
                const hasData = availableMonths.includes(key);
                return (
                  <option key={m.num} value={m.num} className="bg-surface text-text">
                    {m.name} {!hasData && '(empty)'}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-text-muted" />
          </div>

          {/* Year Selector */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="h-7 bg-transparent pl-2 pr-4 text-[11px] sm:text-xs font-bold text-text focus:outline-none cursor-pointer appearance-none transition-colors hover:bg-surface-muted"
              aria-label="Select year"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-surface text-text">
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-text-muted" />
          </div>

          {/* Next Month Button */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next month"
            className="inline-flex h-7 w-6 sm:w-7 items-center justify-center text-text-muted hover:bg-surface-muted hover:text-text active:scale-95 transition-colors"
            title="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
