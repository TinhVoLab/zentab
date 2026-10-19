// Appearance bootstrap — runs in <head> before first paint so the theme and
// wallpaper never flash. Uses localStorage because it is synchronous.
(function () {
  // tone: tone of the wallpaper itself, decides text colour drawn on top of it
  const WALLPAPERS = {
    lotus:    { name: 'Hoa sen',    tone: 'dark' },
    tahoe:    { name: 'Hoàng hôn',  tone: 'dark' },
    aurora:   { name: 'Cực quang',  tone: 'dark' },
    ocean:    { name: 'Đại dương',  tone: 'dark' },
    forest:   { name: 'Rừng sâu',   tone: 'dark' },
    ember:    { name: 'Than hồng',  tone: 'dark' },
    graphite: { name: 'Than chì',   tone: 'dark' },
    sunrise:  { name: 'Bình minh',  tone: 'light' },
    lavender: { name: 'Oải hương',  tone: 'light' },
    sand:     { name: 'Cát trắng',  tone: 'light' },
    mist:     { name: 'Sương mai',  tone: 'light' },
    moon:     { name: 'Đêm trăng',  tone: 'dark' }
  };

  function read(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage blocked */ }
  }

  const root = document.documentElement;

  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
    else delete root.dataset.theme; // 'auto' → follow prefers-color-scheme
  }

  // ---- Photos: read their brightness where text sits ----
  // Gradients have a known tone. A photo (the lotus, or an upload) is sampled small: the
  // centre (clock, greeting, timer) decides light/dark text, and how bright its brightest
  // patches are sets --scrim-a, the strength of the shade drawn behind that text.
  const LOTUS_SRC = 'background.jpg';
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  function analyze(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const w = 96, h = Math.max(1, Math.round(96 * img.naturalHeight / img.naturalWidth));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        // drawn like background-size: cover on a 16:10 screen, so regions match what's seen
        const scr = 16 / 10, ir = img.naturalWidth / img.naturalHeight;
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (ir > scr) { sw = sh * scr; sx = (img.naturalWidth - sw) / 2; } else { sh = sw / scr; sy = (img.naturalHeight - sh) / 2; }
        c.height = Math.round(w / scr);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, c.height);
        const region = (x0, y0, x1, y1) => {
          const d = ctx.getImageData(Math.round(x0 * w), Math.round(y0 * c.height), Math.round((x1 - x0) * w), Math.round((y1 - y0) * c.height)).data;
          const ls = [];
          for (let i = 0; i < d.length; i += 4) ls.push(0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]));
          ls.sort((a, b) => a - b);
          return { mean: ls.reduce((a, b) => a + b, 0) / ls.length, p90: ls[Math.floor(ls.length * 0.9)] };
        };
        const center = region(0.3, 0.15, 0.7, 0.7);
        const dock = region(0.08, 0.84, 0.45, 0.98);
        const tone = center.mean > 0.42 ? 'light' : 'dark';
        // dark text needs the light patches calmed; light text needs the bright ones darkened
        const bright = tone === 'dark' ? Math.max(center.p90, dock.p90) : 1 - Math.min(center.mean, dock.mean);
        const scrim = Math.min(0.75, Math.max(0.4, 0.3 + bright * 0.85));
        resolve({ tone, scrim: +scrim.toFixed(2) });
      };
      img.onerror = () => resolve({ tone: 'dark', scrim: 0.55 });
      img.src = src;
    });
  }
  function applyPhoto(result) {
    root.style.setProperty('--scrim-a', result.scrim);
    root.dataset.wpTone = result.tone;
  }

  function applyWallpaper(id) {
    const wp = WALLPAPERS[id] || WALLPAPERS.lotus;
    root.dataset.wallpaper = WALLPAPERS[id] ? id : 'lotus';
    root.dataset.wpTone = wp.tone;
    root.style.removeProperty('--scrim-a');
    if (root.dataset.wallpaper === 'lotus') {
      try { const cached = JSON.parse(read('zt-photo-lotus', 'null')); if (cached) applyPhoto({ ...cached, tone: 'dark' }); } catch (e) {}
      analyze(LOTUS_SRC).then(r => {
        write('zt-photo-lotus', JSON.stringify(r));
        if (root.dataset.wallpaper === 'lotus' && !root.hasAttribute('data-custom-bg') && !read('zt-photo-custom', '')) applyPhoto({ ...r, tone: 'dark' });
      });
    }
  }

  applyTheme(read('zt-theme', 'auto'));
  applyWallpaper(read('zt-wallpaper', 'lotus'));
  // An uploaded photo is applied later by script.js; use its last known reading meanwhile
  // so a bright photo doesn't flash white text first
  try { const custom = JSON.parse(read('zt-photo-custom', 'null')); if (custom) applyPhoto(custom); } catch (e) {}

  window.ZenAppearance = {
    WALLPAPERS,
    getTheme: () => read('zt-theme', 'auto'),
    getWallpaper: () => read('zt-wallpaper', 'lotus'),
    setTheme(theme) { write('zt-theme', theme); applyTheme(theme); },
    setWallpaper(id) { write('zt-wallpaper', id); applyWallpaper(id); },
    // An uploaded photo: its own reading decides the text tone and shade strength
    setCustomActive(active, src) {
      root.toggleAttribute('data-custom-bg', !!active);
      if (!active) { write('zt-photo-custom', ''); applyWallpaper(read('zt-wallpaper', 'lotus')); return; }
      if (src) analyze(src).then(r => { write('zt-photo-custom', JSON.stringify(r)); if (root.hasAttribute('data-custom-bg')) applyPhoto(r); });
    }
  };
})();
