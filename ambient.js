// Ambient soundscapes synthesized with the Web Audio API — no audio files,
// no network, no licensing. Exposes window.ZenAmbient.
(function () {
  let ctx = null;
  let master = null;
  let current = null; // { kind, nodes: [], timers: [] }
  const VOLUME = 0.55;
  const FADE = 1.2;
  const noiseCache = {};

  function ensureContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ---- Noise sources ----
  function noiseBuffer(type) {
    if (noiseCache[type]) return noiseCache[type];
    const length = ctx.sampleRate * 6;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'pink') {
          // Paul Kellet's refined pink-noise filter
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        } else if (type === 'brown') {
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 3.5;
        } else {
          data[i] = white;
        }
      }
    }
    noiseCache[type] = buffer;
    return buffer;
  }

  function noise(type, nodes) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(type);
    src.loop = true;
    // Random offset so layers built from the same buffer don't phase-lock
    src.start(0, Math.random() * 5);
    nodes.push(src);
    return src;
  }

  function filter(type, frequency, Q, nodes) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    if (Q !== undefined) f.Q.value = Q;
    nodes.push(f);
    return f;
  }

  function gain(value, nodes) {
    const g = ctx.createGain();
    g.gain.value = value;
    nodes.push(g);
    return g;
  }

  // Slow sine LFO modulating an AudioParam around its current value
  function lfo(param, rate, depth, nodes) {
    const osc = ctx.createOscillator();
    osc.frequency.value = rate;
    const amt = gain(depth, nodes);
    osc.connect(amt).connect(param);
    osc.start();
    nodes.push(osc);
  }

  // Re-schedules fn at a random interval while the scene is active
  function every(minMs, maxMs, fn, scene) {
    const tick = () => {
      if (current !== scene) return;
      fn();
      scene.timers.push(setTimeout(tick, minMs + Math.random() * (maxMs - minMs)));
    };
    scene.timers.push(setTimeout(tick, minMs * Math.random()));
  }

  // Inharmonic partials of a Tibetan singing bowl, with gentle beating
  function bowl(base, level, decay, out) {
    const t = ctx.currentTime;
    [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]].forEach(([ratio, amp]) => {
      [0, 1.3].forEach(detune => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = base * ratio + detune;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(level * amp * 0.5, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay / ratio ** 0.4);
        osc.connect(g).connect(out);
        osc.start(t);
        osc.stop(t + decay + 0.1);
      });
    });
  }

  // ---- Scenes ----
  const SCENES = {
    rain(scene, out) {
      const n = scene.nodes;
      noise('pink', n).connect(filter('highpass', 450, 0.5, n)).connect(filter('lowpass', 7500, 0.5, n)).connect(gain(0.9, n)).connect(out);
      noise('brown', n).connect(filter('lowpass', 260, 0.7, n)).connect(gain(0.45, n)).connect(out);
      // Individual droplets on leaves and windows
      const dropBus = gain(0.5, n);
      dropBus.connect(out);
      every(40, 220, () => {
        const t = ctx.currentTime;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer('white');
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2000 + Math.random() * 4000;
        bp.Q.value = 6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.25 + Math.random() * 0.35, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.04 + Math.random() * 0.05);
        src.connect(bp).connect(g).connect(dropBus);
        src.start(t, Math.random() * 5, 0.12);
      }, scene);
    },

    ocean(scene, out) {
      const n = scene.nodes;
      const lp = filter('lowpass', 700, 0.6, n);
      const swell = gain(0.55, n);
      noise('brown', n).connect(lp).connect(swell).connect(out);
      lfo(lp.frequency, 0.075, 450, n);   // waves rolling in and out (~13 s)
      lfo(swell.gain, 0.075, 0.35, n);
      const hiss = filter('highpass', 1800, 0.4, n);
      const foam = gain(0.08, n);
      noise('pink', n).connect(hiss).connect(foam).connect(out);
      lfo(foam.gain, 0.075, 0.07, n);
    },

    forest(scene, out) {
      const n = scene.nodes;
      const bp = filter('bandpass', 550, 0.6, n);
      const wind = gain(0.7, n);
      noise('pink', n).connect(bp).connect(wind).connect(out);
      lfo(bp.frequency, 0.045, 280, n);
      lfo(wind.gain, 0.11, 0.3, n);
      // Distant birdsong: short chirps with a fast downward sweep
      const birds = gain(0.06, n);
      birds.connect(out);
      every(2500, 8000, () => {
        const chirps = 2 + Math.floor(Math.random() * 4);
        const base = 2600 + Math.random() * 2200;
        for (let i = 0; i < chirps; i++) {
          const t = ctx.currentTime + i * (0.09 + Math.random() * 0.05);
          const osc = ctx.createOscillator();
          osc.frequency.setValueAtTime(base * (1.15 + Math.random() * 0.2), t);
          osc.frequency.exponentialRampToValueAtTime(base * 0.8, t + 0.07);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(1, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.connect(g).connect(birds);
          osc.start(t);
          osc.stop(t + 0.1);
        }
      }, scene);
    },

    brown(scene, out) {
      const n = scene.nodes;
      noise('brown', n).connect(filter('lowpass', 520, 0.5, n)).connect(gain(1, n)).connect(out);
    },

    zen(scene, out) {
      const n = scene.nodes;
      // Soft drone on A2 with a fifth and octave, each breathing slowly
      [[110, 0.16], [164.8, 0.08], [220, 0.06]].forEach(([freq, level], i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = gain(level, n);
        osc.connect(g).connect(out);
        osc.start();
        n.push(osc);
        lfo(g.gain, 0.05 + i * 0.03, level * 0.6, n);
        lfo(osc.frequency, 0.07 + i * 0.02, 0.4, n);
      });
      const bowls = gain(0.5, n);
      bowls.connect(out);
      every(9000, 16000, () => bowl(220 * (Math.random() < 0.5 ? 1 : 1.5), 0.35, 9, bowls), scene);
    }
  };

  function stopScene(scene, fade) {
    if (!scene) return;
    scene.timers.forEach(clearTimeout);
    const t = ctx.currentTime;
    scene.out.gain.cancelScheduledValues(t);
    scene.out.gain.setValueAtTime(scene.out.gain.value, t);
    scene.out.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => {
      scene.nodes.forEach(node => {
        try { if (node.stop) node.stop(); } catch (e) { /* already stopped */ }
        try { node.disconnect(); } catch (e) { /* already disconnected */ }
      });
      scene.out.disconnect();
    }, fade * 1000 + 100);
  }

  function startScene(kind) {
    const scene = { kind, nodes: [], timers: [], out: ctx.createGain() };
    scene.out.gain.value = 0;
    scene.out.connect(master);
    current = scene;
    SCENES[kind](scene, scene.out);
    const t = ctx.currentTime;
    scene.out.gain.linearRampToValueAtTime(1, t + FADE);
  }

  window.ZenAmbient = {
    kinds: Object.keys(SCENES),
    has: kind => kind in SCENES,
    isPlaying: () => !!current,
    kind: () => (current ? current.kind : null),

    // Create/resume the context during a user gesture so later sounds
    // (e.g. the timer chime) are allowed to play.
    unlock() { ensureContext(); },

    play(kind) {
      if (!SCENES[kind]) return Promise.reject(new Error('Unknown sound: ' + kind));
      ensureContext();
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(VOLUME, t + 0.3);
      if (current && current.kind === kind) return Promise.resolve();
      stopScene(current, FADE); // crossfade into the new scene
      startScene(kind);
      return ctx.state === 'running' ? Promise.resolve() : ctx.resume();
    },

    stop() {
      if (!ctx || !current) return;
      const scene = current;
      current = null;
      stopScene(scene, 0.8);
    },

    // Bubble-wrap pop: a pitch-dropping blip plus a filtered noise snap, slightly varied each time
    pop() {
      ensureContext();
      const t = ctx.currentTime;
      const out = ctx.createGain();
      out.gain.value = 0.45;
      out.connect(ctx.destination);

      const f = 480 + Math.random() * 360;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.4, t + 0.06);
      const body = ctx.createGain();
      body.gain.setValueAtTime(0.0001, t);
      body.gain.exponentialRampToValueAtTime(0.6, t + 0.003);
      body.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(body).connect(out);
      osc.start(t);
      osc.stop(t + 0.1);

      const snap = ctx.createBufferSource();
      snap.buffer = noiseBuffer('white');
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800 + Math.random() * 1200;
      bp.Q.value = 1.2;
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.5, t);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      snap.connect(bp).connect(sg).connect(out);
      snap.start(t, Math.random() * 5);
      snap.stop(t + 0.05);

      setTimeout(() => out.disconnect(), 300);
    },

    // Raking sand: filtered noise whose loudness follows the stroke speed.
    // Returns { move(speed), end() } for one pointer stroke.
    sandStroke() {
      ensureContext();
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer('pink');
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      bp.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(bp).connect(g).connect(ctx.destination);
      src.start(0, Math.random() * 5);
      return {
        move(speed) {
          const t = ctx.currentTime;
          g.gain.setTargetAtTime(Math.min(0.18, speed * 0.004), t, 0.04);
          bp.frequency.setTargetAtTime(1100 + Math.min(900, speed * 12), t, 0.08);
        },
        end() {
          const t = ctx.currentTime;
          g.gain.setTargetAtTime(0, t, 0.06);
          src.stop(t + 0.4);
        }
      };
    },

    // Setting a lantern on the water: a soft drop followed by a distant bell
    lanternRelease() {
      ensureContext();
      const t = ctx.currentTime;
      const out = ctx.createGain();
      out.gain.value = 0.35;
      out.connect(ctx.destination);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.exponentialRampToValueAtTime(260, t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.3);
      setTimeout(() => bowl(523, 0.18, 5, out), 350);
      setTimeout(() => out.disconnect(), 6000);
    },

    // Quiet bowl tap marking a breathing phase change (higher when breathing in)
    breathCue(rising) {
      ensureContext();
      const out = ctx.createGain();
      out.gain.value = 0.22;
      out.connect(ctx.destination);
      bowl(rising ? 392 : 294, 0.35, 3.5, out);
      setTimeout(() => out.disconnect(), 4500);
    },

    // Two singing-bowl strikes for the end of a Pomodoro
    chime() {
      ensureContext();
      const out = ctx.createGain();
      out.gain.value = 0.6; // leaves headroom when an ambient scene is playing
      out.connect(ctx.destination);
      bowl(330, 0.5, 7, out);
      setTimeout(() => bowl(247, 0.4, 8, out), 1600);
      setTimeout(() => out.disconnect(), 11000);
    }
  };

})();
