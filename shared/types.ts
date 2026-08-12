/** Shared domain types used by the React app and Netlify functions. */

export type TransactionType = 'income' | 'expense' | 'investment';

export type SheetTabName = 'Income' | 'Expense' | 'Investment';

export type SheetRowData = {
  Id?: string;
  Date: string;
  Category: string;
  Amount: number | string;
  Comment?: string;
  'Investment Type'?: string;
};

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
  /** Stable sheet Id column value when present. */
  rowId?: string;
}

export interface RecipeInvestment {
  id: string;
  type: string;
  amount: number;
}

export interface RecipeConfig {
  openingBalance: number;
  investments: RecipeInvestment[];
}

export interface ExpectedRow {
  date?: string;
  category?: string;
  amount?: number | string;
}
