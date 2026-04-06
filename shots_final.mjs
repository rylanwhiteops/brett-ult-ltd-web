import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const BASE = 'https://brett-ult-ltd-web.vercel.app';

const shots = [
  // Desktop — viewport only (1440x900)
  { url: BASE + '/',          name: 'd_home',        w: 1440, h: 900,  scroll: 0 },
  { url: BASE + '/',          name: 'd_home_stats',  w: 1440, h: 900,  scroll: 1100 },
  { url: BASE + '/',          name: 'd_home_svc',    w: 1440, h: 900,  scroll: 2200 },
  { url: BASE + '/services',  name: 'd_services',    w: 1440, h: 900,  scroll: 0 },
  { url: BASE + '/services',  name: 'd_services_mid',w: 1440, h: 900,  scroll: 1800 },
  { url: BASE + '/projects',  name: 'd_projects',    w: 1440, h: 900,  scroll: 0 },
  { url: BASE + '/contact',   name: 'd_contact',     w: 1440, h: 900,  scroll: 0 },
  // Mobile — full page
  { url: BASE + '/',          name: 'm_home',        w: 390,  h: 844,  scroll: 0,   full: true },
  { url: BASE + '/services',  name: 'm_services',    w: 390,  h: 844,  scroll: 0,   full: true },
  { url: BASE + '/projects',  name: 'm_projects',    w: 390,  h: 844,  scroll: 0,   full: true },
  { url: BASE + '/contact',   name: 'm_contact',     w: 390,  h: 844,  scroll: 0,   full: true },
];

for (const c of shots) {
  const p = await b.newPage();
  await p.setViewportSize({ width: c.w, height: c.h });
  await p.goto(c.url, { waitUntil: 'networkidle', timeout: 25000 });
  await p.waitForTimeout(2000);
  if (c.scroll) { await p.evaluate(y => window.scrollTo(0,y), c.scroll); await p.waitForTimeout(600); }
  await p.screenshot({ path: '/tmp/' + c.name + '.png', fullPage: c.full || false });
  await p.close();
  console.log('✓', c.name);
}
await b.close();
console.log('done');
