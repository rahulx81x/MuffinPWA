import type { RecurringRule } from '@shared';

export interface RecurringDueSummary {
  dueItems: RecurringRule[];
  upcomingItems: RecurringRule[];
  loggedThisMonthItems: RecurringRule[];
  pausedItems: RecurringRule[];
  expiredItems: RecurringRule[];
  totalDueAmount: number;
  monthKey: string;
}

/** Check whether a recurring rule has passed its configured end date. */
export function isRuleExpired(rule: RecurringRule, refDate = new Date()): boolean {
  if (!rule.endDate) return false;
  const rawEnd = rule.endDate.trim();
  if (!rawEnd) return false;

  const currentMonthKey = getMonthKey(refDate);

  if (rawEnd.length === 7) {
    // "YYYY-MM" format
    return currentMonthKey > rawEnd;
  }

  // "YYYY-MM-DD" or full date string
  const refIso = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}-${String(refDate.getDate()).padStart(2, '0')}`;
  return refIso > rawEnd;
}

/** Get a readable label for the configured end date. */
export function formatRuleEndDate(endDate?: string): string {
  if (!endDate) return '';
  const raw = endDate.trim();
  if (raw.length === 7) {
    // "YYYY-MM" -> "Nov 2026"
    const [y, m] = raw.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
  const date = new Date(raw + 'T00:00:00');
  if (isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Get the total number of days in a given year and month (0-indexed month: 0 for Jan, 11 for Dec). */
export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Format YYYY-MM key for billing cycle comparison. */
export function getMonthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Returns the effective day of the month clamped to the month's maximum days.
 * E.g., a rule scheduled for the 31st will resolve to 28 (or 29) in February and 30 in April.
 */
export function getEffectiveDueDay(dayOfMonth: number, year: number, monthIndex: number): number {
  const maxDays = getDaysInMonth(year, monthIndex);
  const target = Math.max(1, Math.min(31, Math.round(dayOfMonth || 1)));
  return Math.min(target, maxDays);
}

/** Formatted ISO date string (YYYY-MM-DD) for logging the recurring rule in the current cycle. */
export function getRecurringRuleLogDate(rule: RecurringRule, refDate = new Date()): string {
  const year = refDate.getFullYear();
  const monthIndex = refDate.getMonth();
  const effectiveDay = getEffectiveDueDay(rule.dayOfMonth, year, monthIndex);
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(effectiveDay).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/** Helper to format ordinal suffixes (1st, 2nd, 3rd, 4th...). */
export function getOrdinalSuffix(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}

/** Human friendly label for recurrence day. */
export function formatRecurrenceDay(dayOfMonth: number): string {
  const clamped = Math.max(1, Math.min(31, Math.round(dayOfMonth || 1)));
  if (clamped === 31) {
    return '31st (or last day of month)';
  }
  return `${getOrdinalSuffix(clamped)} of every month`;
}

/** Calculate summary of due, upcoming, logged, and paused recurring rules for the current cycle. */
export function calculateRecurringDueSummary(
  rules: RecurringRule[],
  refDate = new Date()
): RecurringDueSummary {
  const monthKey = getMonthKey(refDate);
  const currentDay = refDate.getDate();
  const year = refDate.getFullYear();
  const monthIndex = refDate.getMonth();

  const dueItems: RecurringRule[] = [];
  const upcomingItems: RecurringRule[] = [];
  const loggedThisMonthItems: RecurringRule[] = [];
  const pausedItems: RecurringRule[] = [];
  const expiredItems: RecurringRule[] = [];

  let totalDueAmount = 0;

  for (const rule of rules) {
    if (!rule.active) {
      pausedItems.push(rule);
      continue;
    }

    if (isRuleExpired(rule, refDate)) {
      expiredItems.push(rule);
      continue;
    }

    if (rule.lastLoggedMonth === monthKey) {
      loggedThisMonthItems.push(rule);
      continue;
    }

    const effectiveDay = getEffectiveDueDay(rule.dayOfMonth, year, monthIndex);
    if (effectiveDay <= currentDay) {
      dueItems.push(rule);
      totalDueAmount += rule.amount;
    } else {
      upcomingItems.push(rule);
    }
  }

  // Sort due items by dayOfMonth ascending
  dueItems.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  upcomingItems.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  loggedThisMonthItems.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  expiredItems.sort((a, b) => a.dayOfMonth - b.dayOfMonth);

  return {
    dueItems,
    upcomingItems,
    loggedThisMonthItems,
    pausedItems,
    expiredItems,
    totalDueAmount,
    monthKey,
  };
}
