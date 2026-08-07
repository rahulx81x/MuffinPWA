/**
 * Capture Galaxy A55–sized screenshots from the local Muffin app (amounts masked).
 * Viewport: 360×780 CSS @ deviceScaleFactor 3 → 1080×2340.
 *
 * Usage: node scripts/capture-showcase.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'showcase', 'screens');

const BASE_URL = process.argv[2] || process.env.MUFFIN_BASE_URL || 'http://localhost:8888';

const VIEWPORT = { width: 360, height: 780 };
const DEVICE_SCALE = 3;

async function settle(page, ms = 450) {
  await page.waitForTimeout(ms);
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, name);
  await page.screenshot({ path: file, fullPage: false, type: 'png' });
  console.log(`✓ ${name}`);
  return file;
}

async function waitForAppReady(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // Prefer role/text waits — networkidle never settles (health probes / HMR).
  await page.getByText('Net Worth', { exact: false }).first().waitFor({
    state: 'visible',
    timeout: 90_000,
  });
  await page.getByText('Baking your money muffins').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  await settle(page, 800);
}

async function ensureMasked(page) {
  const hideBtn = page.getByRole('button', { name: 'Hide amounts' });
  const showBtn = page.getByRole('button', { name: 'Show amounts' });
  if (await hideBtn.isVisible().catch(() => false)) {
    await hideBtn.click();
    await settle(page, 350);
  }
  // Confirm masked state is active.
  if (!(await showBtn.isVisible().catch(() => false))) {
    throw new Error('Could not enable amount masking (Show amounts button not found).');
  }
}

async function goHome(page) {
  await page.getByRole('navigation', { name: 'Primary' }).getByText('Home', { exact: true }).click();
  await settle(page, 500);
}

async function closeOverlays(page) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const dismissors = [
      page.getByRole('button', { name: 'Dismiss modal' }),
      page.getByRole('button', { name: 'Dismiss about dialog' }),
      page.getByRole('button', { name: 'Dismiss transaction dialog' }),
      page.getByRole('button', { name: 'Close theme menu' }),
    ];
    let clicked = false;
    for (const btn of dismissors) {
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ force: true });
        clicked = true;
        await settle(page, 500);
      }
    }
    const dialogVisible = await page
      .getByRole('dialog')
      .first()
      .isVisible()
      .catch(() => false);
    if (!dialogVisible && !clicked) break;
    if (dialogVisible) {
      await page.keyboard.press('Escape').catch(() => {});
      await settle(page, 400);
    }
  }
  // Wait until no modal dialog remains.
  await page
    .getByRole('dialog')
    .first()
    .waitFor({ state: 'hidden', timeout: 5_000 })
    .catch(() => {});
  await settle(page, 300);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`Capturing from ${BASE_URL} → ${OUT_DIR}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  });
  const page = await context.newPage();

  try {
    await waitForAppReady(page);
    await ensureMasked(page);

    // Reset theme to Classic for consistent early shots.
    await page.evaluate(() => {
      localStorage.setItem('muffinTheme', 'classic');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await ensureMasked(page);

    // 01 Home
    await goHome(page);
    await shot(page, '01-home.png');

    // 02 More Details
    const more = page.getByRole('button', { name: /More Details|Show Less/i });
    if ((await more.textContent())?.includes('More Details')) {
      await more.click();
      await settle(page, 700);
    }
    await shot(page, '02-home-more.png');

    // 03 Chart sheet (Net Worth)
    const netWorth = page.getByRole('button', { name: /Net Worth/i }).first();
    await netWorth.click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 10_000 });
    await settle(page, 700);
    await shot(page, '03-chart-sheet.png');
    await closeOverlays(page);

    // Collapse more details if open (cleaner theme menu shot)
    const less = page.getByRole('button', { name: /Show Less/i });
    if (await less.isVisible().catch(() => false)) {
      await less.click();
      await settle(page, 400);
    }

    // 04 Theme menu
    await page.getByRole('button', { name: 'Choose theme' }).click();
    await page.getByRole('menu', { name: 'Theme options' }).waitFor({ state: 'visible' });
    await settle(page, 450);
    await shot(page, '04-theme-menu.png');

    // 05 Red Velvet theme
    await page.getByRole('menuitemradio', { name: /Red Velvet/i }).click();
    await settle(page, 900);
    await closeOverlays(page);
    await goHome(page);
    await shot(page, '05-theme-velvet.png');

    // Switch back to classic for remaining product shots (optional consistency)
    await page.getByRole('button', { name: 'Choose theme' }).click();
    await page.getByRole('menuitemradio', { name: /Classic Muffin/i }).click();
    await settle(page, 700);
    await closeOverlays(page);

    // 06 Planner
    await page.getByRole('navigation', { name: 'Primary' }).getByText('Planner', { exact: true }).click();
    await settle(page, 700);
    await shot(page, '06-planner.png');

    // 07 Ledger
    await page.getByRole('navigation', { name: 'Primary' }).getByText('Ledger', { exact: true }).click();
    await settle(page, 800);
    await shot(page, '07-ledger.png');

    // 08 Monthly
    await page.getByRole('navigation', { name: 'Primary' }).getByText('Months', { exact: true }).click();
    await settle(page, 800);
    await shot(page, '08-monthly.png');

    // 09 Add modal
    await page.getByRole('button', { name: 'Add transaction' }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 10_000 });
    await settle(page, 500);
    await shot(page, '09-add-modal.png');
    // Prefer explicit Close control, then wait for portal teardown.
    const addClose = page.getByRole('dialog').getByRole('button', { name: 'Close' });
    if (await addClose.isVisible().catch(() => false)) {
      await addClose.click();
    } else {
      await page.getByRole('button', { name: 'Dismiss transaction dialog' }).click({ force: true });
    }
    await page
      .getByRole('button', { name: 'Dismiss transaction dialog' })
      .waitFor({ state: 'detached', timeout: 8_000 })
      .catch(() => {});
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 8_000 }).catch(() => {});
    await settle(page, 400);

    // 10 About
    await page.getByRole('button', { name: 'About this app' }).click({ force: true });
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 10_000 });
    await settle(page, 500);
    await shot(page, '10-about.png');
    await closeOverlays(page);

    console.log('\nAll screenshots captured.');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('\nCapture failed:', err);
  process.exit(1);
});
