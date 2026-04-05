import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.setViewportSize({ width: 1440, height: 900 });
// Use IPv6 literal bracket notation
await p.goto('http://[::1]:4322/', { waitUntil: 'domcontentloaded', timeout: 15000 });
await p.waitForTimeout(5000);
await p.screenshot({ path: '/tmp/hero_latest.png' });
const canvases = await p.evaluate(() => Array.from(document.querySelectorAll('canvas')).map(c=>({w:c.width,h:c.height})));
console.log('Canvases:', JSON.stringify(canvases));
if (errs.length) console.log('ERRORS:', errs.slice(0,5).join('\n'));
await b.close();
console.log('done');
