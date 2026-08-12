/** Sheet date parsing shared by the transactions function. */

export function parseSheetDate(raw: unknown): Date {
  if (raw === null || raw === undefined || raw === '') return new Date(NaN);

  if (
    typeof raw === 'number' ||
    (typeof raw === 'string' && /^\d{5}(\.\d+)?$/.test(raw.trim()))
  ) {
    const num = Number(raw);
    const sheetsEpoch = new Date(Date.UTC(1899, 11, 30));
    const millis = sheetsEpoch.getTime() + num * 86400000;
    return new Date(millis);
  }

  const str = String(raw).trim();

  let m = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) {
    return new Date(
      parseInt(m[1], 10),
      parseInt(m[2], 10) - 1,
      parseInt(m[3], 10)
    );
  }

  const parsedTs = Date.parse(str);
  if (!Number.isNaN(parsedTs)) {
    const d = new Date(parsedTs);
    if (!Number.isNaN(d.getTime())) return d;
  }

  m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const first = parseInt(m[1], 10);
    const second = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);

    if (first > 12) {
      return new Date(year, second - 1, first);
    }
    if (second > 12) {
      return new Date(year, first - 1, second);
    }
    return new Date(year, second - 1, first);
  }

  return new Date(str);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
