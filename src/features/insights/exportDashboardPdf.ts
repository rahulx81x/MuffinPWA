import html2canvas from 'html2canvas-pro';
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

/**
 * Give every chart SVG explicit pixel dimensions at desktop width. Without this the
 * serialised SVG keeps its mobile size and only fills a third of the card. Wide charts
 * are scaled up to the card width (height follows the viewBox ratio, capped).
 */
function sizeSvgsForDesktop(doc: Document): void {
  doc.querySelectorAll<SVGSVGElement>('svg[viewBox]').forEach((svg) => {
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    if (!rect.width || !vb || !vb.width) return;
    const w = rect.width;
    let h = rect.height;
    if (svg.classList.contains('w-full')) {
      h = Math.min((w * vb.height) / vb.width, 340);
    }
    svg.setAttribute('width', String(Math.round(w)));
    svg.setAttribute('height', String(Math.round(h)));
    svg.style.width = `${Math.round(w)}px`;
    svg.style.height = `${Math.round(h)}px`;
  });
}

interface SectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CapturedDashboard {
  canvas: HTMLCanvasElement;
  /** Canvas pixels per CSS pixel. */
  scale: number;
  /** Each entry is one PDF page: a list of sections stacked top to bottom. */
  pages: SectionRect[][];
}

async function renderDesktopCanvas(root: HTMLElement): Promise<CapturedDashboard> {
  const bg = getComputedStyle(root).backgroundColor || '#ffffff';
  const estimatedHeight = Math.max(root.scrollHeight, 2000) * (DESKTOP_WIDTH / Math.max(window.innerWidth, 320));
  const maxScale = Capacitor.isNativePlatform() ? 1 : 1.5;
  const scale = Math.max(0.5, Math.min(maxScale, MAX_CANVAS_EDGE / estimatedHeight));
  const pages: SectionRect[][] = [];

  const canvas = await html2canvas(root, {
    backgroundColor: bg,
    scale,
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
      // KPI cards use translucent backgrounds + backdrop blur, which flatten to grey in the capture.
      clonedDoc.querySelectorAll<HTMLElement>('[data-export-kpi]').forEach((n) => {
        n.style.background = 'var(--color-surface)';
        n.style.backdropFilter = 'none';
      });
      sizeSvgsForDesktop(clonedDoc);
      inlineSvgStyles(clonedDoc);

      // Measure sections AFTER all sizing tweaks so the rects match what gets drawn.
      const origin = el?.getBoundingClientRect() ?? { left: 0, top: 0 };
      const measure = (n: Element | null): SectionRect | null => {
        if (!n) return null;
        const r = n.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
      };

      // Page 1: header (title + filters) stacked above the KPI overview.
      const intro = [measure(clonedDoc.querySelector('header')), measure(clonedDoc.querySelector('[data-export-kpis]'))]
        .filter((r): r is SectionRect => r !== null);
      if (intro.length) pages.push(intro);

      // One chart per page.
      clonedDoc.querySelectorAll('[data-export-chart]').forEach((n) => {
        const r = measure(n);
        if (r) pages.push([r]);
      });
    },
  });

  return { canvas, scale, pages };
}

/* ── PDF building ─────────────────────────────────────────────────────── */

function addScreenshotPages(pdf: jsPDF, cap: CapturedDashboard): void {
  const { canvas, scale, pages } = cap;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const drawW = pageW - margin * 2;
  const drawH = pageH - margin * 2;
  const gap = 16; // vertical gap (pt) between stacked sections on one page
  const pad = 6; // CSS px of breathing room so card borders/shadows aren't clipped

  const crop = (r: SectionRect) => {
    const sx = Math.max(0, Math.floor((r.x - pad) * scale));
    const sy = Math.max(0, Math.floor((r.y - pad) * scale));
    const sw = Math.min(canvas.width - sx, Math.ceil((r.w + pad * 2) * scale));
    const sh = Math.min(canvas.height - sy, Math.ceil((r.h + pad * 2) * scale));
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    c.getContext('2d')?.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    return { c, w: sw, h: sh };
  };

  pages.forEach((sections, i) => {
    const crops = sections.map(crop).filter((x) => x.w > 0 && x.h > 0);
    if (!crops.length) return;

    // Fit the whole stack inside the page (contain): scales by width OR height, whichever is tighter,
    // so nothing is ever cut off.
    const maxW = Math.max(...crops.map((x) => x.w));
    const totalH = crops.reduce((sum, x) => sum + x.h, 0);
    const gaps = gap * (crops.length - 1);
    const k = Math.min(drawW / maxW, (drawH - gaps) / totalH);

    if (i > 0) pdf.addPage();
    let y = margin;
    for (const { c, w, h } of crops) {
      const dw = w * k;
      const dh = h * k;
      pdf.addImage(c.toDataURL('image/jpeg', Capacitor.isNativePlatform() ? 0.8 : 0.92), 'JPEG', margin + (drawW - dw) / 2, y, dw, dh);
      y += dh + gap;
    }
  });
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
  // Native Android/iOS app: write to cache and open the share sheet (save / send to AI app).
  // No fallback to the browser path here: WebViews silently ignore blob downloads, so any
  // failure must surface to the UI instead of "doing nothing".
  if (Capacitor.isNativePlatform()) {
    const dataUri = pdf.output('datauristring');
    const base64 = dataUri.slice(dataUri.indexOf('base64,') + 7);

    let uri: string;
    try {
      const written = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });
      uri = written.uri;
    } catch (err) {
      throw new Error(`Could not write PDF file: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      await Share.share({ title: filename, files: [uri], dialogTitle: 'Save or share PDF' });
    } catch (err) {
      // Closing the share sheet without choosing an app is not an error.
      const msg = err instanceof Error ? err.message : String(err);
      if (/cancel|dismiss/i.test(msg)) return;
      throw new Error(`Could not open share sheet: ${msg}`);
    }
    return;
  }

  // PWA / browser: Web Share with files where supported (mobile), else a normal download.
  const blob = pdf.output('blob');
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
  const captured = await renderDesktopCanvas(payload.root);

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  addScreenshotPages(pdf, captured);
  buildTablesPdf(pdf, payload);

  const stamp = payload.generatedAt.toISOString().slice(0, 10);
  const scopeSlug = payload.scopeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await deliverPdf(pdf, `muffin-dashboard-${scopeSlug}-${stamp}.pdf`);
}
