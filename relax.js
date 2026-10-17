// Góc thư giãn: short, score-free activities offered only during Pomodoro breaks.
// Uses timer state from script.js (timerMode, timeLeft, startFocusSession…). Exposes window.ZenRelax.
(function () {
  const modal = document.getElementById('relaxModal');
  if (!modal) return;

  const invite = document.getElementById('relaxInvite');
  const panes = {
    breath: document.getElementById('relaxBreath'),
    bubbles: document.getElementById('relaxBubbles'),
    garden: document.getElementById('relaxGarden')
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
    document.getElementById('relaxTabs').hidden = false;
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
    clearInterval(tickTimer);
    modal.style.display = 'none';
    syncInvite();
  }

  function showTab(tab) {
    Object.entries(panes).forEach(([k, el]) => { el.hidden = k !== tab; });
    document.querySelectorAll('#relaxTabs [data-relax-tab]').forEach(b => {
      const on = b.dataset.relaxTab === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    if (tab !== 'breath') stopBreath();
    if (tab === 'bubbles' && !bubbleSheet.children.length) newSheet();
    if (tab === 'garden') garden.init();
  }
  document.querySelectorAll('#relaxTabs [data-relax-tab]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.relaxTab)));
  document.getElementById('closeRelaxBtn').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display !== 'none') close(); });

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
    '478': [['Hít vào', 4, 'in'], ['Giữ hơi', 7, 'hold'], ['Thở ra', 8, 'out']]
  };
  let pattern = 'box';
  let breathTimer = null;
  let rounds = 0;
  const circle = document.getElementById('breathCircle');
  const phaseEl = document.getElementById('breathPhase');
  const countEl = document.getElementById('breathCount');
  const roundsEl = document.getElementById('breathRounds');
  const toggleBtn = document.getElementById('breathToggle');

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
    toggleBtn.textContent = 'Dừng';
    const enter = () => {
      const [label, secs, kind] = steps[step];
      left = secs;
      phaseEl.textContent = label;
      countEl.textContent = left;
      circle.style.transitionDuration = `${secs}s`;
      if (kind === 'in') circle.classList.add('expanded');
      if (kind === 'out') circle.classList.remove('expanded');
      circle.dataset.phase = kind;
      if (kind !== 'hold') sound('breathCue', kind === 'in');
    };
    enter();
    breathTimer = setInterval(() => {
      left -= 1;
      if (left > 0) { countEl.textContent = left; return; }
      step = (step + 1) % steps.length;
      if (step === 0) {
        rounds += 1;
        roundsEl.textContent = `${rounds} nhịp`;
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
    circle.dataset.phase = '';
  }
  toggleBtn.addEventListener('click', () => (breathTimer ? stopBreath() : startBreath()));
  setPattern('box');

  // ---- Bubble wrap ----
  const bubbleSheet = document.getElementById('bubbleSheet');
  const bubbleMeta = document.getElementById('bubbleMeta');
  const COLS = 8, ROWS = 5;
  let popped = 0, sheets = 0, pressing = false;

  function newSheet() {
    bubbleSheet.classList.remove('sheet-out');
    bubbleSheet.innerHTML = Array.from({ length: COLS * ROWS }, (_, i) =>
      `<button type="button" class="bubble" aria-label="Bong bóng ${i + 1}"></button>`).join('');
  }

  function popBubble(b) {
    if (!b || !b.classList.contains('bubble') || b.classList.contains('popped')) return;
    b.classList.add('popped');
    b.setAttribute('aria-label', 'Đã bóp');
    sound('pop');
    popped += 1;
    if (!bubbleSheet.querySelector('.bubble:not(.popped)')) {
      sheets += 1;
      bubbleSheet.classList.add('sheet-out');
      setTimeout(newSheet, 450);
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
      w = cw; h = ch;
      [[sand, sctx], [stones, tctx]].forEach(([c, x]) => {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
      pattern = makePattern();
      smooth();
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
    document.getElementById('gardenSmooth').addEventListener('click', () => { init(); smooth(); });
    setTool('rake');

    return { init, stop: endStroke };
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
    breakLeft.textContent = '';
    const label = document.getElementById('focusIntentionDisplay');
    const task = label && !label.hidden && label.textContent.trim();
    document.getElementById('relaxEndSub').innerHTML = task
      ? `Quay lại với <b></b>?` : 'Sẵn sàng cho phiên tiếp theo?';
    if (task) document.querySelector('#relaxEndSub b').textContent = task;
    Object.values(panes).forEach(el => { el.hidden = true; });
    document.getElementById('relaxTabs').hidden = true;
    endPanel.hidden = false;
  }

  window.ZenRelax = { open, close, syncInvite: onModeChange, onBreakEnd };
  onModeChange();
})();
