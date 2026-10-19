// Polyfill for chrome.storage when running outside of extension context (e.g. testing locally)
if (typeof chrome === 'undefined' || !chrome.storage) {
  const mockStorage = {
    get: (keys, callback) => {
      const result = {};
      let keysArray = [];
      let defaultValues = {};
      if (Array.isArray(keys)) {
        keysArray = keys;
      } else if (typeof keys === 'string') {
        keysArray = [keys];
      } else if (keys && typeof keys === 'object') {
        keysArray = Object.keys(keys);
        defaultValues = keys;
      }
      keysArray.forEach(key => {
        try {
          const val = localStorage.getItem(key);
          result[key] = val ? JSON.parse(val) : (defaultValues[key] !== undefined ? defaultValues[key] : undefined);
        } catch (e) {
          result[key] = localStorage.getItem(key) || defaultValues[key];
        }
      });
      setTimeout(() => callback(result), 0);
    },
    set: (items, callback) => {
      Object.keys(items).forEach(key => {
        const val = items[key];
        localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : val);
      });
      if (callback) setTimeout(callback, 0);
    },
    remove: (keys, callback) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => localStorage.removeItem(key));
      if (callback) setTimeout(callback, 0);
    }
  };
  window.chrome = window.chrome || {};
  window.chrome.storage = {
    sync: mockStorage,
    local: mockStorage
  };
  window.chrome.runtime = window.chrome.runtime || {
    getURL: (path) => path,
    sendMessage: () => {}
  };
}

// Particles
(function createParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      position: absolute;
      width: ${size}px; height: ${size}px;
      background: rgba(167, 139, 250, ${Math.random() * 0.5});
      border-radius: 50%;
      top: ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      box-shadow: 0 0 10px rgba(167, 139, 250, 0.5);
      animation: float ${Math.random() * 10 + 10}s linear infinite;
      opacity: ${Math.random()};
      pointer-events: none;
    `;
    container.appendChild(p);
  }
})();

// Load and apply Custom Offline Background and Blur immediately to prevent flashing
(function applyCustomBackground() {
  chrome.storage.local.get(['customOfflineBg', 'customBgBlur'], (data) => {
    if (data.customOfflineBg) {
      document.body.style.backgroundImage = `url(${data.customOfflineBg})`;
    }
    if (window.ZenAppearance) ZenAppearance.setCustomActive(!!data.customOfflineBg);
    const blurVal = (data.customBgBlur !== undefined) ? data.customBgBlur : 2;
    const overlay = document.querySelector('.overlay');
    if (overlay) {
      overlay.style.backdropFilter = `blur(${blurVal}px)`;
      overlay.style.webkitBackdropFilter = `blur(${blurVal}px)`;
    }
  });
})();

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes float {
    0% { transform: translateY(0) translateX(0); }
    50% { transform: translateY(-100px) translateX(50px); }
    100% { transform: translateY(-200px) translateX(-50px); opacity: 0; }
  }
`;
document.head.appendChild(styleSheet);

// Clock, Date, Greeting
// Shown until the user sets a name: "Chào buổi sáng, bạn"
const DEFAULT_USER_NAME = 'bạn';
let currentUserName = DEFAULT_USER_NAME;
let selectedAvatarType = 'lotus';
let tempCustomAvatarData = null;

// Dynamic preset SVG generator
function getAvatarPresetUrl(preset) {
  if (preset === 'lotus') return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="url(%23g)"/><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23c084fc"/><stop offset="100%" stop-color="%23db2777"/></linearGradient></defs><text x="50%" y="65%" font-size="50" text-anchor="middle" dominant-baseline="middle">🪷</text></svg>';
  if (preset === 'yinyang') return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="url(%23g)"/><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e293b"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><text x="50%" y="65%" font-size="50" text-anchor="middle" dominant-baseline="middle">☯</text></svg>';
  if (preset === 'sun') return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="url(%23g)"/><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23f59e0b"/><stop offset="100%" stop-color="%23ef4444"/></linearGradient></defs><text x="50%" y="65%" font-size="50" text-anchor="middle" dominant-baseline="middle">☀️</text></svg>';
  if (preset === 'moon') return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="url(%23g)"/><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2338bdf8"/><stop offset="100%" stop-color="%23312e81"/></linearGradient></defs><text x="50%" y="65%" font-size="50" text-anchor="middle" dominant-baseline="middle">🌙</text></svg>';
  if (preset === 'wave') return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="url(%23g)"/><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2306b6d4"/><stop offset="100%" stop-color="%233b82f6"/></linearGradient></defs><text x="50%" y="65%" font-size="50" text-anchor="middle" dominant-baseline="middle">🌊</text></svg>';
  return 'icons/icon128.png'; // default
}

function syncAvatarDisplay(type, customData) {
  const userAvatar = document.getElementById('userAvatar');
  if (!userAvatar) return;
  if (type === 'custom' && customData) {
    userAvatar.src = customData;
  } else {
    userAvatar.src = getAvatarPresetUrl(type || 'lotus');
  }
}

// Load name, avatar type, and custom avatar data on startup
chrome.storage.sync.get(['userName', 'avatarType'], (syncData) => {
  chrome.storage.local.get(['customAvatar'], (localData) => {
    if (syncData.userName) {
      currentUserName = syncData.userName;
    }
    updateGreeting();
    
    const avatarType = syncData.avatarType || 'lotus';
    syncAvatarDisplay(avatarType, localData.customAvatar);
    selectedAvatarType = avatarType;
    if (localData.customAvatar) {
      tempCustomAvatarData = localData.customAvatar;
    }
    
    // Set up click handler on userAvatar to open Settings Modal
    const userAvatarEl = document.getElementById('userAvatar');
    if (userAvatarEl) {
      userAvatarEl.addEventListener('click', () => {
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) settingsBtn.click();
      });
    }
  });
});

function updateGreeting() {
  const greetingEl = document.getElementById('greeting');
  if (!greetingEl) return;
  const nameInput = document.querySelector('.name-input');
  if (nameInput) return; // Do not overwrite when inline editing is active

  const now = new Date();
  const hour = now.getHours();
  let g = 'Chào buổi sáng';
  if (hour >= 12 && hour < 18) g = 'Chào buổi chiều';
  if (hour >= 18) g = 'Chào buổi tối';

  // Runs every second from updateTime: rebuild only when the text changes, so a click on
  // the name never lands on a span that's being replaced
  const key = `${g}|${currentUserName}`;
  if (greetingEl.dataset.rendered === key && document.getElementById('userName')) return;
  greetingEl.dataset.rendered = key;

  const nameEl = document.createElement('span');
  nameEl.id = 'userName';
  nameEl.className = 'name-editable';
  nameEl.textContent = currentUserName;
  greetingEl.replaceChildren(`${g}, `, nameEl, ' 💜');
  attachNameEdit();
}

function updateTime() {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  
  const c1 = document.getElementById('clock');
  const c2 = document.getElementById('focusClock');
  if (c1) c1.textContent = timeStr;
  if (c2) c2.textContent = timeStr;
  
  const d1 = document.getElementById('date');
  const d2 = document.getElementById('focusDate');
  if (d1) d1.textContent = dateStr;
  if (d2) d2.textContent = dateStr;

  updateGreeting();
}


setInterval(updateTime, 1000);
updateTime();

// Name editing
function attachNameEdit() {
  const el = document.getElementById('userName');
  if (!el) return;
  el.onclick = () => {
    const current = el.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.className = 'name-input';
    input.autocomplete = 'off';
    el.replaceWith(input);
    input.focus();
    input.select();

    const save = () => {
      const name = input.value.trim() || DEFAULT_USER_NAME;
      currentUserName = name;
      if (name === DEFAULT_USER_NAME) chrome.storage.sync.remove('userName');
      else chrome.storage.sync.set({ userName: name });
      const span = document.createElement('span');
      span.id = 'userName';
      span.className = 'name-editable';
      span.textContent = name;
      input.replaceWith(span);
      attachNameEdit();
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
  };
}

// One-line Journal
const journalInput = document.getElementById('journalInput');
const journalIntention = document.getElementById('journalIntention');
const journalReflection = document.getElementById('journalReflection');
const journalTodayEntry = document.getElementById('journalTodayEntry');
const intentionLabel = document.getElementById('intentionLabel');
const reflectionEntry = document.getElementById('reflectionEntry');
const startFocusFromIntention = document.getElementById('startFocusFromIntention');

function getDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function loadJournal() {
  chrome.storage.sync.get('journal', (data) => {
    const entries = data.journal || [];
    const today = getDateStr(new Date());
    const yDate = new Date(); yDate.setDate(yDate.getDate() - 1);
    const yesterdaySafe = getDateStr(yDate);

    const todayEntry = entries.find(e => e.date === today);
    const yesterdayEntry = entries.find(e => e.date === yesterdaySafe);

    // Show reflection for yesterday if not yet answered
    if (yesterdayEntry && yesterdayEntry.honored === null) {
      if (journalReflection) journalReflection.style.display = '';
      if (journalIntention) journalIntention.style.display = 'none';
      if (reflectionEntry) reflectionEntry.textContent = yesterdayEntry.entry;
      document.querySelectorAll('[data-honored]').forEach(btn => {
        btn.onclick = () => {
          yesterdayEntry.honored = btn.dataset.honored === 'true';
          chrome.storage.sync.set({ journal: entries });
          if (journalReflection) journalReflection.style.display = 'none';
          if (journalIntention) journalIntention.style.display = '';
          if (!todayEntry && journalInput) journalInput.focus();
        };
      });
    }

    // Show today's intention or entry
    const jInputRow = document.getElementById('journalInputRow');
    if (todayEntry) {
      if (jInputRow) jInputRow.style.display = 'none';
      if (journalTodayEntry) {
        journalTodayEntry.style.display = '';
        journalTodayEntry.textContent = `\u201C${todayEntry.entry}\u201D`;
      }
      if (intentionLabel) intentionLabel.textContent = 'Ý định hôm nay:';
      if (startFocusFromIntention) startFocusFromIntention.hidden = false;
    } else {
      if (jInputRow) jInputRow.style.display = '';
      if (journalTodayEntry) journalTodayEntry.style.display = 'none';
      if (startFocusFromIntention) startFocusFromIntention.hidden = true;
      if (intentionLabel) intentionLabel.textContent = 'Điều gì quan trọng nhất hôm nay?';
      if ((!yesterdayEntry || yesterdayEntry.honored !== null) && journalInput) journalInput.focus();
    }

    renderSparkline(entries);
  });
}

function saveJournalEntry(text) {
  chrome.storage.sync.get('journal', (data) => {
    const entries = data.journal || [];
    const today = getDateStr(new Date());
    const existing = entries.findIndex(e => e.date === today);
    const entry = { date: today, entry: text.trim(), honored: null, createdAt: Date.now() };

    if (existing >= 0) {
      entries[existing] = entry;
    } else {
      entries.push(entry);
    }

    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    const trimmed = entries.slice(0, 30);
    chrome.storage.sync.set({ journal: trimmed }, () => {
      const jInputRow = document.getElementById('journalInputRow');
      if (jInputRow) jInputRow.style.display = 'none';
      if (journalTodayEntry) {
        journalTodayEntry.style.display = '';
        journalTodayEntry.textContent = `\u201C${text.trim()}\u201D`;
      }
      if (intentionLabel) intentionLabel.textContent = 'Ý định hôm nay:';
      if (startFocusFromIntention) {
        startFocusFromIntention.hidden = false;
        // Pressing Enter again starts the session
        if (document.activeElement === journalInput) startFocusFromIntention.focus();
      }
      renderSparkline(trimmed);
    });
  });
}

if (journalInput) {
  journalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && journalInput.value.trim()) {
      e.preventDefault();
      saveJournalEntry(journalInput.value);
    }
  });
}

// Jump to the Focus view and start a pomodoro (no-op if one is already running)
function startFocusSession() {
  switchTab('focus');
  if (document.documentElement.classList.contains('timer-is-running')) return;
  setTimerMode('pomodoro');
  toggleTimer();
}

// Focus on a specific task: it becomes the session's label without touching today's journal intention
function startFocusOnTask(text) {
  chrome.storage.local.set({ focusTask: { text, date: getDateStr(new Date()) } }, startFocusSession);
}

if (startFocusFromIntention) {
  startFocusFromIntention.addEventListener('click', () => {
    chrome.storage.local.remove('focusTask', startFocusSession);
  });
}

function renderSparkline(entries) {
  const container = document.getElementById('sparkline');
  if (!container) return;
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    days.push(getDateStr(d));
  }

  container.innerHTML = days.map(d => {
    const entry = entries.find(e => e.date === d);
    const isToday = d === getDateStr(new Date());
    let level = 0;
    if (entry) {
      if (entry.honored === true) level = 2;
      else if (entry.honored === false) level = 1;
      else if (entry.honored === null && entry.entry) level = 1;
    }
    const height = level === 0 ? 2 : level === 1 ? 8 : 14;
    const cls = isToday ? 'sparkline-bar today' : (level > 0 ? 'sparkline-bar filled' : 'sparkline-bar empty');
    return `<div class="${cls}" style="height:${height}px" title="${d}"></div>`;
  }).join('');
}

loadJournal();

// Zodiac
const westernSigns = [
  { name: 'Capricorn', nameVi: 'Ma Kết', symbol: '♑', start: [12, 22], end: [1, 19] },
  { name: 'Aquarius', nameVi: 'Bảo Bình', symbol: '♒', start: [1, 20], end: [2, 18] },
  { name: 'Pisces', nameVi: 'Song Ngư', symbol: '♓', start: [2, 19], end: [3, 20] },
  { name: 'Aries', nameVi: 'Bạch Dương', symbol: '♈', start: [3, 21], end: [4, 19] },
  { name: 'Taurus', nameVi: 'Kim Ngưu', symbol: '♉', start: [4, 20], end: [5, 20] },
  { name: 'Gemini', nameVi: 'Song Tử', symbol: '♊', start: [5, 21], end: [6, 20] },
  { name: 'Cancer', nameVi: 'Cự Giải', symbol: '♋', start: [6, 21], end: [7, 22] },
  { name: 'Leo', nameVi: 'Sư Tử', symbol: '♌', start: [7, 23], end: [8, 22] },
  { name: 'Virgo', nameVi: 'Xử Nữ', symbol: '♍', start: [8, 23], end: [9, 22] },
  { name: 'Libra', nameVi: 'Thiên Bình', symbol: '♎', start: [9, 23], end: [10, 22] },
  { name: 'Scorpio', nameVi: 'Hổ Cáp', symbol: '♏', start: [10, 23], end: [11, 21] },
  { name: 'Sagittarius', nameVi: 'Nhân Mã', symbol: '♐', start: [11, 22], end: [12, 21] }
];

const vietnameseZodiac = [
  { animal: 'Tý', eng: 'Rat', emoji: '🐀' },
  { animal: 'Sửu', eng: 'Buffalo', emoji: '🐂' },
  { animal: 'Dần', eng: 'Tiger', emoji: '🐅' },
  { animal: 'Mão', eng: 'Cat', emoji: '🐈' },
  { animal: 'Thìn', eng: 'Dragon', emoji: '🐉' },
  { animal: 'Tỵ', eng: 'Snake', emoji: '🐍' },
  { animal: 'Ngọ', eng: 'Horse', emoji: '🐴' },
  { animal: 'Mùi', eng: 'Goat', emoji: '🐐' },
  { animal: 'Thân', eng: 'Monkey', emoji: '🐒' },
  { animal: 'Dậu', eng: 'Rooster', emoji: '🐓' },
  { animal: 'Tuất', eng: 'Dog', emoji: '🐕' },
  { animal: 'Hợi', eng: 'Pig', emoji: '🐖' }
];

const thienCan = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const diaChi = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const nguHanh = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
const nguHanhEmoji = ['💎', '🌳', '💧', '🔥', '⛰️'];

function canOfYear(year) { return (year - 4) % 10; }
function chiOfYear(year) { return (year - 4) % 12; }

function nguHanhOfCan(canIdx) {
  const map = [1, 1, 3, 3, 4, 4, 0, 0, 2, 2];
  return map[canIdx];
}

const hourBranches = [
  { label: 'Tý (23h-1h)', start: 23, chi: 0 },
  { label: 'Sửu (1h-3h)', start: 1, chi: 1 },
  { label: 'Dần (3h-5h)', start: 3, chi: 2 },
  { label: 'Mão (5h-7h)', start: 5, chi: 3 },
  { label: 'Thìn (7h-9h)', start: 7, chi: 4 },
  { label: 'Tỵ (9h-11h)', start: 9, chi: 5 },
  { label: 'Ngọ (11h-13h)', start: 11, chi: 6 },
  { label: 'Mùi (13h-15h)', start: 13, chi: 7 },
  { label: 'Thân (15h-17h)', start: 15, chi: 8 },
  { label: 'Dậu (17h-19h)', start: 17, chi: 9 },
  { label: 'Tuất (19h-21h)', start: 19, chi: 10 },
  { label: 'Hợi (21h-23h)', start: 21, chi: 11 }
];

function chiOfHour(hour) {
  for (const h of hourBranches) {
    if (hour >= h.start && hour < h.start + 2) return h;
    if (h.start === 23 && (hour >= 23 || hour < 1)) return h;
  }
  return hourBranches[0];
}

function getWesternZodiac(month, day) {
  for (const s of westernSigns) {
    if (month === s.start[0] && day >= s.start[1]) return s;
    if (month === s.end[0] && day <= s.end[1]) return s;
  }
  return westernSigns[0];
}

function getDayCanChi(date) {
  const diff = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(1900, 0, 1)) / 86400000);
  return { can: ((diff % 10) + 10) % 10, chi: ((diff + 10) % 12 + 12) % 12 };
}

const dailyChiAdvice = [
  { chi: 'Tý', emoji: '🐭', advice: 'Ngày của khởi đầu. Hãy tin vào trực giác và bắt đầu điều mới.' },
  { chi: 'Sửu', emoji: '🐂', advice: 'Ngày của bền bỉ. Kiên nhẫn sẽ mang lại kết quả xứng đáng.' },
  { chi: 'Dần', emoji: '🐅', advice: 'Ngày của dũng khí. Đối mặt với thử thách bằng sự tự tin.' },
  { chi: 'Mão', emoji: '🐈', advice: 'Ngày của hài hoà. Tìm sự cân bằng giữa làm việc và nghỉ ngơi.' },
  { chi: 'Thìn', emoji: '🐉', advice: 'Ngày của năng lượng. Thích hợp để tiến hành dự án lớn.' },
  { chi: 'Tỵ', emoji: '🐍', advice: 'Ngày của trí tuệ. Suy ngẫm trước khi hành động.' },
  { chi: 'Ngọ', emoji: '🐴', advice: 'Ngày của nhiệt huyết. Tận dụng năng lượng để hoàn thành mục tiêu.' },
  { chi: 'Mùi', emoji: '🐐', advice: 'Ngày của nghệ thuật. Dành thời gian cho sáng tạo và cảm xúc.' },
  { chi: 'Thân', emoji: '🐒', advice: 'Ngày của linh hoạt. Thích nghi với thay đổi một cách khéo léo.' },
  { chi: 'Dậu', emoji: '🐓', advice: 'Ngày của kỷ luật. Hoàn thành những việc còn dang dở.' },
  { chi: 'Tuất', emoji: '🐕', advice: 'Ngày của trung thành. Chăm sóc các mối quan hệ quan trọng.' },
  { chi: 'Hợi', emoji: '🐖', advice: 'Ngày của tận hưởng. Thư giãn và biết ơn những điều nhỏ bé.' }
];

// ---- Bát Tự / Tử Vi (iztro, vi-VN locale) ----
// Nạp âm of the sexagenary cycle: each pair of years from Giáp Tý shares one
const napAm = [
  'Hải Trung Kim', 'Lư Trung Hỏa', 'Đại Lâm Mộc', 'Lộ Bàng Thổ', 'Kiếm Phong Kim', 'Sơn Đầu Hỏa',
  'Giản Hạ Thủy', 'Thành Đầu Thổ', 'Bạch Lạp Kim', 'Dương Liễu Mộc', 'Tuyền Trung Thủy', 'Ốc Thượng Thổ',
  'Tích Lịch Hỏa', 'Tùng Bách Mộc', 'Trường Lưu Thủy', 'Sa Trung Kim', 'Sơn Hạ Hỏa', 'Bình Địa Mộc',
  'Bích Thượng Thổ', 'Kim Bạch Kim', 'Phú Đăng Hỏa', 'Thiên Hà Thủy', 'Đại Trạch Thổ', 'Thoa Xuyến Kim',
  'Tang Đố Mộc', 'Đại Khê Thủy', 'Sa Trung Thổ', 'Thiên Thượng Hỏa', 'Thạch Lựu Mộc', 'Đại Hải Thủy'
];
function napAmOfLunarYear(lunarYear) {
  const name = napAm[Math.floor(((lunarYear - 4) % 60 + 60) % 60 / 2)];
  return { name, element: nguHanh.indexOf(name.split(' ').pop()) };
}

// Canh giờ for iztro: 0 Tý sớm (00–01h), 1 Sửu … 11 Hợi, 12 Tý muộn (23–24h)
const CANH_GIO = ['Tý sớm', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý muộn'];
function hourToTimeIndex(hour) {
  return hour === 23 ? 12 : Math.floor((hour + 1) / 2);
}
// The hour we store for a canh giờ (round-trips through hourToTimeIndex)
function timeIndexToHour(idx) {
  return idx === 12 ? 23 : idx * 2;
}
function canhGioRange(idx) {
  if (idx === 0) return '00:00–00:59';
  if (idx === 12) return '23:00–23:59';
  const pad = h => String(h).padStart(2, '0');
  return `${pad(idx * 2 - 1)}:00–${pad(idx * 2)}:59`;
}

// Giờ hoàng đạo: the 12 day-gods start (Thanh Long) on a branch set by the day's branch —
// Tý Ngọ khởi Thân, Sửu Mùi khởi Tuất, Dần Thân khởi Tý, Mão Dậu khởi Dần, Thìn Tuất khởi Thìn, Tỵ Hợi khởi Ngọ
const HD_START = [8, 10, 0, 2, 4, 6, 8, 10, 0, 2, 4, 6];
const HD_GODS = [[0, 'Thanh Long'], [1, 'Minh Đường'], [4, 'Kim Quỹ'], [5, 'Bảo Quang'], [7, 'Ngọc Đường'], [10, 'Tư Mệnh']];
const branchOfHour = h => Math.floor(((h + 1) % 24) / 2);
// Branch i (Tý = 0) covers (2i−1):00 to (2i):59, Tý wrapping over midnight
const branchRange = i => {
  const pad = h => String(h).padStart(2, '0');
  return `${pad((2 * i + 23) % 24)}:00–${pad(2 * i)}:59`;
};
function hoangDaoHours(date) {
  // The traditional day turns at the start of giờ Tý (23:00)
  const d = new Date(date);
  if (d.getHours() >= 23) d.setDate(d.getDate() + 1);
  const start = HD_START[getDayCanChi(d).chi];
  return HD_GODS.map(([offset, god]) => {
    const branch = (start + offset) % 12;
    return { branch, god, name: diaChi[branch], range: branchRange(branch) };
  }).sort((a, b) => a.branch - b.branch);
}
// "Now in X" or "next is Y" for the Focus view
function hoangDaoNow(date) {
  const hours = hoangDaoHours(date);
  const cur = branchOfHour(date.getHours());
  const now = hours.find(h => h.branch === cur);
  if (now) return { now, hours };
  // Past the last slot today: the next one belongs to the day that starts at 23:00
  const next = hours.find(h => h.branch > cur) ||
    hoangDaoHours(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23))[0];
  return { next, hours };
}

// iztro (~480 KB, over half the extension's code) is only needed for Tử Vi:
// load it on demand instead of on every new tab
let iztroPromise = null;
function loadIztro() {
  if (typeof iztro !== 'undefined') return Promise.resolve();
  if (!iztroPromise) {
    iztroPromise = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = 'iztro.min.js';
      el.onload = resolve;
      el.onerror = () => { iztroPromise = null; reject(new Error('iztro failed to load')); };
      document.head.appendChild(el);
    });
  }
  return iztroPromise;
}

// Everything derived from the birth data. Without a birth hour only the date-based facts are
// trustworthy: the year/month/day pillars. The 12 palaces depend on the hour, so they're withheld.
function getBirthChart(birth) {
  if (!birth || !birth.year || !birth.month || !birth.day) return null;
  if (typeof iztro === 'undefined') return null; // callers load it first via loadIztro()
  const hourKnown = birth.hour != null;
  try {
    const chart = iztro.astro.astrolabeBySolarDate(
      `${birth.year}-${birth.month}-${birth.day}`,
      hourKnown ? hourToTimeIndex(birth.hour) : 0,
      birth.gender || 'male', true, 'vi-VN'
    );
    const lunarYear = chart.rawDates.lunarDate.lunarYear;
    return {
      hourKnown,
      lunarYear,
      yearCanChi: `${thienCan[canOfYear(lunarYear)]} ${diaChi[chiOfYear(lunarYear)]}`,
      zodiacIdx: chiOfYear(lunarYear),
      napAm: napAmOfLunarYear(lunarYear),
      pillars: chart.chineseDate.split(' - ').slice(0, hourKnown ? 4 : 3),
      ziwei: hourKnown ? chart : null
    };
  } catch (e) {
    console.warn('iztro error:', e.message);
    return null;
  }
}

const lunarYearData = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06aa0, 0x1a6c4, 0x0aae0,
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252,
  0x0d520
];

function lunarMonthDays(yearIdx, month) {
  return (lunarYearData[yearIdx] & (0x10000 >> month)) ? 30 : 29;
}

function lunarLeapMonth(yearIdx) {
  return lunarYearData[yearIdx] & 0xf;
}

function lunarLeapDays(yearIdx) {
  return lunarYearData[yearIdx] & 0x10000 ? 30 : 29;
}

function lunarYearDays(yearIdx) {
  let total = 0;
  for (let m = 1; m <= 12; m++) total += lunarMonthDays(yearIdx, m);
  if (lunarLeapMonth(yearIdx)) total += lunarLeapDays(yearIdx);
  return total;
}

function solarToLunar(sy, sm, sd) {
  let offset = Math.floor((Date.UTC(sy, sm - 1, sd) - Date.UTC(1900, 0, 31)) / 86400000) - 1;
  if (offset < 0) return { year: 0, month: 0, day: 0, isLeap: false };

  let lunYear = 1900;
  let yearIdx = 0;
  while (lunYear < 2100) {
    const days = lunarYearDays(yearIdx);
    if (offset < days) break;
    offset -= days;
    lunYear++;
    yearIdx++;
  }
  if (lunYear >= 2100) return { year: 0, month: 0, day: 0, isLeap: false };

  let leap = lunarLeapMonth(yearIdx);
  let isLeap = false;
  for (let m = 1; m <= 12; m++) {
    if (leap && m === leap + 1) {
      const ld = lunarLeapDays(yearIdx);
      if (offset < ld) { isLeap = true; break; }
      offset -= ld;
    }
    const md = lunarMonthDays(yearIdx, m);
    if (offset < md) { return { year: lunYear, month: m, day: offset + 1, isLeap }; }
    offset -= md;
  }
  return { year: lunYear, month: 12, day: offset + 1, isLeap };
}

function lunarMonthName(m) {
  const names = ['', 'Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười Một', 'Chạp'];
  return names[m] || '';
}

// Ngũ Hành relationships
const elemSinh = {};
elemSinh[1] = 3; elemSinh[3] = 4; elemSinh[4] = 0; elemSinh[0] = 2; elemSinh[2] = 1;
const elemKhac = {};
elemKhac[1] = 4; elemKhac[4] = 2; elemKhac[2] = 3; elemKhac[3] = 0; elemKhac[0] = 1;

function nguHanhRelation(userNh, todayNh) {
  if (userNh === todayNh) return { label: 'Bình hòa', emoji: '➖', desc: 'Cùng hành, ổn định.' };
  if (elemSinh[todayNh] === userNh) return { label: 'Sinh nhập', emoji: '💚', desc: 'Hôm nay sinh nhập cho bạn — rất tốt.' };
  if (elemSinh[userNh] === todayNh) return { label: 'Sinh xuất', emoji: '💛', desc: 'Bạn sinh xuất cho hôm nay — tốt nhưng hao năng lượng.' };
  if (elemKhac[todayNh] === userNh) return { label: 'Khắc nhập', emoji: '❤️‍🔥', desc: 'Hôm nay khắc nhập — cẩn thận, giữ bình tĩnh.' };
  if (elemKhac[userNh] === todayNh) return { label: 'Khắc xuất', emoji: '⚡', desc: 'Bạn khắc xuất hôm nay — chủ động, thuận lợi.' };
  return { label: '', emoji: '', desc: '' };
}

const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const birthDay = document.getElementById('birthDay');
const birthMonth = document.getElementById('birthMonth');
const birthYear = document.getElementById('birthYear');
const birthHour = document.getElementById('birthHour');
const birthGender = document.getElementById('birthGender');
const zodiacInfo = document.getElementById('zodiacInfo');
const tuviInfo = document.getElementById('tuviInfo');
const todayInsight = document.getElementById('todayInsight');

function populateSelect(el, start, end, selected, opts) {
  opts = opts || {};
  el.innerHTML = '';
  if (opts.placeholder) {
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = opts.placeholder;
    if (selected === '' || selected == null) ph.selected = true;
    el.appendChild(ph);
  }
  for (let i = start; i <= end; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = i;
    if (i === selected) opt.selected = true;
    el.appendChild(opt);
  }
}

// Birth hour is picked as a canh giờ (2-hour block); that's all the chart needs
function populateCanhGio(el, storedHour) {
  const selectedIdx = storedHour != null ? hourToTimeIndex(storedHour) : null;
  el.innerHTML = '<option value="">Không rõ</option>' + CANH_GIO.map((name, idx) =>
    `<option value="${timeIndexToHour(idx)}"${idx === selectedIdx ? ' selected' : ''}>${name} (${canhGioRange(idx)})</option>`
  ).join('');
}

function updateAvatarSelectionUI(type, customAvatarData) {
  document.querySelectorAll('.avatar-preset').forEach(el => {
    el.classList.remove('active');
  });
  const activeEl = document.querySelector(`.avatar-preset[data-preset="${type}"]`);
  if (activeEl) {
    activeEl.classList.add('active');
  }
  
  const customIndicator = document.getElementById('avatarCustomIndicator');
  if (customIndicator) {
    if (customAvatarData) {
      customIndicator.innerHTML = '';
      customIndicator.style.backgroundImage = `url(${customAvatarData})`;
      customIndicator.style.backgroundSize = 'cover';
      customIndicator.style.backgroundPosition = 'center';
    } else {
      customIndicator.innerHTML = '🖼️';
      customIndicator.style.backgroundImage = '';
    }
  }
}

// Init avatar settings events
(function initAvatarSettingsEvents() {
  document.querySelectorAll('.avatar-preset').forEach(preset => {
    preset.addEventListener('click', () => {
      selectedAvatarType = preset.dataset.preset;
      document.querySelectorAll('.avatar-preset').forEach(el => el.classList.remove('active'));
      preset.classList.add('active');
      if (preset.dataset.preset !== 'custom' || tempCustomAvatarData) saveSettingsGroup('avatar');
    });
    preset.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); preset.click(); }
    });
  });

  const avatarFileInput = document.getElementById('avatarFileInput');
  const avatarFileSelectBtn = document.getElementById('avatarFileSelectBtn');
  
  if (avatarFileSelectBtn && avatarFileInput) {
    avatarFileSelectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      avatarFileInput.click();
    });
    
    avatarFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 128, 128);
          
          try {
            const compressedDataUrl = canvas.toDataURL('image/png');
            tempCustomAvatarData = compressedDataUrl;
            selectedAvatarType = 'custom';
            updateAvatarSelectionUI('custom', compressedDataUrl);
            saveSettingsGroup('avatar');
          } catch (err) {
            console.error('Error compressing avatar:', err);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
})();

settingsBtn.addEventListener('click', () => {
  chrome.storage.sync.get(['birth', 'geminiKey', 'customAudioUrl', 'userName', 'avatarType', 'weatherLocation', 'labsMindmap'], (syncData) => {
    chrome.storage.local.get(['customAvatar'], (localData) => {
      const b = syncData.birth || {};
      populateSelect(birthDay, 1, 31, b.day ?? '', { placeholder: '--' });
      populateSelect(birthMonth, 1, 12, b.month ?? '', { placeholder: '--' });
      populateSelect(birthYear, 1900, 2030, b.year ?? '', { placeholder: '--' });
      [birthDay, birthMonth, birthYear].forEach(el => el.removeAttribute('aria-invalid'));
      populateCanhGio(birthHour, b.hour);
      birthGender.value = b.gender || 'male';
      document.getElementById('geminiKey').value = syncData.geminiKey || '';
      document.getElementById('customAudioUrl').value = syncData.customAudioUrl || '';
      document.getElementById('settingsUserName').value = syncData.userName || '';
      document.getElementById('settingsWeatherLocation').value = syncData.weatherLocation || '';
      document.getElementById('labsMindmap').checked = !!syncData.labsMindmap;
      
      const avType = syncData.avatarType || 'lotus';
      selectedAvatarType = avType;
      tempCustomAvatarData = localData.customAvatar || null;
      updateAvatarSelectionUI(avType, localData.customAvatar);
      
      settingsModal.style.display = '';
    });
  });
});

// Open Settings and put the cursor on a specific field
function openSettingsAt(fieldId) {
  settingsBtn.click();
  const waitForModal = () => {
    if (settingsModal.style.display === 'none') return requestAnimationFrame(waitForModal);
    const field = document.getElementById(fieldId);
    if (field) { field.scrollIntoView({ block: 'center' }); field.focus(); }
  };
  requestAnimationFrame(waitForModal);
}

function closeSettings() {
  settingsModal.style.display = 'none';
}

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettings();
});

// ---- Settings auto-save: each field saves on change and refreshes only what depends on it ----
const birthDateFields = [birthDay, birthMonth, birthYear];

function readBirthFields() {
  const filled = birthDateFields.filter(el => el.value !== '').length;
  if (filled === 0) return { state: 'empty' };
  if (filled < 3) return { state: 'partial' };
  const hourVal = birthHour.value;
  return { state: 'complete', birth: {
    day: parseInt(birthDay.value),
    month: parseInt(birthMonth.value),
    year: parseInt(birthYear.value),
    hour: hourVal !== '' ? parseInt(hourVal) : null,
    min: null,
    gender: birthGender.value
  } };
}

let settingsSavedTimer;
function flashSettingsSaved() {
  const el = document.getElementById('settingsSaved');
  if (!el) return;
  el.textContent = 'Đã lưu ✓';
  el.classList.add('visible');
  clearTimeout(settingsSavedTimer);
  settingsSavedTimer = setTimeout(() => el.classList.remove('visible'), 1600);
}

function saveSettingsGroup(group) {
  if (group === 'name') {
    const userNameVal = document.getElementById('settingsUserName').value.trim();
    const done = () => {
      currentUserName = userNameVal || DEFAULT_USER_NAME;
      updateGreeting();
      flashSettingsSaved();
    };
    if (userNameVal) chrome.storage.sync.set({ userName: userNameVal }, done);
    else chrome.storage.sync.remove('userName', done);
  } else if (group === 'weather') {
    chrome.storage.sync.set({ weatherLocation: document.getElementById('settingsWeatherLocation').value.trim() }, () => {
      if (typeof initWeather === 'function') initWeather(true);
      flashSettingsSaved();
    });
  } else if (group === 'audio') {
    let customAudioUrl = document.getElementById('customAudioUrl').value.trim();
    // Auto-convert Suno share links to direct CDN links
    if (customAudioUrl.includes('suno.com/song/')) {
      const uuid = (customAudioUrl.split('/song/')[1] || '').split('?')[0].split('/')[0].trim();
      if (uuid) customAudioUrl = `https://cdn1.suno.ai/${uuid}.mp3`;
    }
    chrome.storage.sync.set({ customAudioUrl }, () => {
      updateCustomAudioOption(customAudioUrl);
      flashSettingsSaved();
    });
  } else if (group === 'key') {
    forgetGeminiModels();
    chrome.storage.sync.set({ geminiKey: document.getElementById('geminiKey').value.trim() }, () => {
      renderAll(true);
      refreshAiStatus();
      loadAiChatHistory();
      flashSettingsSaved();
    });
  } else if (group === 'avatar') {
    const avatarTypeVal = selectedAvatarType;
    chrome.storage.sync.set({ avatarType: avatarTypeVal }, () => {
      if (avatarTypeVal === 'custom' && tempCustomAvatarData) {
        chrome.storage.local.set({ customAvatar: tempCustomAvatarData }, () => syncAvatarDisplay(avatarTypeVal, tempCustomAvatarData));
      } else {
        chrome.storage.local.get(['customAvatar'], (localData) => syncAvatarDisplay(avatarTypeVal, localData.customAvatar));
      }
      flashSettingsSaved();
    });
  } else if (group === 'labs') {
    chrome.storage.sync.set({ labsMindmap: document.getElementById('labsMindmap').checked }, () => {
      if (currentActiveTool === 'ideas') loadToolContent('ideas');
      flashSettingsSaved();
    });
  } else if (group === 'birth') {
    // Mid-edit (only some of day/month/year picked): keep the stored date until it's complete
    const { state, birth } = readBirthFields();
    birthDateFields.forEach(el => el.removeAttribute('aria-invalid'));
    if (state === 'partial') return;
    const done = () => { renderAll(true); loadAiChatHistory(); initQuickActionChips(); flashSettingsSaved(); };
    if (state === 'complete') chrome.storage.sync.set({ birth }, done);
    else chrome.storage.sync.remove(['birth', 'dailyInsightCache'], () => chrome.storage.local.remove('dailyInsightCache', done));
  }
}

[['settingsUserName', 'name'], ['settingsWeatherLocation', 'weather'], ['customAudioUrl', 'audio'], ['geminiKey', 'key'],
 ['birthDay', 'birth'], ['birthMonth', 'birth'], ['birthYear', 'birth'], ['birthHour', 'birth'], ['birthGender', 'birth'], ['labsMindmap', 'labs']]
  .forEach(([id, group]) => document.getElementById(id)?.addEventListener('change', () => saveSettingsGroup(group)));

// "Xong": everything is already saved; only an unfinished birth date holds the dialog open
document.getElementById('saveBirthBtn').addEventListener('click', () => {
  const { state } = readBirthFields();
  if (state === 'partial') {
    birthDateFields.forEach(el => el.toggleAttribute('aria-invalid', el.value === ''));
    birthDateFields.find(el => el.value === '').focus();
    return;
  }
  closeSettings();
});

document.getElementById('clearBirthBtn').addEventListener('click', () => {
  [...birthDateFields, birthHour].forEach(el => { el.value = ''; el.removeAttribute('aria-invalid'); });
  saveSettingsGroup('birth');
});

// ---- Gemini model selection ----
// No hard-coded model: the newest stable Flash model this key can use is discovered via
// models.list (cached 3 days), with Google's moving "latest" alias as the next choice.
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_ALIAS = 'gemini-flash-latest';
const GEMINI_MODEL_TTL = 3 * 24 * 60 * 60 * 1000;

// "gemini-3.10-flash" > "gemini-3.8-flash": compare dotted versions numerically
function compareModelVersions(a, b) {
  const va = a.match(/\d+/g).map(Number), vb = b.match(/\d+/g).map(Number);
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const d = (va[i] || 0) - (vb[i] || 0);
    if (d) return d;
  }
  return 0;
}

async function listFlashModels(apiKey) {
  const res = await fetch(`${GEMINI_API}/models?pageSize=1000`, { headers: { 'x-goog-api-key': apiKey } });
  if (!res.ok) throw new Error(`models.list ${res.status}`);
  const { models = [] } = await res.json();
  return models
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''))
    // stable general-purpose Flash only: no lite/image/tts/live/preview variants
    .filter(id => /^gemini-\d+(\.\d+)*-flash$/.test(id))
    .sort((a, b) => compareModelVersions(b, a));
}

// Models to try, in order
async function getGeminiModels(apiKey) {
  const { geminiModels: cache } = await chrome.storage.local.get('geminiModels');
  let found = cache && Date.now() - cache.at < GEMINI_MODEL_TTL ? cache.list : null;
  if (!found) {
    try {
      found = await listFlashModels(apiKey);
      chrome.storage.local.set({ geminiModels: { at: Date.now(), list: found } });
    } catch (e) {
      console.warn('ZenTab: could not list Gemini models,', e.message);
      found = [];
    }
  }
  return [...new Set([found[0], GEMINI_ALIAS, found[1]].filter(Boolean))];
}

// Re-discover on the next call (new key, or a model that no longer exists)
function forgetGeminiModels() {
  chrome.storage.local.remove('geminiModels');
}

// Test Gemini API Key Connectivity
const testApiKeyBtn = document.getElementById('testApiKeyBtn');
const apiKeyTestStatus = document.getElementById('apiKeyTestStatus');

if (testApiKeyBtn && apiKeyTestStatus) {
  testApiKeyBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const apiKeyInput = document.getElementById('geminiKey');
    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

    if (!apiKey) {
      apiKeyTestStatus.style.color = '#ef4444';
      apiKeyTestStatus.textContent = '✗ Vui lòng nhập API Key trước khi kiểm tra.';
      return;
    }

    testApiKeyBtn.disabled = true;
    const oldText = testApiKeyBtn.textContent;
    testApiKeyBtn.textContent = 'Đang thử...';
    apiKeyTestStatus.style.color = 'var(--text-muted)';
    apiKeyTestStatus.textContent = 'Đang gửi yêu cầu kiểm tra...';

    try {
      forgetGeminiModels();
      const models = await getGeminiModels(apiKey);
      let okModel = null, errMessage = '';
      for (const model of models) {
        const res = await fetch(`${GEMINI_API}/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Respond only with OK' }] }] })
        });
        if (res.ok) { okModel = model; break; }
        const data = await res.json().catch(() => ({}));
        errMessage = data?.error?.message || `HTTP ${res.status}`;
        if ([400, 401, 403].includes(res.status)) break; // a key problem, not a model problem
      }

      if (okModel) {
        apiKeyTestStatus.style.color = '#10b981';
        apiKeyTestStatus.textContent = `✓ Kết nối thành công · đang dùng ${okModel}`;
      } else {
        apiKeyTestStatus.style.color = '#ef4444';
        apiKeyTestStatus.textContent = `✗ Thất bại: ${errMessage}`;
      }
    } catch (err) {
      console.error('API Key test error:', err);
      apiKeyTestStatus.style.color = '#ef4444';
      apiKeyTestStatus.textContent = '✗ Thất bại: Lỗi kết nối mạng hoặc CORS.';
    } finally {
      testApiKeyBtn.disabled = false;
      testApiKeyBtn.textContent = oldText;
    }
  });
  
  const apiKeyInput = document.getElementById('geminiKey');
  if (apiKeyInput) {
    apiKeyInput.addEventListener('input', () => {
      apiKeyTestStatus.textContent = '';
    });
  }
}

function renderZodiac(birth) {
  const info = getBirthChart(birth);
  if (!info) {
    zodiacInfo.innerHTML = '';
    tuviInfo.innerHTML = '';
    document.getElementById('astroDivider').style.display = 'none';
    document.getElementById('tvDivider').style.display = 'none';
    return;
  }
  document.getElementById('astroDivider').style.display = '';

  const western = getWesternZodiac(birth.month, birth.day);
  const viet = vietnameseZodiac[info.zodiacIdx];
  const nh = info.napAm.element;

  let html = `<div class="row">${viet.emoji} Tuổi <span class="accent">${info.yearCanChi}</span> · ${western.symbol} ${western.nameVi}</div>`;
  html += `<div class="row">Mệnh <span class="nh-pill nh-${nh}">${nguHanhEmoji[nh]} ${info.napAm.name}</span></div>`;

  const pillarLabels = ['Năm', 'Tháng', 'Ngày', 'Giờ'];
  html += `<div class="label">BÁT TỰ</div>`;
  html += `<div class="row">${info.pillars.map((p, i) => `${pillarLabels[i]}: <span class="hl">${p}</span>`).join(' <span class="row-sep">│</span> ')}</div>`;

  const z = info.ziwei;
  if (z) {
    html += `<div class="label">TỬ VI</div>`;
    html += `<div class="row">${z.fiveElementsClass} · Mệnh tại <span class="hl">${z.earthlyBranchOfSoulPalace}</span> · Thân tại <span class="hl">${z.earthlyBranchOfBodyPalace}</span></div>`;
    html += `<div class="row">Mệnh chủ <span class="hl">${z.soul}</span> · Thân chủ <span class="hl">${z.body}</span> · <span class="sml">Giờ ${CANH_GIO[hourToTimeIndex(birth.hour)]} (${canhGioRange(hourToTimeIndex(birth.hour))})</span></div>`;
  } else {
    html += `<div class="astro-hour-missing">
      <span>Chưa có giờ sinh nên chưa an được cung Mệnh, Thân và 12 cung. Trụ giờ cũng chưa xác định.</span>
      <button type="button" class="link-btn astro-add-hour">Thêm giờ sinh</button>
    </div>`;
  }

  zodiacInfo.innerHTML = html;
  zodiacInfo.querySelector('.astro-add-hour')?.addEventListener('click', () => openSettingsAt('birthHour'));
  renderTuVi(info.ziwei);
}

// Six palaces most people ask about, with brightness and birth-year Tứ Hóa
const KEY_PALACES = ['Mệnh', 'Tài Bạch', 'Quan Lộc', 'Phu Thê', 'Thiên Di', 'Phúc Đức'];
// iztro's vi-VN locale renders 陷 as "Hạn"; the Vietnamese term is "Hãm"
const BRIGHTNESS_FIX = { 'Hạn': 'Hãm' };
function describePalaceStars(p) {
  return (p.majorStars || []).map(s => {
    const brightness = BRIGHTNESS_FIX[s.brightness] || s.brightness;
    const notes = [brightness, s.mutagen && `Hóa ${s.mutagen}`].filter(Boolean).join(', ');
    return notes ? `${s.name} (${notes})` : s.name;
  });
}

function renderTuVi(ziwei) {
  const container = document.getElementById('tuviInfo');
  const divider = document.getElementById('tvDivider');
  if (!ziwei || !ziwei.palaces) {
    container.innerHTML = '';
    divider.style.display = 'none';
    return;
  }
  divider.style.display = '';
  let html = `<div class="tuvi-grid">`;
  KEY_PALACES.forEach(name => {
    const p = ziwei.palaces.find(x => x.name === name);
    if (!p) return;
    const stars = describePalaceStars(p);
    const label = p.isBodyPalace ? `${p.name} (Thân)` : p.name;
    html += `<div class="tv-cell"><span class="tv-name">${label}</span> <span class="tv-stars">${stars.length ? stars.join(', ') : 'Vô chính diệu'}</span></div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

// ---- Full chart (lá số) in the details modal ----
// Standard board: palaces sit on the ring by earthly branch, the 2×2 centre holds the owner's info
const BOARD_POS = {
  'Tỵ': [1, 1], 'Ngọ': [1, 2], 'Mùi': [1, 3], 'Thân': [1, 4],
  'Thìn': [2, 1], 'Dậu': [2, 4],
  'Mão': [3, 1], 'Tuất': [3, 4],
  'Dần': [4, 1], 'Sửu': [4, 2], 'Tý': [4, 3], 'Hợi': [4, 4]
};
const BRIGHT_SHORT = { 'Miếu': 'M', 'Vượng': 'V', 'Đắc': 'Đ', 'Lợi': 'L', 'Bình': 'B', 'Bất': 'Bt', 'Hãm': 'H' };
const HOA_CLASS = { 'Lộc': 'loc', 'Quyền': 'quyen', 'Khoa': 'khoa', 'Kỵ': 'ky' };
const HOA_ORDER = ['Lộc', 'Quyền', 'Khoa', 'Kỵ'];

const starBrightness = s => BRIGHTNESS_FIX[s.brightness] || s.brightness || '';
const hoaBadge = m => m ? `<b class="hoa hoa-${HOA_CLASS[m] || ''}">${m}</b>` : '';
// Tam phương tứ chính: the palace, its opposite and its two trines (same offsets on any branch numbering)
const trineOf = idx => [idx, (idx + 4) % 12, (idx + 8) % 12, (idx + 6) % 12];

let chartState = null;

function renderChartModal(birth) {
  const info = getBirthChart(birth);
  const layout = document.getElementById('chartLayout');
  const summary = document.getElementById('modalZodiacInfo');
  const footnote = document.querySelector('.chart-footnote');
  const tabs = document.getElementById('chartTabs');
  showChartTab('board');
  if (!info || !info.ziwei) {
    // No chart without a birth hour: show the date-only facts with the "add hour" prompt
    tabs.hidden = true;
    layout.hidden = true;
    if (footnote) footnote.hidden = !info;
    summary.hidden = false;
    summary.innerHTML = info ? zodiacInfo.innerHTML
      : '<div class="stats-empty" style="text-align:center;padding:32px 0">Nhập ngày sinh trong Cài đặt để xem lá số.</div>';
    return;
  }
  summary.hidden = true;
  layout.hidden = false;
  tabs.hidden = false;
  if (footnote) footnote.hidden = false;

  const z = info.ziwei;
  const luck = z.horoscope(new Date());
  const soul = z.palaces.find(p => p.name === 'Mệnh');
  chartState = { birth, info, z, luck, selected: soul ? soul.index : 0 };
  drawChartBoard();
  drawChartLuck();
  drawChartDecades();
  drawPalaceDetail();
  renderReading();
}

function showChartTab(tab) {
  document.querySelectorAll('#chartTabs [data-chart-tab]').forEach(b => {
    const on = b.dataset.chartTab === tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on);
  });
  document.getElementById('chartLayout').classList.toggle('tab-hidden', tab !== 'board');
  document.getElementById('chartReading').hidden = tab !== 'reading';
}
document.querySelectorAll('#chartTabs [data-chart-tab]').forEach(b => b.addEventListener('click', () => showChartTab(b.dataset.chartTab)));

function drawChartBoard() {
  const { info, z, luck, selected } = chartState;
  const board = document.getElementById('chartBoard');
  const trine = trineOf(selected);

  const cells = z.palaces.map(p => {
    const [row, col] = BOARD_POS[p.earthlyBranch] || [1, 1];
    const classes = ['palace-cell'];
    if (p.index === selected) classes.push('is-selected');
    else if (trine.includes(p.index)) classes.push('is-trine');
    const flags = [];
    if (p.index === luck.decadal.index) flags.push('<span class="pc-flag" title="Đại hạn hiện tại">ĐH</span>');
    if (p.index === luck.yearly.index) flags.push(`<span class="pc-flag" title="Lưu niên ${new Date().getFullYear()}">LN</span>`);
    const major = p.majorStars.map(s => {
      const b = starBrightness(s);
      return `<li>${s.name}${b ? ` <small title="${b}">${BRIGHT_SHORT[b] || b}</small>` : ''} ${hoaBadge(s.mutagen)}</li>`;
    }).join('') || '<li class="pc-empty">Vô chính diệu</li>';
    const minor = p.minorStars.map(s =>
      `<span class="${s.type === 'tough' ? 'pc-sat' : 'pc-cat'}">${s.name}${s.mutagen ? ' ' + hoaBadge(s.mutagen) : ''}</span>`
    ).join('');
    return `<button type="button" class="${classes.join(' ')}" data-idx="${p.index}" style="grid-row:${row};grid-column:${col}"
        aria-pressed="${p.index === selected}" aria-label="Cung ${p.name}, ${p.heavenlyStem} ${p.earthlyBranch}">
      <span class="pc-top"><span>${p.heavenlyStem} ${p.earthlyBranch}</span><span>${p.decadal.range[0]}–${p.decadal.range[1]}</span></span>
      <span class="pc-name">${p.name}${p.isBodyPalace ? ' <span class="pc-tag">Thân</span>' : ''}</span>
      <ul class="pc-major">${major}</ul>
      <span class="pc-minor">${minor}</span>
      <span class="pc-bottom"><span>${p.changsheng12}</span><span>${flags.join('')}</span></span>
    </button>`;
  }).join('');

  const g = chartState.birth.gender === 'female' ? 'Nữ' : 'Nam';
  const yinYang = canOfYear(info.lunarYear) % 2 === 0 ? 'Dương' : 'Âm';
  const ld = z.rawDates.lunarDate;
  const hourIdx = hourToTimeIndex(chartState.birth.hour);
  const centre = `<div class="chart-centre" style="grid-row:2 / 4;grid-column:2 / 4">
      <div class="cc-title">${yinYang} ${g} · Tuổi ${info.yearCanChi}</div>
      <div class="cc-row">Mệnh <span class="nh-pill nh-${info.napAm.element}">${info.napAm.name}</span> · ${z.fiveElementsClass}</div>
      <div class="cc-pillars">${info.pillars.map((p, i) => `<span><small>${['Năm', 'Tháng', 'Ngày', 'Giờ'][i]}</small>${p}</span>`).join('')}</div>
      <div class="cc-row">Âm lịch ${ld.lunarDay}/${ld.lunarMonth}${ld.isLeap ? ' (nhuận)' : ''} năm ${info.yearCanChi} · Giờ ${CANH_GIO[hourIdx]}</div>
      <div class="cc-row">Mệnh chủ ${z.soul} · Thân chủ ${z.body}</div>
      <div class="cc-row cc-muted">Năm nay ${luck.age.nominalAge} tuổi (âm)</div>
    </div>`;

  board.innerHTML = cells + centre;
  board.querySelectorAll('.palace-cell').forEach(btn => {
    btn.onclick = () => selectChartPalace(parseInt(btn.dataset.idx));
  });
}

function selectChartPalace(idx) {
  chartState.selected = idx;
  drawChartBoard();
  drawChartDecades();
  drawPalaceDetail();
}

function hoaList(names) {
  return `<ul class="hoa-list">${HOA_ORDER.map((h, i) => names[i] ? `<li>${hoaBadge(h)} ${names[i]}</li>` : '').join('')}</ul>`;
}

function drawChartLuck() {
  const { z, luck } = chartState;
  const dec = z.palaces[luck.decadal.index];
  const yearPalace = z.palaces[luck.yearly.index];
  const year = new Date().getFullYear();
  document.getElementById('chartLuck').innerHTML = `
    <h4 class="chart-panel-title">Vận hạn hiện tại</h4>
    <div class="luck-block">
      <div class="luck-head"><span class="pc-flag">ĐH</span> Đại hạn ${dec.decadal.range[0]}–${dec.decadal.range[1]} tuổi · cung <button type="button" class="link-btn" data-goto="${dec.index}">${dec.name}</button> <span class="cc-muted">(${luck.decadal.heavenlyStem} ${luck.decadal.earthlyBranch})</span></div>
      ${hoaList(luck.decadal.mutagen)}
    </div>
    <div class="luck-block">
      <div class="luck-head"><span class="pc-flag">LN</span> Lưu niên ${year} (${luck.yearly.heavenlyStem} ${luck.yearly.earthlyBranch}) · tại cung <button type="button" class="link-btn" data-goto="${yearPalace.index}">${yearPalace.name}</button></div>
      ${hoaList(luck.yearly.mutagen)}
    </div>`;
  document.querySelectorAll('#chartLuck [data-goto]').forEach(b => b.onclick = () => selectChartPalace(parseInt(b.dataset.goto)));
}

function drawChartDecades() {
  const { z, luck, selected } = chartState;
  const rows = [...z.palaces].sort((a, b) => a.decadal.range[0] - b.decadal.range[0]).map(p => {
    const now = p.index === luck.decadal.index;
    return `<li><button type="button" class="decade-row${now ? ' is-now' : ''}${p.index === selected ? ' is-selected' : ''}" data-idx="${p.index}">
      <span class="decade-age">${p.decadal.range[0]}–${p.decadal.range[1]}</span>
      <span class="decade-name">${p.name}</span>
      ${now ? '<span class="pc-flag">Hiện tại</span>' : ''}
    </button></li>`;
  }).join('');
  const el = document.getElementById('chartDecades');
  el.innerHTML = `<h4 class="chart-panel-title">Đại hạn 10 năm</h4><ol class="decade-list">${rows}</ol>`;
  el.querySelectorAll('.decade-row').forEach(b => b.onclick = () => selectChartPalace(parseInt(b.dataset.idx)));
}

function drawPalaceDetail() {
  const { z, selected } = chartState;
  const p = z.palaces[selected];
  const list = (stars, fmt) => stars.length ? stars.map(fmt).join(', ') : '—';
  const withHoa = s => `${s.name}${s.mutagen ? ' ' + hoaBadge(s.mutagen) : ''}`;
  const cat = p.minorStars.filter(s => s.type !== 'tough');
  const sat = p.minorStars.filter(s => s.type === 'tough');
  const trine = trineOf(selected).slice(1).map(i => z.palaces[i].name);
  document.getElementById('chartPalaceDetail').innerHTML = `
    <h4 class="chart-panel-title">Cung ${p.name}${p.isBodyPalace ? ' (Thân cư)' : ''} <span class="cc-muted">${p.heavenlyStem} ${p.earthlyBranch}</span></h4>
    <dl class="palace-dl">
      <dt>Chính tinh</dt><dd>${list(p.majorStars, s => `${s.name}${starBrightness(s) ? ` (${starBrightness(s)})` : ''}${s.mutagen ? ' ' + hoaBadge(s.mutagen) : ''}`) .replace(/^—$/, 'Vô chính diệu')}</dd>
      <dt>Cát tinh</dt><dd>${list(cat, withHoa)}</dd>
      <dt>Sát tinh</dt><dd>${list(sat, withHoa)}</dd>
      <dt>Phụ tinh khác</dt><dd>${list(p.adjectiveStars, s => s.name)}</dd>
      <dt>Tràng sinh</dt><dd>${p.changsheng12} · Bác sĩ: ${p.boshi12}</dd>
      <dt>Đại hạn</dt><dd>${p.decadal.range[0]}–${p.decadal.range[1]} tuổi</dd>
      <dt>Tam phương tứ chính</dt><dd>${trine.slice(0, 2).join(', ')} (tam hợp) · ${trine[2]} (xung chiếu)</dd>
    </dl>`;
}

// ---- Chart reading: computed facts per topic, AI explains only those facts ----
const READING_TOPICS = [
  { id: 'tinh-cach', title: 'Tính cách', palaces: ['Mệnh', 'Phúc Đức'], withBody: true },
  { id: 'su-nghiep', title: 'Sự nghiệp', palaces: ['Quan Lộc'] },
  { id: 'tai-chinh', title: 'Tài chính', palaces: ['Tài Bạch'] },
  { id: 'tinh-cam', title: 'Tình cảm', palaces: ['Phu Thê'] },
  { id: 'suc-khoe', title: 'Sức khỏe', palaces: ['Tật Ách'], note: 'Chỉ là gợi ý về thói quen sinh hoạt, không thay cho tư vấn y tế.' }
];
const READING_VERSION = 1;

const chartKeyOf = b => `${b.year}-${b.month}-${b.day}-${b.hour}-${b.gender || 'male'}`;
const majorText = p => { const m = describePalaceStars(p); return m.length ? m.join(', ') : 'Vô chính diệu'; };
const starWithHoa = st => `${st.name}${st.mutagen ? ` (Hóa ${st.mutagen})` : ''}`;

function palaceFact(p) {
  const cat = p.minorStars.filter(st => st.type !== 'tough').map(starWithHoa);
  const sat = p.minorStars.filter(st => st.type === 'tough').map(starWithHoa);
  return `${p.name}${p.isBodyPalace ? ' (Thân cư)' : ''} (${p.heavenlyStem} ${p.earthlyBranch}): ${majorText(p)}` +
    (cat.length ? `; cát tinh: ${cat.join(', ')}` : '') + (sat.length ? `; sát tinh: ${sat.join(', ')}` : '');
}

// Facts for one topic: its palaces in full, plus the major stars of the primary palace's tam phương tứ chính
function topicFacts(z, topic) {
  const names = [...topic.palaces];
  if (topic.withBody) {
    const body = z.palaces.find(p => p.isBodyPalace);
    if (body && !names.includes(body.name)) names.push(body.name);
  }
  const palaces = names.map(n => z.palaces.find(p => p.name === n)).filter(Boolean);
  const facts = palaces.map(palaceFact);
  const [t1, t2, opp] = trineOf(palaces[0].index).slice(1).map(i => z.palaces[i]);
  facts.push(`Tam hợp của ${palaces[0].name}: ${t1.name}: ${majorText(t1)}; ${t2.name}: ${majorText(t2)}`);
  facts.push(`Xung chiếu ${palaces[0].name}: ${opp.name}: ${majorText(opp)}`);
  // Star names that a point's "basis" may cite (grounding check)
  const stars = new Set();
  [...palaces, t1, t2, opp].forEach(p => [...p.majorStars, ...p.minorStars].forEach(st => stars.add(st.name)));
  if (palaces.some(p => !p.majorStars.length)) stars.add('Vô chính diệu');
  return { facts, stars, palaceNames: palaces.map(p => p.name) };
}

function natalHoaFact(z) {
  const lands = {};
  z.palaces.forEach(p => [...p.majorStars, ...p.minorStars].forEach(st => { if (st.mutagen) lands[st.mutagen] = `${st.name} tại ${p.name}`; }));
  return HOA_ORDER.filter(h => lands[h]).map(h => `Hóa ${h}: ${lands[h]}`).join('; ');
}

function buildReadingPrompt(z, info, gender) {
  const yinYang = canOfYear(info.lunarYear) % 2 === 0 ? 'Dương' : 'Âm';
  const topics = READING_TOPICS.map(t => {
    const { facts } = topicFacts(z, t);
    return `[${t.id}] ${t.title}\n${facts.map(f => '- ' + f).join('\n')}`;
  }).join('\n\n');
  return `Bạn là chuyên gia Tử Vi Đẩu Số, viết luận giải tham khảo cho người đọc phổ thông bằng tiếng Việt.

QUY TẮC:
- CHỈ dựa vào dữ kiện bên dưới. Không tự thêm sao, cung hay vận hạn nào khác.
- Mỗi ý trong "points" phải có "basis" trích đúng tên sao và cung trong dữ kiện, ví dụ "Quan Lộc: Vũ Khúc (Đắc)".
- Giọng điềm tĩnh, khách quan, nói về khuynh hướng ("thường", "có xu hướng"); không phán chắc chắn, không gây lo sợ.
- Sức khỏe: chỉ nói về thể trạng và thói quen sinh hoạt nên chú ý; không chẩn đoán, không nêu bệnh nghiêm trọng, không đoán tai nạn hay tuổi thọ.
- Không đưa quyết định tài chính, pháp lý, y tế cụ thể.
- Mỗi chủ đề: "summary" 2–3 câu; "points" 2–4 ý; "action" một gợi ý thực tế làm được ngay.
- Trả về DUY NHẤT một JSON hợp lệ, không markdown, theo mẫu:
{"topics":[{"id":"tinh-cach","summary":"...","points":[{"text":"...","basis":"..."}],"action":"..."}]}

DỮ KIỆN CHUNG:
- ${yinYang} ${gender === 'female' ? 'Nữ' : 'Nam'}, ${z.fiveElementsClass}, Mệnh chủ ${z.soul}, Thân chủ ${z.body}
- Tứ Hóa gốc: ${natalHoaFact(z)}

CHỦ ĐỀ:
${topics}`;
}

// Parse the model's JSON and keep only points whose basis cites a star from that topic's facts
function parseReading(text, z) {
  const raw = text.replace(/```json|```/g, '');
  const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  const byId = Object.fromEntries((json.topics || []).map(t => [t.id, t]));
  let dropped = 0;
  const topics = READING_TOPICS.map(t => {
    const r = byId[t.id];
    if (!r) return { id: t.id, missing: true };
    const { stars } = topicFacts(z, t);
    const points = (r.points || []).filter(pt => {
      const ok = pt && pt.text && pt.basis && [...stars].some(name => pt.basis.includes(name));
      if (!ok) dropped++;
      return ok;
    });
    return { id: t.id, summary: String(r.summary || ''), points, action: String(r.action || '') };
  });
  return { topics, dropped };
}

function renderReading(stored) {
  if (!chartState) return;
  const { z, birth } = chartState;
  const key = chartKeyOf(birth);
  const draw = (cache) => {
    const reading = cache && cache.key === key && cache.v === READING_VERSION ? cache : null;
    const btn = document.getElementById('readingGenerateBtn');
    btn.textContent = reading ? 'Tạo lại' : 'Tạo luận giải';
    const status = document.getElementById('readingStatus');
    if (reading && !status.dataset.busy) status.textContent = `Tạo ngày ${new Date(reading.createdAt).toLocaleDateString('vi-VN')}`;

    document.getElementById('readingTopics').innerHTML = READING_TOPICS.map(t => {
      const { facts, palaceNames } = topicFacts(z, t);
      const r = reading && reading.topics.find(x => x.id === t.id);
      const body = !r ? '' : r.missing ? '<p class="reading-empty">AI chưa trả lời phần này. Bấm "Tạo lại" để thử lại.</p>' : `
        <p class="reading-summary">${escapeHtml(r.summary)}</p>
        <ul class="reading-points">${r.points.map(pt => `<li>${escapeHtml(pt.text)}<span class="reading-basis">Căn cứ: ${escapeHtml(pt.basis)}</span></li>`).join('')}</ul>
        ${r.action ? `<p class="reading-action"><strong>Gợi ý:</strong> ${escapeHtml(r.action)}</p>` : ''}`;
      return `<article class="reading-card">
        <h4 class="reading-title">${t.title} <span class="cc-muted">· cung ${palaceNames.join(', ')}</span></h4>
        ${t.note ? `<p class="reading-note">${t.note}</p>` : ''}
        ${body}
        <details class="reading-facts"${reading ? '' : ' open'}>
          <summary>Dữ kiện từ lá số</summary>
          <ul>${facts.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
        </details>
      </article>`;
    }).join('');
  };
  if (stored !== undefined) draw(stored);
  else chrome.storage.local.get('chartReading', ({ chartReading }) => draw(chartReading));
}

async function generateReading() {
  if (!chartState) return;
  const { z, info, birth } = chartState;
  const btn = document.getElementById('readingGenerateBtn');
  const status = document.getElementById('readingStatus');
  btn.disabled = true;
  status.dataset.busy = '1';
  status.textContent = 'Đang luận giải… (khoảng 10–30 giây)';
  const res = await callGemini(buildReadingPrompt(z, info, birth.gender), 0.4, 8192);
  btn.disabled = false;
  delete status.dataset.busy;
  if (res.error === 'no-key') {
    status.innerHTML = 'Cần Gemini API key. <button type="button" class="link-btn" id="readingAddKey">Thêm API key</button>';
    document.getElementById('readingAddKey').onclick = () => {
      document.getElementById('astroDetailsModal').style.display = 'none';
      openSettingsAt('geminiKey');
    };
    return;
  }
  if (res.error) { status.textContent = 'Không kết nối được AI. Thử lại sau ít phút.'; return; }
  let parsed;
  try { parsed = parseReading(res.text, z); }
  catch (e) { status.textContent = 'AI trả về sai định dạng. Bấm "Tạo luận giải" để thử lại.'; return; }
  const cache = { key: chartKeyOf(birth), v: READING_VERSION, createdAt: Date.now(), topics: parsed.topics };
  chrome.storage.local.set({ chartReading: cache });
  renderReading(cache);
  if (parsed.dropped) status.textContent = `Đã tạo. Bỏ ${parsed.dropped} ý không có căn cứ trong lá số.`;
}
document.getElementById('readingGenerateBtn')?.addEventListener('click', generateReading);

function renderToday(birth, opts) {
  const now = new Date();
  const dc = getDayCanChi(now);
  const dayStr = `${thienCan[dc.can]} ${diaChi[dc.chi]}`;

  const lunar = solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
  let lunarDay = '', lunarMonth = '', lunarYearStr = '';
  if (lunar.year) {
    const lc = canOfYear(lunar.year);
    const lchi = chiOfYear(lunar.year);
    lunarYearStr = `${thienCan[lc]} ${diaChi[lchi]}`;
    lunarDay = lunar.day;
    lunarMonth = lunar.month;
  }

  const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const solarRef = `${weekdays[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  // Update new dashboard elements
  const astroDateTitle = document.getElementById('astroDateTitle');
  if (astroDateTitle) astroDateTitle.textContent = dayStr;

  const astroDateSub = document.getElementById('astroDateSub');
  if (astroDateSub) {
    const formattedDate = `${String(now.getDate()).padStart(2, '0')} / ${String(now.getMonth() + 1).padStart(2, '0')} / ${now.getFullYear()}`;
    astroDateSub.textContent = formattedDate;
  }

  const nhPill = document.getElementById('nhPill');
  if (nhPill) {
    const info = getBirthChart(birth);
    if (info) {
      nhPill.textContent = `Mệnh ${info.napAm.name}`;
      nhPill.className = `nh-pill nh-${info.napAm.element}`;
    } else {
      const todayNh = nguHanhOfCan(dc.can);
      nhPill.textContent = `Ngày hành ${nguHanh[todayNh]}`;
      nhPill.className = `nh-pill nh-${todayNh}`;
    }
  }

  const hdEl = document.getElementById('astroHoangDao');
  if (hdEl) {
    hdEl.hidden = !birth;
    if (birth) {
      hdEl.innerHTML = `<span class="section-label">Giờ hoàng đạo hôm nay</span>
        <div class="hd-chips">${hoangDaoHours(now).map(h => `<span class="hd-chip" title="${h.god}"><b>${h.name}</b> ${h.range}</span>`).join('')}</div>`;
    }
  }

  function buildDisplay(aiText, status) {
    const todayInsight = document.getElementById('todayInsight');
    if (!todayInsight) return;
    // Nothing to detail until there is a birth chart
    const detailBtn = document.getElementById('openAstroDetailsBtn');
    if (detailBtn) detailBtn.hidden = status === 'nobirth';

    if (aiText) {
      todayInsight.textContent = aiText;
    } else if (status === 'nobirth') {
      todayInsight.innerHTML = `<span class="astro-invite">Thêm ngày sinh để nhận lời khuyên Tử Vi cho riêng bạn mỗi ngày.</span>
        <button type="button" class="glass-btn astro-invite-btn">Nhập ngày sinh</button>`;
      todayInsight.querySelector('.astro-invite-btn').onclick = () => openSettingsAt('birthDay');
    } else if (status === 'nokey') {
      todayInsight.innerHTML = `<span style="font-size:11px;opacity:0.6">⚙️ Nhập Gemini API key trong Cài đặt để nhận lời khuyên Tử Vi cá nhân hóa.</span>`;
    } else if (status === 'error') {
      todayInsight.innerHTML = `<span style="font-size:11px;opacity:0.6">⚠️ Lỗi kết nối. Vui lòng kiểm tra lại cấu hình.</span>`;
    } else {
      todayInsight.innerHTML = `<span style="font-size:11px;opacity:0.6">💫 Đang giải mã tinh tú...</span>`;
    }
  }

  if (!birth) {
    buildDisplay('', 'nobirth');
    return;
  }

  if (opts?.text) {
    buildDisplay(opts.text);
  } else if (opts?.error) {
    buildDisplay('', 'error');
  } else if (opts?.loading) {
    buildDisplay('', 'loading');
  } else if (opts?.nokey) {
    buildDisplay('', 'nokey');
  } else {
    buildDisplay('');
  }
}

function renderAll(forceRefresh) {
  chrome.storage.sync.get(['birth', 'geminiKey'], (syncData) => {
   chrome.storage.local.get('dailyInsightCache', ({ dailyInsightCache }) => {
    const data = { ...syncData, dailyInsightCache };
    if (data.birth && typeof iztro === 'undefined') {
      loadIztro().then(() => renderAll(forceRefresh)).catch(e => console.warn('ZenTab:', e.message));
      return;
    }
    if (data.birth) {
      renderZodiac(data.birth);
      const today = getDateStr(new Date());
      const cached = data.dailyInsightCache;
      const cachedText = (cached && cached.date === today && !forceRefresh) ? cached.insight?.text : null;
      if (cachedText) {
        renderToday(data.birth, { text: cachedText });
      } else if (data.geminiKey) {
        renderToday(data.birth, { loading: true });
      } else {
        renderToday(data.birth, { nokey: true });
      }
      if (data.geminiKey) {
        loadDailyPersonalizedInsight(data.birth, data.geminiKey, forceRefresh);
      }
    } else {
      zodiacInfo.innerHTML = '';
      tuviInfo.innerHTML = '';
      document.getElementById('astroDivider').style.display = 'none';
      document.getElementById('tvDivider').style.display = 'none';
      renderToday(null);
    }
   });
  });
}

renderAll();

// ---- Gemini Daily Personalized Insight ----
function loadDailyPersonalizedInsight(birth, apiKey, forceRefresh) {
  const today = getDateStr(new Date());
  chrome.storage.sync.get('tasks', (syncData) => {
   chrome.storage.local.get('dailyInsightCache', ({ dailyInsightCache }) => {
    const data = { ...syncData, dailyInsightCache };
    const cache = data.dailyInsightCache;
    if (cache && cache.date === today && cache.insight?.v === 6 && !forceRefresh) {
      displayDailyInsight(cache.insight);
      return;
    }
    chrome.storage.local.remove('dailyInsightCache');
    chrome.storage.sync.remove('dailyInsightCache'); // legacy location

    const info = getBirthChart(birth);
    const ziwei = info && info.ziwei;
    let tuviStr = '';
    if (ziwei) {
      tuviStr = KEY_PALACES.map(name => {
        const p = ziwei.palaces.find(x => x.name === name);
        const stars = p ? describePalaceStars(p) : [];
        return `${name}: ${stars.length ? stars.join(', ') : 'Vô chính diệu'}`;
      }).join(' | ');
    }

    const now = new Date();
    const dc = getDayCanChi(now);
    const todayStr = `Today: day ${thienCan[dc.can]} ${diaChi[dc.chi]}; giờ hoàng đạo: ${hoangDaoHours(now).map(h => `${h.name} ${h.range}`).join(', ')}`;
    let luckStr = '';
    if (ziwei) {
      const h = ziwei.horoscope(now);
      const hoa = names => HOA_ORDER.map((x, i) => names[i] ? `Hóa ${x} ${names[i]}` : '').filter(Boolean).join(', ');
      luckStr = `- Current luck: đại hạn at ${ziwei.palaces[h.decadal.index].name}; lưu niên at ${ziwei.palaces[h.yearly.index].name}; lưu nhật at ${ziwei.palaces[h.daily.index].name} (daily Tứ Hóa: ${hoa(h.daily.mutagen)})`;
    }
    // Read tasks from storage: at startup the in-memory list may not be loaded yet
    const openTasks = (data.tasks || []).filter(t => !t.done).slice(0, 5).map(t => t.text);

    // English prompt works best with Gemini models, instructing Vietnamese output
    const prompt = `You are a Vietnamese Tử Vi (Zi Wei Dou Shu) and Bát Tự (Ba Zi) master. Give the user ONE actionable piece of advice for today in Vietnamese. 1-2 sentences only. No greeting, no intro, no "chào bạn".

USER INFO:
- Gender: ${birth.gender === 'female' ? 'Nữ' : 'Nam'}
- Lunar birth year: ${info ? info.yearCanChi : '—'} (Nạp âm: ${info ? info.napAm.name : '—'})
- Western zodiac: ${getWesternZodiac(birth.month, birth.day).nameVi}
- Ba Zi pillars: ${info ? info.pillars.join(' | ') : '—'}${info && !info.hourKnown ? ' (birth hour unknown: hour pillar and palaces NOT available, do not mention palaces)' : ''}
${ziwei ? `- Ming palace branch: ${ziwei.earthlyBranchOfSoulPalace}, Five Elements class: ${ziwei.fiveElementsClass}` : ''}
${tuviStr ? '- Key palaces (major stars, brightness, birth-year Tứ Hóa): ' + tuviStr : ''}
${luckStr}
- ${todayStr}
- Today's open tasks: ${openTasks.length ? openTasks.map(t => `"${t}"`).join('; ') : 'none'}

If there are open tasks, tie the advice to ONE of them by name; if you suggest a time for it, pick only from the giờ hoàng đạo listed. Otherwise focus on one area: work, money, love, or health. Only reference stars, palaces and pillars listed above; never invent placements. Do not predict illness, accidents or death, and do not give financial or medical directives.

EXAMPLES (do NOT copy, use as style reference):
❌ "Chào bạn, hôm nay là ngày tốt." (too generic)
✅ "Hôm nay Liêm Trinh tại Tài Bạch, tài vận có biến động, chỉ nên thu chi hợp lý, tránh đầu tư mạo hiểm."
✅ "Tử Vi thủ Mệnh gặp ngày Nhâm, quý nhân xuất hiện, hãy chủ động kết nối với đồng nghiệp cũ."
✅ "Thái Âm tại Phúc Đức, tâm trạng an yên, dành thời gian cho gia đình và thiền định."

ADVICE:`;

    const delays = [5000, 15000, 30000];

    (async () => {
      const models = await getGeminiModels(apiKey);
      let result = null;
      for (const model of models) {
        for (let i = 0; i < 3; i++) {
          try {
            console.log(`ZenTab: calling ${model} (attempt ${i+1})`);
            const res = await fetch(`${GEMINI_API}/models/${model}:generateContent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                // newer models count their thinking against this budget
                generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
              })
            });
            const body = await res.text();
            if (res.status === 429 || res.status === 503) {
              console.warn(`ZenTab: ${model} ${res.status} (attempt ${i+1}/3)`);
              if (i < 2) await new Promise(r => setTimeout(r, delays[i]));
              continue;
            }
            if (!res.ok) {
              console.warn(`ZenTab: ${model} ${res.status}:`, body.slice(0, 200));
              if (res.status === 404) forgetGeminiModels();
              break;
            }
            const data = JSON.parse(body);
            result = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
            if (result) {
              console.log(`ZenTab: ${model} success`);
              break;
            }
          } catch (e) {
            console.warn(`ZenTab: ${model} error:`, e.message);
            if (i < 2) await new Promise(r => setTimeout(r, delays[i]));
            continue;
          }
        }
        if (result) break;
      }
      if (result) {
        const clean = result.replace(/^(advice|advice:|lời khuyên|lời khuyên hôm nay|"|')/i, '').trim();
        const insight = { text: clean, date: today, v: 6 };
        chrome.storage.local.set({ dailyInsightCache: { date: today, insight } });
        displayDailyInsight(insight);
      } else {
        handleGeminiFail(birth);
      }
    })();
   });
  });
}

function handleGeminiFail(birth) {
  showRandomQuote();
  if (birth) renderToday(birth, { error: true });
}

function displayDailyInsight(insight) {
  if (!insight?.text) return;
  const clean = insight.text.replace(/^["']|["']$/g, '').trim();
  const txtEl = document.getElementById('quoteText');
  const authEl = document.getElementById('quoteAuthor');
  if (txtEl) {
    txtEl.textContent = `"${clean}"`;
    txtEl.classList.remove('expanded');
  }
  if (authEl) authEl.textContent = '☯ Tử Vi · Bát Tự · Chiêm Tinh';
  const expandBtn = document.getElementById('expandQuoteBtn');
  if (expandBtn) expandBtn.textContent = 'Xem đầy đủ';
  // Update astro panel via renderToday
  chrome.storage.sync.get('birth', (d) => {
    if (d.birth) renderToday(d.birth, { text: clean });
  });
}

// Start from a random quote; ‹ › then step from that one
function showRandomQuote() {
  currentQuoteIdx = Math.floor(Math.random() * quotes.length);
  displayQuoteAt(currentQuoteIdx);
}

// Task List
let tasks = [];

const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
const taskAddBtn = document.getElementById('taskAddBtn');

function loadTasks() {
  chrome.storage.sync.get('tasks', (data) => {
    tasks = data.tasks || [];
    renderTasks();
  });
}

function saveTasks() {
  chrome.storage.sync.set({ tasks });
}

function renderTasks() {
  const tasksCountBadge = document.getElementById('tasksCountBadge');
  const tasksProgressContainer = document.getElementById('tasksProgressContainer');
  
  if (tasks.length === 0) {
    taskList.innerHTML = '<div class="task-empty">Chưa có nhiệm vụ nào. Hãy thêm nhiệm vụ mới ở trên!</div>';
    if (tasksCountBadge) tasksCountBadge.textContent = '0';
    if (tasksProgressContainer) tasksProgressContainer.style.display = 'none';
    return;
  }
  
  if (tasksCountBadge) tasksCountBadge.textContent = tasks.length;
  
  taskList.innerHTML = tasks.map((t, i) => {
    const categories = ['Công việc', 'Phát triển bản thân'];
    const category = t.category || categories[i % 2];
    const timeVal = t.time || `${String(9 + (i * 2) % 12).padStart(2, '0')}:00`;
    const catClass = category === 'Công việc' ? 'cat-work' : 'cat-life';
    
    return `
      <div class="task-item ${t.done ? 'done' : ''}">
        <button class="task-check" data-idx="${i}">${t.done ? '✓' : '○'}</button>
        <span class="task-text">${escapeHtml(t.text)}</span>
        <span class="task-category-pill ${catClass}">${category}</span>
        <span class="task-time-val">${timeVal}</span>
        <button class="task-del" data-idx="${i}">✕</button>
      </div>
    `;
  }).join('');
  
  const doneCount = tasks.filter(t => t.done).length;
  const percent = Math.round((doneCount / tasks.length) * 100);
  
  if (tasksProgressContainer) {
    tasksProgressContainer.style.display = 'flex';
    const progressText = document.getElementById('tasksProgressText');
    const progressPercent = document.getElementById('tasksProgressPercent');
    const progressBarFill = document.getElementById('tasksProgressBarFill');
    
    if (progressText) progressText.textContent = `Hoàn thành ${doneCount}/${tasks.length} nhiệm vụ`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressBarFill) progressBarFill.style.width = `${percent}%`;
  }
  
  taskList.querySelectorAll('.task-check').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx);
      tasks[idx].done = !tasks[idx].done;
      saveTasks();
      renderTasks();
    };
  });

  taskList.querySelectorAll('.task-del').forEach(btn => {
    btn.onclick = () => {
      tasks.splice(parseInt(btn.dataset.idx), 1);
      saveTasks();
      renderTasks();
    };
  });
}

function addTask(text) {
  text = text.trim();
  if (!text) return;
  
  const categories = ['Công việc', 'Phát triển bản thân'];
  const category = categories[tasks.length % 2];
  const now = new Date();
  const timeVal = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  tasks.push({ 
    text, 
    done: false, 
    createdAt: Date.now(),
    category,
    time: timeVal
  });
  
  saveTasks();
  renderTasks();
  taskInput.value = '';
}

taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask(taskInput.value);
});
taskAddBtn.addEventListener('click', () => addTask(taskInput.value));

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadTasks();

// ---- Pomodoro Timer ----
let timerInterval;
let timeLeft = 25 * 60;
let targetTime = 0;
let isTimerRunning = false;
let timerMode = 'pomodoro';
// Synthesized singing bowl (ambient.js) — no network request
const timerChime = {
  play: () => window.ZenAmbient ? Promise.resolve(ZenAmbient.chime()) : Promise.reject(new Error('Audio unavailable'))
};

const timerDisplay = document.querySelector('.timer-display');
const timerModeSelect = document.getElementById('timerModeSelect');
const timerProgressRing = document.getElementById('timerProgressRing');

(function injectSvgGradient() {
  const existingSvg = document.querySelector('.timer-svg');
  if (existingSvg && !existingSvg.querySelector('defs')) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#a78bfa" />
        <stop offset="100%" stop-color="#ec4899" />
      </linearGradient>
    `;
    existingSvg.appendChild(defs);
  }
})();

function getModeDuration(mode) {
  if (mode === 'short') return 5 * 60;
  if (mode === 'long') return 15 * 60;
  return 25 * 60;
}

function updateTimerDisplay() {
  const m = Math.floor(timeLeft / 60);
  const s = Math.floor(timeLeft % 60);
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  
  document.querySelectorAll('.timer-display').forEach(el => el.textContent = timeStr);
  updateProgressRing();
  // Remaining time in the tab strip while running
  if (isTimerRunning) document.title = `${timeStr} · ${timerMode === 'pomodoro' ? 'Tập trung' : 'Nghỉ ngơi'}`;
  updateFocusMeta();
}

function updateProgressRing() {
  const maxSec = getModeDuration(timerMode);
  const percent = Math.max(0, Math.min(1, timeLeft / maxSec));
  const circumference = 276.46;
  const offset = circumference * (1 - percent);
  
  const r1 = document.getElementById('timerProgressRing');
  const r2 = document.getElementById('focusTimerProgressRing');
  if (r1) r1.style.strokeDashoffset = offset;
  if (r2) r2.style.strokeDashoffset = offset;
}

if (timerModeSelect) {
  timerModeSelect.addEventListener('change', () => {
    resetTimer();
    timerMode = timerModeSelect.value;
    timeLeft = getModeDuration(timerMode);
    
    document.querySelectorAll('.timer-mode-label').forEach(el => {
      el.textContent = timerMode === 'pomodoro' ? 'Tập trung' : 'Nghỉ ngơi';
    });
    document.documentElement.dataset.timerMode = timerMode;
    
    updateTimerDisplay();
    syncFocusModes();
  });
}

function toggleTimerUIEffects(isPlaying) {
  document.querySelectorAll('.timer-circle-wrapper').forEach(el => {
    if (isPlaying) {
      el.classList.add('timer-running');
    } else {
      el.classList.remove('timer-running');
    }
  });
  
  // CSS dims the surrounding chrome while a focus session runs
  document.documentElement.classList.toggle('timer-is-running', isPlaying);
  const drawerBtn = document.getElementById('drawerFocusBtn');
  if (drawerBtn) drawerBtn.textContent = isPlaying ? 'Mở màn Tập trung' : '▶ Bắt đầu phiên';
  document.documentElement.dataset.timerMode = timerMode;
  if (!isPlaying) document.title = 'ZenTab';
  updateFocusMeta();
}

function toggleTimer() {
  if (window.ZenAmbient) ZenAmbient.unlock();
  const btn1Text = document.getElementById('timerStart')?.querySelector('span');
  const btn1Icon = document.getElementById('timerStart')?.querySelector('svg');
  const btn2Text = document.getElementById('focusTimerStart')?.querySelector('span');
  const btn2Icon = document.getElementById('focusTimerStart')?.querySelector('svg');
  
  const updateUIPlay = () => {
    if (btn1Text) btn1Text.textContent = 'Tạm dừng';
    if (btn2Text) btn2Text.textContent = 'Tạm dừng';
    const pauseIconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6" />`;
    if (btn1Icon) btn1Icon.innerHTML = pauseIconSvg;
    if (btn2Icon) btn2Icon.innerHTML = pauseIconSvg;
    toggleTimerUIEffects(true);
  };
  
  const updateUIPause = () => {
    if (btn1Text) btn1Text.textContent = 'Bắt đầu';
    if (btn2Text) btn2Text.textContent = 'Bắt đầu';
    const playIconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />`;
    if (btn1Icon) btn1Icon.innerHTML = playIconSvg;
    if (btn2Icon) btn2Icon.innerHTML = playIconSvg;
    toggleTimerUIEffects(false);
  };
  
  if (isTimerRunning) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    updateUIPause();
  } else {
    isTimerRunning = true;
    targetTime = Date.now() + (timeLeft * 1000);
    updateUIPlay();
    
    timerInterval = setInterval(() => {
      const now = Date.now();
      const remaining = (targetTime - now) / 1000;
      
      if (remaining <= 0) {
        timeLeft = 0;
        updateTimerDisplay();
        clearInterval(timerInterval);
        isTimerRunning = false;
        updateUIPause();
        toggleTimerUIEffects(false);
        
        timerChime.play().catch(e => console.log('Audio play failed', e));
        
        timeLeft = getModeDuration(timerMode);
        updateTimerDisplay();
        onTimerComplete(timerMode);
      } else {
        timeLeft = remaining;
        updateTimerDisplay();
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timeLeft = getModeDuration(timerMode);
  updateTimerDisplay();
  resetTimerUI();
  toggleTimerUIEffects(false);
}

function resetTimerUI() {
  const btn1Text = document.getElementById('timerStart')?.querySelector('span');
  const btn1Icon = document.getElementById('timerStart')?.querySelector('svg');
  const btn2Text = document.getElementById('focusTimerStart')?.querySelector('span');
  const btn2Icon = document.getElementById('focusTimerStart')?.querySelector('svg');
  
  if (btn1Text) btn1Text.textContent = 'Bắt đầu';
  if (btn2Text) btn2Text.textContent = 'Bắt đầu';
  const playIconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />`;
  if (btn1Icon) btn1Icon.innerHTML = playIconSvg;
  if (btn2Icon) btn2Icon.innerHTML = playIconSvg;
}

document.getElementById('timerStart')?.addEventListener('click', toggleTimer);
document.getElementById('focusTimerStart')?.addEventListener('click', toggleTimer);
document.getElementById('timerReset')?.addEventListener('click', resetTimer);
document.getElementById('focusTimerReset')?.addEventListener('click', resetTimer);

// Drawer launcher: start a session (or return to the running one) in the Focus view
document.getElementById('drawerFocusBtn')?.addEventListener('click', () => {
  document.getElementById('closeRightDrawerBtn')?.click();
  if (isTimerRunning) switchTab('focus');
  else startFocusSession();
});

// ---- Quotes Carousel & Audio Player ----
const quotes = [
  { text: 'Việc của bạn là khám phá thế giới của mình, rồi dốc hết lòng mà sống cho nó.', author: 'Đức Phật' },
  { text: 'Tâm hồn luôn biết cách tự chữa lành. Thử thách là làm cho tâm trí lặng yên.', author: 'Caroline Myss' },
  { text: 'Giữa khó khăn luôn ẩn chứa cơ hội.', author: 'Albert Einstein' },
  { text: 'Tĩnh lặng là nguồn của sức mạnh lớn lao.', author: 'Lão Tử' },
  { text: 'Con người càng an tĩnh, thành công càng lớn.', author: 'James Allen' }
];

let currentQuoteIdx = 0;
const relaxingAudio = document.getElementById('relaxingAudio');
const playBtn = document.getElementById('playBtn');

// Built-in sounds are synthesized by ambient.js; 'custom' streams the user's URL
const ambientPlayer = {
  kind: 'forest',
  isPlaying() {
    return this.kind === 'custom' ? !!relaxingAudio && !relaxingAudio.paused : !!window.ZenAmbient && ZenAmbient.isPlaying();
  },
  play() {
    if (this.kind === 'custom') return relaxingAudio ? relaxingAudio.play() : Promise.reject(new Error('No audio element'));
    return window.ZenAmbient ? ZenAmbient.play(this.kind) : Promise.reject(new Error('Audio unavailable'));
  },
  pause() {
    if (relaxingAudio) relaxingAudio.pause();
    if (window.ZenAmbient) ZenAmbient.stop();
  },
  setKind(kind) {
    const wasPlaying = this.isPlaying();
    if (wasPlaying && (kind === 'custom' || this.kind === 'custom')) this.pause();
    this.kind = kind;
    if (wasPlaying) this.play().catch(e => console.warn(e));
  }
};

function displayQuoteAt(index) {
  if (!quotes || quotes.length === 0) return;
  const q = quotes[index];
  const textEl = document.getElementById('quoteText');
  const authEl = document.getElementById('quoteAuthor');
  if (textEl) {
    textEl.textContent = `"${q.text}"`;
    textEl.classList.remove('expanded');
  }
  if (authEl) authEl.textContent = `— ${q.author}`;
  const expandBtn = document.getElementById('expandQuoteBtn');
  if (expandBtn) expandBtn.textContent = 'Xem đầy đủ';
}

document.getElementById('prevQuoteBtn').addEventListener('click', () => {
  currentQuoteIdx = (currentQuoteIdx - 1 + quotes.length) % quotes.length;
  displayQuoteAt(currentQuoteIdx);
});

document.getElementById('nextQuoteBtn').addEventListener('click', () => {
  currentQuoteIdx = (currentQuoteIdx + 1) % quotes.length;
  displayQuoteAt(currentQuoteIdx);
});

// The daily AI insight, when there is one, replaces this once it loads
showRandomQuote();

if (playBtn) {
  playBtn.addEventListener('click', () => {
    const playIcon = document.getElementById('playIcon');
    if (!ambientPlayer.isPlaying()) {
      ambientPlayer.play().then(() => {
        if (playIcon) {
          playIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          `;
        }
      }).catch(e => console.warn("Audio play blocked", e));
    } else {
      ambientPlayer.pause();
      if (playIcon) {
        playIcon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        `;
      }
    }
  });
}

// ---- Sidebar SPA Navigation & State Management ----
function initSPA() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.id === 'settingsBtn') {
        // Settings modal trigger
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.style.display = 'flex';
        return;
      }
      
      const tab = btn.dataset.tab;
      if (!tab) return;
      
      switchTab(tab);
    });
  });
  
  // Load saved active tab on load
  chrome.storage.local.get('activeTab', (data) => {
    const savedTab = data.activeTab || 'home';
    switchTab(savedTab);
  });
}

function switchTab(tab) {
  // Update nav item active states
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.dataset.tab === tab) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Switch visible views
  document.querySelectorAll('.dashboard-view').forEach(view => {
    view.classList.remove('active');
    view.style.display = 'none';
  });
  
  const targetView = document.getElementById(`view-${tab}`);
  if (targetView) {
    targetView.style.display = (tab === 'focus' || tab === 'ai' || tab === 'journal') ? 'flex' : 'block';
    // Reflow trigger
    void targetView.offsetWidth;
    targetView.classList.add('active');
  }
  
  // Zen only applies to Home; other views keep the sidebar for navigation
  const appLayout = document.querySelector('.app-layout');
  if (appLayout) appLayout.dataset.view = tab;

  // Save to storage
  chrome.storage.local.set({ activeTab: tab });
  
  // Execute view-specific initializations
  if (tab === 'focus') {
    initFocusView();
  } else if (tab === 'tasks') {
    initKanbanView();
  } else if (tab === 'ai') {
    initAiView();
  } else if (tab === 'stats') {
    initStatsView();
  } else if (tab === 'journal') {
    window.ZenJournal?.open();
  }
}

// Focus View Specific Initializer
function renderFocusHoangDao() {
  const el = document.getElementById('focusHoangDao');
  if (!el) return;
  chrome.storage.sync.get('birth', ({ birth }) => {
    el.hidden = !birth;
    if (!birth) return;
    const { now, next, hours } = hoangDaoNow(new Date());
    el.title = 'Giờ hoàng đạo hôm nay: ' + hours.map(h => `${h.name} ${h.range}`).join(', ');
    el.innerHTML = now
      ? `<span class="hd-dot" aria-hidden="true"></span>Giờ hoàng đạo <b>${now.name}</b> · đến ${now.range.split('–')[1]}`
      : `Hoàng đạo tiếp theo: <b>${next.name}</b> ${next.range}`;
  });
}
setInterval(() => { if (document.getElementById('view-focus')?.classList.contains('active')) renderFocusHoangDao(); }, 60000);

function initFocusView() {
  renderFocusHoangDao();
  renderFocusIntention();
  renderFocusSessions();
  syncFocusModes();
  syncFocusSounds();
  updateFocusMeta();
  
  // Quick clock trigger to prevent flash of 00:00
  const clockEl = document.getElementById('focusClock');
  const dateEl = document.getElementById('focusDate');
  if (clockEl && dateEl) {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    dateEl.textContent = now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}

// Call SPA initialization
initSPA();

const openAstroDetailsBtn = document.getElementById('openAstroDetailsBtn');
const astroDetailsModal = document.getElementById('astroDetailsModal');
const closeAstroDetailsBtn = document.getElementById('closeAstroDetailsBtn');

if (openAstroDetailsBtn && astroDetailsModal && closeAstroDetailsBtn) {
  openAstroDetailsBtn.addEventListener('click', () => {
    chrome.storage.sync.get('birth', async ({ birth }) => {
      if (birth) await loadIztro().catch(() => {});
      renderChartModal(birth);
      // Copied date-only markup loses listeners: rebind the "add birth hour" shortcut
      document.querySelector('#modalZodiacInfo .astro-add-hour')?.addEventListener('click', () => {
        astroDetailsModal.style.display = 'none';
        openSettingsAt('birthHour');
      });
      astroDetailsModal.style.display = 'flex';
    });
  });
  
  closeAstroDetailsBtn.addEventListener('click', () => {
    astroDetailsModal.style.display = 'none';
  });
  
  astroDetailsModal.addEventListener('click', (e) => {
    if (e.target === astroDetailsModal) {
      astroDetailsModal.style.display = 'none';
    }
  });
}

const intentionSubmitBtn = document.getElementById('intentionSubmitBtn');
if (intentionSubmitBtn) {
  intentionSubmitBtn.addEventListener('click', () => {
    if (journalInput && journalInput.value.trim()) {
      saveJournalEntry(journalInput.value);
    }
  });
}

// Ideas carry their mind-map nodes, which outgrow storage.sync's 8 KB-per-item limit,
// so they live in storage.local. Existing users' ideas are moved over once.
function getIdeasWith(syncKeys, cb) {
  chrome.storage.sync.get(syncKeys, (syncData) => {
    chrome.storage.local.get('quickIdeas', ({ quickIdeas }) => {
      if (quickIdeas) return cb({ ...syncData, quickIdeas });
      chrome.storage.sync.get('quickIdeas', ({ quickIdeas: legacy }) => {
        if (legacy) chrome.storage.local.set({ quickIdeas: legacy }, () => chrome.storage.sync.remove('quickIdeas'));
        cb({ ...syncData, quickIdeas: legacy || [] });
      });
    });
  });
}

// Starter habits shown until the user saves their own list
function defaultHabits(todayStr) {
  return [
    { text: 'Thiền định (10 phút)', done: false, date: todayStr },
    { text: 'Uống đủ nước', done: false, date: todayStr },
    { text: 'Đọc sách (30 phút)', done: false, date: todayStr }
  ];
}

// ---- Quick Tools Interactivity (Notes, Habits, Ideas, Charts) ----
const quickToolPanel = document.getElementById('quickToolPanel');
const quickToolTitle = document.getElementById('quickToolTitle');
const quickToolBody = document.getElementById('quickToolBody');
const closeQuickToolBtn = document.getElementById('closeQuickToolBtn');
let currentActiveTool = null;

if (closeQuickToolBtn && quickToolPanel) {
  closeQuickToolBtn.addEventListener('click', () => {
    quickToolPanel.style.display = 'none';
    currentActiveTool = null;
  });
}

document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tool = btn.dataset.tool;
    // Stats has its own view; the tile is just a shortcut there
    if (tool === 'stats') {
      document.getElementById('closeRightDrawerBtn')?.click();
      switchTab('stats');
      return;
    }
    if (quickToolPanel.style.display !== 'none' && currentActiveTool === tool) {
      quickToolPanel.style.display = 'none';
      currentActiveTool = null;
    } else {
      currentActiveTool = tool;
      quickToolPanel.style.display = 'flex';
      loadToolContent(tool);
    }
  });
});

function loadToolContent(tool) {
  if (!quickToolBody) return;
  
  if (tool === 'notes') {
    quickToolTitle.textContent = 'Ghi chú';
    quickToolBody.innerHTML = `<textarea id="notesArea" placeholder="Ghi chú nhanh ở đây... Tự động lưu sau mỗi thay đổi."></textarea>`;
    
    const notesArea = document.getElementById('notesArea');
    chrome.storage.sync.get('quickNotes', (data) => {
      if (notesArea) notesArea.value = data.quickNotes || '';
    });
    
    // storage.sync allows only ~120 writes a minute: save once typing pauses, and on leave
    let notesTimer = null;
    const saveNotes = () => { clearTimeout(notesTimer); notesTimer = null; chrome.storage.sync.set({ quickNotes: notesArea.value }); };
    notesArea.addEventListener('input', () => { clearTimeout(notesTimer); notesTimer = setTimeout(saveNotes, 800); });
    notesArea.addEventListener('blur', () => { if (notesTimer) saveNotes(); });
    window.addEventListener('pagehide', () => { if (notesTimer) saveNotes(); });
    
  } else if (tool === 'ideas') {
    quickToolTitle.textContent = 'Ý tưởng';
    quickToolBody.innerHTML = `
      <div class="tool-input-row">
        <input type="text" id="ideaInput" placeholder="Thêm ý tưởng mới..." autocomplete="off">
        <button id="ideaAddBtn" class="tool-add-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <div id="ideaList" class="tool-list"></div>
    `;
    
    const ideaInput = document.getElementById('ideaInput');
    const ideaAddBtn = document.getElementById('ideaAddBtn');
    
    function renderIdeas() {
      getIdeasWith(['labsMindmap'], (data) => {
        const mindmapOn = !!data.labsMindmap;
        const ideas = data.quickIdeas || [];
        
        // Data Upgrader: Convert plain strings to mindmap objects
        let needsSave = false;
        const upgradedIdeas = ideas.map((idea, i) => {
          if (typeof idea === 'string') {
            needsSave = true;
            return {
              id: 'idea-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
              text: idea,
              nodes: [
                { id: 'root', text: idea, x: 450, y: 220, parentId: null }
              ]
            };
          }
          return idea;
        });
        
        if (needsSave) {
          chrome.storage.local.set({ quickIdeas: upgradedIdeas });
        }
        
        const listEl = document.getElementById('ideaList');
        if (!listEl) return;
        
        if (upgradedIdeas.length === 0) {
          listEl.innerHTML = '<div class="task-empty">Chưa có ý tưởng nào.</div>';
          return;
        }
        
        listEl.innerHTML = upgradedIdeas.map((idea, i) => `
          <div class="tool-item" style="${mindmapOn ? 'cursor:pointer;' : ''}display:flex;justify-content:space-between;align-items:center;" data-idx="${i}" ${mindmapOn ? 'title="Mở sơ đồ ý tưởng"' : ''}>
            <div class="tool-item-left" style="flex:1;overflow:hidden;">
              <span class="tool-item-text" style="font-weight:400;">💡 ${escapeHtml(idea.text)}</span>
            </div>
            ${mindmapOn ? '<span class="idea-open-hint" aria-hidden="true">Sơ đồ ›</span>' : ''}
            <button class="tool-del-btn" data-idx="${i}" style="pointer-events:auto;">✕</button>
          </div>
        `).join('');
        
        // Click to open Mindmap
        if (mindmapOn) listEl.querySelectorAll('.tool-item').forEach(item => {
          item.onclick = (e) => {
            // If click was on delete button, do nothing
            if (e.target.classList.contains('tool-del-btn')) return;
            const idx = parseInt(item.dataset.idx);
            openMindmap(idx);
          };
        });
        
        listEl.querySelectorAll('.tool-del-btn').forEach(delBtn => {
          delBtn.onclick = (e) => {
            e.stopPropagation();
            const idx = parseInt(delBtn.dataset.idx);
            upgradedIdeas.splice(idx, 1);
            chrome.storage.local.set({ quickIdeas: upgradedIdeas }, renderIdeas);
          };
        });
      });
    }
    
    function addIdea() {
      const text = ideaInput.value.trim();
      if (!text) return;
      getIdeasWith([], (data) => {
        const ideas = data.quickIdeas || [];
        const newIdea = {
          id: 'idea-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          text: text,
          nodes: [
            { id: 'root', text: text, x: 450, y: 220, parentId: null }
          ]
        };
        ideas.push(newIdea);
        chrome.storage.local.set({ quickIdeas: ideas }, () => {
          renderIdeas();
          ideaInput.value = '';
        });
      });
    }
    
    ideaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addIdea();
    });
    ideaAddBtn.onclick = addIdea;
    renderIdeas();
    
  } else if (tool === 'habits') {
    quickToolTitle.textContent = 'Thói quen';
    quickToolBody.innerHTML = `
      <div class="tool-input-row">
        <input type="text" id="habitInput" placeholder="Thêm thói quen..." autocomplete="off">
        <button id="habitAddBtn" class="tool-add-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <div id="habitList" class="tool-list"></div>
    `;
    
    const habitInput = document.getElementById('habitInput');
    const habitAddBtn = document.getElementById('habitAddBtn');
    const todayStr = getDateStr(new Date());
    
    function renderHabits() {
      chrome.storage.sync.get('habits', (data) => {
        let habits = data.habits || defaultHabits(todayStr);
        
        let needsSave = false;
        habits.forEach(h => {
          if (h.date !== todayStr) {
            h.done = false;
            h.date = todayStr;
            needsSave = true;
          }
        });
        
        if (needsSave) {
          chrome.storage.sync.set({ habits });
        }
        
        const listEl = document.getElementById('habitList');
        if (!listEl) return;
        
        listEl.innerHTML = habits.map((h, i) => `
          <div class="tool-item ${h.done ? 'done' : ''}">
            <div class="tool-item-left">
              <button class="tool-check-btn" data-idx="${i}">${h.done ? '✓' : '○'}</button>
              <span class="tool-item-text">${escapeHtml(h.text)}</span>
            </div>
            <button class="tool-del-btn" data-idx="${i}">✕</button>
          </div>
        `).join('');
        
        listEl.querySelectorAll('.tool-check-btn').forEach(chkBtn => {
          chkBtn.onclick = () => {
            const idx = parseInt(chkBtn.dataset.idx);
            habits[idx].done = !habits[idx].done;
            chrome.storage.sync.set({ habits }, renderHabits);
          };
        });
        
        listEl.querySelectorAll('.tool-del-btn').forEach(delBtn => {
          delBtn.onclick = () => {
            const idx = parseInt(delBtn.dataset.idx);
            habits.splice(idx, 1);
            chrome.storage.sync.set({ habits }, renderHabits);
          };
        });
      });
    }
    
    function addHabit() {
      const text = habitInput.value.trim();
      if (!text) return;
      chrome.storage.sync.get('habits', (data) => {
        const habits = data.habits || [];
        habits.push({ text, done: false, date: todayStr });
        chrome.storage.sync.set({ habits }, () => {
          renderHabits();
          habitInput.value = '';
        });
      });
    }
    
    habitInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addHabit();
    });
    habitAddBtn.onclick = addHabit;
    renderHabits();
    
  }
}

// ---------------- VIEW 3: KANBAN BOARD CONTROLLER ----------------
function initKanbanView() {
  renderKanban();
  setupKanbanInputs();
}

function renderKanban() {
  const todoContainer = document.getElementById('kanbanTodoContainer');
  const progressContainer = document.getElementById('kanbanProgressContainer');
  const completedContainer = document.getElementById('kanbanCompletedContainer');
  
  if (!todoContainer || !progressContainer || !completedContainer) return;
  
  todoContainer.innerHTML = '';
  progressContainer.innerHTML = '';
  completedContainer.innerHTML = '';
  
  let todoCount = 0;
  let progressCount = 0;
  let completedCount = 0;
  
  tasks.forEach((t, i) => {
    const status = t.status || (t.done ? 'completed' : 'todo');
    
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.idx = i;
    
    const showLeft = status !== 'todo';
    const showRight = status !== 'completed';
    
    card.innerHTML = `
      <span class="kanban-card-text">${escapeHtml(t.text)}</span>
      <div class="kanban-card-footer">
        <span class="kanban-card-time">${t.time || '09:00'}</span>
        <div class="kanban-card-actions">
          ${status !== 'completed' ? `<button class="kanban-focus-btn" data-idx="${i}" title="Tập trung vào việc này"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>Tập trung</button>` : ''}
          ${showLeft ? `<button class="kanban-action-btn move-left" data-idx="${i}">◀</button>` : ''}
          ${showRight ? `<button class="kanban-action-btn move-right" data-idx="${i}">▶</button>` : ''}
          <button class="kanban-action-btn del" data-idx="${i}">✕</button>
        </div>
      </div>
    `;
    
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', i);
      card.classList.add('dragging');
    });
    
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
    
    if (status === 'todo') {
      todoContainer.appendChild(card);
      todoCount++;
    } else if (status === 'progress') {
      progressContainer.appendChild(card);
      progressCount++;
    } else if (status === 'completed') {
      completedContainer.appendChild(card);
      completedCount++;
    }
  });
  
  const todoCountEl = document.getElementById('kanbanTodoCount');
  const progressCountEl = document.getElementById('kanbanProgressCount');
  const completedCountEl = document.getElementById('kanbanCompletedCount');
  if (todoCountEl) todoCountEl.textContent = todoCount;
  if (progressCountEl) progressCountEl.textContent = progressCount;
  if (completedCountEl) completedCountEl.textContent = completedCount;
  
  document.querySelectorAll('.kanban-focus-btn').forEach(btn => {
    btn.onclick = () => {
      const t = tasks[parseInt(btn.dataset.idx)];
      t.status = 'progress';
      t.done = false;
      saveTasks();
      renderTasks();
      renderKanban();
      startFocusOnTask(t.text);
    };
  });

  document.querySelectorAll('.kanban-action-btn.del').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx);
      tasks.splice(idx, 1);
      saveTasks();
      renderTasks();
      renderKanban();
    };
  });
  
  document.querySelectorAll('.kanban-action-btn.move-left').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx);
      const currentStatus = tasks[idx].status || (tasks[idx].done ? 'completed' : 'todo');
      let nextStatus = 'todo';
      if (currentStatus === 'completed') nextStatus = 'progress';
      
      tasks[idx].status = nextStatus;
      tasks[idx].done = (nextStatus === 'completed');
      saveTasks();
      renderTasks();
      renderKanban();
    };
  });
  
  document.querySelectorAll('.kanban-action-btn.move-right').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx);
      const currentStatus = tasks[idx].status || (tasks[idx].done ? 'completed' : 'todo');
      let nextStatus = 'completed';
      if (currentStatus === 'todo') nextStatus = 'progress';
      
      tasks[idx].status = nextStatus;
      tasks[idx].done = (nextStatus === 'completed');
      saveTasks();
      renderTasks();
      renderKanban();
    };
  });
  
  [
    { el: todoContainer, status: 'todo' },
    { el: progressContainer, status: 'progress' },
    { el: completedContainer, status: 'completed' }
  ].forEach(dest => {
    dest.el.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    dest.el.addEventListener('drop', (e) => {
      e.preventDefault();
      const idxStr = e.dataTransfer.getData('text/plain');
      if (idxStr === '') return;
      const idx = parseInt(idxStr);
      
      tasks[idx].status = dest.status;
      tasks[idx].done = (dest.status === 'completed');
      
      saveTasks();
      renderTasks();
      renderKanban();
    });
  });
}

function setupKanbanInputs() {
  const todoInput = document.getElementById('kanbanTodoInput');
  
  const setupInput = (inputEl, status) => {
    if (!inputEl) return;
    
    const newEl = inputEl.cloneNode(true);
    inputEl.parentNode.replaceChild(newEl, inputEl);
    
    const addKanbanTask = () => {
      const text = newEl.value.trim();
      if (!text) return;
      
      const now = new Date();
      const timeVal = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const categories = ['Công việc', 'Phát triển bản thân'];
      const category = categories[tasks.length % 2];
      
      tasks.push({
        text,
        done: status === 'completed',
        status,
        createdAt: Date.now(),
        category,
        time: timeVal
      });
      
      saveTasks();
      renderTasks();
      renderKanban();
      newEl.value = '';
    };
    
    newEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addKanbanTask();
    });
    
    const parentColumn = newEl.closest('.kanban-column');
    const addBtn = parentColumn?.querySelector('.kanban-add-btn');
    if (addBtn) {
      addBtn.onclick = addKanbanTask;
    }
  };
  
  setupInput(todoInput, 'todo');
}

// ---------------- VIEW 4: AI MENTOR CONTROLLER ----------------
function initAiView() {
  const contextBody = document.getElementById('aiContextInfo');
  if (contextBody) {
    const zodiacSource = document.getElementById('zodiacInfo');
    const astroDateTitle = document.getElementById('astroDateTitle');
    const astroDateSub = document.getElementById('astroDateSub');
    const tuviInfo = document.getElementById('tuviInfo');
    
    let html = '';
    
    html += `<div class="context-section">
      <div class="context-section-title">Ngày hiện tại</div>
      <div style="font-weight:500;font-size:13px">${astroDateTitle ? astroDateTitle.textContent : 'Bính Tý'}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${astroDateSub ? astroDateSub.textContent : ''}</div>
    </div>`;
    
    if (zodiacSource && zodiacSource.innerHTML.trim() !== '') {
      html += `<div class="context-section">
        <div class="context-section-title">Bản Mệnh Chiêm Tinh</div>
        <div class="context-astro-content" style="font-size:11px;display:flex;flex-direction:column;gap:6px;color:var(--text-dim)">
          ${zodiacSource.innerHTML}
        </div>
      </div>`;
    }

    if (tuviInfo && tuviInfo.innerHTML.trim() !== '') {
      html += `<div class="context-section">
        <div class="context-section-title">Cung Mệnh & Lá Số</div>
        <div class="context-astro-content" style="font-size:11px;display:flex;flex-direction:column;gap:6px;color:var(--text-dim)">
          ${tuviInfo.innerHTML}
        </div>
      </div>`;
    }
    
    const todoTasks = tasks.filter(t => !t.done);
    const completedTasks = tasks.filter(t => t.done);
    html += `<div class="context-section">
      <div class="context-section-title">Nhiệm vụ hôm nay</div>
      <div style="font-size:11px;display:flex;flex-direction:column;gap:6px">
        <div style="font-weight:400;margin-bottom:2px">Cần làm (${todoTasks.length}):</div>
        ${todoTasks.length === 0 ? '<div style="font-style:italic;color:var(--text-muted)">Không có việc chưa hoàn thành.</div>' : 
          todoTasks.map((t, idx) => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.02);padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.04)">
              <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;" title="${escapeHtml(t.text)}">${escapeHtml(t.text)}</span>
              <button class="task-astro-btn" data-task="${escapeHtml(t.text)}" title="Tư vấn Giờ Hoàng Đạo">☯</button>
            </div>
          `).join('')
        }
        <div style="margin-top:4px;color:var(--text-muted)">Đã xong: <strong style="color:#34d399">${completedTasks.length}</strong></div>
      </div>
    </div>`;
    
    contextBody.innerHTML = html;
    
    // Bind listeners to task-astro-btn
    setTimeout(() => {
      const decomBtns = contextBody.querySelectorAll('.task-astro-btn');
      decomBtns.forEach(btn => {
        btn.onclick = () => {
          const taskName = btn.dataset.task;
          const prompt = `Dựa trên lá số Tử Vi của tôi và ngày hôm nay, hãy tư vấn chọn Giờ Hoàng Đạo cát lành nhất để thực hiện công việc này: "${taskName}". Hãy chỉ ra cách làm việc hanh thông theo chiêm tinh và tránh các hạn xấu.`;
          sendUserMessage(prompt);
        };
      });
    }, 100);
  }
  
  refreshAiStatus();
  loadAiChatHistory();
  setupChatInputField();
  initQuickActionChips();
}

function parseMarkdownToHtml(text) {
  if (!text) return '';
  let escaped = escapeHtml(text);
  
  // Bold: **text**
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text*
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  const lines = escaped.split('\n');
  let inList = false;
  const resultLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const content = trimmed.substring(2);
      if (!inList) {
        inList = true;
        return `<ul style="margin: 6px 0 6px 16px; padding-left: 0; display:flex; flex-direction:column; gap:4px;"><li>${content}</li>`;
      }
      return `<li>${content}</li>`;
    } else {
      if (inList) {
        inList = false;
        return `</ul>${line}${line ? '<br>' : ''}`;
      }
      return line ? `${line}<br>` : '<br>';
    }
  });
  
  let finalHtml = resultLines.join('\n');
  if (inList) {
    finalHtml += '</ul>';
  }
  return finalHtml;
}

function initQuickActionChips() {
  const chipsContainer = document.getElementById('chatQuickChips');
  if (!chipsContainer) return;
  
  chrome.storage.sync.get('birth', ({ birth }) => {
  // Work first; the astrology prompt only appears once there is a chart to read
  const chipsData = [
    { text: 'Dựa trên danh sách nhiệm vụ của tôi, hãy sắp xếp thứ tự ưu tiên cho hôm nay và chia thành các phiên Pomodoro 25 phút.', label: '🗂 Lên kế hoạch hôm nay' },
    { text: 'Việc nào trong danh sách của tôi đang lớn hoặc khó bắt đầu nhất? Hãy chia nó thành các bước nhỏ, mỗi bước làm được trong một phiên 25 phút.', label: '✂️ Chia nhỏ việc khó' },
    { text: 'Nếu hôm nay tôi chỉ làm được một việc, đó nên là việc gì và vì sao?', label: '🎯 Việc quan trọng nhất' },
    birth
      ? { text: 'Theo lá số của tôi, hôm nay cát hung thế nào và giờ nào hợp để làm việc cần tập trung cao?', label: '🔮 Cát hung hôm nay' }
      : { text: 'Tôi đang trì hoãn và khó tập trung. Gợi ý cho tôi một cách bắt đầu ngay trong 2 phút.', label: '🌱 Vượt trì hoãn' }
  ];
  
  chipsContainer.innerHTML = chipsData.map(chip => `
    <div class="quick-chip" data-prompt="${escapeHtml(chip.text)}">
      ${chip.label}
    </div>
  `).join('');
  
  chipsContainer.querySelectorAll('.quick-chip').forEach(chipEl => {
    chipEl.onclick = () => {
      const prompt = chipEl.dataset.prompt;
      sendUserMessage(prompt);
    };
  });
  });
}

// Status + greeting only claim what the mentor actually has access to
function refreshAiStatus() {
  const statusEl = document.querySelector('.ai-status');
  if (!statusEl) return;
  chrome.storage.sync.get('geminiKey', (data) => {
    const ready = !!data.geminiKey;
    statusEl.textContent = ready ? 'Sẵn sàng' : 'Chưa kết nối';
    statusEl.classList.toggle('offline', !ready);
  });
}

function renderAiGreeting(thread) {
  chrome.storage.sync.get(['geminiKey', 'birth'], (data) => {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ai';
    if (!data.geminiKey) {
      bubble.innerHTML = parseMarkdownToHtml('Xin chào! Để trò chuyện, AI Mentor cần một **Gemini API key** (miễn phí, lấy trong 1 phút).') +
        '<button type="button" class="glass-btn ai-setup-btn">Thêm API key</button>';
      bubble.querySelector('.ai-setup-btn').onclick = () => openSettingsAt('geminiKey');
    } else {
      const sources = data.birth ? 'danh sách nhiệm vụ hôm nay và lá số Tử Vi của bạn' : 'danh sách nhiệm vụ hôm nay của bạn';
      bubble.innerHTML = parseMarkdownToHtml(`Xin chào! Tôi là **AI Mentor**. Tôi có thể xem ${sources} để giúp bạn lên kế hoạch và giữ tập trung. Bạn cần gì nào?`);
    }
    thread.innerHTML = '';
    thread.appendChild(bubble);
  });
}

function loadAiChatHistory() {
  const thread = document.getElementById('chatMessagesThread');
  if (!thread) return;
  
  chrome.storage.local.get('aiChatHistory', (data) => {
    const history = data.aiChatHistory || [];
    if (history.length === 0) {
      renderAiGreeting(thread);
      return;
    }
    
    thread.innerHTML = history.map(msg => `
      <div class="chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}">${msg.role === 'user' ? escapeHtml(msg.text) : parseMarkdownToHtml(msg.text)}</div>
    `).join('');
    
    thread.scrollTop = thread.scrollHeight;
  });
}

function setupChatInputField() {
  const inputEl = document.getElementById('chatInputField');
  const sendBtn = document.getElementById('chatSendBtn');
  
  if (!inputEl || !sendBtn) return;
  
  const newInput = inputEl.cloneNode(true);
  inputEl.parentNode.replaceChild(newInput, inputEl);
  
  const handleSend = () => {
    const text = newInput.value.trim();
    if (!text) return;
    
    sendUserMessage(text);
    newInput.value = '';
  };
  
  newInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });
  
  sendBtn.onclick = handleSend;
}

async function sendUserMessage(text) {
  const thread = document.getElementById('chatMessagesThread');
  if (!thread) return;
  
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user';
  userBubble.textContent = text;
  thread.appendChild(userBubble);
  thread.scrollTop = thread.scrollHeight;
  
  const loadingId = 'ai-loading-' + Date.now();
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'chat-bubble ai loading';
  loadingBubble.id = loadingId;
  loadingBubble.innerHTML = `Đang suy nghĩ... <div class="dot-typing"><span></span><span></span><span></span></div>`;
  thread.appendChild(loadingBubble);
  thread.scrollTop = thread.scrollHeight;
  
  saveChatBubble('user', text);
  
  chrome.storage.sync.get('geminiKey', async (data) => {
    const apiKey = data.geminiKey;
    const loadingEl = document.getElementById(loadingId);
    
    if (!apiKey) {
      if (loadingEl) {
        loadingEl.className = 'chat-bubble ai';
        loadingEl.innerHTML = parseMarkdownToHtml('Cần **Gemini API key** để trả lời. Thêm key trong Cài đặt rồi gửi lại câu hỏi nhé.') +
          '<button type="button" class="glass-btn ai-setup-btn">Thêm API key</button>';
        loadingEl.querySelector('.ai-setup-btn').onclick = () => openSettingsAt('geminiKey');
      }
      return;
    }
    
    try {
      const chatHistory = await getRecentChatHistory();
      
      // Prevent race condition: ensure the current user message is always present in the history payload
      if (chatHistory.length === 0 || chatHistory[chatHistory.length - 1].text !== text) {
        chatHistory.push({ role: 'user', text: text });
      }

      const promptContext = buildAiPromptContext();
      
      const contents = [];
      contents.push({ role: 'user', parts: [{ text: promptContext }] });
      contents.push({ role: 'model', parts: [{ text: 'Đã hiểu bối cảnh lá số và danh sách công việc. Sẵn sàng hỗ trợ gia chủ hành sự.' }] });
      
      chatHistory.forEach(msg => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
      
      let res = null;
      for (const model of await getGeminiModels(apiKey)) {
        res = await fetch(`${GEMINI_API}/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
          })
        });
        if (res.ok) break;
        if (res.status === 404) forgetGeminiModels();
        else break; // only a missing model is worth trying the next one
      }
      
      if (!res || !res.ok) {
        throw new Error(`API error: ${res ? res.status : 'no model'}`);
      }
      
      const resData = await res.json();
      const reply = resData?.candidates?.[0]?.content?.parts?.[0]?.text || 'Tôi chưa hội tụ đủ tinh tú để trả lời lúc này, bạn vui lòng hỏi lại nhé.';
      
      if (loadingEl) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
      
      const aiBubble = document.createElement('div');
      aiBubble.className = 'chat-bubble ai';
      aiBubble.innerHTML = parseMarkdownToHtml(reply);
      thread.appendChild(aiBubble);
      thread.scrollTop = thread.scrollHeight;
      
      saveChatBubble('model', reply);
      
    } catch (err) {
      console.error('ZenTab AI Chat error:', err);
      if (loadingEl) {
        loadingEl.className = 'chat-bubble ai';
        loadingEl.innerHTML = parseMarkdownToHtml('Gặp lỗi trong quá trình kết nối với máy chủ chiêm tinh. Vui lòng kiểm tra lại **API Key** hoặc mạng internet của bạn.');
      }
    }
  });
}

function buildAiPromptContext() {
  const hasChart = !!document.getElementById('zodiacInfo')?.innerHTML.trim();
  const intentionEl = document.getElementById('journalTodayEntry');
  const intention = intentionEl && intentionEl.style.display !== 'none' ? intentionEl.textContent.replace(/[“”]/g, '') : '';
  const taskSummary = tasks.map(t => `- [${t.done ? 'x' : ' '}] ${t.text} (${t.category || 'Chung'})`).join('\n');

  let astro = '';
  if (hasChart) {
    const zodiacSource = document.getElementById('zodiacInfo')?.innerText || '';
    const astroDateTitle = document.getElementById('astroDateTitle')?.textContent || '';
    const nhPill = document.getElementById('nhPill')?.textContent || '';
    const tuviInfoText = document.getElementById('tuviInfo')?.innerText || '';
    astro = `
Người dùng có quan tâm Tử Vi. Hôm nay là ngày ${astroDateTitle} (${nhPill}).
- Con giáp & Tây Phương: ${zodiacSource}
- Lá số Tử Vi & Mệnh Cục: ${tuviInfoText}
Chỉ đưa góc nhìn Tử Vi khi người dùng hỏi hoặc khi nó thực sự giúp ích, và giữ ngắn gọn.`;
  }

  return `Bạn là AI Mentor trong ZenTab, một người cố vấn năng suất điềm tĩnh và thực tế.
Việc của bạn: giúp người dùng chọn việc quan trọng, chia nhỏ việc khó, lập kế hoạch theo phiên Pomodoro 25 phút, vượt trì hoãn và giữ tâm bình an.

Ý định hôm nay của người dùng: ${intention || 'chưa đặt'}
Danh sách công việc:
${taskSummary || 'Chưa có công việc nào.'}
${astro}
Xưng "mình", gọi người dùng là "bạn". Trả lời bằng tiếng Việt, dưới 250 từ, dùng gạch đầu dòng khi liệt kê, kết thúc bằng một bước cụ thể có thể làm ngay.`;
}

function saveChatBubble(role, text) {
  chrome.storage.local.get('aiChatHistory', (data) => {
    const history = data.aiChatHistory || [];
    history.push({ role, text });
    if (history.length > 30) history.shift();
    chrome.storage.local.set({ aiChatHistory: history });
  });
}

// ---------------- VIEW 5: STATS CONTROLLER ----------------
function initStatsView() {
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const today = new Date();
  const todayStr = getDateStr(today);

  // Tasks
  const completedCount = tasks.filter(t => t.done).length;
  setText('statsTasksDone', completedCount);
  setText('statsTasksTotal', ` / ${tasks.length}`);
  setText('statsTasksSub', tasks.length === 0 ? 'Chưa có nhiệm vụ'
    : completedCount === tasks.length ? 'Xong hết rồi, tuyệt!' : `Còn ${tasks.length - completedCount} việc`);

  // Focus: today, streak, last 7 days
  getFocusHistory((history) => {
    const minutesOn = (d) => (history[getDateStr(d)] || {}).minutes || 0;
    const t = history[todayStr] || { sessions: 0, minutes: 0 };
    setText('statsFocusToday', t.minutes);
    chrome.storage.local.get('relaxStats', ({ relaxStats }) => {
      const relaxed = relaxStats && relaxStats.date === todayStr ? relaxStats.count : 0;
      setText('statsFocusSessions', (t.sessions ? `${t.sessions} phiên Pomodoro` : 'Chưa có phiên nào') +
        (relaxed ? ` · ${relaxed} lần nghỉ thư giãn` : ''));
    });

    // A streak survives until the end of today, so start counting from yesterday if today is still empty
    let streak = 0;
    const d = new Date(today);
    if (!minutesOn(d)) d.setDate(d.getDate() - 1);
    while (minutesOn(d) > 0) { streak++; d.setDate(d.getDate() - 1); }
    setText('statsStreak', streak);
    setText('statsStreakSub', streak === 0 ? 'Hoàn thành 1 phiên để bắt đầu chuỗi'
      : t.minutes ? 'Giữ vững nhé!' : 'Tập trung hôm nay để giữ chuỗi');

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today); day.setDate(day.getDate() - i);
      days.push({ date: day, minutes: minutesOn(day), isToday: i === 0 });
    }
    const weekTotal = days.reduce((sum, x) => sum + x.minutes, 0);
    setText('statsWeekTotal', weekTotal ? `Tổng ${weekTotal} phút` : '');
    renderWeekChart(days);
  });

  // Daily intentions: how many were honored (answered "Rồi")
  chrome.storage.sync.get('journal', (data) => {
    const el = document.getElementById('statsIntentions');
    if (!el) return;
    const answered = (data.journal || []).filter(e => e.honored === true || e.honored === false);
    if (answered.length === 0) {
      el.innerHTML = '<p class="stats-empty">Đặt ý định ở Trang chủ mỗi sáng. Hôm sau ZenTab sẽ hỏi bạn đã làm được chưa.</p>';
      return;
    }
    const kept = answered.filter(e => e.honored).length;
    const pct = Math.round(kept / answered.length * 100);
    const recent = answered.slice(0, 7).map(e => `
      <li class="intent-row">
        <span class="intent-mark ${e.honored ? 'kept' : ''}" aria-label="${e.honored ? 'Đã làm được' : 'Chưa làm được'}">${e.honored ? '✓' : '–'}</span>
        <span class="intent-text">${escapeHtml(e.entry)}</span>
        <span class="intent-date">${e.date.slice(8)}/${e.date.slice(5, 7)}</span>
      </li>`).join('');
    el.innerHTML = `
      <div class="intent-summary"><strong>${kept}/${answered.length}</strong> ý định đã làm được <span>(${pct}%)</span></div>
      <ul class="intent-list">${recent}</ul>`;
  });

  // Habits today
  const habitsListEl = document.getElementById('statsHabitsList');
  chrome.storage.sync.get('habits', (data) => {
    const currentHabits = data.habits || defaultHabits(todayStr);
    if (!habitsListEl) return;
    if (currentHabits.length === 0) {
      habitsListEl.innerHTML = '<p class="stats-empty">Chưa có thói quen. Thêm trong Tập trung &amp; Tiện ích → Thói quen.</p>';
      return;
    }
    const done = currentHabits.filter(h => h.done && h.date === todayStr).length;
    habitsListEl.innerHTML = `<div class="intent-summary"><strong>${done}/${currentHabits.length}</strong> thói quen hôm nay</div>` +
      currentHabits.map(h => {
        const isDone = h.done && h.date === todayStr;
        return `<div class="intent-row">
          <span class="intent-mark ${isDone ? 'kept' : ''}" aria-label="${isDone ? 'Đã làm' : 'Chưa làm'}">${isDone ? '✓' : ''}</span>
          <span class="intent-text">${escapeHtml(h.text)}</span>
        </div>`;
      }).join('');
  });
}

// Single-series bar chart: one accent hue, today labelled directly, every bar has a tooltip
function renderWeekChart(days) {
  const chart = document.getElementById('statsWeekChart');
  if (!chart) return;
  const weekday = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const max = Math.max(25, ...days.map(d => d.minutes));
  chart.setAttribute('aria-label', 'Phút tập trung 7 ngày qua: ' +
    days.map(d => `${weekday[d.date.getDay()]} ${d.minutes} phút`).join(', '));
  chart.innerHTML = days.map(d => {
    const label = `${weekday[d.date.getDay()]} ${d.date.getDate()}/${d.date.getMonth() + 1}`;
    const h = d.minutes ? Math.max(4, d.minutes / max * 100) : 0;
    return `<div class="week-col ${d.isToday ? 'today' : ''}" tabindex="0" data-tip="${label}: ${d.minutes} phút">
      <div class="week-bar-wrap">
        ${d.isToday && d.minutes ? `<span class="week-value">${d.minutes}</span>` : ''}
        <div class="week-bar" style="height:${h}%"></div>
      </div>
      <span class="week-day">${d.isToday ? 'Hôm nay' : weekday[d.date.getDay()]}</span>
    </div>`;
  }).join('');
}

function getRecentChatHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get('aiChatHistory', (data) => {
      resolve(data.aiChatHistory || []);
    });
  });
}

// ---- Ambient Sound Selector Controller ----
function updateCustomAudioOption(url) {
  const customOpt = document.getElementById('customAudioOpt');
  if (customOpt) {
    if (url && url.trim() !== '') {
      customOpt.style.display = 'block';
    } else {
      customOpt.style.display = 'none';
      
      // Reset dropdown value if it was set to custom but custom was cleared
      const selectEl = document.getElementById('ambientSoundSelect');
      if (selectEl && selectEl.value === 'custom') {
        selectEl.value = 'forest';
        ambientPlayer.setKind('forest');
      }
    }
  }
}

function initAmbientSoundSelector() {
  const selectEl = document.getElementById('ambientSoundSelect');
  const relaxingAudio = document.getElementById('relaxingAudio');
  
  if (!selectEl || !relaxingAudio) return;
  
  
  // Set initial custom option on load
  chrome.storage.sync.get('customAudioUrl', (data) => {
    updateCustomAudioOption(data.customAudioUrl);
  });
  
  selectEl.addEventListener('change', () => {
    const val = selectEl.value;

    if (val === 'custom') {
      chrome.storage.sync.get('customAudioUrl', (data) => {
        const customUrl = data.customAudioUrl;
        if (customUrl && customUrl.trim() !== '') {
          if (relaxingAudio.src !== customUrl) relaxingAudio.src = customUrl;
          ambientPlayer.setKind('custom');
        } else {
          alert('Vui lòng cấu hình URL nhạc nền cá nhân trong phần Cài đặt trước.');
          selectEl.value = ambientPlayer.kind === 'custom' ? 'forest' : ambientPlayer.kind;
        }
      });
    } else if (window.ZenAmbient && ZenAmbient.has(val)) {
      ambientPlayer.setKind(val);
    }
  });
}

initAmbientSoundSelector();

// ---------------- VIEW 3 ADD-ON: MINDMAP CANVAS CONTROLLER ----------------

// Reusable Gemini helper for Mindmap (reuses the key stored in Settings)
// Shared Gemini caller (mind map, chart reading): retries on 429/503, falls back across models
function callGemini(prompt, temperature, maxTokens) {
  return new Promise((resolve) => {
    chrome.storage.sync.get('geminiKey', async (data) => {
      const apiKey = data.geminiKey;
      if (!apiKey) { resolve({ error: 'no-key' }); return; }
      const models = await getGeminiModels(apiKey);
      const delays = [5000, 15000, 30000];
      let result = null;
      let errorMsg = null;
      for (const model of models) {
        for (let i = 0; i < 3; i++) {
          try {
            const res = await fetch(`${GEMINI_API}/models/${model}:generateContent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: temperature || 0.7, maxOutputTokens: maxTokens || 4096 }
              })
            });
            const body = await res.text();
            if (res.status === 429 || res.status === 503) {
              if (i < 2) await new Promise(r => setTimeout(r, delays[i]));
              continue;
            }
            if (!res.ok) {
              errorMsg = `${res.status}: ${body.slice(0, 200)}`;
              if (res.status === 404) forgetGeminiModels();
              break;
            }
            const parsed = JSON.parse(body);
            result = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || null;
            if (result) break;
          } catch (e) {
            errorMsg = e.message;
            if (i < 2) await new Promise(r => setTimeout(r, delays[i]));
            continue;
          }
        }
        if (result) break;
      }
      if (result) resolve({ text: result });
      else resolve({ error: errorMsg || 'empty' });
    });
  });
}

let activeIdeaIndex = null;
let mindmapNodesList = [];
let draggingNodeId = null;
let draggingShift = false;
let isPanning = false;
let panX = 0;
let panY = 0;
let mindmapSelectedId = null;
let mmScale = 1;
let mouseStartX = 0;
let mouseStartY = 0;
let originalPanX = 0;
let originalPanY = 0;
let originalNodeX = 0;
let originalNodeY = 0;

const mindmapModal = document.getElementById('mindmapModal');
const closeMindmapBtn = document.getElementById('closeMindmapBtn');
const mindmapViewport = document.getElementById('mindmapViewport');
const mindmapSvg = document.getElementById('mindmapSvg');
const mindmapNodesContainer = document.getElementById('mindmapNodes');

if (closeMindmapBtn && mindmapModal) {
  closeMindmapBtn.addEventListener('click', () => {
    mindmapModal.style.display = 'none';
    activeIdeaIndex = null;
  });
}

function openMindmap(idx) {
  activeIdeaIndex = idx;
  if (!mindmapModal || !mindmapViewport) return;
  
  getIdeasWith([], (data) => {
    const ideas = data.quickIdeas || [];
    const currentIdea = ideas[activeIdeaIndex];
    if (!currentIdea) return;
    
    mindmapNodesList = currentIdea.nodes || [
      { id: 'root', text: currentIdea.text, x: 450, y: 220, parentId: null }
    ];

    mindmapUndoStack = [];
    const uBtn = document.getElementById('mindmapUndoBtn');
    if (uBtn) uBtn.disabled = true;
    mindmapSelectedId = null;
    const inspector = document.getElementById('mindmapInspector');
    if (inspector) { inspector.classList.remove('active'); inspector.classList.add('empty'); }
    const fi = document.getElementById('mindmapFastInput');
    if (fi) fi.style.display = 'none';
    mindmapAiStatus('');
    
    // Show Modal
    mindmapModal.style.display = 'flex';
    
    // Auto center viewport around root node on open
    const vw = mindmapViewport.clientWidth;
    const vh = mindmapViewport.clientHeight;
    
    mmScale = 1;
    panX = Math.round(vw / 2 - 450);
    panY = Math.round(vh / 2 - 220);
    mmApplyZoom();
    
    renderMindmap();
  });
}

// Fresh id generator
function mindmapNewId(prefix) {
  return (prefix || 'node') + '-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
}

// Snapshot undo stack (global is fine for single-user local use)
let mindmapUndoStack = [];
function pushUndo() {
  mindmapUndoStack.push(JSON.parse(JSON.stringify(mindmapNodesList)));
  if (mindmapUndoStack.length > 50) mindmapUndoStack.shift();
  const uBtn = document.getElementById('mindmapUndoBtn');
  if (uBtn) uBtn.disabled = false;
}
function undoMindmap() {
  if (mindmapUndoStack.length === 0) return;
  mindmapNodesList = mindmapUndoStack.pop();
  const uBtn = document.getElementById('mindmapUndoBtn');
  if (uBtn && mindmapUndoStack.length === 0) uBtn.disabled = true;
  saveMindmapState();
  renderMindmap();
}

// Viability meta for nodes
const MM_LABEL_META = {
  viable: { cls: 'viable', txt: 'Khả thi' },
  verify: { cls: 'verify', txt: 'Cần kiểm chứng' },
  kill:   { cls: 'kill',   txt: 'Loại bỏ' }
};
const MM_TAG_META = {
  problem: { cls: 'tag-problem', txt: 'Vấn đề' },
  solution:{ cls: 'tag-solution',txt: 'Giải pháp' },
  risk:    { cls: 'tag-risk',   txt: 'Rủi ro' },
  resource:{ cls: 'tag-resource',txt: 'Tài nguyên' },
  insight: { cls: 'tag-insight',txt: 'Góc nhìn' }
};

function isNodeHidden(nodeId) {
  const node = mindmapNodesList.find(n => n.id === nodeId);
  if (!node) return false;
  if (node.id === 'root') return false;
  if (node.parentId === null) return false;
  const parent = mindmapNodesList.find(n => n.id === node.parentId);
  // hide if directly under a collapsed parent
  const ancestor = mindmapNodesList.find(n => n.id === node.parentId);
  if (ancestor && ancestor.collapsed) return true;
  // recurse: hide if any ancestor in the chain is collapsed
  let p = parent;
  while (p && p.id !== 'root') {
    if (p.collapsed) return true;
    p = mindmapNodesList.find(n => n.id === p.parentId);
  }
  return false;
}

function renderMindmap() {
  if (!mindmapSvg || !mindmapNodesContainer) return;
  
  // Apply canvas transform (pan + zoom); render in world coordinates
  const canvas = document.getElementById('mindmapCanvas');
  if (canvas) {
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${mmScale})`;
  }
  
  const defs = mindmapSvg.querySelector('defs');
  mindmapSvg.innerHTML = '';
  if (defs) mindmapSvg.appendChild(defs);
  mindmapNodesContainer.innerHTML = '';
  
  // Draw connection lines only for visible (non-hidden) nodes
  mindmapNodesList.forEach(node => {
    if (node.parentId && !isNodeHidden(node.id)) {
      const parent = mindmapNodesList.find(n => n.id === node.parentId);
      if (parent && !isNodeHidden(parent.id)) {
        const px = parent.x;
        const py = parent.y;
        const cx = node.x;
        const cy = node.y;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'mindmap-connection');
        
        const dx = cx - px;
        const dy = cy - py;
        const cp1x = px + dx / 2;
        const cp1y = py;
        const cp2x = px + dx / 2;
        const cp2y = cy;
        
        path.setAttribute('d', `M ${px} ${py} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${cx} ${cy}`);
        mindmapSvg.appendChild(path);
      }
    }
  });
  
  const hasChildren = (id) => mindmapNodesList.some(n => n.parentId === id);
  
  // Draw HTML nodes in world coordinates
  mindmapNodesList.forEach(node => {
    if (isNodeHidden(node.id)) return;
    const isRoot = node.id === 'root';
    const isSel = mindmapSelectedId === node.id;
    const el = document.createElement('div');
    el.className = `mindmap-node ${isRoot ? 'root' : ''}${isSel ? ' selected' : ''}`;
    
    const labelMeta = node.label ? MM_LABEL_META[node.label] : null;
    const tagMeta = node.tag ? MM_TAG_META[node.tag] : null;
    if (labelMeta) el.classList.add('lab-' + labelMeta.cls);
    if (tagMeta) el.classList.add(tagMeta.cls);
    
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.dataset.id = node.id;
    
    const dot = (labelMeta ? `<i class="mm-dot lab-${labelMeta.cls}" title="${labelMeta.txt}"></i>` : '') +
      (tagMeta ? `<i class="mm-dot ${tagMeta.cls}" title="${tagMeta.txt}"></i>` : '');
    
    // Node columns: only on selection to reduce clutter
    let actions = '';
    if (isSel && !isRoot) {
      actions = `<div class="node-quick">
        <button class="nq-btn" data-act="add" title="Thêm nhánh con">＋</button>
        <button class="nq-btn" data-act="scamper" title="Mở rộng SCAMPER">✦</button>
        <button class="nq-btn" data-act="hats" title="Đánh giá 6 mũ">🕮</button>
        <button class="nq-btn" data-act="collapse" title="Thu gọn/mở rộng">${node.collapsed ? '▶' : '▼'}</button>
        <button class="nq-btn danger" data-act="del" title="Xóa nhánh">✕</button>
      </div>`;
    }
    
    el.innerHTML = `${dot}<span class="node-text">${escapeHtml(node.text)}</span>${actions}`;
    
    if (isSel) {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.nq-btn') || e.target.classList.contains('node-input')) return;
        selectMindmapNode(node.id);
      });
      el.querySelectorAll('.nq-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const act = btn.dataset.act;
          if (act === 'add') addChildNode(node.id);
          else if (act === 'scamper') expandNodeScamper(node.id);
          else if (act === 'hats') assessNodeHats(node.id);
          else if (act === 'collapse') { node.collapsed = !node.collapsed; pushUndo(); saveMindmapState(); renderMindmap(); }
          else if (act === 'del') deleteNodeBranch(node.id);
        });
      });
    }
    
    // Node Drag event: mousedown
    el.addEventListener('mousedown', (e) => {
      if (e.target.closest('.nq-btn') || e.target.classList.contains('node-input')) return;
      e.stopPropagation();
      draggingNodeId = node.id;
      draggingShift = e.shiftKey;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      originalNodeX = node.x;
      originalNodeY = node.y;
      // select on drag start
      if (mindmapSelectedId !== node.id) selectMindmapNode(node.id);
    });
    
    // Double click to edit node text
    const textEl = el.querySelector('.node-text');
    textEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const currentText = node.text;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'node-input';
      input.value = currentText;
      el.replaceChild(input, textEl);
      input.focus();
      input.select();
      const saveText = () => {
        const val = input.value.trim() || currentText;
        node.text = val;
        if (isRoot) updateIdeaMainText(val);
        pushUndo();
        saveMindmapState();
        renderMindmap();
      };
      input.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') saveText();
        if (evt.key === 'Escape') { input.value = currentText; saveText(); }
      });
      input.addEventListener('blur', saveText);
    });
    
    mindmapNodesContainer.appendChild(el);
  });
  
  // Empty state hint
  const emptyHint = document.getElementById('mindmapEmptyHint');
  if (emptyHint) {
    const visible = mindmapNodesList.filter(n => !isNodeHidden(n.id)).length <= 1;
    emptyHint.style.display = visible ? 'flex' : 'none';
  }
}

function addChildNode(parentId, text, meta) {
  const parent = mindmapNodesList.find(n => n.id === parentId);
  if (!parent) return null;
  const childX = parent.x + 160;
  const childY = parent.y + (Math.random() * 120 - 60);
  const id = mindmapNewId('node');
  const child = {
    id: id,
    text: text || 'Ý tưởng con',
    x: Math.round(childX),
    y: Math.round(childY),
    parentId: parentId
  };
  if (meta) Object.assign(child, meta);
  mindmapNodesList.push(child);
  pushUndo();
  saveMindmapState();
  renderMindmap();
  return child;
}

function deleteNodeBranch(nodeId) {
  const toDelete = new Set();
  function collectChildren(id) {
    toDelete.add(id);
    mindmapNodesList.forEach(n => { if (n.parentId === id) collectChildren(n.id); });
  }
  collectChildren(nodeId);
  mindmapNodesList = mindmapNodesList.filter(n => !toDelete.has(n.id));
  if (mindmapSelectedId === nodeId) closeMindmapPanel();
  pushUndo();
  saveMindmapState();
  renderMindmap();
}

// ---------------- Auto-layout: tidy tree ----------------
function autoLayoutMindmap() {
  if (mindmapNodesList.length === 0) return;
  const root = mindmapNodesList.find(n => n.id === 'root') || mindmapNodesList[0];
  const nodeW = 190, hGap = 90, vGap = 34;
  const subtreeWidth = (id) => {
    const kids = mindmapNodesList.filter(n => n.parentId === id);
    if (kids.length === 0) return nodeW;
    return Math.max(nodeW, kids.reduce((s, k) => s + subtreeWidth(k.id), 0) + (kids.length - 1) * hGap);
  };
  let nextY = 0;
  function place(id, x, top) {
    const node = mindmapNodesList.find(n => n.id === id);
    const kids = mindmapNodesList.filter(n => n.parentId === id);
    // detect cycles defensively
    if ((x > 20000) || kids.some(k => k.id === id)) { return; }
    if (kids.length === 0) {
      node.y = top;
      node.x = x;
    } else {
      const totalW = kids.reduce((s, k) => s + subtreeWidth(k.id), 0) + (kids.length - 1) * hGap;
      let cx = x - totalW / 2 + subtreeWidth(kids[0].id) / 2;
      kids.forEach(k => {
        place(k.id, cx, top + hGap);
        cx += subtreeWidth(k.id) + hGap;
      });
      node.x = x;
      node.y = (top + (top + hGap)) / 2;
    }
  }
  // Two-pass: compute subtree mid position for root centering
  const firstY = (() => { let y = 0; return y; })();
  nextY = 0;
  // root at x=0
  place(root.id, 0, 0);
  // recenter: shift so all coords >= 0 and add padding
  const xs = mindmapNodesList.map(n => n.x);
  const ys = mindmapNodesList.map(n => n.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const pad = 60;
  mindmapNodesList.forEach(n => { n.x = Math.round(n.x - minX + pad); n.y = Math.round(n.y - minY + pad); });
  saveMindmapState();
  renderMindmap();
}

function updateIdeaMainText(newText) {
  getIdeasWith([], (data) => {
    const ideas = data.quickIdeas || [];
    if (ideas[activeIdeaIndex]) {
      ideas[activeIdeaIndex].text = newText;
      chrome.storage.local.set({ quickIdeas: ideas });
      
      const listEl = document.getElementById('ideaList');
      if (listEl) {
        const itemTextEl = listEl.querySelector(`.tool-item[data-idx="${activeIdeaIndex}"] .tool-item-text`);
        if (itemTextEl) {
          itemTextEl.innerHTML = `💡 ${escapeHtml(newText)}`;
        }
      }
    }
  });
}

function saveMindmapState() {
  getIdeasWith([], (data) => {
    const ideas = data.quickIdeas || [];
    if (ideas[activeIdeaIndex]) {
      ideas[activeIdeaIndex].nodes = mindmapNodesList;
      chrome.storage.local.set({ quickIdeas: ideas });
    }
  });
}

// ---------------- Focus panel: scores, tag, label, evidence ----------------
const mmPanelEls = {};
function cacheMmPanelEls() {
  ['mmLabelSel','mmTagSel','mmReach','mmImpact','mmConfidence','mmEffort','mmEvidence','mmRice','mmIce','mindmapInspector','mindmapPanelTitle'].forEach(id => {
    mmPanelEls[id] = document.getElementById(id);
  });
}
cacheMmPanelEls();

function computeRice(node) {
  const reach = parseFloat(node.scores?.reach) || 0;
  const impact = parseFloat(node.scores?.impact) || 1;
  const conf = parseFloat(node.scores?.confidence) || 50;
  const effort = parseFloat(node.scores?.effort) || 1;
  if (effort <= 0 || conf <= 0) return 0;
  return Math.round(((reach * impact * (conf / 100)) / effort) * 10) / 10;
}
function computeIce(node) {
  const impact = parseFloat(node.scores?.impact) || 1;
  const conf = parseFloat(node.scores?.confidence) || 50;
  const effort = parseFloat(node.scores?.effort) || 1;
  if (effort <= 0) return 0;
  return Math.round((impact * (conf / 100) / effort) * 10) / 10;
}

function selectMindmapNode(id) {
  mindmapSelectedId = id;
  const node = mindmapNodesList.find(n => n.id === id);
  if (!node) { closeMindmapPanel(); return; }
  const panel = mmPanelEls['mindmapInspector'];
  if (!panel) return;
  panel.classList.add('active');
  panel.classList.remove('empty');
  mmPanelEls['mindmapPanelTitle'].textContent = node.text;
  mmPanelEls['mindmapPanelTitle'].title = node.text;
  mmPanelEls['mmLabelSel'].value = node.label || '';
  mmPanelEls['mmTagSel'].value = node.tag || '';
  mmPanelEls['mmReach'].value = node.scores?.reach ?? '';
  mmPanelEls['mmImpact'].value = node.scores?.impact ?? 1;
  mmPanelEls['mmConfidence'].value = node.scores?.confidence ?? 50;
  mmPanelEls['mmEffort'].value = node.scores?.effort ?? 1;
  mmPanelEls['mmEvidence'].value = node.evidence || '';
  const rice = computeRice({ scores: node.scores });
  const ice = computeIce({ scores: node.scores });
  mmPanelEls['mmRice'].textContent = String(rice);
  mmPanelEls['mmIce'].textContent = String(ice);
  renderMindmapHats(node);
  renderMindmap();
}

function renderMindmapHats(node) {
  const section = document.getElementById('mmHatsSection');
  const body = document.getElementById('mmHatsBody');
  if (!section || !body) return;
  const a = node && node.assess;
  if (!a || (!a.risk && !a.benefit && !a.action && !a.check && !a.creative && !a.feel)) {
    section.style.display = 'none';
    return;
  }
  const colors = { check: '#94a3b8', feel: '#f87171', risk: '#fb7185', benefit: '#fbbf24', creative: '#34d399', action: '#38bdf8' };
  section.style.display = 'block';
  const items = [
    ['check', 'TRẮNG · Dữ kiện cần kiểm chứng'],
    ['feel', 'ĐỎ · Cảm xúc & trực giác'],
    ['risk', 'ĐEN · Rủi ro, điểm yếu'],
    ['benefit', 'VÀNG · Lợi ích, cơ hội'],
    ['creative', 'XANH LÁ · Hướng sáng tạo'],
    ['action', 'XANH DƯƠNG · Hành động tiếp theo']
  ];
  body.innerHTML = items.filter(i => a[i[0]]).map(i => {
    const c = colors[i[0]];
    return `<div class="mm-hat-item mm-hat-${i[0]}">
      <div class="mm-hat-name">${i[1]}</div>
      <div class="mm-hat-text">${escapeHtml(a[i[0]])}</div>
    </div>`;
  }).join('');
}

function closeMindmapPanel() {
  mindmapSelectedId = null;
  const panel = mmPanelEls['mindmapInspector'];
  if (panel) { panel.classList.remove('active'); panel.classList.add('empty'); }
  renderMindmap();
}

function updateSelectedNodeMeta(patch, opts) {
  if (!mindmapSelectedId) return;
  const node = mindmapNodesList.find(n => n.id === mindmapSelectedId);
  if (!node) return;
  const skipUndo = opts && opts.skipUndo;
  const noRender = opts && opts.noRender;
  if (patch.label !== undefined) { node.label = patch.label; mmPanelEls['mmLabelSel'].value = patch.label; }
  if (patch.tag !== undefined) { node.tag = patch.tag; mmPanelEls['mmTagSel'].value = patch.tag; }
  if (patch.evidence !== undefined) node.evidence = patch.evidence;
  if (patch.scores) {
    if (!node.scores) node.scores = {};
    Object.keys(patch.scores).forEach(k => { node.scores[k] = patch.scores[k]; });
    if (!noRender) {
      mmPanelEls['mmRice'].textContent = String(computeRice({ scores: node.scores }));
      mmPanelEls['mmIce'].textContent = String(computeIce({ scores: node.scores }));
    }
  }
  if (!skipUndo) pushUndo();
  saveMindmapState();
  if (!noRender) renderMindmap();
}

function bindMindmapPanel() {
  if (!mmPanelEls['mmLabelSel']) return;
  mmPanelEls['mmLabelSel'].addEventListener('change', () => updateSelectedNodeMeta({ label: mmPanelEls['mmLabelSel'].value }));
  mmPanelEls['mmTagSel'].addEventListener('change', () => updateSelectedNodeMeta({ tag: mmPanelEls['mmTagSel'].value }));
  mmPanelEls['mmEvidence'].addEventListener('change', () => updateSelectedNodeMeta({ evidence: mmPanelEls['mmEvidence'].value }, { skipUndo: true, noRender: true }));
  ['mmReach','mmImpact','mmConfidence','mmEffort'].forEach(id => {
    mmPanelEls[id].addEventListener('input', () => {
      const isNum = id === 'mmReach';
      let val = mmPanelEls[id].value.trim();
      if (isNum && val === '') { val = 0; }
      updateSelectedNodeMeta({ scores: { [id.replace('mm','').toLowerCase()]: isNum ? parseFloat(val) : (parseFloat(val) || 1) } });
    });
  });
  const closeBtn = document.getElementById('mmClosePanel');
  if (closeBtn) closeBtn.addEventListener('click', () => closeMindmapPanel());
  const iscSilk = document.getElementById('mmInspectorScamperBtn');
  if (iscSilk) iscSilk.addEventListener('click', () => { if (mindmapSelectedId) expandNodeScamper(mindmapSelectedId); });
  const isHats = document.getElementById('mmInspectorSixHatsBtn');
  if (isHats) isHats.addEventListener('click', () => { if (mindmapSelectedId) assessNodeHats(mindmapSelectedId); });
  const isDel = document.getElementById('mmInspectorDeleteBtn');
  if (isDel) isDel.addEventListener('click', () => { if (mindmapSelectedId) deleteNodeBranch(mindmapSelectedId); });
}
bindMindmapPanel();

// ---------------- Fast input with hierarchy syntax ----------------
function openFastInput() {
  const fi = document.getElementById('mindmapFastInput');
  if (fi) fi.style.display = 'flex';
}
function closeFastInput() {
  const fi = document.getElementById('mindmapFastInput');
  if (fi) fi.style.display = 'none';
}
function parseFastInput(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const root = mindmapNodesList.find(n => n.id === 'root');
  const parentKey = root ? root.id : null;
  let lastBranchId = parentKey;
  let created = 0;
  pushUndo();
  lines.forEach(rawLine => {
    const level = rawLine.startsWith('>') ? 1 : 0;
    const line = rawLine.replace(/^>+\s*/, '').replace(/^[+\-*]\s*/, '');
    if (!line.trim()) return;
    if (level === 1) {
      const child = addChildNodeLight(lastBranchId, line.trim(), {});
      if (child) { lastBranchId = child.id; created++; }
    } else {
      const isNote = rawLine.startsWith('-');
      const isRisk = rawLine.startsWith('!');
      const meta = {};
      if (isNote) { meta.evidence = line.trim(); meta.tag = 'resource'; }
      else if (isRisk) { meta.tag = 'risk'; }
      const child = addChildNodeLight(parentKey, line.trim(), meta);
      if (child) { lastBranchId = child.id; created++; }
    }
  });
  if (created > 0) {
    saveMindmapState();
    if (created > 1) autoLayoutMindmap();
    else renderMindmap();
  }
}

// ---------------- Gemini agents: SCAMPER expand & Six hats assess ----------------
function mindmapAiStatus(msg, isErr) {
  const el = document.getElementById('mindmapAiStatus');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('err', !!isErr);
}
function setMindmapBusy(on) {
  [['mindmapScamperBtn'],['mindmapSixHatsBtn']].forEach(([id]) => {
    const b = document.getElementById(id);
    if (b) { b.disabled = on; }
  });
}

async function expandNodeScamper(nodeId) {
  const node = mindmapNodesList.find(n => n.id === nodeId);
  if (!node) return;
  const prompt = `Bạn là chuyên gia sáng tạo ý tưởng. Dùng phương pháp SCAMPER để mở rộng ý tưởng sau:
"${node.text}"

SCAMPER = Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse.

Trả về đúng 7 dòng, mỗi dòng bắt đầu bằng tên chữ cái viết hoa (S, C, A, M, P, E, R), dấu hai chấm, rồi MỘT ý tưởng con cụ thể bằng tiếng Việt, ngắn gọn dưới 15 từ. Không giải thích, không đề mục khác.`;
  const res = await callGemini(prompt, 0.8);
  if (res.error) { mindmapAiStatus(res.error === 'no-key' ? '⚠ Chưa có Gemini Key (Cài đặt)' : '⚠ Lỗi: ' + res.error, true); return; }
  const lines = res.text.split('\n').map(l => l.trim()).filter(Boolean);
  pushUndo();
  lines.forEach(line => {
    const m = line.match(/^[SCAMPRE]\s*:\s*(.+)$/);
    if (m && m[1]) {
      addChildNodeLight(nodeId, m[1].trim(), { tag: 'insight', scamper: line[0] });
    }
  });
  saveMindmapState();
  autoLayoutMindmap();
  mindmapAiStatus('✓ Đã mở rộng ' + lines.length + ' nhánh SCAMPER');
  setTimeout(() => mindmapAiStatus(''), 4000);
}

// variant that does not auto-pushUndo + render per node (used by SCAMPER bulk)
function addChildNodeLight(parentId, text, meta) {
  const parent = mindmapNodesList.find(n => n.id === parentId);
  if (!parent) return null;
  const id = mindmapNewId('node');
  const child = { id, text, x: parent.x + 160, y: parent.y + (Math.random() * 120 - 60), parentId };
  if (meta) Object.assign(child, meta);
  mindmapNodesList.push(child);
  return child;
}

async function assessNodeHats(nodeId) {
  const node = mindmapNodesList.find(n => n.id === nodeId);
  if (!node) return;
  const prompt = `Bạn là cố vấn đánh giá ý tưởng theo "Six Thinking Hats". Đánh giá ý tưởng:
"${node.text}"

Trả về đúng 6 dòng, mỗi dòng bắt đầu bằng một trong: TRẮNG:, ĐỎ:, ĐEN:, VÀNG:, XANH LÁ:, XANH DƯƠNG:  và nội dung phù hợp mũ đó, ngắn gọn ≤100 từ tiếng Việt:
- TRẮNG: dữ kiện/giả định cần kiểm chứng (KHÔNG bịa con số; chỉ nêu câu hỏi về số liệu thật cần thu thập)
- ĐỎ: cảm xúc/trực giác
- ĐEN: rủi ro, điểm yếu
- VÀNG: lợi ích, cơ hội
- XANH LÁ: hướng sáng tạo, cải tiến
- XANH DƯƠNG: kết luận và bước hành động tiếp theo
Không thêm dòng khác.`;
  const res = await callGemini(prompt, 0.6);
  if (res.error) { mindmapAiStatus(res.error === 'no-key' ? '⚠ Chưa có Gemini Key (Cài đặt)' : '⚠ Lỗi: ' + res.error, true); return; }
  const lines = res.text.split('\n').map(l => l.trim()).filter(Boolean);
  pushUndo();
  let assess = {};
  lines.forEach(line => {
    const m = line.match(/^(TRẮNG|ĐỎ|ĐEN|VÀNG|XANH LÁ|XANH DƯƠNG)\s*:\s*(.+)$/);
    if (m) {
      const key = m[1];
      const val = m[2].trim();
      if (key === 'ĐEN') assess.risk = (assess.risk || '') + (assess.risk ? ' ' : '') + val;
      else if (key === 'VÀNG') assess.benefit = (assess.benefit || '') + (assess.benefit ? ' ' : '') + val;
      else if (key === 'XANH DƯƠNG') assess.action = val;
      else if (key === 'TRẮNG') assess.check = (assess.check || '') + (assess.check ? ' ' : '') + val;
      else if (key === 'XANH LÁ') assess.creative = (assess.creative || '') + (assess.creative ? ' ' : '') + val;
      else assess.feel = val;
    }
  });
  if (!node.assess) node.assess = {};
  Object.assign(node.assess, assess);
  saveMindmapState();
  renderMindmap();
  selectMindmapNode(nodeId);
  mindmapAiStatus('✓ Đã đánh giá 6 mũ cho node');
  setTimeout(() => mindmapAiStatus(''), 4000);
}

// ---------------- Toolbar bindings ----------------
function bindMindmapToolbar() {
  const scamperBtn = document.getElementById('mindmapScamperBtn');
  const hatsBtn = document.getElementById('mindmapSixHatsBtn');
  const autoBtn = document.getElementById('mindmapAutoLayoutBtn');
  const collapseBtn = document.getElementById('mindmapCollapseBtn');
  const undoBtn = document.getElementById('mindmapUndoBtn');
  const synHint = document.getElementById('mindmapSyntaxHint');
  const fastOpenBtn = document.getElementById('mindmapFastOpenBtn');
  const fastClose = document.getElementById('mmFastClose');
  const fastCancel = document.getElementById('mmFastCancel');
  const fastOk = document.getElementById('mmFastOk');
  const fastText = document.getElementById('mmFastText');

  if (scamperBtn) scamperBtn.addEventListener('click', () => {
    const id = mindmapSelectedId || (mindmapNodesList.find(n => n.id !== 'root' && !isNodeHidden(n.id))?.id) || 'root';
    expandNodeScamper(id);
  });
  if (hatsBtn) hatsBtn.addEventListener('click', () => {
    const id = mindmapSelectedId || (mindmapNodesList.find(n => n.id !== 'root' && !isNodeHidden(n.id))?.id) || 'root';
    assessNodeHats(id);
  });
  if (autoBtn) autoBtn.addEventListener('click', () => { pushUndo(); autoLayoutMindmap(); });
  if (collapseBtn) collapseBtn.addEventListener('click', () => {
    const id = mindmapSelectedId && mindmapSelectedId !== 'root' ? mindmapSelectedId : null;
    if (!id) { mindmapAiStatus('Chọn 1 node (không phải gốc) rồi bấm Thu gọn', true); setTimeout(()=>mindmapAiStatus(''), 3000); return; }
    const n = mindmapNodesList.find(x => x.id === id);
    if (n && mindmapNodesList.some(x => x.parentId === id)) {
      n.collapsed = !n.collapsed;
      pushUndo(); saveMindmapState(); renderMindmap();
    }
  });
  if (undoBtn) undoBtn.addEventListener('click', () => undoMindmap());
  if (fastOk) fastOk.addEventListener('click', () => {
    parseFastInput(fastText.value);
    fastText.value = '';
    closeFastInput();
  });
  if (fastOpenBtn) fastOpenBtn.addEventListener('click', () => openFastInput());
  if (fastCancel) fastCancel.addEventListener('click', closeFastInput);
  if (fastClose) fastClose.addEventListener('click', closeFastInput);
  if (synHint) synHint.addEventListener('click', (e) => { e.preventDefault(); openFastInput(); });

  // Zoom controls
  const zoomIn = document.getElementById('mmZoomIn');
  const zoomOut = document.getElementById('mmZoomOut');
  const zoomFit = document.getElementById('mmZoomFit');
  if (zoomIn) zoomIn.addEventListener('click', () => mmSetZoom(mmScale * 1.2));
  if (zoomOut) zoomOut.addEventListener('click', () => mmSetZoom(mmScale * (1 / 1.2)));
  if (zoomFit) zoomFit.addEventListener('click', () => mmFitToView());

  // Inspector empty-state selectors are handled in bindMindmapPanel
}
bindMindmapToolbar();

// ---- Zoom & fit ----
function mmSetZoom(scale) {
  mmScale = Math.min(2.2, Math.max(0.2, scale));
  renderMindmap();
  mmUpdateZoomLabel();
}
function mmApplyZoom() {
  const label = document.getElementById('mmZoomLabel');
  if (label) label.textContent = Math.round(mmScale * 100) + '%';
}
function mmUpdateZoomLabel() {
  const label = document.getElementById('mmZoomLabel');
  if (label) label.textContent = Math.round(mmScale * 100) + '%';
}
function mmFitToView() {
  if (mindmapNodesList.length === 0) return;
  const xs = mindmapNodesList.map(n => n.x), ys = mindmapNodesList.map(n => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const vw = mindmapViewport.clientWidth, vh = mindmapViewport.clientHeight;
  const pad = 100;
  const scale = Math.min((vw - pad * 2) / Math.max(1, maxX - minX), (vh - pad * 2) / Math.max(1, maxY - minY));
  mmScale = Math.min(1.8, Math.max(0.15, scale));
  panX = Math.round(vw / 2 - ((minX + maxX) / 2) * mmScale);
  panY = Math.round(vh / 2 - ((minY + maxY) / 2) * mmScale);
  renderMindmap();
  mmUpdateZoomLabel();
}

// (mmClosePanel bound inside bindMindmapPanel)


// Bind Global Drag/Pan Events
if (mindmapViewport) {
  mindmapViewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('.mindmap-node')) return;
    closeMindmapPanel();
    isPanning = true;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    originalPanX = panX;
    originalPanY = panY;
  });
}

window.addEventListener('mousemove', (e) => {
  if (draggingNodeId) {
    const dx = (e.clientX - mouseStartX) / mmScale;
    const dy = (e.clientY - mouseStartY) / mmScale;
    
    const node = mindmapNodesList.find(n => n.id === draggingNodeId);
    if (node) {
      const incX = Math.round((originalNodeX + dx) - node.x);
      const incY = Math.round((originalNodeY + dy) - node.y);
      node.x = Math.round(originalNodeX + dx);
      node.y = Math.round(originalNodeY + dy);
      if (draggingShift && (incX !== 0 || incY !== 0)) {
        mindmapNodesList.forEach(n => {
          if (n.id !== node.id && isDescendantOf(n.id, node.id)) {
            n.x += incX; n.y += incY;
          }
        });
      }
      renderMindmap();
    }
  } else if (isPanning) {
    const dx = e.clientX - mouseStartX;
    const dy = e.clientY - mouseStartY;
    
    panX = Math.round(originalPanX + dx);
    panY = Math.round(originalPanY + dy);
    renderMindmap();
  }
});

function isDescendantOf(id, ancestorId) {
  let n = mindmapNodesList.find(x => x.id === id);
  let guard = 0;
  while (n && n.parentId && guard++ < 1000) {
    if (n.parentId === ancestorId) return true;
    n = mindmapNodesList.find(x => x.id === n.parentId);
  }
  return false;
}

window.addEventListener('mouseup', () => {
  if (draggingNodeId) {
    saveMindmapState();
    draggingNodeId = null;
  }
  isPanning = false;
});

// Wheel zoom (Ctrl/Cmd + scroll) + plain scroll conducts panning fallback
if (mindmapViewport) {
  mindmapViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      mmSetZoom(mmScale * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    } else {
      panX = Math.round(panX - e.deltaX);
      panY = Math.round(panY - e.deltaY);
      renderMindmap();
    }
  }, { passive: false });
}

// Keyboard shortcuts for mindmap editing
window.addEventListener('keydown', (e) => {
  const mmOpen = document.getElementById('mindmapModal') && document.getElementById('mindmapModal').style.display === 'flex';
  if (!mmOpen) return;
  const t = e.target;
  const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  if (typing) {
    // Esc closes fast input while typing
    if (e.key === 'Escape') {
      const fi = document.getElementById('mindmapFastInput');
      if (fi && fi.style.display === 'flex') { closeFastInput(); e.stopPropagation(); }
    }
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoMindmap(); return; }
  if ((e.metaKey || e.ctrlKey) && e.key === '+') { e.preventDefault(); mmSetZoom(mmScale * 1.2); return; }
  if ((e.metaKey || e.ctrlKey) && e.key === '-') { e.preventDefault(); mmSetZoom(mmScale / 1.2); return; }
  if (e.key === 'Escape') { closeMindmapPanel(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (mindmapSelectedId && mindmapSelectedId !== 'root') { e.preventDefault(); deleteNodeBranch(mindmapSelectedId); return; }
  }
  if (e.key === 'Tab') {
    if (mindmapSelectedId) { e.preventDefault(); addChildNode(mindmapSelectedId); return; }
  }
  if (e.key === 'c' || e.key === 'C') {
    const n = mindmapNodesList.find(x => x.id === mindmapSelectedId);
    if (n && mindmapNodesList.some(x => x.parentId === n.id)) { n.collapsed = !n.collapsed; pushUndo(); saveMindmapState(); renderMindmap(); }
    return;
  }
  if (e.key === 'f' || e.key === 'F') { mmFitToView(); return; }
  if (e.key === 'Enter') {
    // edit selected node text
    if (mindmapSelectedId) {
      const n = mindmapNodesList.find(x => x.id === mindmapSelectedId);
      const el = mindmapNodesContainer.querySelector(`[data-id="${mindmapSelectedId}"] .node-text`);
      if (n && el && !e.shiftKey) {
        e.preventDefault();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'node-input';
        input.value = n.text;
        el.parentNode.replaceChild(input, el);
        input.focus(); input.select();
        const saveText = () => {
          const val = input.value.trim() || n.text;
          n.text = val;
          if (n.id === 'root') updateIdeaMainText(val);
          pushUndo(); saveMindmapState(); renderMindmap();
        };
        input.addEventListener('keydown', (evt) => { if (evt.key === 'Enter') saveText(); if (evt.key === 'Escape') { input.value = n.text; saveText(); } });
        input.addEventListener('blur', saveText);
      }
    }
  }
});

// ---------------- VIEW 1 ADD-ON: ZEN LAYOUT CONTROLLER ----------------
(function initZenLayout() {
  const toggleLeftBtn = document.getElementById('toggleLeftBtn');
  const toggleTasksBtn = document.getElementById('toggleTasksBtn');
  const toggleRightBtn = document.getElementById('toggleRightBtn');
  const toggleZenBtn = document.getElementById('toggleZenBtn');

  const closeLeftDrawerBtn = document.getElementById('closeLeftDrawerBtn');
  const closeRightDrawerBtn = document.getElementById('closeRightDrawerBtn');
  const closeTasksDrawerBtn = document.getElementById('closeTasksDrawerBtn');

  const leftDrawer = document.getElementById('leftDrawer');
  const rightDrawer = document.getElementById('rightDrawer');
  const tasksDrawer = document.getElementById('tasksDrawer');
  const appLayout = document.querySelector('.app-layout');

  if (!toggleLeftBtn || !leftDrawer) return;

  // Zen chrome (header + dock) fades out after the mouse rests, and comes back on movement
  const ZEN_IDLE_MS = 2500;
  let zenIdleTimer;
  function markZenIdle() {
    clearTimeout(zenIdleTimer);
    appLayout.classList.add('zen-idle');
  }
  function wakeZenChrome() {
    appLayout.classList.remove('zen-idle');
    clearTimeout(zenIdleTimer);
    if (appLayout.classList.contains('zen-active')) zenIdleTimer = setTimeout(markZenIdle, ZEN_IDLE_MS);
  }
  document.addEventListener('mousemove', wakeZenChrome, { passive: true });

  // One-time hint so first-time users know the tools are still there
  function showZenHint() {
    const hint = document.getElementById('zenHint');
    if (!hint) return;
    hint.hidden = false;
    requestAnimationFrame(() => hint.classList.add('visible'));
    const dismiss = () => {
      hint.classList.remove('visible');
      setTimeout(() => { hint.hidden = true; }, 400);
      chrome.storage.local.set({ zenHintSeen: true });
    };
    setTimeout(dismiss, 7000);
    toggleZenBtn.addEventListener('click', dismiss, { once: true });
  }

  // Load saved state on start. New users (no saved choice) start in Zen.
  chrome.storage.local.get(['zenActive', 'zenHintSeen', 'leftDrawerActive', 'rightDrawerActive', 'tasksDrawerActive'], (data) => {
    if (data.zenActive ?? true) {
      appLayout.classList.add('zen-active');
      toggleZenBtn.classList.add('active');
      markZenIdle();
      if (!data.zenHintSeen) showZenHint();
    } else {
      const roomForTwo = window.innerWidth >= 1440;
      if (data.leftDrawerActive && (roomForTwo || !(data.rightDrawerActive || data.tasksDrawerActive))) {
        leftDrawer.classList.add('active');
        toggleLeftBtn.classList.add('active');
      }
      if (data.rightDrawerActive) {
        rightDrawer.classList.add('active');
        toggleRightBtn.classList.add('active');
      }
      // Right and tasks drawers share the right edge — restore only one
      if (data.tasksDrawerActive && !data.rightDrawerActive) {
        tasksDrawer.classList.add('active');
        toggleTasksBtn.classList.add('active');
      }
    }
  });

  // Toggle Function
  function toggleDrawer(drawer, button, storageKey) {
    // If Zen mode is active, turn it off first when opening a drawer
    if (appLayout.classList.contains('zen-active')) {
      appLayout.classList.remove('zen-active', 'zen-idle');
      toggleZenBtn.classList.remove('active');
      chrome.storage.local.set({ zenActive: false });
    }

    const isActive = drawer.classList.toggle('active');
    button.classList.toggle('active', isActive);

    // Right and tasks drawers share the right edge, so they never coexist. On narrower
    // screens any two drawers would cover the clock and intention: keep just one open.
    if (isActive) {
      const all = [[leftDrawer, toggleLeftBtn, 'leftDrawerActive'], [rightDrawer, toggleRightBtn, 'rightDrawerActive'], [tasksDrawer, toggleTasksBtn, 'tasksDrawerActive']];
      const sameEdge = d => (drawer === rightDrawer || drawer === tasksDrawer) && (d === rightDrawer || d === tasksDrawer);
      all.forEach(([other, otherBtn, key]) => {
        if (other === drawer || !other.classList.contains('active')) return;
        if (!sameEdge(other) && window.innerWidth >= 1440) return;
        other.classList.remove('active');
        otherBtn.classList.remove('active');
        if (other === rightDrawer) {
          const qp = document.getElementById('quickToolPanel');
          if (qp) qp.style.display = 'none';
        }
        chrome.storage.local.set({ [key]: false });
      });
    }
    
    // Close quickToolPanel if closing the right drawer
    if (!isActive && drawer === rightDrawer) {
      const qp = document.getElementById('quickToolPanel');
      if (qp) qp.style.display = 'none';
    }

    const setObj = {};
    setObj[storageKey] = isActive;
    chrome.storage.local.set(setObj);
  }

  // Bind Open/Toggle triggers
  toggleLeftBtn.addEventListener('click', () => {
    toggleDrawer(leftDrawer, toggleLeftBtn, 'leftDrawerActive');
  });

  toggleRightBtn.addEventListener('click', () => {
    toggleDrawer(rightDrawer, toggleRightBtn, 'rightDrawerActive');
  });

  toggleTasksBtn.addEventListener('click', () => {
    toggleDrawer(tasksDrawer, toggleTasksBtn, 'tasksDrawerActive');
  });

  // Close buttons inside drawers
  closeLeftDrawerBtn.addEventListener('click', () => {
    leftDrawer.classList.remove('active');
    toggleLeftBtn.classList.remove('active');
    chrome.storage.local.set({ leftDrawerActive: false });
  });

  closeRightDrawerBtn.addEventListener('click', () => {
    rightDrawer.classList.remove('active');
    toggleRightBtn.classList.remove('active');
    chrome.storage.local.set({ rightDrawerActive: false });
    const qp = document.getElementById('quickToolPanel');
    if (qp) qp.style.display = 'none';
  });

  closeTasksDrawerBtn.addEventListener('click', () => {
    tasksDrawer.classList.remove('active');
    toggleTasksBtn.classList.remove('active');
    chrome.storage.local.set({ tasksDrawerActive: false });
  });

  // Zen Mode trigger (collapses all drawers and sidebar)
  toggleZenBtn.addEventListener('click', () => {
    const isZen = appLayout.classList.toggle('zen-active');
    toggleZenBtn.classList.toggle('active', isZen);
    chrome.storage.local.set({ zenActive: isZen });
    wakeZenChrome();

    if (isZen) {
      // Close all drawers
      leftDrawer.classList.remove('active');
      toggleLeftBtn.classList.remove('active');
      rightDrawer.classList.remove('active');
      toggleRightBtn.classList.remove('active');
      tasksDrawer.classList.remove('active');
      toggleTasksBtn.classList.remove('active');
      const qp = document.getElementById('quickToolPanel');
      if (qp) qp.style.display = 'none';

      chrome.storage.local.set({
        leftDrawerActive: false,
        rightDrawerActive: false,
        tasksDrawerActive: false
      });
    }
  });

  // Esc closes open drawers (skipped while a modal is open or when typing)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ([...document.querySelectorAll('.modal-overlay')].some(m => m.style.display !== 'none')) return;
    if (e.target.matches('input, textarea, select')) { e.target.blur(); return; }
    // An open quick tool steps back to the drawer first
    const openTool = document.getElementById('quickToolPanel');
    if (openTool && openTool.style.display !== 'none') { document.getElementById('closeQuickToolBtn')?.click(); return; }
    [[leftDrawer, toggleLeftBtn, 'leftDrawerActive'], [rightDrawer, toggleRightBtn, 'rightDrawerActive'], [tasksDrawer, toggleTasksBtn, 'tasksDrawerActive']]
      .forEach(([drawer, btn, key]) => {
        if (!drawer.classList.contains('active')) return;
        drawer.classList.remove('active');
        btn.classList.remove('active');
        chrome.storage.local.set({ [key]: false });
      });
    const qp = document.getElementById('quickToolPanel');
    if (qp) qp.style.display = 'none';
  });

  // Click outside to close drawers on small screens (standard UX detail)
  document.addEventListener('click', (e) => {
    if (window.innerWidth > 1200) return;
    
    if (leftDrawer.classList.contains('active') && !leftDrawer.contains(e.target) && !toggleLeftBtn.contains(e.target)) {
      leftDrawer.classList.remove('active');
      toggleLeftBtn.classList.remove('active');
      chrome.storage.local.set({ leftDrawerActive: false });
    }
    if (rightDrawer.classList.contains('active') && !rightDrawer.contains(e.target) && !toggleRightBtn.contains(e.target)) {
      rightDrawer.classList.remove('active');
      toggleRightBtn.classList.remove('active');
      chrome.storage.local.set({ rightDrawerActive: false });
    }
    if (tasksDrawer.classList.contains('active') && !tasksDrawer.contains(e.target) && !toggleTasksBtn.contains(e.target)) {
      tasksDrawer.classList.remove('active');
      toggleTasksBtn.classList.remove('active');
      chrome.storage.local.set({ tasksDrawerActive: false });
    }
  });


})();

// ---------------- OFFLINE BACKGROUND IMAGE CONTROLLER ----------------
(function initOfflineBackgroundController() {
  const bgFileInput = document.getElementById('bgFileInput');
  const bgFileSelectBtn = document.getElementById('bgFileSelectBtn');
  const bgFileResetBtn = document.getElementById('bgFileResetBtn');
  const bgFileName = document.getElementById('bgFileName');

  if (!bgFileInput || !bgFileSelectBtn) return;

  // On Settings open, sync the state UI
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.storage.local.get(['customOfflineBg', 'customBgBlur'], (data) => {
        if (data.customOfflineBg) {
          bgFileResetBtn.style.display = 'block';
          bgFileName.textContent = 'Đang dùng ảnh nền cá nhân';
        } else {
          bgFileResetBtn.style.display = 'none';
          bgFileName.textContent = 'Chưa chọn ảnh';
        }
        
        const blurVal = (data.customBgBlur !== undefined) ? data.customBgBlur : 2;
        const bgBlurRange = document.getElementById('bgBlurRange');
        const bgBlurValue = document.getElementById('bgBlurValue');
        if (bgBlurRange && bgBlurValue) {
          bgBlurRange.value = blurVal;
          bgBlurValue.textContent = `${blurVal}px`;
        }

        const statusSpan = document.getElementById('apiKeyTestStatus');
        if (statusSpan) statusSpan.textContent = '';
      });
    });
  }

  // Trigger file dialog
  bgFileSelectBtn.addEventListener('click', (e) => {
    e.preventDefault();
    bgFileInput.click();
  });

  // Handle file select
  bgFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    bgFileName.textContent = 'Đang xử lý ảnh...';

    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        // Compress using HTML5 Canvas to keep file size small in storage
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Limit max width/height to 1920px (standard full HD background size)
        const maxResolution = 1920;
        if (width > maxResolution || height > maxResolution) {
          if (width > height) {
            height = Math.round((height * maxResolution) / width);
            width = maxResolution;
          } else {
            width = Math.round((width * maxResolution) / height);
            height = maxResolution;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Export to JPEG with quality 0.8 to keep size under 1MB
        try {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          chrome.storage.local.set({ customOfflineBg: compressedDataUrl }, () => {
            document.body.style.backgroundImage = `url(${compressedDataUrl})`;
            if (window.ZenAppearance) ZenAppearance.setCustomActive(true);
            syncAppearanceUI();
            bgFileName.textContent = file.name;
            bgFileResetBtn.style.display = 'block';
            bgFileInput.value = ''; // Reset file input
          });
        } catch (err) {
          console.error('Lỗi khi nén ảnh nền:', err);
          bgFileName.textContent = 'Lỗi nén ảnh';
        }
      };
      
      img.onerror = function() {
        bgFileName.textContent = 'Lỗi đọc tệp ảnh';
      };
      
      img.src = event.target.result;
    };
    
    reader.onerror = function() {
      bgFileName.textContent = 'Lỗi đọc tệp';
    };
    
    reader.readAsDataURL(file);
  });

  // Handle Reset to Default background
  bgFileResetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.storage.local.remove('customOfflineBg', () => {
      // Fall back to the selected wallpaper preset (defined in CSS)
      document.body.style.backgroundImage = '';
      if (window.ZenAppearance) ZenAppearance.setCustomActive(false);
      syncAppearanceUI();
      bgFileName.textContent = 'Chưa chọn ảnh';
      bgFileResetBtn.style.display = 'none';
      bgFileInput.value = '';
    });
  });

  // Handle Background Blur Slider
  const bgBlurRange = document.getElementById('bgBlurRange');
  const bgBlurValue = document.getElementById('bgBlurValue');
  const overlay = document.querySelector('.overlay');

  if (bgBlurRange && bgBlurValue && overlay) {
    // Instant update when sliding
    bgBlurRange.addEventListener('input', (e) => {
      const val = e.target.value;
      bgBlurValue.textContent = `${val}px`;
      overlay.style.backdropFilter = `blur(${val}px)`;
      overlay.style.webkitBackdropFilter = `blur(${val}px)`;
    });

    // Save only when dragging ends
    bgBlurRange.addEventListener('change', (e) => {
      const val = parseInt(e.target.value);
      chrome.storage.local.set({ customBgBlur: val });
    });
  }
})();

// ---------------- WEATHER CONTROLLER ----------------
function getWeatherZenInfo(code) {
  switch (code) {
    case 0:
      return {
        emoji: '☀️',
        desc: 'Trời quang mây tạnh',
        quote: 'Hôm nay trời nắng ấm, hãy dành vài phút tản bộ hít thở khí trời.'
      };
    case 1:
    case 2:
    case 3:
      return {
        emoji: '⛅',
        desc: 'Mây rải rác',
        quote: 'Mây nhẹ che bóng mát, giữ cho tâm trí thư thái nhẹ nhàng.'
      };
    case 45:
    case 48:
      return {
        emoji: '🌫️',
        desc: 'Sương mù',
        quote: 'Sương phủ che lối, hãy tập trung vào từng bước đi hiện tại.'
      };
    case 51:
    case 53:
    case 55:
      return {
        emoji: '🌧️',
        desc: 'Mưa phùn',
        quote: 'Trời đổ mưa phùn se lạnh, thích hợp để đọc sách và tĩnh tâm.'
      };
    case 61:
    case 63:
    case 65:
      return {
        emoji: '🌧️',
        desc: 'Mưa lớn',
        quote: 'Mưa rơi mát mẻ, hãy lắng nghe tiếng nước rơi và xoa dịu tâm hồn.'
      };
    case 71:
    case 73:
    case 75:
      return {
        emoji: '❄️',
        desc: 'Tuyết rơi',
        quote: 'Tuyết trắng rơi lạnh, hãy giữ ấm cơ thể và tìm sự bình yên bên trong.'
      };
    case 80:
    case 81:
    case 82:
      return {
        emoji: '🌦️',
        desc: 'Mưa rào',
        quote: 'Cơn mưa rào bất chợt đến rồi đi, như mọi giông bão trong lòng.'
      };
    case 95:
    case 96:
    case 99:
      return {
        emoji: '⛈️',
        desc: 'Giông bão',
        quote: 'Giông sét ngoài kia, hãy giữ sự bình yên kiên định bên trong.'
      };
    default:
      return {
        emoji: '🌡️',
        desc: 'Thời tiết ổn định',
        quote: 'Mỗi ngày đều là một ngày đẹp trời để sống trọn vẹn.'
      };
  }
}

function initWeather(forceRefresh = false) {
  const weatherWidget = document.getElementById('weatherWidget');
  const weatherDetailedCard = document.getElementById('weatherDetailedCard');
  if (!weatherWidget) return;

  // Click to toggle detailed card
  weatherWidget.onclick = (e) => {
    e.stopPropagation();
    const isHidden = weatherDetailedCard.style.display === 'none';
    weatherDetailedCard.style.display = isHidden ? 'flex' : 'none';
  };

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (weatherDetailedCard && !weatherDetailedCard.contains(e.target) && e.target !== weatherWidget) {
      weatherDetailedCard.style.display = 'none';
    }
  });

  chrome.storage.sync.get(['weatherLocation'], (syncData) => {
    const customCity = syncData.weatherLocation ? syncData.weatherLocation.trim() : '';

    chrome.storage.local.get(['weatherCache'], (localData) => {
      const cache = localData.weatherCache;
      const now = Date.now();
      
      // If cache exists, is not expired (< 30 minutes), and location matches custom city
      if (!forceRefresh && cache && (now - cache.timestamp < 30 * 60 * 1000) && (cache.customCity === customCity)) {
        renderWeather(cache);
        return;
      }

      // Refresh weather
      if (customCity) {
        // Fetch coordinate from geocoding
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(customCity)}&count=1&language=vi`)
          .then(res => res.json())
          .then(data => {
            if (data.results && data.results[0]) {
              const res = data.results[0];
              const cityName = res.name + (res.country ? `, ${res.country}` : '');
              fetchWeatherFromApi(res.latitude, res.longitude, cityName, customCity);
            } else {
              setWeatherError(`Không tìm thấy "${customCity}"`);
            }
          })
          .catch((err) => {
            console.error('Weather Geocoding API failed:', err);
            setWeatherError('Lỗi kết nối định vị');
          });
      } else {
        // No city set: guess it from the IP. (navigator.geolocation needs the "geolocation"
        // permission in an extension, and its install warning isn't worth it for weather.)
        fetchIpLocation();
      }
    });
  });
}

// The guessed city rarely changes, and ipapi.co's free tier rate-limits (HTTP 429):
// keep the guess for a day instead of asking on every weather refresh
const IP_LOCATION_TTL = 24 * 60 * 60 * 1000;
function fetchIpLocation() {
  chrome.storage.local.get('ipLocation', ({ ipLocation }) => {
    if (ipLocation && Date.now() - ipLocation.timestamp < IP_LOCATION_TTL) {
      fetchWeatherFromApi(ipLocation.latitude, ipLocation.longitude, ipLocation.city, '');
      return;
    }
    requestIpLocation();
  });
}

function requestIpLocation() {
  fetch('https://ipapi.co/json/')
    .then(res => res.ok ? res.json() : {})
    .then(data => {
      if (data.latitude && data.longitude) {
        const city = data.city || 'Vị trí của bạn';
        chrome.storage.local.set({ ipLocation: { latitude: data.latitude, longitude: data.longitude, city, timestamp: Date.now() } });
        fetchWeatherFromApi(data.latitude, data.longitude, city, '');
      } else {
        // Hard fallback to Hanoi
        fetchWeatherFromApi(21.0285, 105.8542, 'Hà Nội', '');
      }
    })
    .catch(() => {
      // Hard fallback to Hanoi
      fetchWeatherFromApi(21.0285, 105.8542, 'Hà Nội', '');
    });
}

function fetchWeatherFromApi(lat, lng, cityName, customCity) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`;
  
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.current) {
        setWeatherError('Dữ liệu thời tiết lỗi');
        return;
      }
      
      const current = data.current;
      const daily = data.daily || {};
      
      // Construct cache object
      const cache = {
        timestamp: Date.now(),
        customCity: customCity,
        cityName: cityName,
        temp: Math.round(current.temperature_2m),
        weatherCode: current.weather_code,
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        sunrise: daily.sunrise && daily.sunrise[0] ? daily.sunrise[0].split('T')[1] : '--:--',
        sunset: daily.sunset && daily.sunset[0] ? daily.sunset[0].split('T')[1] : '--:--',
        forecast: []
      };

      // 3 days forecast (days 1, 2, 3)
      if (daily.time) {
        const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        for (let i = 1; i <= 3; i++) {
          if (daily.time[i]) {
            const dateObj = new Date(daily.time[i]);
            const dayName = daysOfWeek[dateObj.getDay()];
            cache.forecast.push({
              dayName: dayName,
              weatherCode: daily.weather_code[i],
              tempMin: Math.round(daily.temperature_2m_min[i]),
              tempMax: Math.round(daily.temperature_2m_max[i])
            });
          }
        }
      }

      chrome.storage.local.set({ weatherCache: cache }, () => {
        renderWeather(cache);
      });
    })
    .catch((err) => {
      console.error('Weather forecast API failed:', err);
      setWeatherError('Lỗi kết nối máy chủ thời tiết');
    });
}

function renderWeather(cache) {
  const tempDisplay = document.getElementById('weatherTempDisplay');
  const descDisplay = document.getElementById('weatherDescDisplay');
  const iconEmoji = document.getElementById('weatherIconEmoji');
  
  const feelsLike = document.getElementById('wdFeelsLike');
  const humidity = document.getElementById('wdHumidity');
  const sunrise = document.getElementById('wdSunrise');
  const sunset = document.getElementById('wdSunset');
  const quote = document.getElementById('weatherZenQuote');
  const forecast3Day = document.getElementById('weatherForecast3Day');

  const info = getWeatherZenInfo(cache.weatherCode);

  // Update minimal view
  const widget = document.getElementById('weatherWidget');
  if (widget) {
    widget.classList.remove('is-error');
    widget.title = 'Xem chi tiết thời tiết';
    widget.removeAttribute('aria-label');
  }
  if (tempDisplay) tempDisplay.textContent = `${cache.cityName}, ${cache.temp}°C`;
  if (descDisplay) descDisplay.textContent = `· ${info.desc}`;
  if (iconEmoji) iconEmoji.textContent = info.emoji;

  // Update detailed card
  if (feelsLike) feelsLike.textContent = `${cache.feelsLike}°C`;
  if (humidity) humidity.textContent = `${cache.humidity}%`;
  if (sunrise) sunrise.textContent = cache.sunrise;
  if (sunset) sunset.textContent = cache.sunset;
  if (quote) quote.textContent = info.quote;

  if (forecast3Day && cache.forecast && cache.forecast.length > 0) {
    forecast3Day.innerHTML = cache.forecast.map(f => {
      const fInfo = getWeatherZenInfo(f.weatherCode);
      return `
        <div class="forecast-day-row">
          <span class="forecast-day-name">${f.dayName}</span>
          <span class="forecast-day-icon" title="${fInfo.desc}">${fInfo.emoji}</span>
          <span class="forecast-day-temp">${f.tempMin}°C - ${f.tempMax}°C</span>
        </div>
      `;
    }).join('');
  }
}

function setWeatherError(msg) {
  const widget = document.getElementById('weatherWidget');
  const tempDisplay = document.getElementById('weatherTempDisplay');
  const descDisplay = document.getElementById('weatherDescDisplay');
  const iconEmoji = document.getElementById('weatherIconEmoji');
  if (tempDisplay) tempDisplay.textContent = '';
  if (descDisplay) descDisplay.textContent = '';
  if (iconEmoji) iconEmoji.textContent = '🌫️';
  if (widget) {
    widget.classList.add('is-error');
    widget.title = `${msg}. Kiểm tra mạng hoặc "Địa phương" trong Cài đặt.`;
    widget.setAttribute('aria-label', msg);
  }
}

// Initialise Weather
initWeather();

// Toggle Quote Expansion
const expandQuoteBtn = document.getElementById('expandQuoteBtn');
if (expandQuoteBtn) {
  expandQuoteBtn.addEventListener('click', () => {
    const textEl = document.getElementById('quoteText');
    if (textEl) {
      const isExpanded = textEl.classList.toggle('expanded');
      expandQuoteBtn.textContent = isExpanded ? 'Thu gọn' : 'Xem đầy đủ';
    }
  });
}



// ---------------- APPEARANCE: THEME + WALLPAPER PRESETS ----------------
// State lives in theme.js (localStorage) so it applies before first paint.
function syncAppearanceUI() {
  if (!window.ZenAppearance) return;
  const theme = ZenAppearance.getTheme();
  const customActive = document.documentElement.hasAttribute('data-custom-bg');
  const wallpaper = customActive ? null : ZenAppearance.getWallpaper();
  document.querySelectorAll('[data-theme-option]').forEach(btn => {
    const on = btn.dataset.themeOption === theme;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-checked', on);
  });
  document.querySelectorAll('.wallpaper-tile').forEach(tile => {
    const on = tile.dataset.wallpaper === wallpaper;
    tile.classList.toggle('active', on);
    tile.setAttribute('aria-checked', on);
  });
}

(function initAppearanceControls() {
  if (!window.ZenAppearance) return;

  document.querySelectorAll('[data-theme-option]').forEach(btn => {
    btn.addEventListener('click', () => {
      ZenAppearance.setTheme(btn.dataset.themeOption);
      syncAppearanceUI();
    });
  });

  document.querySelectorAll('.wallpaper-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      ZenAppearance.setWallpaper(tile.dataset.wallpaper);
      // Picking a preset replaces an uploaded photo
      chrome.storage.local.get('customOfflineBg', (data) => {
        if (data.customOfflineBg) {
          chrome.storage.local.remove('customOfflineBg');
          const resetBtn = document.getElementById('bgFileResetBtn');
          const fileName = document.getElementById('bgFileName');
          if (resetBtn) resetBtn.style.display = 'none';
          if (fileName) fileName.textContent = 'Chưa chọn ảnh';
        }
      });
      document.body.style.backgroundImage = '';
      ZenAppearance.setCustomActive(false);
      syncAppearanceUI();
    });
  });

  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.addEventListener('click', syncAppearanceUI);
  syncAppearanceUI();
})();


// ---------------- FOCUS VIEW: SESSIONS, MODES, SOUNDS, SHORTCUTS ----------------
const FOCUS_CYCLE = 4; // a long break after every 4 focus sessions

function formatClock(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Secondary line under the big timer: planned end time, paused state or duration
function updateFocusMeta() {
  const el = document.getElementById('focusEndTime');
  if (!el) return;
  const full = getModeDuration(timerMode);
  if (isTimerRunning) {
    el.textContent = `Kết thúc lúc ${formatClock(new Date(targetTime))}`;
  } else if (Math.round(timeLeft) < full) {
    el.textContent = 'Đã tạm dừng';
  } else {
    el.textContent = `${Math.round(full / 60)} phút`;
  }
}

function syncFocusModes() {
  document.querySelectorAll('#focusModes [data-mode]').forEach(btn => {
    const on = btn.dataset.mode === timerMode;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-checked', on);
  });
  // Relaxation is offered only on breaks
  window.ZenRelax?.syncInvite();
}

function setTimerMode(mode) {
  if (!timerModeSelect || timerModeSelect.value === mode) return;
  timerModeSelect.value = mode;
  timerModeSelect.dispatchEvent(new Event('change'));
}

// ---- Daily session stats (chrome.storage.local, resets each day) ----
function getFocusStats(cb) {
  chrome.storage.local.get('focusStats', (data) => {
    const today = getDateStr(new Date());
    const stats = data.focusStats && data.focusStats.date === today ? data.focusStats : { date: today, sessions: 0, minutes: 0 };
    cb(stats);
  });
}

function renderFocusSessions() {
  getFocusStats((stats) => {
    const dots = document.getElementById('focusSessionDots');
    const text = document.getElementById('focusSessionText');
    const inCycle = stats.sessions === 0 ? 0 : (stats.sessions % FOCUS_CYCLE || FOCUS_CYCLE);
    if (dots) {
      dots.innerHTML = '';
      for (let i = 0; i < FOCUS_CYCLE; i++) {
        const d = document.createElement('span');
        d.className = 'session-dot' + (i < inCycle ? ' done' : '');
        dots.appendChild(d);
      }
    }
    if (text) {
      text.textContent = stats.sessions === 0
        ? 'Chưa có phiên nào hôm nay'
        : `Hôm nay: ${stats.sessions} phiên · ${stats.minutes} phút tập trung`;
    }
  });
}

// Per-day focus totals, kept for 120 days: { 'YYYY-MM-DD': { sessions, minutes } }
const FOCUS_HISTORY_DAYS = 120;
function recordFocusHistory(date, stats) {
  chrome.storage.local.get('focusHistory', ({ focusHistory }) => {
    const history = focusHistory || {};
    history[date] = { sessions: stats.sessions, minutes: stats.minutes };
    const keep = Object.keys(history).sort().slice(-FOCUS_HISTORY_DAYS);
    chrome.storage.local.set({ focusHistory: Object.fromEntries(keep.map(d => [d, history[d]])) });
  });
}

function getFocusHistory(cb) {
  chrome.storage.local.get(['focusHistory', 'focusStats'], ({ focusHistory, focusStats }) => {
    const history = { ...(focusHistory || {}) };
    // Sessions logged before history existed
    if (focusStats && focusStats.sessions && !history[focusStats.date]) {
      history[focusStats.date] = { sessions: focusStats.sessions, minutes: focusStats.minutes };
    }
    cb(history);
  });
}

// Called when a countdown reaches zero: log focus time, then queue the next mode
function onTimerComplete(finishedMode) {
  if (finishedMode !== 'pomodoro') {
    window.ZenRelax?.onBreakEnd();
    setTimerMode('pomodoro');
    return;
  }
  getFocusStats((stats) => {
    const minutes = Math.round(getModeDuration('pomodoro') / 60);
    stats.sessions += 1;
    stats.minutes += minutes;
    chrome.storage.local.set({ focusStats: stats }, renderFocusSessions);
    recordFocusHistory(stats.date, stats);
    setTimerMode(stats.sessions % FOCUS_CYCLE === 0 ? 'long' : 'short');
  });
}

// ---- Intention (shares today's journal entry with the Home view) ----
function renderFocusIntention() {
  const display = document.getElementById('focusIntentionDisplay');
  const input = document.getElementById('focusIntentionInput');
  if (!display || !input) return;
  chrome.storage.sync.get('journal', (data) => {
   chrome.storage.local.get('focusTask', ({ focusTask }) => {
    const today = getDateStr(new Date());
    const entry = (data.journal || []).find(e => e.date === today);
    const label = focusTask && focusTask.date === today ? focusTask.text : entry && entry.entry;
    if (label) {
      display.textContent = label;
      display.hidden = false;
      input.hidden = true;
    } else {
      display.hidden = true;
      input.hidden = false;
      input.value = '';
    }
   });
  });
}

(function initFocusIntention() {
  const display = document.getElementById('focusIntentionDisplay');
  const input = document.getElementById('focusIntentionInput');
  if (!display || !input) return;
  display.addEventListener('click', () => {
    input.value = display.textContent;
    display.hidden = true;
    input.hidden = false;
    input.focus();
    input.select();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      chrome.storage.local.remove('focusTask');
      saveJournalEntry(input.value);
      setTimeout(renderFocusIntention, 150);
    } else if (e.key === 'Escape') {
      renderFocusIntention();
    }
  });
  input.addEventListener('blur', () => setTimeout(renderFocusIntention, 150));
})();

// ---- Ambient sound pills: drive the existing dock player so both stay in sync ----
function syncFocusSounds() {
  const active = ambientPlayer.isPlaying() ? ambientPlayer.kind : 'off';
  document.querySelectorAll('#focusSounds [data-sound]').forEach(btn => {
    const on = btn.dataset.sound === active;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-checked', on);
    if (on) {
      const label = document.getElementById('soundPickerLabel');
      if (label) label.textContent = btn.textContent.trim();
    }
  });
}

// Focus footer popovers (sound picker, keyboard shortcuts): one open at a time,
// closed by a second click, a click outside or Esc
(function initFocusPopovers() {
  const pairs = [['soundPickerBtn', 'focusSounds'], ['kbdHelpBtn', 'focusKbdHint']]
    .map(([b, p]) => [document.getElementById(b), document.getElementById(p)])
    .filter(([b, p]) => b && p);
  const closeAll = except => pairs.forEach(([b, p]) => {
    if (p === except) return;
    p.hidden = true;
    b.setAttribute('aria-expanded', 'false');
  });
  pairs.forEach(([btn, pop]) => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = pop.hidden;
      closeAll(pop);
      pop.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
    pop.addEventListener('click', e => e.stopPropagation());
  });
  document.addEventListener('click', () => closeAll());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
  // Picking a sound closes the picker
  document.querySelectorAll('#focusSounds [data-sound]').forEach(b => b.addEventListener('click', () => setTimeout(() => closeAll(), 150)));
})();

(function initFocusSounds() {
  const selectEl = document.getElementById('ambientSoundSelect');
  document.querySelectorAll('#focusSounds [data-sound]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sound = btn.dataset.sound;
      if (sound === 'off') {
        if (ambientPlayer.isPlaying()) playBtn.click();
      } else {
        if (selectEl && selectEl.value !== sound) {
          selectEl.value = sound;
          selectEl.dispatchEvent(new Event('change'));
        }
        if (!ambientPlayer.isPlaying()) playBtn.click();
      }
      setTimeout(syncFocusSounds, 120);
    });
  });
  if (playBtn) playBtn.addEventListener('click', () => setTimeout(syncFocusSounds, 120));
  if (selectEl) selectEl.addEventListener('change', () => setTimeout(syncFocusSounds, 120));
})();

// ---- Modes, fullscreen, keyboard shortcuts ----
(function initFocusControls() {
  document.querySelectorAll('#focusModes [data-mode]').forEach(btn => {
    btn.addEventListener('click', () => setTimerMode(btn.dataset.mode));
  });

  const fsBtn = document.getElementById('focusFullscreenBtn');
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  };
  if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    document.documentElement.classList.toggle('is-fullscreen', !!document.fullscreenElement);
  });

  document.addEventListener('keydown', (e) => {
    const view = document.getElementById('view-focus');
    if (!view || !view.classList.contains('active')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target instanceof Element ? e.target : null;
    if (target && target.matches('input, textarea, select, [contenteditable]')) return;
    if ([...document.querySelectorAll('.modal-overlay')].some(m => m.style.display !== 'none')) return;
    const key = e.key.toLowerCase();
    // A focused button already handles Space natively; don't toggle twice
    if (key === ' ' && target && target.closest('button')) return;
    if (key === ' ') { e.preventDefault(); toggleTimer(); }
    else if (key === 'r') resetTimer();
    else if (key === 'f') toggleFullscreen();
    else if (key === '1') setTimerMode('pomodoro');
    else if (key === '2') setTimerMode('short');
    else if (key === '3') setTimerMode('long');
  });

  syncFocusModes();
  renderFocusSessions();
})();
