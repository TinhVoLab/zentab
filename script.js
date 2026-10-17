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
let currentUserName = 'Tinh';
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

  greetingEl.innerHTML = `${g}, <span id="userName" class="name-editable">${currentUserName}</span> 💜`;
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
      const name = input.value.trim() || 'Tinh';
      currentUserName = name;
      chrome.storage.sync.set({ userName: name });
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
    } else {
      if (jInputRow) jInputRow.style.display = '';
      if (journalTodayEntry) journalTodayEntry.style.display = 'none';
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

// ---- TỬ VI Vietnamese mappings ----
const palaceNameVi = {
  '命宫': 'Mệnh', '兄弟': 'Huynh Đệ', '夫妻': 'Phu Thê', '子女': 'Tử Nữ',
  '财帛': 'Tài Bạch', '疾厄': 'Tật Ách', '迁移': 'Thiên Di', '仆役': 'Giao Hữu',
  '官禄': 'Quan Lộc', '田宅': 'Điền Trạch', '福德': 'Phúc Đức', '父母': 'Phụ Mẫu'
};

const majorStarNameVi = {
  '紫微': 'Tử Vi', '天机': 'Thiên Cơ', '太阳': 'Thái Dương', '武曲': 'Vũ Khúc',
  '天同': 'Thiên Đồng', '廉贞': 'Liêm Trinh', '天府': 'Thiên Phủ', '太阴': 'Thái Âm',
  '贪狼': 'Tham Lang', '巨门': 'Cự Môn', '天相': 'Thiên Tướng', '天梁': 'Thiên Lương',
  '七杀': 'Thất Sát', '破军': 'Phá Quân'
};

const minorStarNameVi = {
  '左辅': 'Tả Phụ', '右弼': 'Hữu Bật', '文昌': 'Văn Xương', '文曲': 'Văn Khúc',
  '天魁': 'Thiên Khôi', '天钺': 'Thiên Việt', '禄存': 'Lộc Tồn', '擎羊': 'Kình Dương',
  '陀罗': 'Đà La', '火星': 'Hỏa Tinh', '铃星': 'Linh Tinh', '地空': 'Địa Không',
  '地劫': 'Địa Kiếp', '天马': 'Thiên Mã'
};

const chineseDiaChi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const chineseDiaChiLookup = {};
chineseDiaChi.forEach((c, i) => chineseDiaChiLookup[c] = diaChi[i]);

const songNameVi = {
  '魂': 'Hồn', '魄': 'Phách', '命主': 'Mệnh Chủ', '身主': 'Thân Chủ'
};

const brightnessVi = {
  '庙': 'miếu', '旺': 'vượng', '得': 'đắc', '利': 'lợi', '平': 'bình', '不': 'bất', '陷': 'hãm'
};

const changePalaceName = {
  '兄弟': 'huynh đệ', '夫妻': 'phu thê', '子女': 'tử nữ', '财帛': 'tài bạch',
  '疾厄': 'tật ách', '迁移': 'thiên di', '仆役': 'giao hữu', '官禄': 'quan lộc',
  '田宅': 'điền trạch', '福德': 'phúc đức', '父母': 'phụ mẫu', '命宫': 'mệnh'
};

function msgStar(s) { return majorStarNameVi[s.name] || minorStarNameVi[s.name] || s.name; }

function hourToTimeIndex(hour) {
  if (hour == null) return 2;
  if (hour === 23) return 12;
  return Math.floor((hour + 1) / 2);
}

function getZiWei(birth) {
  if (!birth || !birth.year || !birth.month || !birth.day) return null;
  try {
    const dateStr = `${birth.year}-${birth.month}-${birth.day}`;
    const idx = hourToTimeIndex(birth.hour);
    const gender = birth.gender || 'male';
    return iztro.astro.astrolabeBySolarDate(dateStr, idx, gender, true, 'zh-CN');
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
const birthMin = document.getElementById('birthMin');
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
  chrome.storage.sync.get(['birth', 'geminiKey', 'customAudioUrl', 'userName', 'avatarType', 'weatherLocation'], (syncData) => {
    chrome.storage.local.get(['customAvatar'], (localData) => {
      const b = syncData.birth || {};
      populateSelect(birthDay, 1, 31, b.day || 1);
      populateSelect(birthMonth, 1, 12, b.month || 1);
      populateSelect(birthYear, 1900, 2030, b.year || 2000);
      populateSelect(birthHour, 0, 23, b.hour != null ? b.hour : '', { placeholder: '--' });
      populateSelect(birthMin, 0, 59, b.min != null ? b.min : 0);
      birthGender.value = b.gender || 'male';
      document.getElementById('geminiKey').value = syncData.geminiKey || '';
      document.getElementById('customAudioUrl').value = syncData.customAudioUrl || '';
      document.getElementById('settingsUserName').value = syncData.userName || currentUserName;
      document.getElementById('settingsWeatherLocation').value = syncData.weatherLocation || '';
      
      const avType = syncData.avatarType || 'lotus';
      selectedAvatarType = avType;
      tempCustomAvatarData = localData.customAvatar || null;
      updateAvatarSelectionUI(avType, localData.customAvatar);
      
      settingsModal.style.display = '';
    });
  });
});

function closeSettings() {
  settingsModal.style.display = 'none';
}

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettings();
});

document.getElementById('saveBirthBtn').addEventListener('click', () => {
  const hourVal = birthHour.value;
  const birth = {
    day: parseInt(birthDay.value),
    month: parseInt(birthMonth.value),
    year: parseInt(birthYear.value),
    hour: hourVal !== '' ? parseInt(hourVal) : null,
    min: birthMin.value ? parseInt(birthMin.value) : null,
    gender: birthGender.value
  };
  const geminiKey = document.getElementById('geminiKey').value.trim();
  let customAudioUrl = document.getElementById('customAudioUrl').value.trim();
  const userNameVal = document.getElementById('settingsUserName').value.trim() || 'Tinh';
  const avatarTypeVal = selectedAvatarType;
  const weatherLocVal = document.getElementById('settingsWeatherLocation').value.trim();
  
  // Auto-convert Suno share links to direct CDN links
  if (customAudioUrl.includes('suno.com/song/')) {
    const parts = customAudioUrl.split('/song/');
    if (parts[1]) {
      const uuid = parts[1].split('?')[0].split('/')[0].trim();
      if (uuid) {
        customAudioUrl = `https://cdn1.suno.ai/${uuid}.mp3`;
      }
    }
  }
  
  chrome.storage.sync.set({ birth, geminiKey, customAudioUrl, userName: userNameVal, avatarType: avatarTypeVal, weatherLocation: weatherLocVal }, () => {
    currentUserName = userNameVal;
    updateGreeting();
    updateCustomAudioOption(customAudioUrl);
    
    if (avatarTypeVal === 'custom' && tempCustomAvatarData) {
      chrome.storage.local.set({ customAvatar: tempCustomAvatarData }, () => {
        syncAvatarDisplay(avatarTypeVal, tempCustomAvatarData);
      });
    } else {
      chrome.storage.local.get(['customAvatar'], (localData) => {
        syncAvatarDisplay(avatarTypeVal, localData.customAvatar);
      });
    }
    
    renderAll(true);
    if (typeof initWeather === 'function') {
      initWeather(true);
    }
    closeSettings();
  });
});

document.getElementById('clearBirthBtn').addEventListener('click', () => {
  chrome.storage.sync.remove(['birth', 'dailyInsightCache'], () => {
    renderAll(true);
    closeSettings();
  });
});

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
      const model = 'gemini-2.5-flash';
      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respond only with OK" }] }]
        })
      });

      if (res.ok) {
        apiKeyTestStatus.style.color = '#10b981';
        apiKeyTestStatus.textContent = '✓ Kết nối thành công! API hoạt động tốt.';
      } else {
        const data = await res.json();
        const errMessage = data?.error?.message || `HTTP ${res.status}`;
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
  if (!birth || !birth.day || !birth.month || !birth.year) {
    zodiacInfo.innerHTML = '';
    tuviInfo.innerHTML = '';
    document.getElementById('astroDivider').style.display = 'none';
    document.getElementById('tvDivider').style.display = 'none';
    return;
  }
  document.getElementById('astroDivider').style.display = '';

  const western = getWesternZodiac(birth.month, birth.day);
  const viet = vietnameseZodiac[chiOfYear(birth.year)];
  const canIdx = canOfYear(birth.year);
  const chiIdx = chiOfYear(birth.year);
  const nhIdx = nguHanhOfCan(canIdx);

  const birthDate = new Date(birth.year, birth.month - 1, birth.day);
  const dayCC = getDayCanChi(birthDate);

  let html = `<div class="row">${western.symbol} <span class="accent">${western.nameVi}</span> · ${viet.emoji} Tuổi <span class="accent">${viet.animal}</span> · <span class="nh-pill nh-${nhIdx}">${nguHanhEmoji[nhIdx]} ${nguHanh[nhIdx]}</span></div>`;

  // TỨ TRỤ from iztro if available
  const ziwei = getZiWei(birth);
  if (ziwei && ziwei.chineseDate) {
    const pillars = ziwei.chineseDate.split(' ');
    const pillarLabels = ['Niên', 'Nguyệt', 'Nhật', 'Giờ'];
    html += `<div class="label">BÁT TỰ</div>`;
    let truLine = '';
    pillars.forEach((p, i) => {
      if (i > 0) truLine += ` <span class="row-sep">│</span>`;
      truLine += `${pillarLabels[i]}: <span class="hl">${p}</span>`;
    });
    html += `<div class="row">${truLine}</div>`;
  } else {
    // Fallback to manual calculation
    const canChiStr = `${thienCan[canIdx]} ${diaChi[chiIdx]}`;
    const dayTru = `${thienCan[dayCC.can]} ${diaChi[dayCC.chi]}`;
    html += `<div class="label">TỨ TRỤ</div>`;
    let truLine = `Niên: <span class="hl">${canChiStr}</span> <span class="row-sep">│</span> Nhật: <span class="hl">${dayTru}</span>`;

    if (birth.hour != null) {
      const hc = chiOfHour(birth.hour);
      const hourStem = ((dayCC.can % 5) * 2 + hc.chi) % 10;
      truLine += ` <span class="row-sep">│</span> Giờ: <span class="hl">${thienCan[hourStem]} ${diaChi[hc.chi]}</span> <span class="sml">${hc.label}</span>`;
    }
    html += `<div class="row">${truLine}</div>`;
  }

  // TỬ VI summary
  if (ziwei) {
    html += `<div class="label">TỬ VI</div>`;
    const soulBranch = chineseDiaChiLookup[ziwei.earthlyBranchOfSoulPalace] || ziwei.earthlyBranchOfSoulPalace;
    html += `<div class="row">${ziwei.fiveElementsClass || ''} · Mệnh: <span class="hl">${soulBranch}</span>`;
    if (ziwei.soul) html += ` · ${songNameVi['命主']||'Mệnh'}: <span class="hl">${majorStarNameVi[ziwei.soul] || ziwei.soul}</span>`;
    if (ziwei.body) html += ` · ${songNameVi['身主']||'Thân'}: <span class="hl">${majorStarNameVi[ziwei.body] || ziwei.body}</span>`;
    html += `</div>`;
  }

  zodiacInfo.innerHTML = html;
  renderTuVi(birth, ziwei);
}

function renderTuVi(birth, ziwei) {
  const container = document.getElementById('tuviInfo');
  const divider = document.getElementById('tvDivider');
  if (!ziwei || !ziwei.palaces) {
    container.innerHTML = '';
    divider.style.display = 'none';
    return;
  }
  divider.style.display = '';
  let html = `<div class="tuvi-grid">`;
  const keyPalaces = ['命宫', '财帛', '官禄', '夫妻', '迁移', '福德'];
  const rendered = new Set();
  ziwei.palaces.forEach(p => {
    const match = keyPalaces.find(k => p.name.includes(k));
    if (!match || rendered.has(match)) return;
    rendered.add(match);
    const viName = palaceNameVi[p.name] || p.name;
    const stars = [...(p.majorStars || [])].map(s => {
      const vi = majorStarNameVi[s.name] || s.name;
      const b = s.brightness ? brightnessVi[s.brightness] || s.brightness : '';
      return b ? `${vi} (${b})` : vi;
    });
    const starsStr = stars.length ? stars.join(', ') : '—';
    html += `<div class="tv-cell"><span class="tv-name">${viName}</span> <span class="tv-stars">${starsStr}</span></div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

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
    if (birth && birth.year) {
      const userNh = nguHanhOfCan(canOfYear(birth.year));
      nhPill.textContent = `Mệnh ${nguHanh[userNh]}`;
      nhPill.className = `nh-pill nh-${userNh}`;
    } else {
      const todayNh = nguHanhOfCan(dc.can);
      nhPill.textContent = `Ngày hành ${nguHanh[todayNh]}`;
      nhPill.className = `nh-pill nh-${todayNh}`;
    }
  }

  function buildDisplay(aiText, status) {
    const todayInsight = document.getElementById('todayInsight');
    if (!todayInsight) return;

    if (aiText) {
      todayInsight.textContent = aiText;
    } else if (status === 'nokey') {
      todayInsight.innerHTML = `<span style="font-size:11px;opacity:0.6">⚙️ Nhập Gemini API key trong Cài đặt để nhận lời khuyên Tử Vi cá nhân hóa.</span>`;
    } else if (status === 'error') {
      todayInsight.innerHTML = `<span style="font-size:11px;opacity:0.6">⚠️ Lỗi kết nối. Vui lòng kiểm tra lại cấu hình.</span>`;
    } else {
      todayInsight.innerHTML = `<span style="font-size:11px;opacity:0.6">💫 Đang giải mã tinh tú...</span>`;
    }
  }

  if (!birth) {
    buildDisplay('');
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
  chrome.storage.sync.get(['birth', 'geminiKey', 'dailyInsightCache'], (data) => {
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
}

renderAll();

// ---- Gemini Daily Personalized Insight ----
function buildBirthContext(birth) {
  const western = getWesternZodiac(birth.month, birth.day);
  const viet = vietnameseZodiac[chiOfYear(birth.year)];
  const nhIdx = nguHanhOfCan(canOfYear(birth.year));
  const ziwei = getZiWei(birth);
  const now = new Date();
  const dc = getDayCanChi(now);
  const todayCanChi = `${thienCan[dc.can]} ${diaChi[dc.chi]}`;

  let context = `THÔNG TIN NGƯỜI DÙNG:
- Sinh: ${birth.day}/${birth.month}/${birth.year} (${birth.gender === 'female' ? 'Nữ' : 'Nam'})
- Con giáp: ${viet.animal} | Cung hoàng đạo: ${western.nameVi} | Ngũ hành: ${nguHanh[nhIdx]}
- Mệnh: ${ziwei ? (chineseDiaChiLookup[ziwei.earthlyBranchOfSoulPalace] || ziwei.earthlyBranchOfSoulPalace) : '—'}
- Thân: ${ziwei ? (chineseDiaChiLookup[ziwei.earthlyBranchOfBodyPalace] || ziwei.earthlyBranchOfBodyPalace) : '—'}
- Cục: ${ziwei ? ziwei.fiveElementsClass : '—'}`;

  if (ziwei && ziwei.chineseDate) {
    context += `\n- Bát Tự: ${ziwei.chineseDate}`;
  }

  if (ziwei && ziwei.palaces) {
    const keyPalaces = ['命宫', '财帛', '官禄', '夫妻', '迁移', '福德'];
    context += `\n\nTỬ VI:`;
    ziwei.palaces.forEach(p => {
      if (keyPalaces.includes(p.name)) {
        const viName = palaceNameVi[p.name] || p.name;
        const stars = (p.majorStars || []).map(s => majorStarNameVi[s.name] || s.name).join(', ');
        context += `\n- ${viName}: ${stars || 'không có chính tinh'}`;
      }
    });
  }

  context += `\n\nHÔM NAY: ${now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${todayCanChi})`;

  return context;
}

function loadDailyPersonalizedInsight(birth, apiKey, forceRefresh) {
  const today = getDateStr(new Date());
  chrome.storage.sync.get('dailyInsightCache', (data) => {
    const cache = data.dailyInsightCache;
    if (cache && cache.date === today && cache.insight?.v === 4 && !forceRefresh) {
      displayDailyInsight(cache.insight);
      return;
    }
    chrome.storage.sync.remove('dailyInsightCache');

    const ziwei = getZiWei(birth);
    let tuviStr = '';
    if (ziwei && ziwei.palaces) {
      const kp = ['命宫', '财帛', '官禄', '夫妻', '迁移', '福德'];
      tuviStr = ziwei.palaces.filter(p => kp.includes(p.name)).map(p =>
        (palaceNameVi[p.name] || p.name) + ': ' + (p.majorStars || []).map(s => majorStarNameVi[s.name] || s.name).join(',')
      ).join(' | ');
    }

    const dc = getDayCanChi(new Date());
    const todayStr = `Hôm nay (${thienCan[dc.can]} ${diaChi[dc.chi]})`;

    // English prompt works best with Gemini models, instructing Vietnamese output
    const prompt = `You are a Vietnamese Tử Vi (Zi Wei Dou Shu) and Bát Tự (Ba Zi) master. Give the user ONE actionable piece of advice for today in Vietnamese. 1-2 sentences only. No greeting, no intro, no "chào bạn".

USER INFO:
- Born: ${birth.day}/${birth.month}/${birth.year} (${birth.gender === 'female' ? 'Nữ' : 'Nam'})
- Chinese zodiac: ${vietnameseZodiac[chiOfYear(birth.year)].animal}
- Western zodiac: ${getWesternZodiac(birth.month, birth.day).nameVi}
- Ba Zi (Four Pillers): ${ziwei ? ziwei.chineseDate : '—'}
- Ming Palace: ${ziwei ? (chineseDiaChiLookup[ziwei.earthlyBranchOfSoulPalace] || '—') : '—'}
${tuviStr ? '- Key palaces: ' + tuviStr : ''}
- ${todayStr}

Focus on one area: work, money, love, or health. Be specific to this person's chart.

EXAMPLES (do NOT copy, use as style reference):
❌ "Chào bạn, hôm nay là ngày tốt." (too generic)
✅ "Hôm nay Liêm Trinh tại Tài Bạch, tài vận có biến động, chỉ nên thu chi hợp lý, tránh đầu tư mạo hiểm."
✅ "Tử Vi thủ Mệnh gặp ngày Nhâm, quý nhân xuất hiện, hãy chủ động kết nối với đồng nghiệp cũ."
✅ "Thái Âm tại Phúc Đức, tâm trạng an yên, dành thời gian cho gia đình và thiền định."

ADVICE:`;

    const delays = [5000, 15000, 30000];
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];

    (async () => {
      let result = null;
      for (const model of models) {
        for (let i = 0; i < 3; i++) {
          try {
            console.log(`ZenTab: calling ${model} (attempt ${i+1})`);
            const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
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
        const insight = { text: clean, date: today, v: 4 };
        chrome.storage.sync.set({ dailyInsightCache: { date: today, insight } });
        displayDailyInsight(insight);
      } else {
        handleGeminiFail(birth);
      }
    })();
  });
}

function handleGeminiFail(birth) {
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  const txtEl = document.getElementById('quoteText');
  const authEl = document.getElementById('quoteAuthor');
  if (txtEl) txtEl.textContent = `"${q.text}"`;
  if (authEl) authEl.textContent = q.author;
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

function fallbackDailyInsight() {
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  const txtEl = document.getElementById('quoteText');
  const authEl = document.getElementById('quoteAuthor');
  if (txtEl) txtEl.textContent = `"${q.text}"`;
  if (authEl) authEl.textContent = q.author;
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
const timerChime = new Audio('https://cdn.pixabay.com/download/audio/2022/02/22/audio_d0a13f69d2.mp3?filename=tibetan-singing-bowl-1-43575.mp3');
timerChime.preload = 'none'; // fetch only when it first plays

const timerDisplay = document.querySelector('.timer-display');
const timerStart = document.getElementById('timerStart');
const timerReset = document.getElementById('timerReset');
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
    
    updateTimerDisplay();
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
  
  const appLayout = document.querySelector('.app-layout');
  if (appLayout) {
    if (isPlaying && timerMode === 'pomodoro' && document.getElementById('view-focus').classList.contains('active')) {
      appLayout.style.background = 'rgba(0,0,0,0.6)';
    } else {
      appLayout.style.background = '';
    }
  }
}

function toggleTimer() {
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
        
        if (typeof chrome !== 'undefined' && chrome.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: timerMode === 'pomodoro' ? 'Hoàn thành!' : 'Hết giờ nghỉ!',
            message: timerMode === 'pomodoro' ? 'Tuyệt vời! Bạn đã hoàn thành phiên tập trung. Hãy nghỉ ngơi một chút nhé.' : 'Thời gian nghỉ đã hết! Cùng quay lại làm việc nào.',
            priority: 2
          });
        }
        
        timeLeft = getModeDuration(timerMode);
        updateTimerDisplay();
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

const timerExpandBtn = document.querySelector('.timer-expand-btn');
if (timerExpandBtn) {
  timerExpandBtn.addEventListener('click', () => {
    // Nếu Pomodoro đang mở trong bảng bên phải, tự động đóng bảng đó lại
    const closeRightDrawerBtn = document.getElementById('closeRightDrawerBtn');
    if (closeRightDrawerBtn) closeRightDrawerBtn.click();
    
    // Chuyển toàn bộ màn hình sang tab Focus
    if (typeof switchTab === 'function') switchTab('focus');
  });
}

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

function displayQuoteAt(index) {
  if (!quotes || quotes.length === 0) return;
  const q = quotes[index];
  const textEl = document.getElementById('quoteText');
  const authEl = document.getElementById('quoteAuthor');
  if (textEl) {
    textEl.textContent = `"${q.text}"`;
    textEl.classList.remove('expanded');
  }
  if (authEl) authEl.textContent = q.author;
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

if (playBtn) {
  playBtn.addEventListener('click', () => {
    if (!relaxingAudio) return;
    const playIcon = document.getElementById('playIcon');
    if (relaxingAudio.paused) {
      relaxingAudio.play().then(() => {
        if (playIcon) {
          playIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          `;
        }
      }).catch(e => console.warn("Audio play blocked", e));
    } else {
      relaxingAudio.pause();
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
    targetView.style.display = (tab === 'focus' || tab === 'ai') ? 'flex' : 'block';
    // Reflow trigger
    void targetView.offsetWidth;
    targetView.classList.add('active');
  }
  
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
  }
}

// Focus View Specific Initializer
function initFocusView() {
  // Update focus intention
  const focusIntentionDisplay = document.getElementById('focusIntentionDisplay');
  if (focusIntentionDisplay) {
    chrome.storage.sync.get('journalEntry', (data) => {
      if (data.journalEntry) {
        focusIntentionDisplay.textContent = `Tiêu điểm: "${data.journalEntry}"`;
      } else {
        focusIntentionDisplay.textContent = 'Hôm nay hãy tập trung hoàn thành mục tiêu của bạn. 💜';
      }
    });
  }
  
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
    const modalZodiac = document.getElementById('modalZodiacInfo');
    const modalTuvi = document.getElementById('modalTuviInfo');
    const zodiacSource = document.getElementById('zodiacInfo');
    const tuviSource = document.getElementById('tuviInfo');
    
    if (modalZodiac && zodiacSource) {
      if (zodiacSource.innerHTML.trim() === "") {
        modalZodiac.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);font-size:13px;">Vui lòng thiết lập ngày sinh trong Cài đặt để hiển thị thông tin Bát Tự & Tử Vi chi tiết.</div>';
      } else {
        modalZodiac.innerHTML = zodiacSource.innerHTML;
      }
    }
    
    if (modalTuvi && tuviSource) {
      modalTuvi.innerHTML = tuviSource.innerHTML;
    }
    
    astroDetailsModal.style.display = 'flex';
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
    
    notesArea.addEventListener('input', () => {
      chrome.storage.sync.set({ quickNotes: notesArea.value });
    });
    
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
      chrome.storage.sync.get('quickIdeas', (data) => {
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
          chrome.storage.sync.set({ quickIdeas: upgradedIdeas });
        }
        
        const listEl = document.getElementById('ideaList');
        if (!listEl) return;
        
        if (upgradedIdeas.length === 0) {
          listEl.innerHTML = '<div class="task-empty">Chưa có ý tưởng nào.</div>';
          return;
        }
        
        listEl.innerHTML = upgradedIdeas.map((idea, i) => `
          <div class="tool-item" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;" data-idx="${i}">
            <div class="tool-item-left" style="flex:1;overflow:hidden;">
              <span class="tool-item-text" style="color:var(--accent);font-weight:400;">💡 ${escapeHtml(idea.text)}</span>
            </div>
            <button class="tool-del-btn" data-idx="${i}" style="pointer-events:auto;">✕</button>
          </div>
        `).join('');
        
        // Click to open Mindmap
        listEl.querySelectorAll('.tool-item').forEach(item => {
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
            chrome.storage.sync.set({ quickIdeas: upgradedIdeas }, renderIdeas);
          };
        });
      });
    }
    
    function addIdea() {
      const text = ideaInput.value.trim();
      if (!text) return;
      chrome.storage.sync.get('quickIdeas', (data) => {
        const ideas = data.quickIdeas || [];
        const newIdea = {
          id: 'idea-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          text: text,
          nodes: [
            { id: 'root', text: text, x: 450, y: 220, parentId: null }
          ]
        };
        ideas.push(newIdea);
        chrome.storage.sync.set({ quickIdeas: ideas }, () => {
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
        let habits = data.habits || [
          { text: 'Thiền định (10 phút)', done: false, date: todayStr },
          { text: 'Uống đủ nước', done: false, date: todayStr },
          { text: 'Đọc sách (30 phút)', done: false, date: todayStr }
        ];
        
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
    
  } else if (tool === 'charts') {
    quickToolTitle.textContent = 'Biểu đồ';
    quickToolBody.innerHTML = `
      <div class="charts-container">
        <!-- Task Completion Chart -->
        <div class="chart-section">
          <div class="chart-visual">
            <svg class="chart-svg" viewBox="0 0 50 50">
              <circle class="chart-track" cx="25" cy="25" r="22" />
              <circle class="chart-fill" id="taskChartRing" cx="25" cy="25" r="22" />
            </svg>
            <div class="chart-value" id="taskChartVal">0%</div>
          </div>
          <div class="chart-info">
            <span class="chart-title">Năng suất công việc</span>
            <span class="chart-desc" id="taskChartDesc">Đang tải dữ liệu...</span>
          </div>
        </div>
        
        <!-- Habit Completion Chart -->
        <div class="chart-section">
          <div class="chart-info" style="gap:2px">
            <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
              <span class="chart-title">Thói quen hôm nay</span>
              <span class="chart-value" style="position:static;transform:none" id="habitChartVal">0%</span>
            </div>
            <span class="chart-desc" id="habitChartDesc" style="margin-bottom:4px">Đang tải thói quen...</span>
            <div class="habit-bar-visual">
              <div class="habit-bar-fill" id="habitChartBarFill"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    chrome.storage.sync.get(['tasks', 'habits'], (data) => {
      const currentTasks = data.tasks || [];
      const totalTasks = currentTasks.length;
      const doneTasks = currentTasks.filter(t => t.done).length;
      const taskPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      
      const taskRing = document.getElementById('taskChartRing');
      const taskVal = document.getElementById('taskChartVal');
      const taskDesc = document.getElementById('taskChartDesc');
      
      if (taskRing) {
        const circumference = 138.2;
        const offset = circumference * (1 - (taskPercent / 100));
        taskRing.style.strokeDashoffset = offset;
      }
      if (taskVal) taskVal.textContent = `${taskPercent}%`;
      if (taskDesc) {
        taskDesc.textContent = totalTasks > 0 
          ? `Đã hoàn thành ${doneTasks}/${totalTasks} nhiệm vụ của hôm nay.` 
          : 'Không có nhiệm vụ nào được đặt ra hôm nay.';
      }
      
      const todayStr = getDateStr(new Date());
      let currentHabits = data.habits || [
        { text: 'Thiền định (10 phút)', done: false, date: todayStr },
        { text: 'Uống đủ nước', done: false, date: todayStr },
        { text: 'Đọc sách (30 phút)', done: false, date: todayStr }
      ];
      
      const totalHabits = currentHabits.length;
      const doneHabits = currentHabits.filter(h => h.done).length;
      const habitPercent = totalHabits > 0 ? Math.round((doneHabits / totalHabits) * 100) : 0;
      
      const habitVal = document.getElementById('habitChartVal');
      const habitDesc = document.getElementById('habitChartDesc');
      const habitBarFill = document.getElementById('habitChartBarFill');
      
      if (habitVal) habitVal.textContent = `${habitPercent}%`;
      if (habitDesc) {
        habitDesc.textContent = totalHabits > 0
          ? `Đã tích lũy ${doneHabits}/${totalHabits} thói quen tốt hôm nay.`
          : 'Không có danh sách thói quen nào.';
      }
      if (habitBarFill) {
        habitBarFill.style.width = `${habitPercent}%`;
      }
    });
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
  const progressInput = document.getElementById('kanbanProgressInput');
  const completedInput = document.getElementById('kanbanCompletedInput');
  
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
  setupInput(progressInput, 'progress');
  setupInput(completedInput, 'completed');
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
    } else {
      html += `<div class="context-section">
        <div class="context-section-title">Bản Mệnh Chiêm Tinh</div>
        <div style="color:var(--text-muted);font-style:italic;font-size:11px">Vui lòng thiết lập ngày sinh trong Cài đặt để hiển thị Tử Vi.</div>
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
  
  const chipsData = [
    { text: 'Hãy phân tích ngày hôm nay cát hung thế nào, tôi nên làm việc gì lành và kỵ việc gì theo lá số bản mệnh của tôi?', label: '🔮 Xem Cát Hung Ngày Nay' },
    { text: 'Hôm nay sao chủ mệnh và ngũ hành của tôi tác động thế nào đến tâm trạng và năng suất làm việc của tôi?', label: '⚔️ Năng Lượng Bản Mệnh' },
    { text: 'Gợi ý cho tôi một bài thực hành tĩnh tâm hoặc thiền định ngắn phù hợp với ngày hôm nay.', label: '🧘 Tĩnh Tâm Cân Bằng' }
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
}

function loadAiChatHistory() {
  const thread = document.getElementById('chatMessagesThread');
  if (!thread) return;
  
  chrome.storage.local.get('aiChatHistory', (data) => {
    const history = data.aiChatHistory || [];
    if (history.length === 0) {
      thread.innerHTML = `
        <div class="chat-bubble ai">
          Xin chào! Tôi là **Đại Sư Tử Vi Đông Phương** của bạn. Tôi đã đọc qua lá số Tử Vi, Bát Tự cũng như danh sách nhiệm vụ của bạn hôm nay. Hãy hỏi tôi bất cứ điều gì bạn cần tư vấn để làm việc hanh thông cát lành và cân bằng cuộc sống nhé!
        </div>
      `;
      // Render formatting on greeting
      thread.querySelector('.chat-bubble.ai').innerHTML = parseMarkdownToHtml(thread.querySelector('.chat-bubble.ai').innerText);
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
  loadingBubble.innerHTML = `Đang chiêm nghiệm tinh tú... <div class="dot-typing"><span></span><span></span><span></span></div>`;
  thread.appendChild(loadingBubble);
  thread.scrollTop = thread.scrollHeight;
  
  saveChatBubble('user', text);
  
  chrome.storage.sync.get('geminiKey', async (data) => {
    const apiKey = data.geminiKey;
    const loadingEl = document.getElementById(loadingId);
    
    if (!apiKey) {
      if (loadingEl) {
        loadingEl.className = 'chat-bubble ai';
        loadingEl.innerHTML = parseMarkdownToHtml('Vui lòng điền **Gemini API Key** trong phần Cài đặt để bắt đầu trò chuyện với Đại Sư Tử Vi. 💜');
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
      
      const model = 'gemini-2.5-flash';
      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      });
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
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
  const zodiacSource = document.getElementById('zodiacInfo')?.innerText || 'Chưa có thông tin';
  const astroDateTitle = document.getElementById('astroDateTitle')?.textContent || 'Bính Tý';
  const nhPill = document.getElementById('nhPill')?.textContent || 'Mộc';
  const tuviInfoText = document.getElementById('tuviInfo')?.innerText || 'Chưa có thông tin';
  
  const taskSummary = tasks.map((t, idx) => `- [${t.done ? 'x' : ' '}] ${t.text} (${t.category || 'Chung'})`).join('\n');
  
  return `Bạn là một Đại Sư Tử Vi Đông Phương hiền triết, có kiến thức thâm sâu về Tử Vi Đẩu Số, Bát Tự, và Phong Thủy. 
Thông tin ngày hôm nay: ngày Can Chi là ${astroDateTitle} (Ngũ hành ngày: ${nhPill}).
Thông tin bản mệnh Tử Vi của gia chủ:
- Con giáp & Tây Phương: ${zodiacSource}
- Lá số Tử Vi & Mệnh Cục: ${tuviInfoText}

Danh sách công việc cần làm hôm nay của gia chủ:
${taskSummary || 'Chưa có công việc nào.'}

Hãy phân tích cát hung ngày hôm nay, sự hợp kỵ giữa ngày hiện tại với bản mệnh của gia chủ. Hãy tư vấn bằng giọng văn thông thái, hiền triết, thấu cảm, đậm chất chiêm tinh cổ truyền nhưng vẫn thiết thực để gia chủ lập kế hoạch công việc tối ưu, vượt qua trì hoãn, chọn giờ hoàng đạo tốt và duy trì tĩnh tâm.
Xưng hô là "Ta" hoặc "AI Mentor" và gọi người dùng là "Gia chủ" hoặc "Bạn".
Trả lời bằng tiếng Việt, ngắn gọn dưới 300 từ, định dạng có phân dòng/đoạn rõ ràng.`;
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
  const totalTasksEl = document.getElementById('statsTotalTasks');
  const completedTasksEl = document.getElementById('statsCompletedTasks');
  const pendingTasksEl = document.getElementById('statsPendingTasks');
  const taskPercentEl = document.getElementById('statsTaskPercent');
  const taskRingEl = document.getElementById('statsTaskRing');
  
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.done).length;
  const pendingCount = totalCount - completedCount;
  const taskPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  if (totalTasksEl) totalTasksEl.textContent = totalCount;
  if (completedTasksEl) completedTasksEl.textContent = completedCount;
  if (pendingTasksEl) pendingTasksEl.textContent = pendingCount;
  if (taskPercentEl) taskPercentEl.textContent = `${taskPercent}%`;
  
  if (taskRingEl) {
    const circumference = 138.2;
    const offset = circumference * (1 - (taskPercent / 100));
    taskRingEl.style.strokeDashoffset = offset;
  }
  
  // Render Habits Analytics list
  const habitsListEl = document.getElementById('statsHabitsList');
  const todayStr = getDateStr(new Date());
  
  chrome.storage.sync.get('habits', (data) => {
    let currentHabits = data.habits || [
      { text: 'Thiền định (10 phút)', done: false, date: todayStr },
      { text: 'Uống đủ nước', done: false, date: todayStr },
      { text: 'Đọc sách (30 phút)', done: false, date: todayStr }
    ];
    
    if (habitsListEl) {
      if (currentHabits.length === 0) {
        habitsListEl.innerHTML = '<div style="color:var(--text-muted);font-style:italic;font-size:12px;padding:20px 0;">Chưa thiết lập thói quen.</div>';
      } else {
        habitsListEl.innerHTML = currentHabits.map(h => `
          <div class="habits-analytics-item">
            <div style="display:flex;justify-content:space-between;font-size:12px">
              <span style="color:var(--text-dim);font-weight:300">${escapeHtml(h.text)}</span>
              <span style="color:${h.done ? '#34d399' : 'var(--text-muted)'};font-weight:500">${h.done ? 'Đã hoàn thành' : 'Chưa làm'}</span>
            </div>
            <div class="habit-bar-visual" style="margin-top:2px">
              <div class="habit-bar-fill" style="width:${h.done ? '100%' : '0%'};background:${h.done ? 'linear-gradient(90deg, #a78bfa 0%, #ec4899 100%)' : 'rgba(255,255,255,0.06)'}"></div>
            </div>
          </div>
        `).join('');
      }
    }
    
    // Update stats metrics highlights
    const statsTasksDoneCount = document.getElementById('statsTasksDoneCount');
    const statsActiveHabitsCount = document.getElementById('statsActiveHabitsCount');
    if (statsTasksDoneCount) statsTasksDoneCount.textContent = completedCount;
    if (statsActiveHabitsCount) statsActiveHabitsCount.textContent = currentHabits.filter(h => h.done).length;
  });
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
        const relaxingAudio = document.getElementById('relaxingAudio');
        if (relaxingAudio) {
          const wasPlaying = !relaxingAudio.paused;
          relaxingAudio.src = 'https://cdn.jsdelivr.net/gh/karthiknvd/noctune/sounds/forest.mp3';
          if (wasPlaying) relaxingAudio.play().catch(e => console.warn(e));
        }
      }
    }
  }
}

function initAmbientSoundSelector() {
  const selectEl = document.getElementById('ambientSoundSelect');
  const relaxingAudio = document.getElementById('relaxingAudio');
  
  if (!selectEl || !relaxingAudio) return;
  
  const ambientSources = {
    forest: 'https://cdn.jsdelivr.net/gh/karthiknvd/noctune/sounds/forest.mp3',
    rain: 'https://cdn.jsdelivr.net/gh/karthiknvd/noctune/sounds/rain.mp3',
    ocean: 'https://cdn.jsdelivr.net/gh/karthiknvd/noctune/sounds/river.mp3',
    lofi: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    zen: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  };
  
  // Set initial custom option on load
  chrome.storage.sync.get('customAudioUrl', (data) => {
    updateCustomAudioOption(data.customAudioUrl);
  });
  
  selectEl.addEventListener('change', () => {
    const val = selectEl.value;
    const wasPlaying = !relaxingAudio.paused;
    
    if (val === 'custom') {
      chrome.storage.sync.get('customAudioUrl', (data) => {
        const customUrl = data.customAudioUrl;
        if (customUrl && customUrl.trim() !== '') {
          relaxingAudio.src = customUrl;
          if (wasPlaying) relaxingAudio.play().catch(e => console.warn(e));
        } else {
          alert('Vui lòng cấu hình URL nhạc nền cá nhân trong phần Cài đặt trước.');
          selectEl.value = 'forest';
        }
      });
    } else {
      const src = ambientSources[val];
      if (src) {
        relaxingAudio.src = src;
        if (wasPlaying) relaxingAudio.play().catch(e => console.warn(e));
      }
    }
  });
}

initAmbientSoundSelector();

// ---------------- VIEW 3 ADD-ON: MINDMAP CANVAS CONTROLLER ----------------

// Reusable Gemini helper for Mindmap (reuses the key stored in Settings)
function callMindmapGemini(prompt, temperature) {
  return new Promise((resolve) => {
    chrome.storage.sync.get('geminiKey', async (data) => {
      const apiKey = data.geminiKey;
      if (!apiKey) { resolve({ error: 'no-key' }); return; }
      const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
      const delays = [5000, 15000, 30000];
      let result = null;
      let errorMsg = null;
      for (const model of models) {
        for (let i = 0; i < 3; i++) {
          try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: temperature || 0.7, maxOutputTokens: 4096 }
              })
            });
            const body = await res.text();
            if (res.status === 429 || res.status === 503) {
              if (i < 2) await new Promise(r => setTimeout(r, delays[i]));
              continue;
            }
            if (!res.ok) { errorMsg = `${res.status}: ${body.slice(0, 200)}`; break; }
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
  
  chrome.storage.sync.get('quickIdeas', (data) => {
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
  chrome.storage.sync.get('quickIdeas', (data) => {
    const ideas = data.quickIdeas || [];
    if (ideas[activeIdeaIndex]) {
      ideas[activeIdeaIndex].text = newText;
      chrome.storage.sync.set({ quickIdeas: ideas });
      
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
  chrome.storage.sync.get('quickIdeas', (data) => {
    const ideas = data.quickIdeas || [];
    if (ideas[activeIdeaIndex]) {
      ideas[activeIdeaIndex].nodes = mindmapNodesList;
      chrome.storage.sync.set({ quickIdeas: ideas });
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
  const res = await callMindmapGemini(prompt, 0.8);
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
  const res = await callMindmapGemini(prompt, 0.6);
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

  // Load saved state on start
  chrome.storage.local.get(['zenActive', 'leftDrawerActive', 'rightDrawerActive', 'tasksDrawerActive'], (data) => {
    if (data.zenActive) {
      appLayout.classList.add('zen-active');
      toggleZenBtn.classList.add('active');
    } else {
      if (data.leftDrawerActive) {
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
      appLayout.classList.remove('zen-active');
      toggleZenBtn.classList.remove('active');
      chrome.storage.local.set({ zenActive: false });
    }

    const isActive = drawer.classList.toggle('active');
    button.classList.toggle('active', isActive);

    // Right and tasks drawers occupy the same edge: opening one closes the other
    if (isActive && (drawer === rightDrawer || drawer === tasksDrawer)) {
      const other = drawer === rightDrawer ? tasksDrawer : rightDrawer;
      const otherBtn = drawer === rightDrawer ? toggleTasksBtn : toggleRightBtn;
      if (other.classList.contains('active')) {
        other.classList.remove('active');
        otherBtn.classList.remove('active');
        if (other === rightDrawer) {
          const qp = document.getElementById('quickToolPanel');
          if (qp) qp.style.display = 'none';
        }
        chrome.storage.local.set({ [other === rightDrawer ? 'rightDrawerActive' : 'tasksDrawerActive']: false });
      }
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
        // Auto Geolocation
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            fetchWeatherFromApi(pos.coords.latitude, pos.coords.longitude, 'Vị trí của bạn', '');
          },
          () => {
            // Fallback to IP Geolocation
            fetchIpLocation();
          },
          { timeout: 4000 }
        );
      }
    });
  });
}

function fetchIpLocation() {
  fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(data => {
      if (data.latitude && data.longitude) {
        fetchWeatherFromApi(data.latitude, data.longitude, data.city || 'Vị trí của bạn', '');
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
  const tempDisplay = document.getElementById('weatherTempDisplay');
  const descDisplay = document.getElementById('weatherDescDisplay');
  if (tempDisplay) tempDisplay.textContent = msg;
  if (descDisplay) descDisplay.textContent = '';
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
