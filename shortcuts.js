// Lối tắt: a few sites the user opens every day, as a quiet row under the intention.
// - Plain links kept in chrome.storage.sync (`quickLinks`); no extra permission, nothing fetched:
//   each tile is the site's initial, not a downloaded icon.
// - Right-click a tile (or the menu key) to edit or remove it; ＋ adds one, up to MAX.
// - The row fades with the rest of the chrome in Zen, and steps back while a session runs.
(function () {
  const row = document.getElementById('quickLinks');
  const editor = document.getElementById('quickLinkEditor');
  if (!row || !editor) return;

  const MAX = 6;
  const DEFAULTS = [
    { name: 'Gmail', url: 'https://mail.google.com/' },
    { name: 'Google', url: 'https://www.google.com/' },
    { name: 'Lịch', url: 'https://calendar.google.com/' },
    { name: 'Drive', url: 'https://drive.google.com/' }
  ];

  const nameInput = document.getElementById('quickLinkName');
  const urlInput = document.getElementById('quickLinkUrl');
  const removeBtn = document.getElementById('quickLinkRemove');
  const errorEl = document.getElementById('quickLinkError');
  let links = [];
  let editing = null; // index being edited, or -1 for a new one
  let anchor = null;  // the tile the editor was opened from

  // "gmail.com" -> "https://gmail.com/"; only web addresses are accepted
  function normalizeUrl(raw) {
    const text = raw.trim();
    if (!text) return null;
    try {
      const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
      return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.') ? url.href : null;
    } catch (e) { return null; }
  }
  const hostLabel = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; } };
  // One letter; two when another shortcut starts with the same one (Gmail / Google -> Gm / Go)
  function monogram(name, all) {
    const chars = Array.from(name.trim());
    const first = (chars[0] || '•').toLocaleUpperCase('vi');
    const clash = all.filter(l => (Array.from(l.name.trim())[0] || '').toLocaleUpperCase('vi') === first).length > 1;
    return clash && chars[1] && chars[1].trim() ? first + chars[1].toLocaleLowerCase('vi') : first;
  }

  function save() {
    chrome.storage.sync.set({ quickLinks: links });
  }

  function render() {
    const tiles = links.map((link, i) => {
      const a = document.createElement('a');
      a.className = 'quick-link';
      a.href = link.url;
      a.rel = 'noopener';
      a.setAttribute('aria-label', `${link.name} · bấm phải để sửa`);
      const mark = document.createElement('span');
      mark.className = 'quick-link-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = monogram(link.name, links);
      const tip = document.createElement('span');
      tip.className = 'quick-link-tip';
      tip.textContent = link.name;
      a.append(mark, tip);
      a.addEventListener('contextmenu', (e) => { e.preventDefault(); openEditor(i, a); });
      return a;
    });
    if (links.length < MAX) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'quick-link quick-link-add';
      add.setAttribute('aria-label', 'Thêm lối tắt');
      add.innerHTML = '<span class="quick-link-mark" aria-hidden="true">＋</span><span class="quick-link-tip">Thêm lối tắt</span>';
      add.addEventListener('click', () => openEditor(-1, add));
      tiles.push(add);
    }
    row.replaceChildren(...tiles);
    row.classList.toggle('is-empty', links.length === 0);
  }

  function openEditor(index, tile) {
    editing = index;
    anchor = tile;
    const link = index >= 0 ? links[index] : { name: '', url: '' };
    nameInput.value = link.name;
    urlInput.value = index >= 0 ? link.url : '';
    removeBtn.hidden = index < 0;
    errorEl.textContent = '';
    editor.hidden = false;
    row.classList.add('is-editing');
    // above the tile, kept inside the window
    const r = tile.getBoundingClientRect();
    const w = editor.offsetWidth, h = editor.offsetHeight;
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    const top = r.top - h - 10 >= 12 ? r.top - h - 10 : Math.min(r.bottom + 10, window.innerHeight - h - 12);
    editor.style.left = `${left}px`;
    editor.style.top = `${top}px`;
    requestAnimationFrame(() => { editor.classList.add('visible'); (index >= 0 ? nameInput : urlInput).focus(); });
  }

  function closeEditor(returnFocus) {
    if (editor.hidden) return;
    editor.classList.remove('visible');
    editor.hidden = true;
    row.classList.remove('is-editing');
    editing = null;
    if (returnFocus && anchor && anchor.isConnected) anchor.focus();
    anchor = null;
  }

  editor.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = normalizeUrl(urlInput.value);
    if (!url) {
      errorEl.textContent = 'Địa chỉ chưa đúng. Ví dụ: mail.google.com';
      urlInput.focus();
      return;
    }
    const link = { name: nameInput.value.trim() || hostLabel(url), url };
    if (editing >= 0) links[editing] = link; else links.push(link);
    const focusIndex = editing >= 0 ? editing : links.length - 1;
    save();
    render();
    closeEditor(false);
    row.children[focusIndex]?.focus();
  });

  removeBtn.addEventListener('click', () => {
    if (editing == null || editing < 0) return;
    const index = editing;
    const [removed] = links.splice(index, 1);
    save();
    render();
    closeEditor(false);
    if (typeof zenToast === 'function') {
      zenToast(`Đã xoá lối tắt ${removed.name}`, {
        actionLabel: 'Hoàn tác',
        onAction: () => { links.splice(Math.min(index, links.length), 0, removed); links = links.slice(0, MAX); save(); render(); }
      });
    }
  });

  document.getElementById('quickLinkCancel').addEventListener('click', () => closeEditor(true));
  editor.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeEditor(true); } });
  document.addEventListener('pointerdown', (e) => {
    if (!editor.hidden && !editor.contains(e.target) && !(anchor && anchor.contains(e.target))) closeEditor(false);
  });
  window.addEventListener('resize', () => closeEditor(false));

  // Another tab changed the list
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes.quickLinks || !editor.hidden) return;
    links = Array.isArray(changes.quickLinks.newValue) ? changes.quickLinks.newValue.slice(0, MAX) : DEFAULTS.slice();
    render();
  });

  chrome.storage.sync.get('quickLinks', ({ quickLinks }) => {
    // never set: the suggested four; an emptied list stays empty
    links = (Array.isArray(quickLinks) ? quickLinks : DEFAULTS)
      .filter(l => l && typeof l.name === 'string' && normalizeUrl(l.url || ''))
      .slice(0, MAX)
      .map(l => ({ name: l.name, url: l.url }));
    render();
    row.hidden = false;
  });
})();
