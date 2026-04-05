import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', err => errors.push(err.message));
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://localhost:4322/', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(3000);

// Screenshot at rest (no scroll)
await page.screenshot({ path: '/tmp/scroll_0.png' });

// Scroll 30% into the pin
await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'instant' }));
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/scroll_30.png' });

// Scroll 60%
await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 2.0, behavior: 'instant' }));
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/scroll_60.png' });

// Scroll 90%
await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 3.5, behavior: 'instant' }));
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/scroll_90.png' });

// Check model container styles at each point
const info = await page.evaluate(() => {
  const mc = document.getElementById('model-container');
  const hc = document.getElementById('hero-copy');
  return {
    modelContainer: mc ? { width: mc.style.width, left: mc.style.left, right: mc.style.right, offsetWidth: mc.offsetWidth } : null,
    heroCopy: hc ? { opacity: hc.style.opacity, transform: hc.style.transform } : null,
  };
});
console.log('State at 90% scroll:', JSON.stringify(info, null, 2));
if (errors.length) console.log('ERRORS:', errors.join('\n'));
await browser.close();
console.log('Done');
