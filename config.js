// ============================================================
// CONFIG — edit this file to point the app at your own data
// ============================================================

// The Google Sheet URL is now kept confidential on the Netlify server.
// Set SECRET_GOOGLE_SHEETS_URL in your Netlify site environment variables.
const SHEET_CSV_URL = '';

// Add your starting balances here (before tracking started)
const INITIAL_INVESTMENT = 171000;      // legacy single-bucket fallback
const INITIAL_REGULAR_DEPOSITS = 36000;     // e.g., 50000
const INITIAL_FIXED_DEPOSITS = 80000;       // e.g., 75000
const INITIAL_MUTUAL_FUNDS = 55000;         // e.g., 46000
const INITIAL_LIQUID_BALANCE = 54957;  // e.g., 50000

// Currency formatting (Indian Rupee, lakh/crore grouping)
const CURRENCY = {
  symbol: "₹",
  locale: "en-IN",
};

function formatCurrency(amount) {
  return CURRENCY.symbol + Math.round(amount).toLocaleString(CURRENCY.locale);
}
