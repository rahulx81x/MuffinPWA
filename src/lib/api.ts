import type { SheetRowData, SheetTabName, Transaction } from '../types';

const ENDPOINT = '/.netlify/functions/transactions';

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) return data.error;
  } catch {
    // ignore JSON parse errors
  }
  return `Request failed (${response.status})`;
}

export async function getTransactions(): Promise<Transaction[]> {
  const response = await fetch(ENDPOINT);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as Transaction[];
}

export async function createTransaction(
  tabName: SheetTabName,
  rowData: SheetRowData
): Promise<void> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tabName, rowData }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function updateTransaction(
  tabName: SheetTabName,
  rowIndex: number,
  rowData: SheetRowData
): Promise<void> {
  const response = await fetch(ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tabName, rowIndex, rowData }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function deleteTransaction(
  tabName: SheetTabName,
  rowIndex: number
): Promise<void> {
  const response = await fetch(ENDPOINT, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tabName, rowIndex }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}
