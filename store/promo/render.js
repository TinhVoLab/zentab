// Renders promo.html to the Store's promo image sizes, and cover-9x16.html to the Shorts cover.
// Usage: node store/promo/render.js  (needs puppeteer-core and a Chrome; set CHROME_PATH)
const path = require('path');
const puppeteer = require('puppeteer-core');
const sizes = { tile: [440, 280, 'promo-tile-440x280.png'], marquee: [1400, 560, 'promo-marquee-1400x560.png'], cover: [1080, 1920, 'cover-9x16-1080x1920.png', 'cover-9x16.html'] };
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: 'new', args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  for (const [size, [width, height, file, html = 'promo.html']] of Object.entries(sizes)) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto('file://' + path.join(__dirname, html) + '?size=' + size, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(__dirname, '..', file), type: 'png' });
    console.log(file);
  }
  await browser.close();
})();
