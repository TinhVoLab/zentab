const puppeteer = require('puppeteer-core'); const path = require('path'); const fs = require('fs');
const [HTML, OUT, MODE] = process.argv.slice(2);
(async () => {
  const browser = await puppeteer.launch({ executablePath: '' + process.env.CHROME_PATH + '', headless: 'new', args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve(HTML), { waitUntil: 'networkidle0' });
  const [W, H] = await page.evaluate(() => window.SIZE || [1920, 1080]); if (W !== 1920 || H !== 1080) await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.evaluate(() => document.fonts.ready); await page.evaluate(() => window.ready);
  fs.mkdirSync(OUT, { recursive: true });
  const FROM = +(process.env.FROM || 0), TO = +(process.env.TO || 900); const times = Array.from({ length: TO - FROM }, (_, i) => (FROM + i) / 30);
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(async t => { await window.render(t); }, times[i]);
    await page.screenshot({ path: `${OUT}/${String(FROM + i).padStart(4, '0')}.${MODE === 'preview' ? 'jpg' : 'png'}`, type: MODE === 'preview' ? 'jpeg' : 'png', quality: MODE === 'preview' ? 85 : undefined });
  }
  console.log('frames:', times.length, 'errors:', errs.join('|') || 'none');
  await browser.close();
})();
