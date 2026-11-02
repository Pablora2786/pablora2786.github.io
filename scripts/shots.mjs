import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:4173/';
mkdirSync('/workspace/suimint-site/shots', { recursive: true });

const browser = await chromium.launch({ headless: true });

async function shot(width, height, name) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  // wait for table or loading to settle
  try {
    await page.waitForSelector('table.table tbody tr, .card.muted', { timeout: 90000 });
  } catch {}
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `/workspace/suimint-site/shots/${name}.png`, fullPage: true });
  // also market tab
  await page.getByRole('button', { name: '市场' }).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `/workspace/suimint-site/shots/${name}-market.png`, fullPage: true });
  await page.getByRole('button', { name: '创建铭文' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `/workspace/suimint-site/shots/${name}-deploy.png`, fullPage: true });
  await page.close();
  console.log('saved', name);
}

await shot(390, 844, 'mobile-390');
await shot(1440, 900, 'desktop-1440');
await browser.close();
console.log('done');
