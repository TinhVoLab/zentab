const puppeteer = require('puppeteer-core'); const [EXT, PROFILE, OUT] = process.argv.slice(2); const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '' + process.env.CHROME_PATH + '', headless: 'new', userDataDir: PROFILE, args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--autoplay-policy=no-user-gesture-required'] });
  await wait(1500); const page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('chrome://newtab', { waitUntil: 'networkidle2' });
  const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
  const seed = (withIntention) => page.evaluate((t0, t1, t2, t4, withIntention) => new Promise(r => chrome.storage.local.clear(() => chrome.storage.sync.clear(() => chrome.storage.sync.set({
    userName: 'Minh', weatherLocation: 'Hà Nội',
    journal: [...(withIntention ? [{ date: t0, entry: 'Hoàn thiện slide thuyết trình quý 4', honored: null }] : []), { date: t1, entry: 'A', honored: true }, { date: t2, entry: 'B', honored: true }, { date: t4, entry: 'C', honored: false }],
    tasks: [{ text: 'Review hợp đồng với đối tác', done: false, createdAt: 1 }, { text: 'Đọc 20 trang sách', done: false, createdAt: 2 }, { text: 'Gửi báo cáo tuần', done: true, createdAt: 3 }],
  }, () => chrome.storage.local.set({ zenHintSeen: true, greetState: { date: t0, milestones: [] }, quoteState: { moment: null, id: null, shown: [] },
    journalPages: { [t0]: { notes: 'Sáng nay tập trung 2 phiên liền, xong phần khó nhất của slide.', did: 'Hoàn thiện slide thuyết trình', grateful: 'Một buổi sáng yên tĩnh', tomorrow: 'Review hợp đồng', mood: 5 }, [t1]: { notes: 'Một ngày nhẹ nhàng. Chạy bộ buổi sáng, đầu óc tỉnh táo hơn hẳn.', did: 'Xong bản nháp báo cáo', grateful: 'Cà phê sáng cùng đồng nghiệp', mood: 4 } },
    quoteLog: { [t0]: { text: 'Hành trình ngàn dặm bắt đầu từ một bước chân.', author: 'Lão Tử, Đạo Đức Kinh' }, [t1]: { text: 'Nước chảy đá mòn.', author: 'Tục ngữ' } } }, r))))), d(0), d(1), d(2), d(4), withIntention);
  const go = async ({ wp = 'moon', zen = true, large = false, intention = true } = {}) => {
    await seed(intention);
    await page.evaluate((wp, zen, large) => { localStorage.setItem('zt-wallpaper', wp); localStorage.setItem('zt-relax-large', large ? '1' : ''); return new Promise(r => chrome.storage.local.set({ zenActive: zen }, r)); }, wp, zen, large);
    await page.reload({ waitUntil: 'networkidle2' }); await wait(1500);
    await page.mouse.move(960, 1075);
  };
  const tab = t => page.evaluate(t => document.querySelector(`.nav-item[data-tab="${t}"]`).click(), t);
  const record = async (name, fn) => { const rec = await page.screencast({ path: `${OUT}/${name}.webm` }); await fn(); await rec.stop(); console.log('clip', name); };
  const relax = async g => { await tab('focus'); await page.evaluate(g => { setTimerMode('short'); ZenRelax.open(g); }, g); await wait(1100); };

  // wallpaper stills for the montage (Zen: just the clock and the intention)
  for (const wp of ['lotus', 'moon', 'mist', 'sunrise', 'aurora', 'ocean', 'lavender', 'forest']) {
    await go({ wp }); await wait(600);
    await page.screenshot({ path: `${OUT}/wp-${wp}.jpg`, type: 'jpeg', quality: 92 });
  }

  // A: typing the morning intention
  await go({ wp: 'moon', intention: false }); await page.focus('#journalInput'); await wait(300);
  await record('home-type', async () => { await wait(500); await page.keyboard.type('Hoàn thiện slide thuyết trình quý 4', { delay: 65 }); await wait(400); await page.keyboard.press('Enter'); await wait(1800); });

  // B: focus — open the line, pick a task, start
  await go({ wp: 'moon', zen: false }); await tab('focus'); await page.mouse.move(960, 1075); await wait(900);
  await record('focus', async () => { await wait(400); await page.click('#focusIntentionDisplay'); await wait(900); await page.click('#focusSuggest button:nth-child(2)'); await wait(700); await page.click('#focusTimerStart'); await page.mouse.move(960, 1075); await wait(2600); });
  await page.click('#focusTimerStart');

  // C–G: the relax corner, enlarged
  await go({ wp: 'moon', zen: false, large: true }); await relax('breath');
  await record('breath', async () => { await page.keyboard.press('Space'); await wait(4600); });
  await page.keyboard.press('Space');

  await go({ wp: 'moon', zen: false, large: true }); await relax('bubbles');
  await record('bubbles', async () => {
    const b = await (await page.$('#bubbleSheet')).boundingBox(); const rowH = b.height / 5;
    await wait(300); await page.mouse.move(b.x + 40, b.y + rowH * 0.6); await page.mouse.down();
    for (let i = 0; i <= 40; i++) { await page.mouse.move(b.x + 40 + (b.width - 80) * i / 40, b.y + rowH * 0.6); await wait(28); }
    for (let i = 40; i >= 0; i--) { await page.mouse.move(b.x + 40 + (b.width - 80) * i / 40, b.y + rowH * 1.6); await wait(28); }
    await page.mouse.up(); await wait(600);
  });

  await go({ wp: 'moon', zen: false, large: true }); await relax('garden');
  await record('garden', async () => {
    const b = await (await page.$('#gardenStage')).boundingBox();
    await wait(300); await page.mouse.move(b.x + 120, b.y + b.height * 0.55); await page.mouse.down();
    for (let i = 0; i <= 60; i++) { await page.mouse.move(b.x + 120 + (b.width - 240) * i / 60, b.y + b.height * (0.55 + 0.16 * Math.sin(i / 9))); await wait(24); }
    await page.mouse.up(); await page.click('[data-tool="stone"]'); await wait(300);
    await page.mouse.click(b.x + b.width * 0.3, b.y + b.height * 0.3); await wait(500);
    await page.mouse.click(b.x + b.width * 0.74, b.y + b.height * 0.32); await wait(900);
  });

  await go({ wp: 'mist', zen: false, large: true }); await relax('stones');
  await record('stones', async () => {
    const b = await (await page.$('#stonesStage')).boundingBox(); const cx = b.x + b.width / 2;
    for (let i = 0; i < 6; i++) { await page.mouse.move(cx + (i % 2 ? 4 : -4), b.y + 90); await wait(250); await page.mouse.down(); await page.mouse.up(); await wait(950); }
    await page.mouse.move(cx + 46, b.y + 90); await wait(200); await page.mouse.down(); await page.mouse.up(); await wait(900);
    await page.mouse.move(cx + 80, b.y + 90); await wait(200); await page.mouse.down(); await page.mouse.up(); await wait(2600);
  });

  await go({ wp: 'moon', zen: false, large: true }); await relax('lantern');
  await record('lantern', async () => { await wait(300); await page.type('#lanternText', 'Buông bớt lo âu', { delay: 70 }); await wait(500); await page.keyboard.press('Enter'); await wait(4200); });

  // H: journal — turn back a day and forward again
  await go({ wp: 'lotus', zen: false }); await tab('journal'); await page.mouse.move(960, 1075); await wait(900);
  await record('journal', async () => { await wait(400); await page.click('#jbPrevDay'); await wait(1500); await page.click('#jbNextDay'); await wait(1500); });

  // I: the daily greeting (Monday morning: a wish to open)
  await seed(true); await page.evaluate(() => { localStorage.setItem('zt-wallpaper', 'moon'); return new Promise(r => chrome.storage.local.set({ zenActive: true, greetState: null }, r)); });
  const rec = await page.screencast({ path: `${OUT}/greet.webm` });
  await page.reload({ waitUntil: 'networkidle2' }); await page.mouse.move(960, 1075); await wait(2800);
  await page.click('#greetToast .greet-open').catch(() => {}); await wait(2600);
  await rec.stop(); console.log('clip greet');

  await page.evaluate(() => localStorage.setItem('zt-relax-large', ''));
  console.log('errors:', errs.join(' | ') || 'none');
  await browser.close();
})();
