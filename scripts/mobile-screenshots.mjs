import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const PRODUCTION_URL = 'https://brett-ult-ltd-web.vercel.app';
const OUT_DIR = './mobile-audit';

const PAGES = [
  { path: '/', name: 'home' },
  { path: '/services', name: 'services' },
  { path: '/projects', name: 'projects' },
  { path: '/careers', name: 'careers' },
  { path: '/contact', name: 'contact' },
];

await fs.mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['iPhone 14'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

const page = await context.newPage();

for (const p of PAGES) {
  const url = PRODUCTION_URL + p.path;
  console.log(`→ ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  // Bounded scroll: 30 steps of 600px = up to 18000px (covers home page which is tallest)
  for (let i = 0; i < 30; i++) {
    await page.evaluate((step) => window.scrollBy(0, step), 600);
    await page.waitForTimeout(150);
  }

  // Force any still-hidden ScrollReveal elements to be visible (style attr based)
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach((el) => {
      const s = el.getAttribute('style') || '';
      if (s.includes('opacity: 0') || s.includes('opacity:0')) {
        el.style.opacity = '1';
        el.style.filter = 'none';
        el.style.transform = 'none';
      }
    });
  });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);

  await page.screenshot({
    path: `${OUT_DIR}/${p.name}-full.png`,
    fullPage: true,
  });
  console.log(`✓ ${p.name}-full.png`);
}

await browser.close();
console.log('Done. Screenshots saved to', OUT_DIR);
