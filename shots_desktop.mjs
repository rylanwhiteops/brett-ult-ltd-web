import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true, args: ['--disable-web-security'] });

const BASE = 'https://brett-ult-ltd-web.vercel.app';

const pages = [
  { url: BASE + '/', name: 'desk_home' },
  { url: BASE + '/services', name: 'desk_services' },
  { url: BASE + '/projects', name: 'desk_projects' },
  { url: BASE + '/contact', name: 'desk_contact' },
];

for (const c of pages) {
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto(c.url, { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: '/tmp/' + c.name + '.png', fullPage: false });
  await p.close();
  console.log('captured', c.name);
}
await b.close();
console.log('done');
