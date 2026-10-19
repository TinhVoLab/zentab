// Ủng hộ: a VietQR code in Settings for anyone who wants to buy the author a coffee.
// The QR payload (NAPAS/EMVCo) is built here and drawn locally with qrcode.js, so
// nothing is fetched and nobody is tracked. Any banking app can scan it.
(function () {
  // The section stays hidden if account is empty.
  const DONATE = {
    bankBin: '970436',        // NAPAS BIN of Vietcombank
    bankName: 'Vietcombank',
    account: '0071000815935',
    holder: 'VO LINH TINH',   // as banking apps show it (no diacritics)
    note: 'Ung ho ZenTab',
  };
  const AMOUNTS = [
    { value: 20000, label: 'Ly cà phê' },
    { value: 50000, label: 'Bữa sáng' },
    { value: 100000, label: 'Bữa trưa' },
    { value: 0, label: 'Tuỳ tâm' },
  ];

  const section = document.getElementById('donateSection');
  if (!section || !DONATE.bankBin || !DONATE.account) return;
  section.hidden = false;

  const $ = id => document.getElementById(id);
  const vnd = n => n.toLocaleString('vi-VN') + ' ₫';

  // ---- VietQR payload: EMVCo TLV fields + CRC-16/CCITT-FALSE ----
  const tlv = (id, value) => id + String(value.length).padStart(2, '0') + value;
  function crc16(str) {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
  function payload(amount) {
    const merchant = tlv('00', 'A000000727') + tlv('01', tlv('00', DONATE.bankBin) + tlv('01', DONATE.account)) + tlv('02', 'QRIBFTTA');
    const body = tlv('00', '01') + tlv('01', amount ? '12' : '11') + tlv('38', merchant) + tlv('53', '704') +
      (amount ? tlv('54', String(amount)) : '') + tlv('58', 'VN') + tlv('62', tlv('08', DONATE.note)) + '6304';
    return body + crc16(body);
  }

  // qrcode.js (~55 KB) is only needed once someone scrolls to this section
  let qrLib = null;
  function loadQr() {
    if (!qrLib) {
      qrLib = new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = 'qrcode.js';
        el.onload = resolve;
        el.onerror = () => { qrLib = null; reject(new Error('qrcode.js failed to load')); };
        document.head.appendChild(el);
      });
    }
    return qrLib;
  }

  function draw(amount) {
    const qr = qrcode(0, 'M');
    qr.addData(payload(amount));
    qr.make();
    const canvas = $('donateQr');
    const n = qr.getModuleCount(), quiet = 3, cells = n + quiet * 2;
    const css = 168, dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.height = Math.round(css * dpr);
    canvas.style.width = canvas.style.height = css + 'px';
    const ctx = canvas.getContext('2d');
    const cell = canvas.width / cells;
    ctx.fillStyle = '#fff';   // scanners want dark-on-light, also in dark mode
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect(Math.floor((c + quiet) * cell), Math.floor((r + quiet) * cell), Math.ceil(cell), Math.ceil(cell));
      }
    }
    canvas.setAttribute('aria-label', `Mã VietQR chuyển khoản ${amount ? vnd(amount) : 'số tiền tuỳ tâm'} tới ${DONATE.holder}, ${DONATE.bankName}`);
    $('donateAmountLine').textContent = amount ? vnd(amount) : 'Số tiền tuỳ tâm';
  }

  // ---- Amount picker ----
  const picker = $('donateAmounts');
  let current = AMOUNTS[0].value;
  AMOUNTS.forEach(a => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.dataset.amount = a.value;
    const label = document.createElement('span');
    label.textContent = a.label;
    b.append(label);
    if (a.value) {
      const price = document.createElement('small');
      price.textContent = (a.value / 1000) + 'k';
      b.append(price);
    }
    b.addEventListener('click', () => select(a.value));
    picker.append(b);
  });
  function select(amount) {
    current = amount;
    picker.querySelectorAll('button').forEach(b => {
      const on = Number(b.dataset.amount) === amount;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on);
    });
    if (typeof qrcode !== 'undefined') draw(amount);
  }
  select(current);

  // ---- Bank details with copy buttons ----
  $('donateBank').textContent = DONATE.bankName;
  $('donateHolder').textContent = DONATE.holder;
  $('donateAccount').textContent = DONATE.account;
  $('donateNote').textContent = DONATE.note;
  section.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', () => {
    const text = $(btn.dataset.copy).textContent;
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Đã chép';
      setTimeout(() => { btn.textContent = 'Chép'; }, 1400);
    }).catch(() => {});
  }));

  // Draw when the section first comes into view inside the settings sheet
  new IntersectionObserver((entries, obs) => {
    if (!entries.some(e => e.isIntersecting)) return;
    obs.disconnect();
    loadQr().then(() => draw(current)).catch(e => console.warn('ZenTab:', e.message));
  }).observe(section);
})();
