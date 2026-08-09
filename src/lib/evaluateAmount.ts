/**
 * Safely evaluate a simple arithmetic expression for amount fields.
 * Supports + - * / ^, parentheses, unary minus, and BODMAS precedence.
 * Does not use eval.
 */

export type EvaluateAmountResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

const MAX_EXPRESSION_LENGTH = 120;

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function normalizeInput(raw: string): string {
  return raw
    .trim()
    .replace(/,/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\s+/g, '');
}

/**
 * Returns true when the string looks like a formula (operators / parens),
 * not a plain numeric literal.
 */
export function looksLikeAmountExpression(raw: string): boolean {
  const s = normalizeInput(raw);
  if (!s) return false;
  // Plain number: optional leading -, digits, optional decimal
  return !/^-?\d+(\.\d+)?$/.test(s);
}

export function evaluateAmountExpression(raw: string): EvaluateAmountResult {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'Enter an amount.' };
  }
  if (raw.length > MAX_EXPRESSION_LENGTH) {
    return { ok: false, error: 'Amount expression is too long.' };
  }

  const input = normalizeInput(raw);
  if (!input) {
    return { ok: false, error: 'Enter an amount.' };
  }

  let i = 0;

  function peek(): string {
    return input[i] ?? '';
  }

  function consume(): string {
    return input[i++] ?? '';
  }

  function parseNumber(): number | null {
    const start = i;
    while (isDigit(peek())) consume();
    if (peek() === '.') {
      consume();
      if (!isDigit(peek())) return null;
      while (isDigit(peek())) consume();
    }
    if (i === start) return null;
    const n = Number(input.slice(start, i));
    return Number.isFinite(n) ? n : null;
  }

  // factor → number | '(' expr ')' | unary '-' factor | unary '+' factor
  function parseFactor(): number | null {
    const ch = peek();
    if (ch === '+' || ch === '-') {
      consume();
      const v = parseFactor();
      if (v === null) return null;
      return ch === '-' ? -v : v;
    }
    if (ch === '(') {
      consume();
      const v = parseExpr();
      if (v === null || peek() !== ')') return null;
      consume();
      return v;
    }
    return parseNumber();
  }

  // power → factor ('^' factor)*  (right-associative)
  function parsePower(): number | null {
    const base = parseFactor();
    if (base === null) return null;
    if (peek() !== '^') return base;
    consume();
    const exp = parsePower();
    if (exp === null) return null;
    const result = base ** exp;
    return Number.isFinite(result) ? result : null;
  }

  // term → power (('*' | '/') power)*
  function parseTerm(): number | null {
    let value = parsePower();
    if (value === null) return null;
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const rhs = parsePower();
      if (rhs === null) return null;
      if (op === '*') {
        value *= rhs;
      } else {
        if (rhs === 0) return null;
        value /= rhs;
      }
      if (!Number.isFinite(value)) return null;
    }
    return value;
  }

  // expr → term (('+' | '-') term)*
  function parseExpr(): number | null {
    let value = parseTerm();
    if (value === null) return null;
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const rhs = parseTerm();
      if (rhs === null) return null;
      value = op === '+' ? value + rhs : value - rhs;
      if (!Number.isFinite(value)) return null;
    }
    return value;
  }

  const value = parseExpr();
  if (value === null || i !== input.length) {
    return { ok: false, error: 'Invalid amount expression.' };
  }

  // Money-friendly rounding (2 decimal places)
  const rounded = Math.round(value * 100) / 100;
  if (!Number.isFinite(rounded)) {
    return { ok: false, error: 'Invalid amount expression.' };
  }

  return { ok: true, value: rounded };
}
