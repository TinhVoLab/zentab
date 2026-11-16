// Lời nhắn đúng lúc: the dock quote is chosen from what ZenTab already knows about the day
// (yesterday's mood and intention, focus streak, a finished Pomodoro, a long task list,
// rain, the lunar calendar, the time of day). Everything is read locally; nothing is sent.
// A pick holds for its moment (one per morning/afternoon/evening, or per signal), and a
// quote shown in the last two weeks isn't picked again while others fit. The reader can
// keep (♡) or hide a quote and add their own; those shape later picks.
// Loaded before script.js; at call time it uses script.js helpers (getDateStr, solarToLunar,
// getFocusHistory, tasks). Exposes window.ZenQuotes.
(function () {
  // Every quote has a known source; translations of foreign texts are ours.
  // Tags: khoi-dau (beginning), kien-tri (persevering), diu-dang (gentle with yourself),
  // nghi-ngoi (rest), tap-trung (focus), tinh-tam (stillness), nhin-lai (looking back),
  // thien (Zen/Buddhist, for Rằm and Mùng Một), mua (rain)
  const LIST = [
    { id: 'lt64', text: 'Hành trình ngàn dặm bắt đầu từ một bước chân.', author: 'Lão Tử, Đạo Đức Kinh', tags: ['khoi-dau', 'kien-tri'] },
    { id: 'lt63', text: 'Việc khó trong thiên hạ ắt bắt đầu từ chỗ dễ; việc lớn trong thiên hạ ắt bắt đầu từ chỗ nhỏ.', author: 'Lão Tử, Đạo Đức Kinh', tags: ['khoi-dau', 'tap-trung'] },
    { id: 'lt33a', text: 'Biết người là trí, biết mình là sáng.', author: 'Lão Tử, Đạo Đức Kinh', tags: ['nhin-lai'] },
    { id: 'lt33b', text: 'Biết đủ là giàu.', author: 'Lão Tử, Đạo Đức Kinh', tags: ['nhin-lai', 'tinh-tam'] },
    { id: 'lt16', text: 'Đạt tới chỗ hư không tột cùng, giữ sự tĩnh lặng cho vững bền.', author: 'Lão Tử, Đạo Đức Kinh', tags: ['tinh-tam', 'mua'] },
    { id: 'kt-hoc', text: 'Học mà không nghĩ thì uổng công, nghĩ mà không học thì nguy.', author: 'Khổng Tử, Luận Ngữ', tags: ['tap-trung'] },
    { id: 'kt-thich', text: 'Biết không bằng thích, thích không bằng vui với nó.', author: 'Khổng Tử, Luận Ngữ', tags: ['tap-trung', 'kien-tri'] },
    { id: 'kt-thu', text: 'Điều mình không muốn, chớ làm cho người.', author: 'Khổng Tử, Luận Ngữ', tags: ['nhin-lai'] },
    { id: 'tt-xet', text: 'Mỗi ngày tôi tự xét mình ba lần.', author: 'Tăng Tử, Luận Ngữ', tags: ['nhin-lai'] },
    { id: 'lotan', text: 'Trên mặt đất vốn làm gì có đường, người ta đi mãi thì thành đường thôi.', author: 'Lỗ Tấn, Cố hương', tags: ['kien-tri', 'khoi-dau'] },

    { id: 'hcm', text: 'Không có việc gì khó, chỉ sợ lòng không bền. Đào núi và lấp biển, quyết chí ắt làm nên.', author: 'Hồ Chí Minh', tags: ['kien-tri', 'khoi-dau'] },
    { id: 'tn-kim', text: 'Có công mài sắt, có ngày nên kim.', author: 'Tục ngữ', tags: ['kien-tri'] },
    { id: 'tn-da', text: 'Nước chảy đá mòn.', author: 'Tục ngữ', tags: ['kien-tri'] },
    { id: 'tn-tich', text: 'Tích tiểu thành đại.', author: 'Thành ngữ', tags: ['kien-tri', 'tap-trung'] },
    { id: 'tn-nan', text: 'Vạn sự khởi đầu nan.', author: 'Thành ngữ', tags: ['khoi-dau', 'diu-dang'] },
    { id: 'tn-mua', text: 'Sau cơn mưa trời lại sáng.', author: 'Tục ngữ', tags: ['diu-dang', 'mua'] },
    { id: 'tn-qua', text: 'Ăn quả nhớ kẻ trồng cây.', author: 'Tục ngữ', tags: ['nhin-lai'] },

    { id: 'tnt', text: 'Ở đời vui đạo hãy tuỳ duyên, đói đến thì ăn, mệt ngủ liền.', author: 'Trần Nhân Tông, Cư trần lạc đạo phú', tags: ['thien', 'nghi-ngoi', 'tinh-tam'] },
    { id: 'mangiac', text: 'Chớ bảo xuân tàn hoa rụng hết, đêm qua sân trước một cành mai.', author: 'Thiền sư Mãn Giác', tags: ['thien', 'diu-dang'] },
    { id: 'phapcu1', text: 'Ý dẫn đầu các pháp, ý làm chủ, ý tạo.', author: 'Kinh Pháp Cú', tags: ['thien', 'tinh-tam'] },
    { id: 'phapcu103', text: 'Dù thắng ngàn quân địch nơi chiến trường, không bằng tự thắng mình; tự thắng mình mới là chiến thắng tối thượng.', author: 'Kinh Pháp Cú', tags: ['thien', 'kien-tri'] },
    { id: 'tnh-tho', text: 'Thở vào, tôi làm lắng dịu thân. Thở ra, tôi mỉm cười.', author: 'Thích Nhất Hạnh', tags: ['nghi-ngoi', 'diu-dang', 'thien', 'mua'] },
    { id: 'tnh-di', text: 'Hãy bước đi như thể bàn chân bạn đang hôn lên mặt đất.', author: 'Thích Nhất Hạnh', tags: ['nghi-ngoi', 'thien'] },

    { id: 'sen-ngan', text: 'Không phải ta có ít thời gian để sống, mà là ta phung phí quá nhiều.', author: 'Seneca, Về sự ngắn ngủi của đời người', tags: ['tap-trung', 'nhin-lai'] },
    { id: 'sen-gio', text: 'Không có ngọn gió nào thuận cho người không biết mình đi về đâu.', author: 'Seneca', tags: ['khoi-dau', 'tap-trung'] },
    { id: 'sen-khap', text: 'Ở khắp mọi nơi tức là chẳng ở nơi nào cả.', author: 'Seneca', tags: ['tap-trung'] },
    { id: 'sen-tuong', text: 'Ta khổ trong tưởng tượng nhiều hơn ngoài đời thật.', author: 'Seneca', tags: ['diu-dang'] },
    { id: 'epic', text: 'Con người bị xáo trộn không phải bởi sự việc, mà bởi cách họ nghĩ về sự việc.', author: 'Epictetus', tags: ['diu-dang', 'tinh-tam'] },
    { id: 'ma-1217', text: 'Nếu không đúng, đừng làm; nếu không thật, đừng nói.', author: 'Marcus Aurelius, Suy tưởng', tags: ['nhin-lai'] },
    { id: 'ma-847', text: 'Nếu điều gì bên ngoài làm bạn khổ, nỗi khổ không nằm ở nó mà ở cách bạn nhìn nó, và điều đó bạn có thể đổi bất cứ lúc nào.', author: 'Marcus Aurelius, Suy tưởng', tags: ['diu-dang'] },
    { id: 'aristotle', text: 'Khởi đầu là một nửa của mọi việc.', author: 'Aristotle, Chính trị luận', tags: ['khoi-dau'] },

    { id: 'pascal', text: 'Mọi bất hạnh của con người đều đến từ việc không biết ngồi yên lặng trong một căn phòng.', author: 'Blaise Pascal', tags: ['tinh-tam', 'nghi-ngoi', 'mua'] },
    { id: 'kierkegaard', text: 'Cuộc đời chỉ có thể hiểu được khi nhìn lại, nhưng phải được sống khi tiến về phía trước.', author: 'Søren Kierkegaard', tags: ['nhin-lai'] },
    { id: 'james', text: 'Nghệ thuật của sự khôn ngoan là biết nên bỏ qua điều gì.', author: 'William James', tags: ['tap-trung'] },
    { id: 'allen', text: 'Con người càng an tĩnh, thành công càng lớn.', author: 'James Allen', tags: ['tinh-tam', 'kien-tri'] },
    { id: 'lubbock', text: 'Nghỉ ngơi không phải là lười biếng. Nằm dưới bóng cây ngày hè, nghe nước chảy, ngắm mây trôi, chẳng bao giờ là phí thời gian.', author: 'John Lubbock', tags: ['nghi-ngoi'] },
    { id: 'exupery', text: 'Hoàn hảo không phải là khi không còn gì để thêm, mà là khi không còn gì để bớt.', author: 'Antoine de Saint-Exupéry', tags: ['tap-trung'] },
    { id: 'drucker', text: 'Không gì vô ích bằng làm thật hiệu quả một việc lẽ ra không cần làm.', author: 'Peter Drucker', tags: ['tap-trung'] },
    { id: 'jobs', text: 'Tập trung là biết nói không.', author: 'Steve Jobs', tags: ['tap-trung'] },
    { id: 'dillard', text: 'Cách ta sống mỗi ngày cũng chính là cách ta sống cả đời.', author: 'Annie Dillard', tags: ['khoi-dau', 'nhin-lai'] },
    { id: 'oliver', text: 'Hãy nói tôi nghe, bạn định làm gì với cuộc đời duy nhất, hoang dại và quý giá của mình?', author: 'Mary Oliver', tags: ['khoi-dau', 'nhin-lai'] },
    { id: 'beckett', text: 'Đã thử. Đã thất bại. Không sao. Thử lại. Thất bại lại. Thất bại khá hơn.', author: 'Samuel Beckett', tags: ['diu-dang', 'kien-tri'] },
    { id: 'cohen', text: 'Mọi thứ đều có một vết nứt, đó là nơi ánh sáng lọt vào.', author: 'Leonard Cohen', tags: ['diu-dang'] },
    { id: 'lamott', text: 'Hầu như mọi thứ sẽ chạy lại nếu bạn rút điện vài phút, kể cả chính bạn.', author: 'Anne Lamott', tags: ['nghi-ngoi'] },
  ];

  const REPEAT_DAYS = 14;
  const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

  const get = (area, keys) => new Promise(r => chrome.storage[area].get(keys, r));
  const dayStr = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return getDateStr(d); };

  function period(hour) {
    if (hour >= 4 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 18) return 'afternoon';
    return 'evening';
  }

  function streakFrom(history) {
    const minutesOn = d => (history[getDateStr(d)] || {}).minutes || 0;
    const d = new Date();
    if (!minutesOn(d)) d.setDate(d.getDate() - 1);
    let n = 0;
    while (minutesOn(d) > 0) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // The first signal that applies decides the theme; `hint` is the hover note on the quote
  async function readSignal(opts) {
    const now = new Date();
    const today = getDateStr(now), yesterday = dayStr(-1);
    const [{ journalPages, weatherCache }, { journal }] = await Promise.all([
      get('local', ['journalPages', 'weatherCache']),
      get('sync', 'journal'),
    ]);
    const pages = journalPages || {};
    const intentions = journal || [];
    const part = period(now.getHours());
    const partName = { morning: 'buổi sáng', afternoon: 'buổi chiều', evening: 'buổi tối' }[part];

    const mood = (pages[today] && pages[today].mood) || (pages[yesterday] && pages[yesterday].mood);
    if (mood && mood <= 2) return { key: 'gentle', tags: ['diu-dang', 'nghi-ngoi'], hint: 'Một lời nhẹ nhàng cho hôm nay' };

    const y = intentions.find(e => e.date === yesterday);
    if (y && y.entry && y.honored === false && part !== 'evening') {
      return { key: 'restart', tags: ['diu-dang', 'khoi-dau'], hint: 'Hôm nay là một trang mới' };
    }

    if (opts.justFocused) return { key: 'break-' + Date.now(), tags: ['nghi-ngoi'], hint: 'Cho giờ nghỉ của bạn' };

    const [ly, lm, ld] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
    const lunar = solarToLunar(ly, lm, ld);
    if (lunar.month === 1 && lunar.day <= 3 && !lunar.isLeap) return { key: 'tet', tags: ['khoi-dau'], hint: 'Năm mới an lành' };
    if (lunar.day === 15) return { key: 'ram', tags: ['thien'], hint: 'Ngày Rằm' };
    if (lunar.day === 1) return { key: 'mung1', tags: ['thien'], hint: 'Ngày mùng Một' };

    const streak = await new Promise(r => getFocusHistory(h => r(streakFrom(h))));
    if (streak >= 3) return { key: 'streak', tags: ['kien-tri'], hint: `Cho chuỗi ${streak} ngày tập trung` };

    const open = (typeof tasks !== 'undefined' ? tasks : []).filter(t => !t.done).length;
    if (open >= 6) return { key: 'busy', tags: ['tap-trung'], hint: 'Cho một ngày nhiều việc' };

    if (weatherCache && Date.now() - weatherCache.timestamp < 3 * 3600 * 1000 && RAIN_CODES.has(weatherCache.weatherCode)) {
      // shares the time-of-day moment, so weather arriving later doesn't swap a quote already shown
      return { key: part, tags: ['mua', 'tinh-tam'], hint: 'Cho một ngày mưa' };
    }

    const hasIntention = intentions.some(e => e.date === today && e.entry);
    const tags = part === 'morning' ? (hasIntention ? ['tap-trung', 'kien-tri'] : ['khoi-dau'])
      : part === 'afternoon' ? ['tap-trung', 'kien-tri', 'tinh-tam']
      : ['nhin-lai', 'tinh-tam'];
    return { key: part, tags, hint: `Cho ${partName} của bạn` };
  }

  // Small stable hash so a moment always lands on the same quote among its candidates
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // ---- The reader's own touch: ♡ kept, hidden, and their own quotes ----
  // Kept and hidden ids sync across devices (small); own quotes stay on this device.
  const OWN_MAX = 50, OWN_TEXT_MAX = 240, OWN_AUTHOR_MAX = 60;
  let prefs = { fav: [], hidden: [] };
  let own = [];
  const ready = Promise.all([get('sync', 'quotePrefs'), get('local', 'ownQuotes')]).then(([{ quotePrefs }, { ownQuotes }]) => {
    prefs = { fav: [], hidden: [], ...(quotePrefs || {}) };
    own = ownQuotes || [];
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.quotePrefs) prefs = { fav: [], hidden: [], ...(changes.quotePrefs.newValue || {}) };
    else if (area === 'local' && changes.ownQuotes) own = changes.ownQuotes.newValue || [];
    else return;
    document.dispatchEvent(new CustomEvent('zenquotes:change'));
  });
  const savePrefs = () => chrome.storage.sync.set({ quotePrefs: prefs });

  // Own quotes first: they fit every moment
  const all = () => [...own.map(q => ({ ...q, own: true, tags: [] })), ...LIST].filter(q => !prefs.hidden.includes(q.id));
  const byId = id => [...own.map(q => ({ ...q, own: true, tags: [] })), ...LIST].find(q => q.id === id);

  // Weighted pick: own quotes ×3, kept ×2, and +1 for the theme the reader keeps most often
  function pick(pool, seed) {
    const favTags = {};
    prefs.fav.forEach(id => (byId(id)?.tags || []).forEach(t => { favTags[t] = (favTags[t] || 0) + 1; }));
    const top = Object.entries(favTags).sort((a, b) => b[1] - a[1])[0];
    const weights = pool.map(q => (q.own ? 3 : 1) + (prefs.fav.includes(q.id) ? 1 : 0) + (top && q.tags.includes(top[0]) ? 1 : 0));
    let n = hash(seed) % weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { n -= weights[i]; if (n < 0) return pool[i]; }
    return pool[0];
  }

  async function choose(opts = {}) {
    await ready;
    const signal = await readSignal(opts);
    const today = getDateStr(new Date());
    const momentKey = `${today}|${signal.key}`;
    const { quoteState, quoteLog } = await get('local', ['quoteState', 'quoteLog']);
    const state = quoteState || { moment: null, id: null, shown: [] };
    const list = all();

    let quote = state.moment === momentKey && list.find(q => q.id === state.id);
    let hint = quote && state.hint ? state.hint : signal.hint; // the note that came with the pick
    if (!quote) {
      hint = signal.hint;
      const cutoff = getDateStr(new Date(Date.now() - REPEAT_DAYS * 86400000));
      const recent = new Set(state.shown.filter(s => s.date > cutoff).map(s => s.id));
      const fits = list.filter(q => q.own || q.tags.some(t => signal.tags.includes(t)));
      const fresh = fits.filter(q => !recent.has(q.id));
      const pool = fresh.length ? fresh : (fits.length ? fits : list);
      quote = pick(pool, momentKey);
      const shown = [...state.shown.filter(s => s.date > cutoff && s.id !== quote.id), { id: quote.id, date: today }];
      chrome.storage.local.set({ quoteState: { moment: momentKey, id: quote.id, hint, shown } });
    }
    // The first quote of each day goes into the journal page for that day
    const log = quoteLog || {};
    if (quote && !log[today]) {
      log[today] = { text: quote.text, author: quote.author || '' };
      const keep = Object.keys(log).sort().slice(-400);
      chrome.storage.local.set({ quoteLog: Object.fromEntries(keep.map(k => [k, log[k]])) });
    }
    return { quote, hint };
  }

  function toggleFav(id) {
    const on = !prefs.fav.includes(id);
    prefs.fav = on ? [...prefs.fav, id] : prefs.fav.filter(x => x !== id);
    savePrefs();
    return on;
  }
  function hide(id) {
    if (!prefs.hidden.includes(id)) prefs.hidden = [...prefs.hidden, id];
    prefs.fav = prefs.fav.filter(x => x !== id);
    savePrefs();
  }
  function unhideAll() { prefs.hidden = []; savePrefs(); }
  function addOwn(text, author) {
    text = text.trim().replace(/^["“”']+|["“”']+$/g, '').slice(0, OWN_TEXT_MAX);
    if (!text || own.length >= OWN_MAX) return false;
    own = [{ id: 'own-' + Date.now().toString(36), text, author: author.trim().slice(0, OWN_AUTHOR_MAX) }, ...own];
    chrome.storage.local.set({ ownQuotes: own });
    return true;
  }
  function removeOwn(id) {
    own = own.filter(q => q.id !== id);
    prefs.fav = prefs.fav.filter(x => x !== id);
    chrome.storage.local.set({ ownQuotes: own });
    savePrefs();
  }

  // ---- Settings → Lời nhắn: own quotes, kept quotes, hidden count ----
  function initSettings() {
    const ownList = document.getElementById('ownQuoteList');
    if (!ownList) return;
    const favList = document.getElementById('favQuoteList');
    const textEl = document.getElementById('ownQuoteText');
    const authorEl = document.getElementById('ownQuoteAuthor');
    const addBtn = document.getElementById('ownQuoteAdd');
    const hiddenRow = document.getElementById('hiddenQuotesRow');

    const row = (q, label, onRemove) => {
      const li = document.createElement('li');
      li.className = 'quote-row';
      const body = document.createElement('div');
      const t = document.createElement('p');
      t.className = 'quote-row-text';
      t.textContent = `“${q.text}”`;
      body.append(t);
      if (q.author) {
        const a = document.createElement('span');
        a.className = 'quote-row-author';
        a.textContent = q.author;
        body.append(a);
      }
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'quote-row-remove';
      x.textContent = '✕';
      x.title = x.ariaLabel = label;
      x.addEventListener('click', onRemove);
      li.append(body, x);
      return li;
    };
    const empty = text => { const li = document.createElement('li'); li.className = 'quote-row-empty'; li.textContent = text; return li; };

    function render() {
      ownList.replaceChildren(...(own.length ? own.map(q => row(q, 'Xoá câu này', () => removeOwn(q.id)))
        : [empty('Chưa có. Một câu mẹ dặn, một dòng trong cuốn sách bạn yêu…')]));
      const favs = prefs.fav.map(byId).filter(Boolean);
      favList.replaceChildren(...(favs.length ? favs.map(q => row(q, 'Bỏ giữ lại', () => toggleFav(q.id)))
        : [empty('Bấm ♡ dưới câu trích dẫn ở Trang chủ để giữ lại câu bạn thích.')]));
      const n = prefs.hidden.length;
      hiddenRow.hidden = !n;
      hiddenRow.querySelector('span').textContent = `Đã ẩn ${n} câu`;
      addBtn.disabled = own.length >= OWN_MAX;
    }

    const add = () => {
      if (addOwn(textEl.value, authorEl.value)) { textEl.value = ''; authorEl.value = ''; render(); textEl.focus(); }
    };
    addBtn.addEventListener('click', add);
    textEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); } });
    authorEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    hiddenRow.querySelector('button').addEventListener('click', unhideAll);
    document.addEventListener('zenquotes:change', render);
    ready.then(render);
  }
  initSettings();

  window.ZenQuotes = {
    choose, all, byId, ready, toggleFav, hide,
    isFav: id => prefs.fav.includes(id),
    dayQuote: date => get('local', 'quoteLog').then(({ quoteLog }) => (quoteLog || {})[date] || null),
  };
})();
