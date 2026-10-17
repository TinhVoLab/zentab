// Góc thư giãn: short, score-free activities offered only during Pomodoro breaks.
// Uses timer state from script.js (timerMode, timeLeft, startFocusSession…). Exposes window.ZenRelax.
(function () {
  const modal = document.getElementById('relaxModal');
  if (!modal) return;

  const invite = document.getElementById('relaxInvite');
  const panes = { breath: document.getElementById('relaxBreath'), bubbles: document.getElementById('relaxBubbles') };
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
