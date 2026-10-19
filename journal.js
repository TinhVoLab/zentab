// Nhật ký: a notebook spread — month index on the left, one page per day on the right.
// Pages live in storage.local (journal text outgrows storage.sync's limits); the morning
// intention keeps coming from the existing sync "journal" entries.
// Uses helpers from script.js (getDateStr, solarToLunar, thienCan, diaChi, canOfYear,
// getFocusHistory, saveJournalEntry, tasks). Exposes window.ZenJournal.
(function () {
  const book = document.getElementById('journalBook');
  if (!book) return;

  const $ = id => document.getElementById(id);
  // Sounds are a nicety: never let audio problems interrupt writing
  const sound = (name, ...args) => { try { window.ZenAmbient?.[name]?.(...args); } catch (e) {} };
  const fields = [...book.querySelectorAll('textarea[data-field]')];
  const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const MOODS = { 1: 'rất tệ', 2: 'không ổn', 3: 'bình thường', 4: 'tốt', 5: 'rất tốt' };
  const MOOD_EMOJI = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };
  const TEXT_FIELDS = ['notes', 'did', 'grateful', 'tomorrow'];
  const QUESTIONS = { did: 'Hôm nay mình làm được gì?', grateful: 'Mình biết ơn điều gì?', tomorrow: 'Ngày mai ưu tiên gì?' };

  let pages = {};          // { 'YYYY-MM-DD': { notes, did, grateful, tomorrow, mood, updatedAt } }
  let intentions = {};     // { 'YYYY-MM-DD': { entry, honored } } from the sync journal
  let focusByDay = {};
  let dayQuotes = {};      // { 'YYYY-MM-DD': { text, author } }: the day's dock quote (quotes.js)
  let selected = startOfDay(new Date());
  let viewMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
  let saveTimer = null;
  let loaded = false;

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  const key = d => getDateStr(d);
  const isToday = d => key(d) === key(new Date());

  // ---- Load ----
  function load(cb) {
    chrome.storage.local.get(['journalPages', 'journalPaper', 'quoteLog'], ({ journalPages, journalPaper, quoteLog }) => {
      pages = journalPages || {};
      dayQuotes = quoteLog || {};
      setPaper(journalPaper || 'cream', false);
      chrome.storage.sync.get('journal', ({ journal }) => {
        intentions = {};
        (journal || []).forEach(e => { intentions[e.date] = e; });
        // The sync journal keeps only ~30 days: copy each intention into its page so the
        // notebook keeps it after it rotates out
        let changed = false;
        Object.values(intentions).forEach(e => {
          if (!e.entry) return;
          const snap = { entry: e.entry, honored: e.honored ?? null };
          const cur = pages[e.date] && pages[e.date].intention;
          if (!cur || cur.entry !== snap.entry || cur.honored !== snap.honored) {
            pages[e.date] = { ...(pages[e.date] || {}), intention: snap };
            changed = true;
          }
        });
        if (changed) chrome.storage.local.set({ journalPages: pages });
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
  const intentionOf = k => intentions[k] || (pages[k] && pages[k].intention) || null;
  function pageHasContent(k) {
    const p = pages[k];
    return !!(p && (p.mood || TEXT_FIELDS.some(f => (p[f] || '').trim()))) || !!(intentionOf(k) && intentionOf(k).entry);
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
    $('jbCornerNext').hidden = isToday(selected);
    $('jbToday').hidden = isToday(selected);

    fields.forEach(f => { f.value = page[f.dataset.field] || ''; autosize(f); });
    document.querySelectorAll('#jbMood [data-mood]').forEach(b => {
      const on = Number(b.dataset.mood) === page.mood;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on);
    });

    // Morning intention: from the Home view; today's can be set right here
    const it = intentionOf(k);
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

    renderDayQuote(k);
    renderFacts(k);
    $('jbSaved').textContent = page.updatedAt ? `Sửa lần cuối ${new Date(page.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : '';
  }

  function renderDayQuote(k) {
    const q = dayQuotes[k];
    const el = $('jbQuote');
    el.hidden = !q;
    if (!q) return;
    const by = document.createElement('span');
    by.textContent = q.author ? ` — ${q.author}` : '';
    el.replaceChildren(`“${q.text}”`, by);
  }
  // Today's quote is usually picked after the notebook has loaded
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.quoteLog) return;
    dayQuotes = changes.quoteLog.newValue || {};
    if (loaded) renderDayQuote(key(selected));
  });

  // The day's footprint, from data ZenTab already has
  function renderFacts(k) {
    const parts = [];
    const f = focusByDay[k];
    if (f && f.minutes) parts.push(`${f.minutes} phút tập trung`);
    if (k === key(new Date()) && typeof tasks !== 'undefined') {
      const done = tasks.filter(t => t.done).length;
      if (done) parts.push(`${done} việc đã xong`);
    }
    const it = intentionOf(k);
    if (it && it.honored === true) parts.push('✓ giữ được ý định');
    $('jbFacts').textContent = parts.join(' · ');
  }

  // ---- Turning pages: a 3D leaf hinged on the spine ----
  // Forward: the current page lifts from the right and turns over onto the left.
  // Back: the previous page comes over from the left and settles on the right.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TURN_MS = 820;
  let turning = false;

  // A static copy of the day page (textarea values come along with cloneNode)
  function snapshot() {
    const c = $('jbDay').cloneNode(true);
    c.removeAttribute('id');
    c.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    c.classList.remove('turn-next', 'turn-prev');
    c.classList.add('jb-leaf-face');
    c.setAttribute('aria-hidden', 'true');
    c.inert = true;
    return c;
  }

  // A layer exactly over the right-hand page
  function overlay(cls, children) {
    const day = $('jbDay');
    const el = document.createElement('div');
    el.className = cls;
    Object.assign(el.style, { left: `${day.offsetLeft}px`, top: `${day.offsetTop}px`, width: `${day.offsetWidth}px`, height: `${day.offsetHeight}px` });
    children.forEach(c => el.appendChild(c));
    book.appendChild(el);
    return el;
  }

  function buildLeaf(front) {
    const back = document.createElement('div');
    back.className = 'jb-page jb-leaf-back';
    const shade = document.createElement('div');
    shade.className = 'jb-leaf-shade';
    return overlay('jb-leaf', [front, back, shade]);
  }

  // Leaf angle for progress p (0 → 1) in a direction
  const angleAt = (dir, p) => dir > 0 ? -180 * p : -180 * (1 - p);
  // The right page is wider than the left one, so the sheet narrows as it turns until it
  // lies exactly over the left page instead of overhanging the book
  function leafTransform(dir, p) {
    const a = angleAt(dir, p);
    const day = $('jbDay');
    const ratio = Math.min(1, day.offsetLeft / day.offsetWidth);
    const t = Math.abs(a) / 180;
    const k = t * t * (3 - 2 * t); // smoothstep: barely narrows early, lands at the left page's width
    return `rotateY(${a}deg) scaleX(${1 - (1 - ratio) * k})`;
  }
  function pose(t, p) {
    t.leaf.style.transform = leafTransform(t.dir, p);
    // Light falls off as the page stands up, brightest when flat
    t.leaf.lastChild.style.opacity = String(Math.sin(Math.PI * p) * 0.55);
  }

  function applyDate(date) {
    selected = startOfDay(date);
    if (selected.getMonth() !== viewMonth.getMonth() || selected.getFullYear() !== viewMonth.getFullYear()) {
      viewMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
    }
    renderCalendar();
    renderDay();
  }

  // Start a turn: the new day is rendered underneath right away
  function beginTurn(date, dir) {
    flush();
    const prevDate = selected;
    const old = snapshot();
    applyDate(date);
    const t = { dir, prevDate, under: null, leaf: null };
    if (dir > 0) {
      t.leaf = buildLeaf(old);
    } else {
      // keep showing the old page until the incoming one lands on it
      t.under = overlay('jb-under', [old]);
      t.leaf = buildLeaf(snapshot());
    }
    pose(t, 0);
    return t;
  }

  function endTurn(t, fromP, complete) {
    const toP = complete ? 1 : 0;
    const dur = TURN_MS * Math.max(0.25, Math.abs(toP - fromP));
    // Sample the path so the narrowing past 90° follows the turn smoothly
    const steps = 16;
    const frames = Array.from({ length: steps + 1 }, (_, i) => ({ transform: leafTransform(t.dir, fromP + (toP - fromP) * (i / steps)) }));
    const anim = t.leaf.animate(frames, { duration: dur, easing: 'cubic-bezier(0.4, 0.1, 0.25, 1)', fill: 'forwards' });
    t.leaf.lastChild.animate([{ opacity: 0.3 }, { opacity: 0 }], { duration: dur, fill: 'forwards' });
    anim.onfinish = () => {
      t.leaf.remove();
      if (t.under) t.under.remove();
      if (!complete) applyDate(t.prevDate); // released too early: stay on the old day
      turning = false;
    };
  }

  function go(date, dir) {
    const target = startOfDay(date);
    if (key(target) === key(selected) || turning) return;
    dir = dir || (target > selected ? 1 : -1);
    if (reduceMotion.matches) {
      flush();
      applyDate(target);
      const day = $('jbDay');
      day.classList.remove('turn-next', 'turn-prev');
      void day.offsetWidth;
      day.classList.add(dir > 0 ? 'turn-next' : 'turn-prev');
      return;
    }
    turning = true;
    sound('pageTurn');
    try {
      endTurn(beginTurn(target, dir), 0, true);
    } catch (e) {
      // never leave the notebook stuck mid-turn
      turning = false;
      book.querySelectorAll('.jb-leaf, .jb-under').forEach(el => el.remove());
      applyDate(target);
      console.warn('ZenTab: page turn failed,', e.message);
    }
  }

  // Grab a dog-eared corner and drag across the page; a click turns it outright
  function cornerTurn(dir, e) {
    if (turning) return;
    const target = new Date(selected);
    target.setDate(target.getDate() + dir);
    if (target > startOfDay(new Date())) return;
    if (reduceMotion.matches) { go(target, dir); return; }
    e.preventDefault();
    turning = true;
    const startX = e.clientX;
    const width = $('jbDay').offsetWidth;
    let t = null, p = 0, moved = false;
    const onMove = ev => {
      const dx = (ev.clientX - startX) * (dir > 0 ? -1 : 1);
      if (!moved && Math.abs(dx) < 6) return;
      if (!moved) { moved = true; t = beginTurn(target, dir); sound('pageTurn'); }
      p = Math.max(0, Math.min(1, dx / (width * 0.9)));
      pose(t, p);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (!moved) { turning = false; go(target, dir); return; }
      endTurn(t, p, p > 0.35);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
  $('jbCornerNext').addEventListener('pointerdown', e => cornerTurn(1, e));
  $('jbCornerPrev').addEventListener('pointerdown', e => cornerTurn(-1, e));
  // keyboard users: the corners are buttons too
  $('jbCornerNext').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shift(1); } });
  $('jbCornerPrev').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shift(-1); } });

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
    const empty = !page.mood && !page.intention && TEXT_FIELDS.every(f => !(page[f] || '').trim());
    if (empty) delete pages[k]; else pages[k] = page;
    chrome.storage.local.set({ journalPages: pages }, () => {
      $('jbSaved').textContent = 'Đã lưu ✓';
      renderCalendar();
      renderTags();
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

  // ---- Search (accent-insensitive: "ban" finds "bản", "đ" ~ "d") ----
  const fold = t => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const escapeText = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pageText = k => {
    const p = pages[k] || {};
    const it = intentionOf(k);
    return [it && it.entry, ...TEXT_FIELDS.map(f => p[f])].filter(Boolean).join('\n');
  };

  function allKeys() {
    return [...new Set([...Object.keys(pages), ...Object.keys(intentions)])].filter(pageHasContent).sort().reverse();
  }

  // Snippet around the first match; the folded text has the same length as the original,
  // so match offsets map straight back for highlighting
  function snippet(text, q) {
    text = text.normalize('NFC'); // keep folded offsets aligned with what we slice
    const i = fold(text).indexOf(q);
    if (i < 0) return escapeText(text.slice(0, 90));
    const start = Math.max(0, i - 40), end = Math.min(text.length, i + q.length + 50);
    return (start ? '…' : '') + escapeText(text.slice(start, i)) + '<mark>' + escapeText(text.slice(i, i + q.length)) + '</mark>' +
      escapeText(text.slice(i + q.length, end)) + (end < text.length ? '…' : '');
  }

  function runSearch() {
    const raw = $('jbSearch').value.trim();
    const q = fold(raw);
    $('jbIndex').hidden = !!q;
    $('jbResults').hidden = !q;
    if (!q) return;
    const hits = allKeys().filter(k => fold(pageText(k)).includes(q)).slice(0, 50);
    $('jbResults').innerHTML = hits.length
      ? `<p class="jb-results-count">${hits.length} trang có “${escapeText(raw)}”</p>` + hits.map(k => {
          const [y, m, d] = k.split('-').map(Number);
          const date = new Date(y, m - 1, d);
          return `<button type="button" class="jb-hit" data-date="${k}"><span class="jb-hit-date">${WEEKDAYS[date.getDay()]}, ${d}/${m}/${y}</span><span class="jb-hit-text">${snippet(pageText(k).replace(/\n/g, ' · '), q)}</span></button>`;
        }).join('')
      : `<p class="jb-results-count">Không tìm thấy “${escapeText(raw)}”.</p>`;
  }
  $('jbSearch').addEventListener('input', runSearch);
  $('jbSearch').addEventListener('keydown', e => { if (e.key === 'Escape') { e.target.value = ''; runSearch(); } });
  $('jbResults').addEventListener('click', e => {
    const hit = e.target.closest('.jb-hit');
    if (!hit) return;
    const [y, m, d] = hit.dataset.date.split('-').map(Number);
    go(new Date(y, m - 1, d));
  });

  // ---- #tags written anywhere on a page ----
  const TAG_RE = /#[\p{L}\p{N}_-]+/gu;
  function renderTags() {
    const counts = {};
    allKeys().forEach(k => (pageText(k).match(TAG_RE) || []).forEach(t => { const n = t.toLowerCase(); counts[n] = (counts[n] || 0) + 1; }));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    $('jbTags').innerHTML = top.length
      ? top.map(([t, n]) => `<button type="button" class="jb-tag" data-tag="${escapeText(t)}">${escapeText(t)} <small>${n}</small></button>`).join('')
      : '<span class="jb-hint">Gõ #tên-thẻ khi viết để gom các trang theo chủ đề.</span>';
  }
  $('jbTags').addEventListener('click', e => {
    const tag = e.target.closest('.jb-tag');
    if (!tag) return;
    $('jbSearch').value = tag.dataset.tag;
    runSearch();
  });

  // ---- Export, print, backup ----
  function dayHeading(k) {
    const [y, m, d] = k.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return { solar: `${WEEKDAYS[date.getDay()]}, ${d} tháng ${m}, ${y}`, lunar: lunarLabel(date) };
  }

  function pageMarkdown(k) {
    const p = pages[k] || {};
    const it = intentionOf(k);
    const { solar, lunar } = dayHeading(k);
    const out = [`## ${solar}`, `*${lunar}*${p.mood ? ` · Tâm trạng: ${MOOD_EMOJI[p.mood]} ${MOODS[p.mood]}` : ''}`, ''];
    const q = dayQuotes[k];
    if (q) out.push(`> “${q.text}”${q.author ? ` — ${q.author}` : ''}`, '');
    if (it && it.entry) out.push(`**Ý định:** ${it.entry}${it.honored === true ? ' ✓' : ''}`, '');
    if ((p.notes || '').trim()) out.push(p.notes.trim(), '');
    Object.entries(QUESTIONS).forEach(([f, q]) => { if ((p[f] || '').trim()) out.push(`**${q}** ${p[f].trim()}`, ''); });
    const f = focusByDay[k];
    if (f && f.minutes) out.push(`_${f.minutes} phút tập trung_`, '');
    return out.join('\n');
  }

  function monthKeys(y, m) {
    const prefix = `${y}-${String(m).padStart(2, '0')}-`;
    return allKeys().filter(k => k.startsWith(prefix)).reverse(); // oldest first, like a notebook
  }

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportMarkdown(scope) {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth() + 1;
    const keys = scope === 'month' ? monthKeys(y, m) : allKeys().reverse();
    if (!keys.length) { $('jbSaved').textContent = 'Chưa có trang nào để xuất'; return; }
    const title = scope === 'month' ? `# Nhật ký ZenTab · Tháng ${m}/${y}` : '# Nhật ký ZenTab';
    const body = [title, '', ...keys.map(k => pageMarkdown(k) + '\n---\n')].join('\n');
    download(scope === 'month' ? `nhat-ky-${y}-${String(m).padStart(2, '0')}.md` : `nhat-ky-zentab.md`, body, 'text/markdown;charset=utf-8');
  }

  function backup() {
    const data = { app: 'ZenTab', type: 'journal-backup', version: 1, exportedAt: new Date().toISOString(), pages, paper: book.dataset.paper };
    download(`zentab-nhat-ky-${getDateStr(new Date())}.json`, JSON.stringify(data, null, 2), 'application/json');
  }

  // Restore merges: for each day the more recently edited version wins
  function restore(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { data = null; }
      if (!data || data.type !== 'journal-backup' || typeof data.pages !== 'object') {
        $('jbSaved').textContent = 'File không phải bản sao lưu nhật ký ZenTab';
        return;
      }
      let added = 0;
      Object.entries(data.pages).forEach(([k, p]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !p || typeof p !== 'object') return;
        const clean = {};
        TEXT_FIELDS.forEach(f => { if (typeof p[f] === 'string') clean[f] = p[f]; });
        if ([1, 2, 3, 4, 5].includes(p.mood)) clean.mood = p.mood;
        if (p.intention && typeof p.intention.entry === 'string') clean.intention = { entry: p.intention.entry, honored: p.intention.honored ?? null };
        clean.updatedAt = Number(p.updatedAt) || 0;
        const cur = pages[k];
        if (!cur || (cur.updatedAt || 0) < clean.updatedAt) { pages[k] = { ...cur, ...clean }; added++; }
      });
      chrome.storage.local.set({ journalPages: pages }, () => {
        renderCalendar(); renderTags(); renderDay();
        $('jbSaved').textContent = added ? `Đã khôi phục ${added} trang` : 'Không có trang nào mới hơn bản trên máy';
      });
    };
    reader.readAsText(file);
  }

  // Print: render the month into a print-only container, styled as notebook pages
  function printMonth() {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth() + 1;
    const keys = monthKeys(y, m);
    const box = $('journalPrint');
    box.dataset.paper = book.dataset.paper;
    box.innerHTML = `<h1 class="jp-title">Nhật ký · Tháng ${m}/${y}</h1>` + (keys.length ? keys.map(k => {
      const p = pages[k] || {};
      const it = intentionOf(k);
      const { solar, lunar } = dayHeading(k);
      const qa = Object.entries(QUESTIONS).filter(([f]) => (p[f] || '').trim())
        .map(([f, q]) => `<p class="jp-q">${q}</p><p class="jp-a">${escapeText(p[f].trim())}</p>`).join('');
      return `<section class="jp-page">
        <h2>${solar}</h2><p class="jp-lunar">${lunar}${p.mood ? ` · ${MOOD_EMOJI[p.mood]} ${MOODS[p.mood]}` : ''}</p>
        ${dayQuotes[k] ? `<p class="jp-quote">“${escapeText(dayQuotes[k].text)}”${dayQuotes[k].author ? ` — ${escapeText(dayQuotes[k].author)}` : ''}</p>` : ''}
        ${it && it.entry ? `<p class="jp-intention">☀ ${escapeText(it.entry)}${it.honored === true ? ' ✓' : ''}</p>` : ''}
        ${(p.notes || '').trim() ? `<p class="jp-notes">${escapeText(p.notes.trim())}</p>` : ''}
        ${qa}
      </section>`;
    }).join('') : '<p>Chưa có trang nào trong tháng này.</p>');
    document.body.classList.add('printing-journal');
    window.print();
    document.body.classList.remove('printing-journal');
  }

  book.querySelectorAll('[data-export]').forEach(b => b.addEventListener('click', () => {
    flush();
    const kind = b.dataset.export;
    if (kind === 'md-month') exportMarkdown('month');
    if (kind === 'md-all') exportMarkdown('all');
    if (kind === 'backup') backup();
    if (kind === 'print') printMonth();
    b.closest('details').open = false;
  }));
  $('jbImport').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (file) restore(file);
    e.target.value = '';
    e.target.closest('details').open = false;
  });

  window.ZenJournal = {
    open() {
      load(() => { renderCalendar(); renderTags(); runSearch(); renderDay(); });
    }
  };
})();
