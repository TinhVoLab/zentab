const puppeteer = require('puppeteer-core'); const path = require('path'); const fs = require('fs');
const [HTML, OUT, MODE] = process.argv.slice(2);
(async () => {
  const browser = await puppeteer.launch({ executablePath: '' + process.env.CHROME_PATH + '', headless: 'new', args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve(HTML), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync(OUT, { recursive: true });
  const times = MODE === 'preview' ? [1.4, 2.3, 2.9, 3.8, 5.2, 7.6, 9.9, 12.6, 14.6] : Array.from({ length: Math.round(15.5 * 30) }, (_, i) => i / 30);
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(t => window.render(t), times[i]);
    await page.screenshot({ path: `${OUT}/${MODE === 'preview' ? 'p' + times[i] : String(i).padStart(4, '0')}.${MODE === 'preview' ? 'jpg' : 'png'}`, type: MODE === 'preview' ? 'jpeg' : 'png', quality: MODE === 'preview' ? 85 : undefined });
  }
  console.log('frames:', times.length, 'errors:', errs.join('|') || 'none');
  await browser.close();
})();
