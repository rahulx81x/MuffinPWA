export type TransactionType = 'income' | 'expense' | 'investment';
export type AppTab = 'home' | 'planner' | 'ledger' | 'monthly';

export type MetricKey =
  | 'currentMonthIncome'
  | 'currentMonthExpense'
  | 'currentMonthInvestment'
  | 'currentMonthSavingsPct'
  | 'currentMonthLiquid'
  | 'totalLiquid'
  | 'totalInvestment'
  | 'investmentBreakup'
  | 'providentFund'
  | 'netWorth'
  | 'totalIncome'
  | 'totalSpends'
  | 'incomeMinusSpends'
  | 'growthSinceStart'
  | 'growthSinceStartPct'
  | 'avgMonthlySavings'
  | 'monthsTracked';

export type KpiModalKind = 'list' | 'pie' | 'line';

export type KpiIconHint = 'list' | 'chart';

export type SheetTabName = 'Income' | 'Expense' | 'Investment';

export interface Transaction {
  id: string;
  date: string;
  category: string;
  type: TransactionType;
  amount: number;
  comment: string;
  investmentType?: string;
  /** Present for sheet-backed rows; omitted for local planner entries. */
  tabName?: SheetTabName;
  rowIndex?: number;
}

export interface FinancialMetrics {
  netWorth: number;
  totalIncome: number;
  totalSpends: number;
  savingsRate: number;
  liquidBalance: number;
  investmentBalance: number;
  /** Cumulative Provident Fund contributions — display only, not in net worth. */
  providentFundBalance: number;
  currentMonthIncome: number;
  currentMonthExpense: number;
  currentMonthInvestment: number;
  currentMonthSavingsPct: number;
  currentMonthLiquid: number;
  incomeMinusSpends: number;
  growthSinceStart: number;
  growthSinceStartPct: number;
  avgMonthlySavings: number;
  monthsTracked: number;
  investmentBreakup: Record<string, number>;
}

export interface MonthlyKPI {
  key: string;
  label: string;
  income: number;
  spends: number;
  investment: number;
  incomeMinusSpends: number;
  liquidSavings: number;
  closingLiquid: number;
  investmentPct: number;
  liquidSavingsPct: number;
  totalSavingsPct: number;
  expensesByCategory: Record<string, number>;
}

export interface NewTransactionInput {
  date: string;
  category: string;
  type: TransactionType;
  amount: number;
  comment: string;
  investmentType?: string;
}

export type SheetRowData = {
  Date: string;
  Category: string;
  Amount: number | string;
  Comment?: string;
  'Investment Type'?: string;
};
