export const INITIAL_INVESTMENT = 171000;
export const INITIAL_REGULAR_DEPOSITS = 36000;
export const INITIAL_FIXED_DEPOSITS = 80000;
export const INITIAL_MUTUAL_FUNDS = 55000;
export const INITIAL_LIQUID_BALANCE = 54957;

export const CURRENCY = {
  symbol: '₹',
  locale: 'en-IN',
} as const;

export function formatCurrency(amount: number): string {
  return CURRENCY.symbol + Math.round(amount).toLocaleString(CURRENCY.locale);
}

export function formatSignedCurrency(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${formatCurrency(amount)}`;
}

export interface InitialInvestmentBreakdown {
  regular: number;
  fixed: number;
  mutual: number;
  total: number;
}

export function getInitialInvestmentBreakdown(): InitialInvestmentBreakdown {
  const regular = Number(INITIAL_REGULAR_DEPOSITS);
  const fixed = Number(INITIAL_FIXED_DEPOSITS);
  const mutual = Number(INITIAL_MUTUAL_FUNDS);
  const legacy = Number(INITIAL_INVESTMENT);
  const hasSpecificValues = [regular, fixed, mutual].some((value) => value > 0);

  return {
    regular: hasSpecificValues ? regular : legacy || 0,
    fixed: hasSpecificValues ? fixed : 0,
    mutual: hasSpecificValues ? mutual : 0,
    total: hasSpecificValues ? regular + fixed + mutual : legacy,
  };
}

export function getInitialInvestmentTotal(): number {
  return getInitialInvestmentBreakdown().total;
}
