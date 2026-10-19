// Góc thư giãn: short, score-free activities offered only during Pomodoro breaks.
// Uses timer state from script.js (timerMode, timeLeft, startFocusSession…). Exposes window.ZenRelax.
(function () {
  const modal = document.getElementById('relaxModal');
  if (!modal) return;

  const invite = document.getElementById('relaxInvite');
  const panes = {
    breath: document.getElementById('relaxBreath'),
    bubbles: document.getElementById('relaxBubbles'),
    garden: document.getElementById('relaxGarden'),
    lantern: document.getElementById('relaxLantern')
  };
  const endPanel = document.getElementById('relaxEnd');
  const breakLeft = document.getElementById('relaxBreakLeft');
  const sound = (name, ...args) => { try { window.ZenAmbient?.[name]?.(...args); } catch (e) {} };

  const isBreak = () => typeof timerMode !== 'undefined' && timerMode !== 'pomodoro';
  let inviteDismissedFor = null; // which break the user said "Bỏ qua" to
  let breakId = 0;               // bumps each time a new break starts
  let countedBreak = null;       // count one relaxation per break in stats
  let tickTimer = null;

  // ---- Invite: visible on the Focus view only while on a break ----
  function syncInvite() {
    if (!invite) return;
    invite.hidden = !isBreak() || inviteDismissedFor === breakId || modal.style.display !== 'none';
  }
  let lastMode = typeof timerMode !== 'undefined' ? timerMode : 'pomodoro';
  function onModeChange() {
    if (typeof timerMode === 'undefined') return;
    if (timerMode !== lastMode && timerMode !== 'pomodoro') breakId++;
    lastMode = timerMode;
    syncInvite();
  }
  document.getElementById('relaxInviteDismiss')?.addEventListener('click', () => {
    inviteDismissedFor = breakId;
    syncInvite();
  });
  document.querySelectorAll('[data-relax-open]').forEach(b => b.addEventListener('click', () => open(b.dataset.relaxOpen)));

  // ---- Modal ----
  function open(tab) {
    if (!isBreak()) return; // focus time stays focused
    if (window.ZenAmbient) ZenAmbient.unlock();
    endPanel.hidden = true;
    document.getElementById('relaxTabs').style.visibility = '';
    modal.style.display = 'flex';
    showTab(tab || 'breath');
    recordRelax();
    updateBreakLeft();
    clearInterval(tickTimer);
    tickTimer = setInterval(updateBreakLeft, 1000);
    syncInvite();
  }

  function close() {
    stopBreath();
    garden.stop();
    lanterns.stop();
    clearInterval(tickTimer);
    modal.style.display = 'none';
    syncInvite();
  }

  function showTab(tab) {
    currentTab = tab;
    Object.entries(panes).forEach(([k, el]) => { el.hidden = k !== tab; });
    document.querySelectorAll('#relaxTabs [data-relax-tab]').forEach(b => {
      const on = b.dataset.relaxTab === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    if (tab !== 'breath') stopBreath();
    if (tab === 'bubbles' && !bubbleSheet.children.length) newSheet();
    if (tab === 'garden') garden.init();
    if (tab === 'lantern') lanterns.start(); else lanterns.stop();
  }
  document.querySelectorAll('#relaxTabs [data-relax-tab]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.relaxTab)));
  document.getElementById('closeRelaxBtn').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  // ---- Phóng to: a bigger card; remembered for next time ----
  const card = modal.querySelector('.relax-card');
  const sizeBtn = document.getElementById('relaxSizeBtn');
  function setLarge(on) {
    card.classList.toggle('is-large', on);
    sizeBtn.setAttribute('aria-pressed', on);
    sizeBtn.title = sizeBtn.ariaLabel = on ? 'Thu nhỏ (F)' : 'Phóng to (F)';
    try { localStorage.setItem('zt-relax-large', on ? '1' : ''); } catch (e) {}
    // canvases follow the new size once the card has settled
    setTimeout(() => { if (currentTab === 'garden') garden.init(); }, 480);
  }
  sizeBtn.addEventListener('click', () => setLarge(!card.classList.contains('is-large')));
  try { if (localStorage.getItem('zt-relax-large')) setLarge(true); } catch (e) {}

  const TABS = ['breath', 'bubbles', 'garden', 'lantern'];
  let currentTab = 'breath';
  document.addEventListener('keydown', e => {
    if (modal.style.display === 'none') return;
    if (e.key === 'Escape') { close(); return; }
    if (e.target.matches('input, textarea') || !endPanel.hidden) return;
    if (e.key === 'f' || e.key === 'F') { setLarge(!card.classList.contains('is-large')); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const i = TABS.indexOf(currentTab) + (e.key === 'ArrowRight' ? 1 : -1);
      showTab(TABS[(i + TABS.length) % TABS.length]);
    } else if (e.key === ' ' && currentTab === 'breath' && !e.target.matches('button')) {
      e.preventDefault();
      breathTimer ? stopBreath() : startBreath();
    }
  });

  function updateBreakLeft() {
    if (!isBreak() || typeof timeLeft === 'undefined') { breakLeft.textContent = ''; return; }
    const s = Math.max(0, Math.round(timeLeft));
    breakLeft.textContent = `Còn ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} giờ nghỉ`;
  }

  function recordRelax() {
    if (countedBreak === breakId) return;
    countedBreak = breakId;
    const today = getDateStr(new Date());
    chrome.storage.local.get('relaxStats', ({ relaxStats }) => {
      const stats = relaxStats && relaxStats.date === today ? relaxStats : { date: today, count: 0 };
      stats.count += 1;
      chrome.storage.local.set({ relaxStats: stats });
    });
  }

  // ---- Breathing ----
  const PATTERNS = {
    box: [['Hít vào', 4, 'in'], ['Giữ hơi', 4, 'hold'], ['Thở ra', 4, 'out'], ['Nghỉ', 4, 'hold']],
    '478': [['Hít vào', 4, 'in'], ['Giữ hơi', 7, 'hold'], ['Thở ra', 8, 'out']],
    calm: [['Hít vào', 4, 'in'], ['Thở ra', 6, 'out']]
  };
  let pattern = 'box';
  let breathTimer = null;
  let rounds = 0;
  const circle = document.getElementById('breathCircle');
  const phaseEl = document.getElementById('breathPhase');
  const countEl = document.getElementById('breathCount');
  const roundsEl = document.getElementById('breathRounds');
  const toggleBtn = document.getElementById('breathToggle');
  const orb = circle.parentElement;
  const ring = document.getElementById('breathRing');
  const hintEl = document.getElementById('breathHint');
  // The ring fills over each phase: reset instantly, then run for the phase's length
  function traceRing(secs) {
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = '100';
    void ring.getBoundingClientRect();
    ring.style.transition = `stroke-dashoffset ${secs}s linear`;
    ring.style.strokeDashoffset = '0';
  }

  function setPattern(p) {
    pattern = p;
    document.querySelectorAll('#breathPatterns [data-pattern]').forEach(b => {
      const on = b.dataset.pattern === p;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on);
    });
    if (breathTimer) { stopBreath(); startBreath(); }
  }
  document.querySelectorAll('#breathPatterns [data-pattern]').forEach(b => b.addEventListener('click', () => setPattern(b.dataset.pattern)));

  function startBreath() {
    const steps = PATTERNS[pattern];
    let step = 0, left = steps[0][1];
    rounds = 0;
    roundsEl.textContent = '';
    hintEl.hidden = true;
    toggleBtn.textContent = 'Dừng';
    const enter = () => {
      const [label, secs, kind] = steps[step];
      left = secs;
      phaseEl.textContent = label;
      countEl.textContent = left;
      circle.style.transitionDuration = `${secs}s`;
      if (kind === 'in') circle.classList.add('expanded');
      if (kind === 'out') circle.classList.remove('expanded');
      orb.dataset.phase = kind;
      traceRing(secs);
      if (kind !== 'hold') sound('breathCue', kind === 'in');
    };
    enter();
    breathTimer = setInterval(() => {
      left -= 1;
      if (left > 0) { countEl.textContent = left; return; }
      step = (step + 1) % steps.length;
      if (step === 0) {
        rounds += 1;
        roundsEl.textContent = `${rounds} nhịp thở`;
      }
      enter();
    }, 1000);
  }

  function stopBreath() {
    clearInterval(breathTimer);
    breathTimer = null;
    toggleBtn.textContent = 'Bắt đầu';
    phaseEl.textContent = rounds ? 'Tốt lắm' : 'Sẵn sàng';
    countEl.textContent = '';
    circle.style.transitionDuration = '1.2s';
    circle.classList.remove('expanded');
    orb.dataset.phase = '';
    ring.style.transition = 'stroke-dashoffset 0.6s ease';
    ring.style.strokeDashoffset = '100';
    hintEl.hidden = !!rounds;
  }
  toggleBtn.addEventListener('click', () => (breathTimer ? stopBreath() : startBreath()));
  setPattern('box');

  // ---- Bubble wrap ----
  const bubbleSheet = document.getElementById('bubbleSheet');
  const bubbleMeta = document.getElementById('bubbleMeta');
  const COLS = 10, ROWS = 5;
  let popped = 0, sheets = 0, pressing = false;

  function newSheet() {
    bubbleSheet.classList.remove('sheet-out', 'sheet-in');
    bubbleSheet.innerHTML = Array.from({ length: COLS * ROWS }, (_, i) =>
      `<button type="button" class="bubble" aria-label="Bong bóng ${i + 1}"></button>`).join('');
    void bubbleSheet.offsetWidth;
    bubbleSheet.classList.add('sheet-in');
  }
  function swapSheet() {
    bubbleSheet.classList.add('sheet-out');
    setTimeout(newSheet, 380);
  }
  document.getElementById('bubbleNew').addEventListener('click', swapSheet);

  function popBubble(b) {
    if (!b || !b.classList.contains('bubble') || b.classList.contains('popped')) return;
    b.classList.add('popped');
    b.setAttribute('aria-label', 'Đã bóp');
    sound('pop');
    popped += 1;
    if (!bubbleSheet.querySelector('.bubble:not(.popped)')) {
      sheets += 1;
      setTimeout(swapSheet, 250);
    }
    bubbleMeta.textContent = `Đã bóp ${popped} bong bóng${sheets ? ` · ${sheets} tấm` : ''}`;
  }
  // Click/keyboard pops one; holding the pointer down and sweeping pops a row
  bubbleSheet.addEventListener('click', e => popBubble(e.target.closest('.bubble')));
  bubbleSheet.addEventListener('pointerdown', e => { pressing = true; popBubble(e.target.closest('.bubble')); });
  bubbleSheet.addEventListener('pointerover', e => { if (pressing) popBubble(e.target.closest('.bubble')); });
  window.addEventListener('pointerup', () => { pressing = false; });

  // ---- Zen sand garden ----
  // Two canvases: sand (grooves) below, stones above so raking never paints over a stone.
  const garden = (() => {
    const stage = document.getElementById('gardenStage');
    const sand = document.getElementById('gardenSand');
    const stones = document.getElementById('gardenStones');
    const sctx = sand.getContext('2d');
    const tctx = stones.getContext('2d');
    const SAND = '#e6d8bd', GROOVE = '#b49d78', LIGHT = '#f7efdf';
    const TOOLS = { rake: { tines: 5, gap: 9 }, stick: { tines: 1, gap: 0 } };
    let w = 0, h = 0, pattern = null, tool = 'rake';
    let last = null, lastTime = 0, dir = null, tineEnds = null, stroke = null;

    // Fine grain so a freshly raked band looks like the untouched sand around it
    function makePattern() {
      const off = document.createElement('canvas');
      off.width = off.height = 160;
      const o = off.getContext('2d');
      o.fillStyle = SAND;
      o.fillRect(0, 0, 160, 160);
      for (let i = 0; i < 1400; i++) {
        const light = Math.random() < 0.5;
        o.fillStyle = light ? 'rgba(255,255,255,0.35)' : 'rgba(120,95,60,0.18)';
        o.fillRect(Math.random() * 160, Math.random() * 160, 1, 1);
      }
      return sctx.createPattern(off, 'repeat');
    }

    // Layout size, not getBoundingClientRect: the modal scales in on open, and sizing
    // mid-animation would trigger a re-init (and wipe the sand) once it settles
    function init() {
      const cw = stage.offsetWidth, ch = stage.offsetHeight;
      if (!cw || (cw === w && ch === h)) return;
      const dpr = window.devicePixelRatio || 1;
      // Resized (Phóng to): keep the garden, centred on the larger or smaller tray
      const keep = w ? [sand, stones].map(c => { const k = document.createElement('canvas'); k.width = c.width; k.height = c.height; k.getContext('2d').drawImage(c, 0, 0); return k; }) : null;
      const [ow, oh] = [w, h];
      w = cw; h = ch;
      [[sand, sctx], [stones, tctx]].forEach(([c, x]) => {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
      if (!pattern) pattern = makePattern(); else pattern = makePattern();
      smooth();
      if (keep) {
        const dx = (w - ow) / 2, dy = (h - oh) / 2;
        sctx.drawImage(keep[0], dx, dy, ow, oh);
        tctx.drawImage(keep[1], dx, dy, ow, oh);
      }
    }

    function smooth() {
      sctx.fillStyle = pattern;
      sctx.fillRect(0, 0, w, h);
      tctx.clearRect(0, 0, w, h);
    }

    function line(x, a, b) {
      x.beginPath();
      x.moveTo(a.x, a.y);
      x.lineTo(b.x, b.y);
      x.stroke();
    }

    // A groove: a dark cut with a light lip on the lit side
    function groove(a, b) {
      sctx.lineCap = 'round';
      sctx.lineWidth = 2.4;
      sctx.strokeStyle = LIGHT;
      line(sctx, { x: a.x + 0.9, y: a.y + 0.9 }, { x: b.x + 0.9, y: b.y + 0.9 });
      sctx.strokeStyle = GROOVE;
      line(sctx, a, b);
    }

    function rakeSegment(a, b, n) {
      const spec = TOOLS[tool] || TOOLS.rake;
      const half = (spec.tines - 1) / 2;
      // The rake levels the sand it passes over before cutting new grooves
      sctx.lineCap = 'butt';
      sctx.lineWidth = spec.tines === 1 ? 7 : (spec.tines - 1) * spec.gap + 9;
      sctx.strokeStyle = pattern;
      line(sctx, a, b);
      const ends = [];
      for (let i = 0; i < spec.tines; i++) {
        const o = (i - half) * spec.gap;
        // Continue each tine from where it ended, so turns stay unbroken
        const from = tineEnds ? tineEnds[i] : { x: a.x + n.x * o, y: a.y + n.y * o };
        const to = { x: b.x + n.x * o, y: b.y + n.y * o };
        groove(from, to);
        ends.push(to);
      }
      tineEnds = ends;
    }

    function placeStone(p) {
      const r = 13 + Math.random() * 12;
      // Ripples: level a ring of sand, then cut a circular groove
      for (let k = 1; k <= 3; k++) {
        const rr = r + 4 + k * 9;
        sctx.lineWidth = 9;
        sctx.strokeStyle = pattern;
        sctx.beginPath(); sctx.arc(p.x, p.y, rr, 0, Math.PI * 2); sctx.stroke();
        sctx.lineWidth = 2.4;
        sctx.strokeStyle = LIGHT;
        sctx.beginPath(); sctx.arc(p.x + 0.9, p.y + 0.9, rr, 0, Math.PI * 2); sctx.stroke();
        sctx.strokeStyle = GROOVE;
        sctx.beginPath(); sctx.arc(p.x, p.y, rr, 0, Math.PI * 2); sctx.stroke();
      }
      // A slightly irregular, softly lit stone
      const pts = Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        const rad = r * (0.88 + Math.random() * 0.2);
        return { x: p.x + Math.cos(a) * rad * 1.12, y: p.y + Math.sin(a) * rad * 0.9 };
      });
      tctx.save();
      tctx.shadowColor = 'rgba(0,0,0,0.35)';
      tctx.shadowBlur = 8;
      tctx.shadowOffsetX = 3;
      tctx.shadowOffsetY = 4;
      const g = tctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.1, p.x, p.y, r * 1.2);
      g.addColorStop(0, '#9a9a96');
      g.addColorStop(0.6, '#62625f');
      g.addColorStop(1, '#3f3f3d');
      tctx.fillStyle = g;
      tctx.beginPath();
      pts.forEach((pt, i) => {
        const next = pts[(i + 1) % pts.length];
        const mid = { x: (pt.x + next.x) / 2, y: (pt.y + next.y) / 2 };
        if (i === 0) tctx.moveTo(mid.x, mid.y); else tctx.quadraticCurveTo(pt.x, pt.y, mid.x, mid.y);
      });
      tctx.quadraticCurveTo(pts[0].x, pts[0].y, (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      tctx.fill();
      tctx.restore();
      sound('pop');
    }

    // Pointer → canvas units, correcting for any transform on the modal
    const point = e => {
      const r = stage.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (w / r.width), y: (e.clientY - r.top) * (h / r.height) };
    };

    stage.addEventListener('pointerdown', e => {
      init();
      const p = point(e);
      if (tool === 'stone') { placeStone(p); return; }
      stage.setPointerCapture(e.pointerId);
      last = p; lastTime = performance.now(); dir = null; tineEnds = null;
      stroke = window.ZenAmbient?.sandStroke ? ZenAmbient.sandStroke() : null;
    });
    stage.addEventListener('pointermove', e => {
      if (!last) return;
      const p = point(e);
      const dx = p.x - last.x, dy = p.y - last.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) return; // short steps make the rake jitter
      const seg = { x: dx / d, y: dy / d };
      // Smooth the heading so the rake turns gently
      if (dir) {
        const sx = dir.x * 0.55 + seg.x * 0.45, sy = dir.y * 0.55 + seg.y * 0.45, sl = Math.hypot(sx, sy) || 1;
        dir = { x: sx / sl, y: sy / sl };
      } else dir = seg;
      rakeSegment(last, p, { x: -dir.y, y: dir.x });
      const now = performance.now();
      stroke?.move((d / Math.max(1, now - lastTime)) * 16);
      last = p; lastTime = now;
    });
    const endStroke = () => { last = null; tineEnds = null; stroke?.end(); stroke = null; };
    stage.addEventListener('pointerup', endStroke);
    stage.addEventListener('pointercancel', endStroke);

    function setTool(t) {
      tool = t;
      stage.dataset.tool = t;
      document.querySelectorAll('#gardenTools [data-tool]').forEach(b => {
        const on = b.dataset.tool === t;
        b.classList.toggle('active', on);
        b.setAttribute('aria-checked', on);
      });
    }
    document.querySelectorAll('#gardenTools [data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
    // Làm phẳng: a board sweeps the tray left to right
    function sweep() {
      init();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { smooth(); return; }
      tctx.clearRect(0, 0, w, h);
      const t0 = performance.now(), dur = 650;
      let x0 = 0;
      const step = now => {
        const k = Math.min(1, (now - t0) / dur);
        const x = w * (1 - Math.pow(1 - k, 2));
        sctx.fillStyle = pattern;
        sctx.fillRect(x0, 0, x - x0 + 1, h);
        x0 = x;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      sound('pop');
    }
    document.getElementById('gardenSmooth').addEventListener('click', sweep);
    setTool('rake');

    return { init, stop: endStroke };
  })();

  // ---- Thả đèn hoa đăng: write a worry, set it on the river, watch it drift away ----
  // The river is the Đêm trăng wallpaper (wallpapers/moon.svg) with stars and moonlight
  // that move. A lantern waits on the water and shows what you type; released, it drifts
  // to the far shore and stays there as a small light for the rest of the break.
  // Nothing written here is stored or sent anywhere; it only exists on the canvas.
  const lanterns = (() => {
    const stage = document.getElementById('lanternStage');
    const canvas = document.getElementById('lanternCanvas');
    const ctx = canvas.getContext('2d');
    const form = document.getElementById('lanternForm');
    const input = document.getElementById('lanternText');
    const countEl = document.getElementById('lanternCount');
    const DRIFT_MS = 14000, FAR_MAX = 14, NEXT_MS = 1400, WAIT_SCALE = 1.25;
    const VB = { w: 1600, h: 1000, horizon: 660, moonX: 1220, moonY: 230 }; // moon.svg geometry
    let w = 0, h = 0, dpr = 1, raf = null, released = 0, U = 1; // U: lantern scale, grows with Phóng to
    let scene = null, map = null, waiting = null;
    const drifting = [], far = [];
    const bg = new Image();
    bg.src = 'wallpapers/moon.svg';
    bg.onload = () => { scene = null; };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // twinkles placed in the sky once
    const twinkles = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random() * 0.5, r: Math.random() * 0.9 + 0.5, p: Math.random() * 6 }));

    function size() {
      const cw = stage.offsetWidth, ch = stage.offsetHeight;
      if (!cw || (cw === w && ch === h)) return;
      dpr = window.devicePixelRatio || 1;
      w = cw; h = ch;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // background-size: cover, centred — the same crop the wallpaper uses
      const k = Math.max(w / VB.w, h / VB.h);
      map = { k, ox: (w - VB.w * k) / 2, oy: (h - VB.h * k) / 2 };
      map.horizon = map.oy + VB.horizon * k;
      map.moonX = map.ox + VB.moonX * k;
      map.moonY = map.oy + VB.moonY * k;
      U = Math.max(1, h / 340);
      scene = null;
      waiting = waiting || newWaiting(performance.now());
    }

    // The still scene, rendered once per size into an offscreen canvas
    function renderScene() {
      const off = document.createElement('canvas');
      off.width = canvas.width; off.height = canvas.height;
      const o = off.getContext('2d');
      o.setTransform(dpr, 0, 0, dpr, 0, 0);
      o.fillStyle = '#0b1730';
      o.fillRect(0, 0, w, h);
      if (bg.complete && bg.naturalWidth) o.drawImage(bg, map.ox, map.oy, VB.w * map.k, VB.h * map.k);
      scene = off;
    }

    function drawScene(t) {
      if (!scene) renderScene();
      ctx.drawImage(scene, 0, 0, w, h);
      if (reduceMotion.matches) return;
      // stars breathe
      twinkles.forEach(st => {
        const y = st.y * map.horizon;
        ctx.globalAlpha = Math.max(0, 0.15 + 0.55 * Math.sin(t / 1100 + st.p));
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(st.x * w, y, st.r, 0, Math.PI * 2); ctx.fill();
      });
      // moonlight glints that come and go on the water under the moon
      for (let i = 0; i < 18; i++) {
        const depth = (i + 0.5) / 18;
        const y = map.horizon + 8 + depth * (h - map.horizon - 10);
        const spread = 10 + depth * 60 * map.k * 1.6;
        const x = map.moonX + Math.sin(i * 12.9898 + Math.floor(t / 900 + i) * 3.1) * spread;
        const a = Math.max(0, Math.sin(t / 420 + i * 1.7)) * (0.55 - depth * 0.35);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#fff4d8';
        ctx.beginPath(); ctx.ellipse(x, y, 6 + depth * 10, 1 + depth * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // One lotus lantern at (x, y), scale s, opacity a
    function lantern(x, y, s, a, flicker) {
      ctx.save();
      ctx.globalAlpha = a;
      const refl = ctx.createRadialGradient(x, y + 12 * s, 0, x, y + 12 * s, 46 * s);
      refl.addColorStop(0, `rgba(255,190,110,${0.38 * flicker})`);
      refl.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = refl;
      ctx.save(); ctx.translate(x, y + 12 * s); ctx.scale(1, 0.32); ctx.translate(-x, -(y + 12 * s));
      ctx.beginPath(); ctx.arc(x, y + 12 * s, 46 * s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      const glow = ctx.createRadialGradient(x, y - 6 * s, 0, x, y - 6 * s, 46 * s);
      glow.addColorStop(0, `rgba(255,214,140,${0.55 * flicker})`);
      glow.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y - 6 * s, 46 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2f6b4f';
      ctx.beginPath(); ctx.ellipse(x, y + 4 * s, 23 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
      [[8, 17, 9, '#f2a6c4'], [6, 12, 7, '#fbd3e3']].forEach(([n, len, wid, color], ring) => {
        ctx.fillStyle = color;
        for (let i = 0; i < n; i++) {
          const ang = Math.PI + (i / (n - 1)) * Math.PI;
          ctx.save();
          ctx.translate(x, y - ring * 2 * s);
          ctx.rotate(ang + Math.PI / 2);
          ctx.beginPath(); ctx.ellipse(0, -len * s * 0.55, wid * s * 0.5, len * s * 0.6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      });
      ctx.fillStyle = `rgba(255,232,160,${flicker})`;
      ctx.beginPath(); ctx.ellipse(x, y - 9 * s, 2.6 * s, 5.5 * s * flicker, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const flick = (t, seed) => 0.82 + 0.18 * Math.sin(t / 90 + seed * 3) * Math.sin(t / 37 + seed);

    function text(str, x, y, size, alpha) {
      if (!str || alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `italic ${Math.round(size)}px "New York", ui-serif, Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff2dc';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 8;
      ctx.fillText(str, x, y);
      ctx.restore();
    }

    function newWaiting(t) { return { born: t, seed: Math.random() * 10, x: w * 0.5 }; }
    const restY = () => h * 0.86;

    function frame(t) {
      size();
      drawScene(t);
      // far shore: lights that stay, drifting slowly along the horizon
      far.forEach(l => {
        const x = l.x + Math.sin(t / 4000 + l.seed) * 14;
        lantern(x, map.horizon + 6 + l.dy, 0.2 * U, l.a, flick(t, l.seed));
      });
      // released lanterns crossing the river
      for (let i = drifting.length - 1; i >= 0; i--) {
        const l = drifting[i];
        const k = Math.min(1, (t - l.born) / DRIFT_MS);
        const e = 1 - Math.pow(1 - k, 2.2);
        const y = l.y0 + (map.horizon + 6 + l.dy - l.y0) * e;
        const s = WAIT_SCALE * U * (1 - 0.84 * e);
        const x = l.x0 + (l.x1 - l.x0) * e + Math.sin(t / 900 + l.seed) * 6 * s;
        lantern(x, y, s, 1, flick(t, l.seed));
        text(l.text, x, y - 36 * s - e * 30, 15 * Math.max(0.7, s), Math.max(0, 1 - k / 0.4));
        if (k >= 1) {
          drifting.splice(i, 1);
          far.push({ x, dy: l.dy, seed: l.seed, a: 1 });
          if (far.length > FAR_MAX) far.shift();
        }
      }
      // the waiting lantern bobs and shows what's being typed
      if (waiting) {
        const appear = Math.min(1, (t - waiting.born) / 700);
        const bob = reduceMotion.matches ? 0 : Math.sin(t / 1100 + waiting.seed) * 2.5;
        const y = restY() + bob + (1 - appear) * 12;
        lantern(waiting.x, y, WAIT_SCALE * U, appear, flick(t, waiting.seed));
        text(input.value.trim(), waiting.x, y - 48 * U, 16 * U, appear * 0.95);
      }
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf) return;
      raf = requestAnimationFrame(frame);
      setTimeout(() => input.focus(), 50);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      const str = input.value.trim();
      if (!str) { input.focus(); return; }
      size();
      const now = performance.now();
      const lane = [0, -0.18, 0.18, -0.08, 0.1][released % 5];
      const x0 = waiting ? waiting.x : w * 0.5;
      drifting.push({ text: str, born: now, x0, y0: restY(), x1: map.moonX * 0.35 + w * (0.32 + lane), dy: Math.random() * 14, seed: waiting ? waiting.seed : Math.random() * 10 });
      waiting = null;
      setTimeout(() => { waiting = newWaiting(performance.now()); }, NEXT_MS);
      input.value = '';
      released += 1;
      countEl.textContent = `Đã thả ${released} đèn · `;
      sound('lanternRelease');
    });

    return { start, stop };
  })();

  // ---- Break over ----
  document.getElementById('relaxBackToWork').addEventListener('click', () => {
    close();
    if (typeof startFocusSession === 'function') startFocusSession();
  });
  document.getElementById('relaxStay').addEventListener('click', close);

  function onBreakEnd() {
    if (modal.style.display === 'none') return;
    stopBreath();
    clearInterval(tickTimer);
    breakLeft.textContent = 'Giờ nghỉ đã hết';
    const label = document.getElementById('focusIntentionDisplay');
    const task = label && !label.hidden && label.textContent.trim();
    document.getElementById('relaxEndSub').innerHTML = task
      ? `Quay lại với <b></b>?` : 'Sẵn sàng cho phiên tiếp theo?';
    if (task) document.querySelector('#relaxEndSub b').textContent = task;
    Object.values(panes).forEach(el => { el.hidden = true; });
    document.getElementById('relaxTabs').style.visibility = 'hidden'; // keeps its room, so the card doesn't shrink
    endPanel.hidden = false;
  }

  window.ZenRelax = { open, close, syncInvite: onModeChange, onBreakEnd };
  onModeChange();
})();
