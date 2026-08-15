export type {
  ExpectedRow,
  RecipeConfig,
  RecipeInvestment,
  SheetRowData,
  SheetTabName,
  Transaction,
  TransactionType,
} from '@shared';

export type AppTab = 'home' | 'ledger' | 'insights' | 'settings';

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
  avgMonthlySavingsPct: number;
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
  type: import('@shared').TransactionType;
  amount: number;
  comment: string;
  investmentType?: string;
}
