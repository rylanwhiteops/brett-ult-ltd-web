import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--disable-web-security'] });

const captures = [
  { url: 'http://[::1]:4322/', name: 'home', scrollY: 0 },
  { url: 'http://[::1]:4322/', name: 'home_mid', scrollY: 2000 },
  { url: 'http://[::1]:4322/services', name: 'services', scrollY: 0 },
  { url: 'http://[::1]:4322/projects', name: 'projects', scrollY: 0 },
  { url: 'http://[::1]:4322/contact', name: 'contact', scrollY: 0 },
];

for (const c of captures) {
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await p.waitForTimeout(3500);
  if (c.scrollY) {
    await p.evaluate(y => window.scrollTo(0, y), c.scrollY);
    await p.waitForTimeout(800);
  }
  await p.screenshot({ path: '/tmp/ss_' + c.name + '.png' });
  await p.close();
  console.log('captured', c.name);
}

await b.close();
console.log('done');
