import {
  getInitialInvestmentBreakdown,
  INITIAL_LIQUID_BALANCE,
} from '../config';
import type { FinancialMetrics, MonthlyKPI, Transaction } from '../types';
import {
  isCountedInvestment,
  isProvidentFund,
  sumProvidentFund,
} from './providentFund';

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}

export function monthKey(dateStr: string | Date): string {
  const date =
    typeof dateStr === 'string' ? new Date(dateStr + 'T00:00:00') : dateStr;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

export function buildMonthlyKPIs(transactions: Transaction[]): MonthlyKPI[] {
  const byMonth: Record<
    string,
    {
      income: number;
      spends: number;
      investment: number;
      expensesByCategory: Record<string, number>;
    }
  > = {};

  transactions.forEach((t) => {
    const key = monthKey(t.date);
    if (!byMonth[key]) {
      byMonth[key] = {
        income: 0,
        spends: 0,
        investment: 0,
        expensesByCategory: {},
      };
    }
    if (t.type === 'income') byMonth[key].income += t.amount;
    else if (t.type === 'expense') {
      byMonth[key].spends += t.amount;
      byMonth[key].expensesByCategory[t.category] =
        (byMonth[key].expensesByCategory[t.category] || 0) + t.amount;
    } else if (isCountedInvestment(t)) {
      byMonth[key].investment += t.amount;
    }
  });

  return Object.keys(byMonth)
    .sort()
    .reduce<MonthlyKPI[]>((rows, key) => {
      const m = byMonth[key];
      const incomeMinusSpends = m.income - m.spends;
      const liquidSavings = m.income - m.spends - m.investment;
      const previousClose =
        rows.length > 0
          ? rows[rows.length - 1].closingLiquid
          : INITIAL_LIQUID_BALANCE;
      const closingLiquid = previousClose + liquidSavings;

      rows.push({
        key,
        label: monthLabel(key),
        income: m.income,
        spends: m.spends,
        investment: m.investment,
        incomeMinusSpends,
        liquidSavings,
        closingLiquid,
        investmentPct: pct(m.investment, m.income),
        liquidSavingsPct: pct(liquidSavings, m.income),
        totalSavingsPct: pct(m.investment + liquidSavings, m.income),
        expensesByCategory: m.expensesByCategory,
      });
      return rows;
    }, []);
}

export function buildInvestmentBreakup(
  transactions: Transaction[]
): Record<string, number> {
  const initial = getInitialInvestmentBreakdown();
  const breakdown: Record<string, number> = {};

  if (initial.regular) breakdown['Regular Deposits'] = initial.regular;
  if (initial.fixed) breakdown['Fixed Deposits'] = initial.fixed;
  if (initial.mutual) breakdown['Mutual Funds'] = initial.mutual;

  // Counted investments only — PF has its own card and is omitted from breakup/pie.
  transactions.filter(isCountedInvestment).forEach((t) => {
    const key =
      (t.investmentType || t.category || 'Uncategorized').trim() ||
      'Uncategorized';
    breakdown[key] = (breakdown[key] || 0) + t.amount;
  });

  return breakdown;
}

export function buildFinancialMetrics(
  transactions: Transaction[]
): FinancialMetrics {
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSpends = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const trackedInvestment = transactions
    .filter(isCountedInvestment)
    .reduce((sum, t) => sum + t.amount, 0);
  const providentFundBalance = sumProvidentFund(transactions);

  const initInv = getInitialInvestmentBreakdown().total;
  const initLiq = INITIAL_LIQUID_BALANCE;

  const investmentBalance = initInv + trackedInvestment;
  const trackedLiquid = totalIncome - totalSpends - trackedInvestment;
  const liquidBalance = initLiq + trackedLiquid;
  const netWorth = investmentBalance + liquidBalance;
  const savingsRate = pct(trackedInvestment + trackedLiquid, totalIncome);

  const incomeMinusSpends = totalIncome - totalSpends;
  const startingNetWorth = initInv + initLiq;
  const growthSinceStart = netWorth - startingNetWorth;
  const growthSinceStartPct = pct(
    growthSinceStart,
    Math.abs(startingNetWorth) || 1
  );

  const monthly = buildMonthlyKPIs(transactions);
  const monthsTracked = monthly.length;
  const avgMonthlySavings = monthsTracked
    ? (trackedInvestment + trackedLiquid) / monthsTracked
    : 0;

  const thisMonth = currentMonthKey();
  const monthTx = transactions.filter((t) => monthKey(t.date) === thisMonth);
  const currentMonthIncome = monthTx
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const currentMonthExpense = monthTx
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const currentMonthInvestment = monthTx
    .filter(isCountedInvestment)
    .reduce((sum, t) => sum + t.amount, 0);
  const currentMonthLiquid =
    currentMonthIncome - currentMonthExpense - currentMonthInvestment;
  const currentMonthSavingsPct = pct(
    currentMonthInvestment + currentMonthLiquid,
    currentMonthIncome
  );

  return {
    netWorth,
    totalIncome,
    totalSpends,
    savingsRate,
    liquidBalance,
    investmentBalance,
    providentFundBalance,
    currentMonthIncome,
    currentMonthExpense,
    currentMonthInvestment,
    currentMonthSavingsPct,
    currentMonthLiquid,
    incomeMinusSpends,
    growthSinceStart,
    growthSinceStartPct,
    avgMonthlySavings,
    monthsTracked,
    investmentBreakup: buildInvestmentBreakup(transactions),
  };
}

export const EMPTY_METRICS: FinancialMetrics = {
  netWorth: 0,
  totalIncome: 0,
  totalSpends: 0,
  savingsRate: 0,
  liquidBalance: 0,
  investmentBalance: 0,
  providentFundBalance: 0,
  currentMonthIncome: 0,
  currentMonthExpense: 0,
  currentMonthInvestment: 0,
  currentMonthSavingsPct: 0,
  currentMonthLiquid: 0,
  incomeMinusSpends: 0,
  growthSinceStart: 0,
  growthSinceStartPct: 0,
  avgMonthlySavings: 0,
  monthsTracked: 0,
  investmentBreakup: {},
};

export { isProvidentFund, isCountedInvestment };
