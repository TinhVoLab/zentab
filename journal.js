// Nhật ký: a notebook spread — month index on the left, one page per day on the right.
// Pages live in storage.local (journal text outgrows storage.sync's limits); the morning
// intention keeps coming from the existing sync "journal" entries.
// Uses helpers from script.js (getDateStr, solarToLunar, thienCan, diaChi, canOfYear,
// getFocusHistory, saveJournalEntry, tasks). Exposes window.ZenJournal.
(function () {
  const book = document.getElementById('journalBook');
  if (!book) return;

  const $ = id => document.getElementById(id);
  const fields = [...book.querySelectorAll('textarea[data-field]')];
  const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const MOODS = { 1: 'rất tệ', 2: 'không ổn', 3: 'bình thường', 4: 'tốt', 5: 'rất tốt' };

  let pages = {};          // { 'YYYY-MM-DD': { notes, did, grateful, tomorrow, mood, updatedAt } }
  let intentions = {};     // { 'YYYY-MM-DD': { entry, honored } } from the sync journal
  let focusByDay = {};
  let selected = startOfDay(new Date());
  let viewMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
  let saveTimer = null;
  let loaded = false;

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  const key = d => getDateStr(d);
  const isToday = d => key(d) === key(new Date());

  // ---- Load ----
  function load(cb) {
    chrome.storage.local.get(['journalPages', 'journalPaper'], ({ journalPages, journalPaper }) => {
      pages = journalPages || {};
      setPaper(journalPaper || 'cream', false);
      chrome.storage.sync.get('journal', ({ journal }) => {
        intentions = {};
        (journal || []).forEach(e => { intentions[e.date] = e; });
        getFocusHistory(history => { focusByDay = history; loaded = true; cb && cb(); });
      });
    });
  }

  // ---- Paper ----
  function setPaper(paper, persist = true) {
    book.dataset.paper = paper;
    document.querySelectorAll('#jbPaper [data-paper]').forEach(b => {
      const on = b.dataset.paper === paper;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on);
    });
    if (persist) chrome.storage.local.set({ journalPaper: paper });
  }
  document.querySelectorAll('#jbPaper [data-paper]').forEach(b => b.addEventListener('click', () => setPaper(b.dataset.paper)));

  // ---- Month index ----
  function pageHasContent(k) {
    const p = pages[k];
    return !!(p && (p.mood || ['notes', 'did', 'grateful', 'tomorrow'].some(f => (p[f] || '').trim()))) || !!(intentions[k] && intentions[k].entry);
  }

  function renderCalendar() {
    $('jbMonthTitle').textContent = `Tháng ${viewMonth.getMonth() + 1} · ${viewMonth.getFullYear()}`;
    const first = new Date(viewMonth);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const days = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const todayKey = key(new Date());
    let html = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => `<span class="jb-wd" role="columnheader">${d}</span>`).join('');
    html += '<span class="jb-blank"></span>'.repeat(offset);
    for (let d = 1; d <= days; d++) {
      const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d);
      const k = key(date);
      const mood = pages[k] && pages[k].mood;
      const classes = ['jb-day'];
      if (pageHasContent(k)) classes.push('has-entry');
      if (mood) classes.push(`mood-${mood}`);
      if (k === todayKey) classes.push('is-today');
      if (k === key(selected)) classes.push('is-selected');
      const future = date > startOfDay(new Date());
      const label = `${d} tháng ${viewMonth.getMonth() + 1}${pageHasContent(k) ? ', đã viết' : ''}${mood ? ', tâm trạng ' + MOODS[mood] : ''}`;
      html += `<button type="button" class="${classes.join(' ')}" data-date="${k}" ${future ? 'disabled' : ''} aria-label="${label}" aria-current="${k === key(selected) ? 'date' : 'false'}">${d}<i class="jb-dot"></i></button>`;
    }
    $('jbCalendar').innerHTML = html;
    $('jbNextMonth').disabled = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1) > new Date();
  }

  $('jbCalendar').addEventListener('click', e => {
    const b = e.target.closest('.jb-day');
    if (!b || b.disabled) return;
    const [y, m, d] = b.dataset.date.split('-').map(Number);
    go(new Date(y, m - 1, d));
  });
  $('jbPrevMonth').addEventListener('click', () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1); renderCalendar(); });
  $('jbNextMonth').addEventListener('click', () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1); renderCalendar(); });

  // ---- Day page ----
  function lunarLabel(d) {
    const l = solarToLunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (!l.year) return '';
    const day = l.day <= 10 ? `Mùng ${l.day}` : `Ngày ${l.day}`;
    return `${day} tháng ${l.month}${l.isLeap ? ' nhuận' : ''} năm ${thienCan[canOfYear(l.year)]} ${diaChi[chiOfYear(l.year)]}`;
  }

  function renderDay() {
    const k = key(selected);
    const page = pages[k] || {};
    $('jbDateSolar').textContent = `${WEEKDAYS[selected.getDay()]}, ${selected.getDate()} tháng ${selected.getMonth() + 1}, ${selected.getFullYear()}`;
    $('jbDateLunar').textContent = lunarLabel(selected);
    $('jbNextDay').disabled = isToday(selected);
    $('jbToday').hidden = isToday(selected);

    fields.forEach(f => { f.value = page[f.dataset.field] || ''; autosize(f); });
    document.querySelectorAll('#jbMood [data-mood]').forEach(b => {
      const on = Number(b.dataset.mood) === page.mood;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on);
    });

    // Morning intention: from the Home view; today's can be set right here
    const it = intentions[k];
    const box = $('jbIntention');
    if (it && it.entry) {
      const kept = it.honored === true ? ' <span class="jb-kept">✓ đã làm được</span>' : it.honored === false ? ' <span class="jb-missed">chưa làm được</span>' : '';
      box.innerHTML = `<span class="jb-intention-text"></span>${kept}`;
      box.querySelector('.jb-intention-text').textContent = it.entry;
    } else if (isToday(selected)) {
      box.innerHTML = '<input type="text" class="jb-intention-input" placeholder="Điều gì quan trọng nhất hôm nay?" aria-label="Ý định hôm nay">';
      box.querySelector('input').addEventListener('keydown', e => {
        if (e.key !== 'Enter' || !e.target.value.trim()) return;
        const text = e.target.value.trim();
        saveJournalEntry(text);
        intentions[k] = { date: k, entry: text, honored: null };
        renderDay();
        renderCalendar();
      });
    } else {
      box.innerHTML = '<span class="jb-muted">Không đặt ý định</span>';
    }

    renderFacts(k);
    $('jbSaved').textContent = page.updatedAt ? `Sửa lần cuối ${new Date(page.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : '';
  }

  // The day's footprint, from data ZenTab already has
  function renderFacts(k) {
    const parts = [];
    const f = focusByDay[k];
    if (f && f.minutes) parts.push(`${f.minutes} phút tập trung`);
    if (k === key(new Date()) && typeof tasks !== 'undefined') {
      const done = tasks.filter(t => t.done).length;
      if (done) parts.push(`${done} việc đã xong`);
    }
    const it = intentions[k];
    if (it && it.honored === true) parts.push('✓ giữ được ý định');
    $('jbFacts').textContent = parts.join(' · ');
  }

  function go(date, dir) {
    flush();
    const prev = selected;
    selected = startOfDay(date);
    if (selected.getMonth() !== viewMonth.getMonth() || selected.getFullYear() !== viewMonth.getFullYear()) {
      viewMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
    }
    renderCalendar();
    renderDay();
    // Page-turn cue (CSS honours reduced motion)
    const day = $('jbDay');
    day.classList.remove('turn-next', 'turn-prev');
    void day.offsetWidth;
    day.classList.add((dir || (selected > prev ? 1 : -1)) > 0 ? 'turn-next' : 'turn-prev');
  }
  const shift = n => {
    const d = new Date(selected);
    d.setDate(d.getDate() + n);
    if (d > startOfDay(new Date())) return;
    go(d, n);
  };
  $('jbPrevDay').addEventListener('click', () => shift(-1));
  $('jbNextDay').addEventListener('click', () => shift(1));
  $('jbToday').addEventListener('click', () => go(new Date(), 1));

  // ← → turn pages, unless the user is typing
  document.addEventListener('keydown', e => {
    if (!document.getElementById('view-journal').classList.contains('active')) return;
    if (e.target.matches('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); shift(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); shift(1); }
  });

  // ---- Writing + autosave ----
  function autosize(t) {
    if (!t.classList.contains('jb-short')) return;
    t.style.height = 'auto';
    t.style.height = `${Math.max(t.scrollHeight, 64)}px`;
  }

  function writePage(k, patch) {
    const page = { ...(pages[k] || {}), ...patch, updatedAt: Date.now() };
    const empty = !page.mood && ['notes', 'did', 'grateful', 'tomorrow'].every(f => !(page[f] || '').trim());
    if (empty) delete pages[k]; else pages[k] = page;
    chrome.storage.local.set({ journalPages: pages }, () => {
      $('jbSaved').textContent = 'Đã lưu ✓';
      renderCalendar();
    });
  }

  function collect() {
    const patch = {};
    fields.forEach(f => { patch[f.dataset.field] = f.value; });
    return patch;
  }

  function flush() {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    writePage(key(selected), collect());
  }

  fields.forEach(f => f.addEventListener('input', () => {
    autosize(f);
    $('jbSaved').textContent = 'Đang lưu…';
    clearTimeout(saveTimer);
    const k = key(selected);
    saveTimer = setTimeout(() => { saveTimer = null; writePage(k, collect()); }, 600);
  }));
  window.addEventListener('pagehide', flush);

  document.querySelectorAll('#jbMood [data-mood]').forEach(b => b.addEventListener('click', () => {
    const k = key(selected);
    const mood = Number(b.dataset.mood);
    const current = pages[k] && pages[k].mood;
    flush();
    writePage(k, { ...collect(), mood: current === mood ? null : mood });
    renderDay();
  }));

  window.ZenJournal = {
    open() {
      load(() => { renderCalendar(); renderDay(); });
    }
  };
})();
