import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { CURRENCY } from '../../config';
import type { MonthlyKPI, Transaction } from '../../domain/types';

/** Width (px) the dashboard is laid out at for the screenshot = desktop view. */
const DESKTOP_WIDTH = 1280;
/** Max canvas edge that mobile WebViews can reliably allocate. */
const MAX_CANVAS_EDGE = 16000;

export interface ExportRow {
  name: string;
  total: number;
  count?: number;
  share: number;
}

export interface ExportPayload {
  /** Root element of the dashboard (the scrolling container). */
  root: HTMLElement;
  masked: boolean;
  scopeLabel: string;
  trendRangeLabel: string;
  generatedAt: Date;
  metrics: Array<{ label: string; value: string }>;
  monthly: MonthlyKPI[];
  expenses: { rows: ExportRow[]; total: number };
  income: { rows: ExportRow[]; total: number };
  investments: { rows: ExportRow[]; total: number };
  transactions: Transaction[];
}

/* ── helpers ──────────────────────────────────────────────────────────── */

/** jsPDF's built-in fonts have no ₹ glyph, so tables use "Rs." instead. */
function money(n: number, masked: boolean): string {
  if (masked) return '****';
  const rounded = Math.round(n * 100) / 100;
  const abs = Math.abs(rounded);
  const body = Number.isInteger(abs)
    ? abs.toLocaleString(CURRENCY.locale)
    : abs.toLocaleString(CURRENCY.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${rounded < 0 ? '-' : ''}Rs. ${body}`;
}

function percent(n: number): string {
  return `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;
}

/** Plain text only (jsPDF built-in fonts): strip anything outside Latin-1. */
function clean(text: string | undefined): string {
  return (text ?? '').replace(/[^\u0020-\u00FF]/g, '').trim();
}

const SVG_STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'font-size',
  'font-family',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'letter-spacing',
];

/**
 * html2canvas draws inline <svg> by serialising it to a standalone image, which
 * loses Tailwind classes and CSS variables. Bake the computed styles inline first.
 */
function inlineSvgStyles(doc: Document): void {
  const view = doc.defaultView;
  if (!view) return;
  doc.querySelectorAll('svg, svg *').forEach((node) => {
    if (!(node instanceof SVGElement)) return;
    const cs = view.getComputedStyle(node);
    for (const prop of SVG_STYLE_PROPS) {
      const value = cs.getPropertyValue(prop);
      if (value) node.style.setProperty(prop, value);
    }
  });
}

async function renderDesktopCanvas(root: HTMLElement): Promise<HTMLCanvasElement> {
  const bg = getComputedStyle(root).backgroundColor || '#ffffff';
  const estimatedHeight = Math.max(root.scrollHeight, 2000) * (DESKTOP_WIDTH / Math.max(window.innerWidth, 320));
  const scale = Math.min(1.5, MAX_CANVAS_EDGE / estimatedHeight);

  return html2canvas(root, {
    backgroundColor: bg,
    scale: Math.max(0.5, scale),
    useCORS: true,
    logging: false,
    windowWidth: DESKTOP_WIDTH,
    width: DESKTOP_WIDTH,
    onclone: (clonedDoc) => {
      const el = clonedDoc.querySelector<HTMLElement>('[data-export-root]');
      if (el) {
        // Un-fix the full-screen overlay so the whole page flows at desktop width.
        el.style.position = 'absolute';
        el.style.inset = 'auto';
        el.style.top = '0';
        el.style.left = '0';
        el.style.width = `${DESKTOP_WIDTH}px`;
        el.style.height = 'auto';
        el.style.overflow = 'visible';
        el.style.paddingBottom = '24px';
      }
      clonedDoc.querySelectorAll<HTMLElement>('[data-export-hide]').forEach((n) => {
        n.style.display = 'none';
      });
      clonedDoc.querySelectorAll<HTMLElement>('header').forEach((h) => {
        h.style.position = 'static';
        h.style.paddingTop = '0';
      });
      inlineSvgStyles(clonedDoc);
    },
  });
}

/* ── PDF building ─────────────────────────────────────────────────────── */

function addScreenshotPages(pdf: jsPDF, canvas: HTMLCanvasElement): void {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const drawW = pageW - margin * 2;
  const drawH = pageH - margin * 2;

  // Source pixels per PDF point, and how many source rows fit on one page.
  const pxPerPt = canvas.width / drawW;
  const sliceH = Math.floor(drawH * pxPerPt);

  let y = 0;
  let first = true;
  while (y < canvas.height) {
    const h = Math.min(sliceH, canvas.height - y);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = h;
    const ctx = slice.getContext('2d');
    if (!ctx) break;
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (!first) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, drawW, h / pxPerPt);
    first = false;
    y += h;
  }
}

function buildTablesPdf(pdf: jsPDF, p: ExportPayload): void {
  const margin = 28;
  const head = { fillColor: [55, 65, 81] as [number, number, number], textColor: 255, fontSize: 8 };
  const base = {
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: head,
    theme: 'grid' as const,
  };
  const right = { halign: 'right' as const };

  const nextY = () => ((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0) + 18;
  const title = (text: string, y: number) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(20);
    pdf.text(text, margin, y);
  };

  // Page: filters + KPIs
  pdf.addPage();
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(20);
  pdf.text('Super Dashboard - Data Export', margin, 40);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(90);
  pdf.text(
    'Tables below contain exactly the data behind the dashboard for the selected filters.',
    margin,
    55
  );

  title('Selected filters', 78);
  autoTable(pdf, {
    ...base,
    startY: 84,
    head: [['Filter', 'Value']],
    body: [
      ['Scope', p.scopeLabel],
      ['Trend range', p.trendRangeLabel],
      ['Generated', p.generatedAt.toLocaleString()],
      ['Currency', `${CURRENCY.symbol === '₹' ? 'INR (Rs.)' : CURRENCY.symbol}`],
      ['Values', p.masked ? 'MASKED (hidden in app at export time)' : 'Visible'],
      ['Transactions in scope', String(p.transactions.length)],
    ],
  });

  title('Key financial metrics', nextY());
  autoTable(pdf, {
    ...base,
    startY: nextY() + 6,
    head: [['Metric', 'Value']],
    body: p.metrics.map((m) => [m.label, m.value]),
    columnStyles: { 1: right },
  });

  // Monthly trend
  pdf.addPage();
  title(`Monthly trend (${p.monthly.length} months, ${p.trendRangeLabel})`, 40);
  autoTable(pdf, {
    ...base,
    startY: 46,
    head: [[
      'Month',
      'Income',
      'Spends',
      'Investment',
      'Income - Spends',
      'Liquid savings',
      'Closing liquid',
      'Invest %',
      'Liquid %',
      'Total savings %',
    ]],
    body: p.monthly.map((m) => [
      m.label,
      money(m.income, p.masked),
      money(m.spends, p.masked),
      money(m.investment, p.masked),
      money(m.incomeMinusSpends, p.masked),
      money(m.liquidSavings, p.masked),
      money(m.closingLiquid, p.masked),
      percent(m.investmentPct),
      percent(m.liquidSavingsPct),
      percent(m.totalSavingsPct),
    ]),
    columnStyles: Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [i + 1, right])
    ),
  });

  // Breakdown tables
  let cursorY = 40;
  const breakdown = (label: string, data: { rows: ExportRow[]; total: number }, withCount: boolean) => {
    if (cursorY > 440) {
      pdf.addPage();
      cursorY = 40;
    }
    title(`${label} (${p.scopeLabel})`, cursorY);
    const cols = withCount ? ['Category', 'Entries', 'Amount', 'Share'] : ['Category', 'Amount', 'Share'];
    const body = data.rows.map((r) =>
      withCount
        ? [clean(r.name), String(r.count ?? 0), money(r.total, p.masked), percent(r.share)]
        : [clean(r.name), money(r.total, p.masked), percent(r.share)]
    );
    body.push(
      withCount
        ? ['TOTAL', String(data.rows.reduce((s, r) => s + (r.count ?? 0), 0)), money(data.total, p.masked), '100.0%']
        : ['TOTAL', money(data.total, p.masked), '100.0%']
    );
    autoTable(pdf, {
      ...base,
      startY: cursorY + 6,
      head: [cols],
      body: data.rows.length ? body : [[`No data for ${p.scopeLabel}`]],
      columnStyles: withCount ? { 1: right, 2: right, 3: right } : { 1: right, 2: right },
    });
    cursorY = nextY();
  };
  pdf.addPage();
  breakdown('Expenses by category', p.expenses, true);
  breakdown('Income by source', p.income, true);
  breakdown('Investment allocation', p.investments, false);

  // Transactions
  pdf.addPage();
  title(`Transactions in scope - ${p.scopeLabel} (${p.transactions.length})`, 40);
  const sorted = [...p.transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  autoTable(pdf, {
    ...base,
    startY: 46,
    head: [['Date', 'Type', 'Category', 'Investment type', 'Amount', 'Comment']],
    body: sorted.length
      ? sorted.map((t) => [
          t.date,
          t.type,
          clean(t.category),
          clean(t.investmentType),
          money(t.amount, p.masked),
          clean(t.comment),
        ])
      : [['No transactions for the selected scope']],
    columnStyles: { 4: right, 5: { cellWidth: 220 } },
  });

  // Footer on every table page (pages after the screenshot pages are numbered globally)
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(130);
    pdf.text(
      `Muffin - Super Dashboard export - ${p.scopeLabel} - page ${i}/${total}`,
      margin,
      pdf.internal.pageSize.getHeight() - 12
    );
  }
}

/* ── delivery ─────────────────────────────────────────────────────────── */

async function deliverPdf(pdf: jsPDF, filename: string): Promise<void> {
  const blob = pdf.output('blob');

  // Native Android app: write to cache and open the share sheet (save / send to AI app).
  if (Capacitor.isNativePlatform()) {
    try {
      const dataUri = pdf.output('datauristring');
      const base64 = dataUri.slice(dataUri.indexOf('base64,') + 7);
      const written = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({ title: filename, files: [written.uri], dialogTitle: 'Save or share PDF' });
      return;
    } catch (err) {
      console.warn('[export] Native share failed, falling back to download:', err);
    }
  }

  // PWA / browser: Web Share with files where supported (mobile), else a normal download.
  const file = new File([blob], filename, { type: 'application/pdf' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename });
      return;
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/* ── public API ───────────────────────────────────────────────────────── */

export async function exportDashboardPdf(payload: ExportPayload): Promise<void> {
  const canvas = await renderDesktopCanvas(payload.root);

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  addScreenshotPages(pdf, canvas);
  buildTablesPdf(pdf, payload);

  const stamp = payload.generatedAt.toISOString().slice(0, 10);
  const scopeSlug = payload.scopeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await deliverPdf(pdf, `muffin-dashboard-${scopeSlug}-${stamp}.pdf`);
}
