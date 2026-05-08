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
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  // Scroll the entire page slowly so every ScrollReveal IntersectionObserver fires
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const step = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 80);
    });
  });

  // Force any still-hidden ScrollReveal elements to be visible
  await page.evaluate(() => {
    document.querySelectorAll('[style*="opacity: 0"]').forEach((el) => {
      el.style.opacity = '1';
      el.style.filter = 'none';
      el.style.transform = 'none';
    });
  });

  // Scroll back to top before taking screenshot
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  await page.screenshot({
    path: `${OUT_DIR}/${p.name}-full.png`,
    fullPage: true,
  });
  console.log(`✓ ${p.name}-full.png`);
}

await browser.close();
console.log('Done. Screenshots saved to', OUT_DIR);
