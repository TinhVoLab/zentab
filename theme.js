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
    sand:     { name: 'Cát trắng',  tone: 'light' }
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

  function applyWallpaper(id) {
    const wp = WALLPAPERS[id] || WALLPAPERS.lotus;
    root.dataset.wallpaper = WALLPAPERS[id] ? id : 'lotus';
    root.dataset.wpTone = wp.tone;
  }

  applyTheme(read('zt-theme', 'auto'));
  applyWallpaper(read('zt-wallpaper', 'lotus'));

  window.ZenAppearance = {
    WALLPAPERS,
    getTheme: () => read('zt-theme', 'auto'),
    getWallpaper: () => read('zt-wallpaper', 'lotus'),
    setTheme(theme) { write('zt-theme', theme); applyTheme(theme); },
    setWallpaper(id) { write('zt-wallpaper', id); applyWallpaper(id); },
    // A custom uploaded photo is treated as a dark-toned wallpaper
    setCustomActive(active) {
      if (active) root.dataset.wpTone = 'dark';
      else applyWallpaper(read('zt-wallpaper', 'lotus'));
      root.toggleAttribute('data-custom-bg', !!active);
    }
  };
})();
