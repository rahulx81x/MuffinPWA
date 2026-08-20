/**
 * Build a professional Muffin showcase PowerPoint from captured screenshots.
 *
 * Usage: node scripts/build-showcase-ppt.mjs
 */
import PptxGenJS from 'pptxgenjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCREEN_DIR = path.join(ROOT, 'docs', 'showcase', 'screens');
const OUT_FILE = path.join(ROOT, 'docs', 'showcase', 'Muffin_Showcase.pptx');

const COLORS = {
  cream: 'FAF5EF',
  oat: 'F3E8DC',
  espresso: '3D2314',
  cinnamon: '7C5A43',
  gold: 'D97706',
  amber: 'F59E0B',
  chocolate: '1C130D',
  white: 'FFFFFF',
  border: 'E5D3B3',
  muted: '8C6D53',
};

const THEMES = [
  { name: 'Classic', bg: 'FAF5EF', accent: 'D97706' },
  { name: 'Blueberry', bg: 'F5F6FA', accent: '4F46E5' },
  { name: 'Pistachio', bg: 'F6F8F3', accent: '65A30D' },
  { name: 'Chocolate', bg: '1C130D', accent: 'F59E0B' },
  { name: 'Velvet', bg: '1A0C0E', accent: 'E11D48' },
  { name: 'Midnight', bg: '0B1120', accent: '3B82F6' },
];

function screen(name) {
  return path.join(SCREEN_DIR, name);
}

async function mustExist(file) {
  try {
    await fs.access(file);
  } catch {
    throw new Error(`Missing screenshot: ${file}`);
  }
}

/** Phone frame around a screenshot. Units are inches on a 13.33×7.5 widescreen slide. */
function addPhoneShot(slide, imgPath, opts = {}) {
  const {
    x = 0.55,
    y = 0.55,
    h = 6.4,
    label = null,
  } = opts;
  // A55 ratio 19.5:9 ≈ 2.166 → width = h / 2.166
  const w = h / (2340 / 1080);
  const pad = 0.06;
  const radius = 0.18;

  slide.addShape('roundRect', {
    x: x - pad,
    y: y - pad,
    w: w + pad * 2,
    h: h + pad * 2,
    fill: { color: COLORS.chocolate },
    shadow: {
      type: 'outer',
      color: '3D2314',
      blur: 18,
      offset: 4,
      opacity: 0.22,
    },
    rectRadius: radius,
  });

  slide.addImage({
    path: imgPath,
    x,
    y,
    w,
    h,
    rounding: radius * 0.7,
  });

  if (label) {
    slide.addText(label, {
      x,
      y: y + h + 0.12,
      w,
      h: 0.28,
      fontSize: 11,
      fontFace: 'Calibri',
      color: COLORS.muted,
      align: 'center',
    });
  }

  return { x, y, w, h };
}

function addAccentBar(slide) {
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.08,
    fill: { color: COLORS.gold },
  });
}

function addFooter(slide, page, total = 12) {
  slide.addText('Muffin  ·  Cozy finance PWA', {
    x: 0.5,
    y: 7.15,
    w: 8,
    h: 0.25,
    fontSize: 10,
    fontFace: 'Calibri',
    color: COLORS.muted,
  });
  slide.addText(`${page} / ${total}`, {
    x: 11.5,
    y: 7.15,
    w: 1.3,
    h: 0.25,
    fontSize: 10,
    fontFace: 'Calibri',
    color: COLORS.muted,
    align: 'right',
  });
}

function sectionTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.55,
    y: 0.35,
    w: 12.2,
    h: 0.45,
    fontSize: 28,
    fontFace: 'Calibri',
    bold: true,
    color: COLORS.espresso,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.55,
      y: 0.8,
      w: 12.2,
      h: 0.35,
      fontSize: 14,
      fontFace: 'Calibri',
      color: COLORS.cinnamon,
    });
  }
}

async function main() {
  const required = [
    '01-home.png',
    '02-home-more.png',
    '03-chart-sheet.png',
    '04-theme-menu.png',
    '05-theme-velvet.png',
    '06-planner.png',
    '07-ledger.png',
    '08-monthly.png',
    '09-add-modal.png',
    '10-about.png',
  ];
  for (const f of required) await mustExist(screen(f));

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDESCREEN', width: 13.333, height: 7.5 });
  pptx.layout = 'WIDESCREEN';
  pptx.author = 'Rahul Gouri';
  pptx.title = 'Muffin — Cozy Finance PWA Showcase';
  pptx.subject = 'Product showcase (amounts masked)';

  // —— 1. Title ——
  {
    const s = pptx.addSlide();
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: COLORS.cream },
    });
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 0.22,
      h: 7.5,
      fill: { color: COLORS.gold },
    });
    s.addText('Muffin', {
      x: 0.8,
      y: 1.6,
      w: 6.5,
      h: 0.9,
      fontSize: 54,
      fontFace: 'Calibri',
      bold: true,
      color: COLORS.espresso,
    });
    s.addText('Bake your money muffins.', {
      x: 0.8,
      y: 2.5,
      w: 6.5,
      h: 0.45,
      fontSize: 22,
      fontFace: 'Calibri',
      color: COLORS.gold,
    });
    s.addText(
      'A cozy personal finance PWA that turns your Google Sheet into a live phone dashboard — income, expenses, investments, PF, and net worth.',
      {
        x: 0.8,
        y: 3.15,
        w: 6.2,
        h: 1.2,
        fontSize: 15,
        fontFace: 'Calibri',
        color: COLORS.cinnamon,
      }
    );
    s.addText('Product showcase  ·  Amounts masked  ·  Galaxy A55 frames', {
      x: 0.8,
      y: 6.6,
      w: 6.5,
      h: 0.3,
      fontSize: 12,
      fontFace: 'Calibri',
      color: COLORS.muted,
    });
    addPhoneShot(s, screen('01-home.png'), { x: 8.55, y: 0.45, h: 6.5 });
  }

  // —— 2. Problem / promise ——
  {
    const s = pptx.addSlide();
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: COLORS.cream },
    });
    addAccentBar(s);
    sectionTitle(s, 'From spreadsheet to pocket', 'Keep the ledger you trust — enjoy the dashboard you deserve.');
    const cards = [
      {
        t: 'You already track in Sheets',
        d: 'Income, Expense, and Investment tabs stay human-editable.',
      },
      {
        t: 'Muffin reads & writes live',
        d: 'OAuth-backed Netlify Functions sync securely — credentials never hit the browser.',
      },
      {
        t: 'Phone-first clarity',
        d: 'KPIs, charts, ledger manage, planner scenarios, and six cozy themes.',
      },
    ];
    cards.forEach((c, i) => {
      const x = 0.55 + i * 4.15;
      s.addShape('roundRect', {
        x,
        y: 1.6,
        w: 3.9,
        h: 4.5,
        fill: { color: COLORS.oat },
        rectRadius: 0.15,
        shadow: {
          type: 'outer',
          color: '3D2314',
          blur: 12,
          offset: 3,
          opacity: 0.1,
        },
      });
      s.addShape('ellipse', {
        x: x + 1.45,
        y: 2.0,
        w: 1.0,
        h: 1.0,
        fill: { color: COLORS.gold },
      });
      s.addText(String(i + 1), {
        x: x + 1.45,
        y: 2.2,
        w: 1.0,
        h: 0.6,
        fontSize: 24,
        bold: true,
        color: COLORS.white,
        align: 'center',
        fontFace: 'Calibri',
      });
      s.addText(c.t, {
        x: x + 0.25,
        y: 3.3,
        w: 3.4,
        h: 0.8,
        fontSize: 18,
        bold: true,
        color: COLORS.espresso,
        align: 'center',
        fontFace: 'Calibri',
      });
      s.addText(c.d, {
        x: x + 0.3,
        y: 4.2,
        w: 3.3,
        h: 1.4,
        fontSize: 13,
        color: COLORS.cinnamon,
        align: 'center',
        fontFace: 'Calibri',
      });
    });
    addFooter(s, 2);
  }

  // —— 3. Home overview ——
  {
    const s = pptx.addSlide();
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: COLORS.cream },
    });
    addAccentBar(s);
    sectionTitle(s, 'Home — your money at a glance', 'Masked amounts for sharing · tap any KPI to drill in.');
    addPhoneShot(s, screen('01-home.png'), { x: 0.7, y: 1.35, h: 5.5, label: 'Home KPIs' });
    addPhoneShot(s, screen('02-home-more.png'), {
      x: 4.55,
      y: 1.35,
      h: 5.5,
      label: 'More Details',
    });
    s.addShape('roundRect', {
      x: 8.5,
      y: 1.5,
      w: 4.3,
      h: 4.8,
      fill: { color: COLORS.oat },
      rectRadius: 0.14,
    });
    s.addText('On Home', {
      x: 8.75,
      y: 1.8,
      w: 3.8,
      h: 0.4,
      fontSize: 18,
      bold: true,
      color: COLORS.espresso,
      fontFace: 'Calibri',
    });
    const bullets = [
      'Current-month income, spends, investments',
      'Investment breakup chips + full pie',
      'Net Worth hero card (theme accent)',
      'Provident Fund under More Details',
      'Growth & savings metrics',
    ];
    s.addText(
      bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
      {
        x: 8.75,
        y: 2.4,
        w: 3.8,
        h: 3.5,
        fontSize: 14,
        color: COLORS.cinnamon,
        fontFace: 'Calibri',
        paraSpacing: 10,
      }
    );
    addFooter(s, 3);
  }

  // —— 4. Drill-downs ——
  {
    const s = pptx.addSlide();
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: COLORS.cream },
    });
    addAccentBar(s);
    sectionTitle(s, 'Drill-downs that feel native', 'Bottom sheets for charts and filtered lists — smooth enter & exit.');
    addPhoneShot(s, screen('03-chart-sheet.png'), { x: 1.2, y: 1.3, h: 5.6 });
    s.addShape('roundRect', {
      x: 6.3,
      y: 1.8,
      w: 6.3,
      h: 4.2,
      fill: { color: COLORS.oat },
      rectRadius: 0.14,
    });
    s.addText('Chart modal kinds', {
      x: 6.6,
      y: 2.15,
      w: 5.7,
      h: 0.4,
      fontSize: 18,
      bold: true,
      color: COLORS.espresso,
      fontFace: 'Calibri',
    });
    s.addText(
      [
        { text: 'Line — net worth, liquid, savings % trajectories', options: { bullet: true, breakLine: true } },
        { text: 'Pie — investment allocation (theme-aware colors)', options: { bullet: true, breakLine: true } },
        { text: 'List — this-month income / expense / investment / PF', options: { bullet: true, breakLine: true } },
        { text: 'Portaled above the nav · dim backdrop · spring motion', options: { bullet: true, breakLine: true } },
      ],
      {
        x: 6.6,
        y: 2.8,
        w: 5.7,
        h: 2.8,
        fontSize: 15,
        color: COLORS.cinnamon,
        fontFace: 'Calibri',
        paraSpacing: 12,
      }
    );
    addFooter(s, 4);
  }

  // —— 5. Themes ——
  {
    const s = pptx.addSlide();
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: COLORS.cream },
    });
    addAccentBar(s);
    sectionTitle(s, 'Six cozy muffin themes', '3 light · 3 dark — persisted, FOUC-safe, charts included.');
    addPhoneShot(s, screen('04-theme-menu.png'), { x: 0.5, y: 1.35, h: 5.5, label: 'Theme picker' });
    addPhoneShot(s, screen('05-theme-velvet.png'), {
      x: 4.2,
      y: 1.35,
      h: 5.5,
      label: 'Red Velvet',
    });

    THEMES.forEach((t, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 8.1 + col * 2.45;
      const y = 1.45 + row * 1.7;
      s.addShape('roundRect', {
        x,
        y,
        w: 2.25,
        h: 1.45,
        fill: { color: t.bg },
        line: { color: COLORS.border, width: 1 },
        rectRadius: 0.12,
      });
      s.addShape('ellipse', {
        x: x + 0.2,
        y: y + 0.95,
        w: 0.32,
        h: 0.32,
        fill: { color: t.accent },
      });
      s.addText(t.name, {
        x: x + 0.15,
        y: y + 0.2,
        w: 1.95,
        h: 0.4,
        fontSize: 13,
        bold: true,
        color: i < 3 ? COLORS.espresso : 'F3E8DC',
        fontFace: 'Calibri',
      });
    });
    addFooter(s, 5);
  }

  // —— 6. Planner ——
  {
    const s = pptx.addSlide();
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: COLORS.cream },
    });
    addAccentBar(s);
    sectionTitle(s, 'Planner — what-if without the sheet', 'Temporary scenarios stay on-device in localStorage.');
    addPhoneShot(s, screen('06-planner.png'), { x: 1.0, y: 1.3, h: 5.6 });
    s.addShape('roundRect', {
      x: 6.0,
      y: 2.0,
      w: 6.6,
      h: 3.8,
      fill: { color: COLORS.oat },
      rectRadius: 0.14,
    });
    s.addText(
      [
        { text: 'Add provisional income, expense, or investment lines', options: { bullet: true, breakLine: true } },
        { text: 'See plan vs sheet for the current month', options: { bullet: true, breakLine: true } },
        { text: 'Never writes back to Google Sheets', options: { bullet: true, breakLine: true } },
        { text: 'Clear when you are done experimenting', options: { bullet: true, breakLine: true } },
      ],
      {
        x: 6.35,
        y: 2.4,
        w: 6.0,
        h: 3.0,
        fontSize: 16,
        color: COLORS.cinnamon,
        fontFace: 'Calibri',
        paraSpacing: 14,
      }
    );
    addFooter(s, 6);
  }

  // —— 7. Ledger ——
  {
    const s = pptx.addSlide();
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: COLORS.cream },
    });
    addAccentBar(s);
    sectionTitle(s, 'Ledger — search, filter, manage', 'Add / edit / delete write straight to your Google Sheet.');
    addPhoneShot(s, screen('07-ledger.png'), { x: 0.8, y: 1.3, h: 5.6 });
    addPhoneShot(s, screen('09-add-modal.png'), {
      x: 5.0,
      y: 1.3,
      h: 5.6,
      label: 'Add / edit modal',
    });
    s.addShape('roundRect', {
      x: 9.2,
      y: 2.0,
      w: 3.6,
      h: 3.6,
      fill: { color: COLORS.oat },
      rectRadius: 0.14,
    });
    s.addText(
      [
        { text: 'Full-text search', options: { bullet: true, breakLine: true } },
        { text: 'Type & date filters', options: { bullet: true, breakLine: true } },
        { text: 'Creatable Investment Type', options: { bullet: true, breakLine: true } },
        { text: 'PF labels carve out net worth', options: { bullet: true, breakLine: true } },
      ],
      {
        x: 9.45,
        y: 2.35,
        w: 3.15,
        h: 3.0,
        fontSize: 14,
        color: COLORS.cinnamon,
        fontFace: 'Calibri',
        paraSpacing: 12,
      }
    );
    addFooter(s, 7);
  }

  // —— 8. Monthly ——
  {
    const s = pptx.addSlide();
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: COLORS.cream },
    });
    addAccentBar(s);
    sectionTitle(s, 'Monthly — history that stays readable', 'Per-month income, spends, investment, liquid, and savings %.');
    addPhoneShot(s, screen('08-monthly.png'), { x: 4.7, y: 1.25, h: 5.7 });
    s.addShape('roundRect', {
      x: 0.55,
      y: 1.8,
      w: 3.7,
      h: 4.2,
      fill: { color: COLORS.oat },
      rectRadius: 0.14,
    });
    s.addText('Why it matters', {
      x: 0.8,
      y: 2.15,
      w: 3.2,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: COLORS.espresso,
      fontFace: 'Calibri',
    });
    s.addText(
      'Spot seasonality, check savings discipline, and confirm investment cadence — without opening the spreadsheet.',
      {
        x: 0.8,
        y: 2.7,
        w: 3.2,
        h: 2.8,
        fontSize: 14,
        color: COLORS.cinnamon,
        fontFace: 'Calibri',
      }
    );
    addFooter(s, 8);
  }

  // —— 9. Privacy & polish ——
  {
    const s = pptx.addSlide();
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: COLORS.cream },
    });
    addAccentBar(s);
    sectionTitle(s, 'Privacy & polish', 'Feel soft. Stay private when you need to.');
    const items = [
      { t: 'Amount masking', d: 'One tap hides figures as •••• — perfect for demos and shoulder-surfing.' },
      { t: 'Soft motion', d: 'Framer Motion springs, sliding tab pill, page fades, sheet enter/exit.' },
      { t: 'Tactile controls', d: 'Hover/tap scale, accent glow, cozy focus rings on inputs.' },
      { t: 'Glass chrome, solid sheets', d: 'Header/nav blur; modals stay crisp above the floating nav.' },
    ];
    items.forEach((it, i) => {
      const y = 1.4 + i * 1.25;
      s.addShape('roundRect', {
        x: 0.55,
        y,
        w: 12.2,
        h: 1.1,
        fill: { color: COLORS.oat },
        rectRadius: 0.12,
      });
      s.addShape('rect', {
        x: 0.55,
        y,
        w: 0.12,
        h: 1.1,
        fill: { color: COLORS.gold },
      });
      s.addText(it.t, {
        x: 1.0,
        y: y + 0.18,
        w: 11.4,
        h: 0.35,
        fontSize: 16,
        bold: true,
        color: COLORS.espresso,
        fontFace: 'Calibri',
      });
      s.addText(it.d, {
        x: 1.0,
        y: y + 0.55,
        w: 11.4,
        h: 0.4,
        fontSize: 13,
        color: COLORS.cinnamon,
        fontFace: 'Calibri',
      });
    });
    addFooter(s, 9);
  }

  // —— 10. Architecture ——
  {
    const s = pptx.addSlide();
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: COLORS.cream },
    });
    addAccentBar(s);
    sectionTitle(s, 'Architecture', 'Thin, secure, sheet-native.');

    const boxes = [
      { x: 0.7, label: 'React PWA\n(browser)' },
      { x: 4.7, label: 'Netlify Function\ntransactions' },
      { x: 8.7, label: 'Google Sheets\nAPI + OAuth' },
    ];
    boxes.forEach((b, i) => {
      s.addShape('roundRect', {
        x: b.x,
        y: 2.4,
        w: 3.2,
        h: 1.8,
        fill: { color: i === 1 ? COLORS.gold : COLORS.oat },
        rectRadius: 0.14,
      });
      s.addText(b.label, {
        x: b.x + 0.15,
        y: 2.85,
        w: 2.9,
        h: 1.0,
        fontSize: 16,
        bold: true,
        color: i === 1 ? COLORS.white : COLORS.espresso,
        align: 'center',
        fontFace: 'Calibri',
      });
      if (i < 2) {
        s.addText('→', {
          x: b.x + 3.15,
          y: 3.0,
          w: 0.5,
          h: 0.5,
          fontSize: 28,
          color: COLORS.gold,
          align: 'center',
        });
      }
    });
    s.addText(
      'Client never sees Google secrets. Metrics compute in the browser. Planner stays local. Theme & mask persist in localStorage.',
      {
        x: 0.7,
        y: 4.7,
        w: 11.9,
        h: 1.2,
        fontSize: 15,
        color: COLORS.cinnamon,
        fontFace: 'Calibri',
        align: 'center',
      }
    );
    addFooter(s, 10);
  }

  // —— 11. Stack ——
  {
    const s = pptx.addSlide();
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: COLORS.cream },
    });
    addAccentBar(s);
    sectionTitle(s, 'Stack', 'Lean runtime. Rich feel.');
    const stack = [
      ['React 19', 'UI'],
      ['TypeScript', 'Types'],
      ['Vite 6', 'Build'],
      ['Tailwind CSS', 'Tokens'],
      ['Framer Motion', 'Motion'],
      ['Lucide', 'Icons'],
      ['react-select', 'Forms'],
      ['Workbox PWA', 'Install'],
      ['Netlify Functions', 'API'],
      ['Google Sheets', 'Data'],
      ['Syne / DM Sans', 'Type'],
      ['OAuth 2.0', 'Auth'],
    ];
    stack.forEach((item, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 0.7 + col * 3.15;
      const y = 1.5 + row * 1.7;
      s.addShape('roundRect', {
        x,
        y,
        w: 2.95,
        h: 1.4,
        fill: { color: COLORS.oat },
        rectRadius: 0.12,
      });
      s.addText(item[0], {
        x: x + 0.15,
        y: y + 0.3,
        w: 2.65,
        h: 0.45,
        fontSize: 16,
        bold: true,
        color: COLORS.espresso,
        align: 'center',
        fontFace: 'Calibri',
      });
      s.addText(item[1], {
        x: x + 0.15,
        y: y + 0.8,
        w: 2.65,
        h: 0.35,
        fontSize: 12,
        color: COLORS.gold,
        align: 'center',
        fontFace: 'Calibri',
      });
    });
    addFooter(s, 11);
  }

  // —— 12. Credits ——
  {
    const s = pptx.addSlide();
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: COLORS.cream },
    });
    s.addShape('rect', {
      x: 0,
      y: 0,
      w: 0.22,
      h: 7.5,
      fill: { color: COLORS.gold },
    });
    addPhoneShot(s, screen('10-about.png'), { x: 8.55, y: 0.55, h: 6.3 });
    s.addText('Muffin', {
      x: 0.8,
      y: 1.8,
      w: 7,
      h: 0.7,
      fontSize: 42,
      bold: true,
      color: COLORS.espresso,
      fontFace: 'Calibri',
    });
    s.addText('Vibe Coded by Rahul Gouri, 2026', {
      x: 0.8,
      y: 2.55,
      w: 7,
      h: 0.4,
      fontSize: 18,
      color: COLORS.gold,
      fontFace: 'Calibri',
    });
    s.addText(
      'Install as a PWA on your phone. Keep the sheet. Enjoy the muffins.\n\nBuilt with Antigravity, Cursor & GitHub Copilot.',
      {
        x: 0.8,
        y: 3.3,
        w: 6.8,
        h: 1.8,
        fontSize: 15,
        color: COLORS.cinnamon,
        fontFace: 'Calibri',
      }
    );
    s.addText('Amounts in this deck are masked for privacy.', {
      x: 0.8,
      y: 6.5,
      w: 7,
      h: 0.3,
      fontSize: 12,
      color: COLORS.muted,
      fontFace: 'Calibri',
    });
  }

  await pptx.writeFile({ fileName: OUT_FILE });
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
