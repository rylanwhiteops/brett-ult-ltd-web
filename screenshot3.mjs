import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });

// Mobile screenshot
const mobile = await browser.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto('http://localhost:4322/', { waitUntil: 'networkidle', timeout: 20000 });
await mobile.waitForTimeout(3000);
await mobile.screenshot({ path: '/tmp/mobile.png' });
const mobileCanvases = await mobile.evaluate(() => Array.from(document.querySelectorAll('canvas')).map(c=>({w:c.width,h:c.height})));
console.log('Mobile canvases:', JSON.stringify(mobileCanvases));

// Desktop full scroll
const desktop = await browser.newPage();
await desktop.setViewportSize({ width: 1440, height: 900 });
await desktop.goto('http://localhost:4322/', { waitUntil: 'networkidle', timeout: 20000 });
await desktop.waitForTimeout(4000);
await desktop.screenshot({ path: '/tmp/desktop_full.png', fullPage: false });

await browser.close();
console.log('Done');
