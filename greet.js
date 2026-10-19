// Lời hỏi thăm: at most one small toast a day, on the first new tab of the day.
// - A special day (birthday, Tết, Rằm tháng Giêng, Trung thu, a focus milestone, Monday
//   morning, Friday afternoon) brings a sealed wish to open, like a tiny lì xì.
// - Otherwise, if today's mood isn't in the notebook yet, it asks how you are; one tap
//   writes the mood into today's Nhật ký page (which also steers the dock quote).
// - Otherwise nothing.
// Uses script.js helpers (getDateStr, solarToLunar, getFocusHistory) and ZenJournal.
(function () {
  const toast = document.getElementById('greetToast');
  if (!toast) return;

  const SHOW_DELAY = 1200;   // let the page settle first
  const HIDE_AFTER = 10000;  // paused while hovered
  const MOODS = [
    { v: 1, e: '😞', label: 'Rất tệ', reply: 'Cảm ơn bạn đã chia sẻ. Hôm nay cứ chậm lại, nhẹ nhàng với mình nhé.' },
    { v: 2, e: '😕', label: 'Không ổn', reply: 'Không sao đâu. Một việc nhỏ thôi cũng đủ cho hôm nay.' },
    { v: 3, e: '😐', label: 'Bình thường', reply: 'Một ngày bình thường cũng là một ngày tốt để bắt đầu.' },
    { v: 4, e: '🙂', label: 'Tốt', reply: 'Thật vui! Chúc bạn một ngày trôi chảy.' },
    { v: 5, e: '😄', label: 'Rất tốt', reply: 'Tuyệt quá! Giữ năng lượng này cho điều quan trọng nhất nhé.' },
  ];
  const WISHES = {
    birthday: ['Chúc mừng sinh nhật! Mong tuổi mới của bạn bình an, khoẻ mạnh và có thật nhiều ngày đáng nhớ.',
      'Sinh nhật vui vẻ! Cảm ơn bạn đã chăm chút cho từng ngày của mình. Tuổi mới thật rực rỡ nhé.'],
    tet: ['Chúc mừng năm mới! An khang, thịnh vượng, vạn sự như ý.',
      'Năm mới an lành. Mong mỗi ngày trong năm đều có một điều nhỏ khiến bạn mỉm cười.'],
    ramGieng: ['Rằm tháng Giêng an lành. Chúc bạn một năm tâm sáng như trăng rằm.'],
    trungThu: ['Trung thu vui vẻ! Chúc bạn một mùa trăng đoàn viên, ấm áp bên người thương.'],
    streak7: ['Bảy ngày liên tiếp tập trung! Bạn đang xây một thói quen thật đẹp.'],
    streak30: ['Ba mươi ngày tập trung không ngắt quãng. Thật đáng nể, hãy tự thưởng cho mình nhé.'],
    monday: ['Tuần mới, trang mới. Chỉ cần làm tốt một việc quan trọng nhất hôm nay là đủ.',
      'Chào tuần mới! Bắt đầu nhẹ nhàng thôi, nhịp độ sẽ tự đến.'],
    friday: ['Bạn đã làm việc chăm chỉ cả tuần rồi. Chúc bạn một cuối tuần thật thảnh thơi.',
      'Cuối tuần đến rồi. Cảm ơn bạn của tuần này, giờ là lúc nghỉ ngơi.'],
  };
  const OCCASION = {
    birthday: 'Sinh nhật', tet: 'Năm mới', ramGieng: 'Rằm tháng Giêng', trungThu: 'Trung thu',
    streak7: '7 ngày tập trung', streak30: '30 ngày tập trung', monday: 'Đầu tuần', friday: 'Cuối tuần',
  };

  const get = (area, keys) => new Promise(r => chrome.storage[area].get(keys, r));
  const pickOne = (list, seed) => list[[...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % list.length];

  function streakFrom(history) {
    const minutesOn = d => (history[getDateStr(d)] || {}).minutes || 0;
    const d = new Date();
    if (!minutesOn(d)) d.setDate(d.getDate() - 1);
    let n = 0;
    while (minutesOn(d) > 0) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  async function occasion(now, birth, milestones) {
    if (birth && birth.month === now.getMonth() + 1 && birth.day === now.getDate()) return 'birthday';
    const lunar = solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
    if (!lunar.isLeap) {
      if (lunar.month === 1 && lunar.day <= 3) return 'tet';
      if (lunar.month === 1 && lunar.day === 15) return 'ramGieng';
      if (lunar.month === 8 && lunar.day === 15) return 'trungThu';
    }
    const streak = await new Promise(r => getFocusHistory(h => r(streakFrom(h))));
    // a milestone is celebrated once per streak, not every day after it
    if (streak >= 30 && !milestones.includes('streak30')) return 'streak30';
    if (streak >= 7 && streak < 30 && !milestones.includes('streak7')) return 'streak7';
    const day = now.getDay(), hour = now.getHours();
    if (day === 1 && hour < 12) return 'monday';
    if (day === 5 && hour >= 15) return 'friday';
    return null;
  }

  // ---- Toast ----
  let hideTimer = null;
  function show() {
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('visible'));
    armHide();
  }
  function hide() {
    clearTimeout(hideTimer);
    toast.classList.remove('visible');
    setTimeout(() => { toast.hidden = true; }, 400);
  }
  function armHide(ms = HIDE_AFTER) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, ms);
  }
  toast.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  toast.addEventListener('mouseleave', () => armHide(4000));
  toast.addEventListener('focusin', () => clearTimeout(hideTimer));

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  function closeBtn() {
    const b = el('button', 'greet-close', '✕');
    b.type = 'button';
    b.title = b.ariaLabel = 'Đóng';
    b.addEventListener('click', hide);
    return b;
  }
  function reply(text) {
    toast.replaceChildren(el('p', 'greet-text', text), closeBtn());
    armHide(5000);
  }

  function renderCheckIn(name, today) {
    const part = new Date().getHours();
    const hello = part < 11 ? 'Chào buổi sáng' : part < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
    const moods = el('div', 'greet-moods');
    moods.setAttribute('role', 'group');
    moods.ariaLabel = 'Tâm trạng hôm nay';
    MOODS.forEach(m => {
      const b = el('button', null, m.e);
      b.type = 'button';
      b.title = b.ariaLabel = m.label;
      b.addEventListener('click', () => {
        window.ZenJournal?.setMood(today, m.v);
        reply(m.reply);
      });
      moods.append(b);
    });
    toast.replaceChildren(el('p', 'greet-text', `${hello}${name ? `, ${name}` : ''}. Hôm nay bạn thế nào?`), moods, closeBtn());
  }

  function renderWish(kind, today) {
    const open = el('button', 'greet-open', 'Mở');
    open.type = 'button';
    open.addEventListener('click', () => {
      const card = el('div', 'greet-wish');
      card.append(el('span', 'greet-occasion', OCCASION[kind]), el('p', 'greet-text', pickOne(WISHES[kind], today + kind)));
      toast.replaceChildren(card, closeBtn());
      toast.classList.add('opened');
      armHide(12000);
    });
    toast.replaceChildren(el('span', 'greet-envelope', '✉'), el('p', 'greet-text', 'Có một lời chúc cho bạn'), open, closeBtn());
  }

  async function run() {
    const now = new Date();
    const today = getDateStr(now);
    const [{ greetEnabled, birth, userName }, { greetState, journalPages }] = await Promise.all([
      get('sync', ['greetEnabled', 'birth', 'userName']),
      get('local', ['greetState', 'journalPages']),
    ]);
    if (greetEnabled === false) return;
    const state = greetState || { date: null, milestones: [] };
    if (state.date === today) return; // once a day
    // Don't speak over a running focus session
    if (document.documentElement.classList.contains('timer-is-running')) return;

    const kind = await occasion(now, birth, state.milestones || []);
    let milestones = (state.milestones || []).filter(m => m !== 'streak7' || kind !== 'streak30');
    if (kind && kind.startsWith('streak')) milestones = [...milestones, kind];
    // A broken streak can be celebrated again next time
    const streak = await new Promise(r => getFocusHistory(h => r(streakFrom(h))));
    if (streak < 7) milestones = milestones.filter(m => !m.startsWith('streak'));

    const moodLogged = journalPages && journalPages[today] && journalPages[today].mood;
    if (!kind && moodLogged) { chrome.storage.local.set({ greetState: { date: today, milestones } }); return; }

    chrome.storage.local.set({ greetState: { date: today, milestones } });
    if (kind) renderWish(kind, today);
    else renderCheckIn(userName && userName.trim(), today);
    toast.classList.toggle('opened', false);
    show();
  }

  setTimeout(() => run().catch(e => console.warn('ZenTab: greeting,', e.message)), SHOW_DELAY);

  // Settings → Lời nhắn switch
  const sw = document.getElementById('greetEnabled');
  if (sw) {
    get('sync', 'greetEnabled').then(({ greetEnabled }) => { sw.checked = greetEnabled !== false; });
    sw.addEventListener('change', () => chrome.storage.sync.set({ greetEnabled: sw.checked }));
  }
})();
