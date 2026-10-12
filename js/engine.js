// =============================================================
// KOFI KESE - engine: input, audio, sprites hook, helpers
// =============================================================
window.KK = window.KK || {};
(function () {
  const C = KK.CONFIG;

  // ---------------- Helpers ----------------
  KK.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  KK.lerp = (a, b, t) => a + (b - a) * t;
  KK.rand = (a, b) => a + Math.random() * (b - a);
  KK.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  KK.store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  KK.fmtTime = (t) => {
    t = Math.floor(t);
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
  };

  // ---------------- Input (action layer) ----------------
  const ACTIONS = ['AIM', 'MOVE_LEFT', 'MOVE_RIGHT', 'UP', 'DOWN', 'JUMP', 'DODGE', 'NORMAL_ATTACK',
    'HEAVY_ATTACK_STAMINA', 'HEAVY_ATTACK_POWER', 'PAUSE'];
  const Input = KK.Input = {
    held: {}, pressed: {}, queue: new Set(), sources: {},
    press(a, src = 'k') {
      this.sources[a] = this.sources[a] || new Set();
      if (!this.sources[a].size) this.queue.add(a);
      this.sources[a].add(src);
      this.held[a] = true;
      KK.Audio.unlock();
    },
    release(a, src = 'k') {
      if (this.sources[a]) this.sources[a].delete(src);
      this.held[a] = !!(this.sources[a] && this.sources[a].size);
    },
    releaseAll() { for (const a of ACTIONS) { this.sources[a] = new Set(); this.held[a] = false; } },
    update() { this.pollPads(); this.pressed = {}; for (const a of this.queue) this.pressed[a] = true; this.queue.clear(); },
    // ---- gamepads (PS5, Xbox, Switch Pro... via the standard mapping) ----
    padConnected: false,
    pollPads() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const now = {}; let any = false;
      for (const gp of pads) {
        if (!gp) continue; any = true;
        if (KK.capturePad) { const i = gp.buttons.findIndex(b => b && b.pressed); if (i >= 0 && !this._padHeldIdx) { const f = KK.capturePad; KK.capturePad = null; this._padHeldIdx = true; f(i); } else if (i < 0) this._padHeldIdx = false; return; }
        if (this._padHeldIdx && !gp.buttons.some(b => b && b.pressed)) this._padHeldIdx = false;
        for (const [i, a] of Object.entries(C.PAD)) if (gp.buttons[i] && gp.buttons[i].pressed) now[a] = true;
        const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        if (ax < -0.45) now.MOVE_LEFT = true;
        if (ax > 0.45) now.MOVE_RIGHT = true;
        if (ay < -0.6) now.UP = true;
        if (ay > 0.6) now.DOWN = true;
      }
      if (any !== this.padConnected) { this.padConnected = any; if (KK.onPadChange) KK.onPadChange(any); }
      for (const a of ACTIONS) {
        if (now[a]) { if (!(this.sources[a] && this.sources[a].has('pad'))) this.press(a, 'pad'); }
        else if (this.sources[a] && this.sources[a].has('pad')) this.release(a, 'pad');
      }
    },
    confirm() { return this.pressed.JUMP || this.pressed.NORMAL_ATTACK || this.pressed.PAUSE; },
  };

  // remappable controls: player's choices are saved on the device and override the defaults in config.js
  KK.DEFAULT_KEYS = JSON.parse(JSON.stringify(C.KEYS));
  KK.DEFAULT_PAD = JSON.parse(JSON.stringify(C.PAD));
  const saved = KK.store.get('kofikese_controls');
  if (saved && saved.keys) C.KEYS = saved.keys;
  if (saved && saved.pad) C.PAD = saved.pad;
  const keyMap = {};
  KK.rebuildKeys = function () {
    for (const k of Object.keys(keyMap)) delete keyMap[k];
    for (const [action, keys] of Object.entries(C.KEYS)) for (const k of keys) (keyMap[k] = keyMap[k] || []).push(action);
    KK.store.set('kofikese_controls', { keys: C.KEYS, pad: C.PAD });
  };
  for (const [action, keys] of Object.entries(C.KEYS)) for (const k of keys) (keyMap[k] = keyMap[k] || []).push(action);
  window.addEventListener('keydown', (e) => {
    if (KK.captureKey) { e.preventDefault(); const f = KK.captureKey; KK.captureKey = null; f(e.key); return; }
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const acts = keyMap[e.key];
    if (e.key === 'm' || e.key === 'M') KK.Audio.toggle();
    if (!acts) return;
    e.preventDefault();
    if (e.repeat) return;
    for (const a of acts) Input.press(a, 'key:' + e.key);
  });
  window.addEventListener('keyup', (e) => {
    const acts = keyMap[e.key];
    if (!acts) return;
    for (const a of acts) Input.release(a, 'key:' + e.key);
  });
  window.addEventListener('blur', () => Input.releaseAll());

  // On-screen console buttons (click, tap, multi-touch)
  KK.bindButtons = function (root) {
    root.querySelectorAll('[data-action]').forEach(btn => {
      const acts = btn.dataset.action.split(',');
      const id = 'btn:' + btn.dataset.action + ':' + Math.random();
      const down = (e) => { e.preventDefault(); btn.classList.add('pressed'); for (const a of acts) Input.press(a, id); };
      const up = (e) => { e.preventDefault(); btn.classList.remove('pressed'); for (const a of acts) Input.release(a, id); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('contextmenu', e => e.preventDefault());
    });
  };

  // Virtual joystick: push left/right to move, UP to jump (or climb), DOWN to climb down / drop
  // Floating joystick: the base jumps to wherever the thumb lands in the left zone and is dragged
  // along when the thumb goes past its rim, so there is no exact spot to hit. Hysteresis on every
  // direction keeps it from flickering at the thresholds.
  KK.bindJoystick = function (base, knob) {
    const box = base.parentNode;
    let zone = document.getElementById('joyzone');
    if (!zone) { zone = document.createElement('div'); zone.id = 'joyzone'; box.insertBefore(zone, base); }
    let id = null, cx = 0, cy = 0, R = 1;
    const want = { MOVE_LEFT: false, MOVE_RIGHT: false, UP: false, DOWN: false };
    const apply = () => {
      for (const a in want) {
        const held = Input.sources[a] && Input.sources[a].has('joy');
        if (want[a] && !held) Input.press(a, 'joy'); else if (!want[a] && held) Input.release(a, 'joy');
      }
    };
    const place = () => { base.style.left = cx + 'px'; base.style.top = cy + 'px'; };
    const move = (e) => {
      const r = box.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let dx = x - cx, dy = y - cy; const m = Math.hypot(dx, dy), lim = R * 1.05;
      if (m > lim) { cx += dx * (1 - lim / m); cy += dy * (1 - lim / m); dx = x - cx; dy = y - cy; place(); }   // drag the base along
      const ux = dx / R, uy = dy / R, k = Math.min(1, Math.hypot(ux, uy));
      knob.style.transform = `translate(${ux * R * 0.55}px, ${uy * R * 0.55}px)`;
      want.MOVE_LEFT = ux < (want.MOVE_LEFT ? -0.16 : -0.26);
      want.MOVE_RIGHT = ux > (want.MOVE_RIGHT ? 0.16 : 0.26);
      want.UP = uy < (want.UP ? -0.38 : -0.5) && k > 0.4;
      want.DOWN = uy > (want.DOWN ? 0.42 : 0.55) && Math.abs(ux) < 0.8;
      apply();
    };
    const end = (e) => {
      if (e.pointerId !== id) return; id = null;
      knob.style.transform = ''; base.classList.remove('active'); base.style.left = base.style.top = '';
      for (const a in want) want[a] = false; apply();
    };
    const start = (e) => {
      if (id !== null) return;
      e.preventDefault(); id = e.pointerId; try { zone.setPointerCapture(id); } catch (_) { }
      const r = box.getBoundingClientRect(), br = base.getBoundingClientRect(); R = br.width / 2;
      cx = KK.clamp(e.clientX - r.left, R * 0.7, r.width * 0.5); cy = KK.clamp(e.clientY - r.top, -r.height * 0.3, r.height - R * 0.5);
      base.classList.add('active'); place(); move(e);
    };
    for (const el of [zone, base]) {
      el.addEventListener('pointerdown', start);
      el.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
    }
  };

  // ---------------- Audio (synth placeholders) ----------------
  KK.Audio = {
    ctx: null, muted: false,
    unlock() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    },
    toggle() { this.muted = !this.muted; return this.muted; },
    tone(freq, dur, type = 'square', vol = 0.06, slide = 0, delay = 0) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, vol = 0.05) {
      if (!this.ctx || this.muted) return;
      const n = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); g.gain.value = vol;
      s.buffer = buf; s.connect(g); g.connect(this.ctx.destination); s.start();
    },
    sfx(name) {
      switch (name) {
        case 'jump': this.tone(330, 0.12, 'square', 0.05, 300); break;
        case 'land': this.noise(0.04, 0.03); break;
        case 'dodge': this.tone(700, 0.15, 'sawtooth', 0.04, -500); break;
        case 'attack': this.tone(520, 0.06, 'square', 0.04, -200); break;
        case 'heavy': this.tone(200, 0.16, 'sawtooth', 0.06, -120); this.noise(0.08, 0.04); break;
        case 'power': this.tone(440, 0.3, 'triangle', 0.08, 440); this.tone(660, 0.3, 'square', 0.03, 200, 0.05); break;
        case 'hit': this.noise(0.06, 0.06); this.tone(160, 0.06, 'square', 0.04); break;
        case 'clang': this.tone(1200, 0.12, 'square', 0.04, -300); this.tone(1800, 0.1, 'triangle', 0.03); break;
        case 'hurt': this.tone(220, 0.2, 'square', 0.07, -150); break;
        case 'death': this.tone(400, 0.6, 'square', 0.06, -350); break;
        case 'pickup': this.tone(880, 0.07, 'square', 0.04); this.tone(1320, 0.1, 'square', 0.04, 0, 0.06); break;
        case 'gold': this.tone(988, 0.08, 'square', 0.05); this.tone(1319, 0.2, 'square', 0.05, 0, 0.07); break;
        case 'box': this.tone(260, 0.08, 'square', 0.05, 120); break;
        case 'switch': this.tone(500, 0.08, 'square', 0.05); this.tone(750, 0.12, 'square', 0.05, 0, 0.08); break;
        case 'portal': for (let i = 0; i < 6; i++) this.tone(300 + i * 120, 0.15, 'triangle', 0.05, 0, i * 0.07); break;
        case 'blip': this.tone(600, 0.025, 'square', 0.02); break;
        case 'menu': this.tone(700, 0.05, 'square', 0.04); break;
        case 'fire': this.noise(0.12, 0.04); this.tone(180, 0.15, 'sawtooth', 0.03, 80); break;
        case 'warn': this.tone(880, 0.08, 'square', 0.04); this.tone(880, 0.08, 'square', 0.04, 0, 0.12); break;
        case 'boss': this.tone(110, 0.5, 'sawtooth', 0.07, -40); break;
        case 'regen': for (let i = 0; i < 8; i++) this.tone(200 + i * 60, 0.12, 'triangle', 0.05, 0, i * 0.08); break;
      }
    },
  };

  // ---------------- Artwork loader ----------------
  // Loads every PNG found in assets/. Frames are probed in order (01.png, 1.png or "Layer 1.png") until one is missing,
  // so any number of frames works without editing code. Missing artwork falls back to the coloured shapes.
  const KEYMAP = { kofitia_habanfena: 'kofitia_palm', minionred: 'red', minionblue: 'blue', brafo: 'barafo', whiteMmoatia: 'white_mmoatia', goldMask: 'gold_mask', goldLion: 'gold_lion', goldSlime: 'gold_slime', gye: 'gye_nyame', proj_shock: 'proj_shockwave', proj_wave: 'proj_power_wave' };
  KK.spriteKey = (k) => KEYMAP[k] || k;
  const loadImg = (src) => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
  async function loadFrames(dir) {
    const pats = [i => String(i).padStart(2, '0') + '.png', i => i + '.png', i => 'Layer ' + i + '.png', i => 'Layer' + i + '.png'];
    let pat = null, first = null;
    for (const p of pats) { first = await loadImg(dir + encodeURI(p(1))); if (first) { pat = p; break; } }
    if (!first) return [];
    const frames = [first];
    for (let i = 2; i < 120; i++) { const im = await loadImg(dir + encodeURI(pat(i))); if (!im) break; frames.push(im); }
    return frames;
  }
  // sword shown in Kofitia's hand: 'afena' (story default: gold Afenakwa, palm leaf while it is stolen) or 'palm' (always the palm-leaf sword)
  KK.weapon = (() => { try { return localStorage.getItem('kofikese_weapon') || 'afena'; } catch (e) { return 'afena'; } })();
  KK.setWeapon = (w) => { KK.weapon = w; try { localStorage.setItem('kofikese_weapon', w); } catch (e) {} };
  KK.Sprites = {
    anims: {}, images: {}, defs: null, ready: false, progress: 0, _tmp: null,
    async load(defs) {
      this.defs = defs || { chars: {}, proj: {}, vfx: {}, pickups: {} };
      const jobs = [];
      const add = (key, anim, dir, meta) => jobs.push(async () => { const f = await loadFrames(dir); if (f.length) (this.anims[key] = this.anims[key] || {})[anim] = { frames: f, ...meta }; });
      for (const [key, d] of Object.entries(this.defs.chars)) for (const [anim, a] of Object.entries(d.anims)) {
        add(key, anim, `assets/sprites/${key}/${anim}/`, { loop: a.loop, fps: a.fps, w: d.w, h: d.h, body: d.body, base: d.base, pixel: d.pixel });
      }
      for (const [key, d] of Object.entries(this.defs.proj)) for (const part of ['start', 'loop', 'impact']) add(key, part, `assets/sprites/${key}/${part}/`, { loop: part === 'loop', w: d.w, h: d.h, proj: true });
      for (const [key, d] of Object.entries(this.defs.pickups)) add(key, 'idle', `assets/sprites/${key}/idle/`, { loop: true, w: d.w, h: d.h, pickup: true });
      for (const th of ['forge', 'w1', 'w2', 'w3']) for (const n of ['ground_top', 'ground_fill', 'ground_top_left', 'ground_top_right', 'ground_side_left', 'ground_side_right', 'platform_left', 'platform_middle', 'platform_right', 'ladder', 'spikes'])
        jobs.push(async () => { const im = await loadImg(`assets/tiles/${th}/${n}.png`); if (im) this.images[`tile/${th}/${n}`] = im; });
      for (const bg of ['forge', 'w1_forest', 'w1_samanteng', 'w2_forest', 'w3_clouds']) for (const n of ['bg_far', 'bg_mid', 'bg_near'])
        jobs.push(async () => { const im = await loadImg(`assets/backgrounds/${bg}/${n}.png`); if (im) this.images[`bg/${bg}/${n}`] = im; });
      for (const n of ['box', 'box_used', 'moving_platform', 'switch_platform', 'gate', 'boss_gate', 'exit', 'sign', 'nyamedua_pan', 'cloud_hole', 'forge', 'anvil'])
        jobs.push(async () => { const im = await loadImg(`assets/objects/${n}.png`); if (im) this.images[`obj/${n}`] = im; });
      for (const n of ['crumble_platform', 'switch', 'checkpoint', 'pan_water', 'forge_fire'])
        jobs.push(async () => { const f = await loadFrames(`assets/objects/${n}/`); if (f.length) this.images[`obj/${n}`] = f; });
      for (const n of ['kofitia', 'odade', 'samanteng', 'sasabonsam', 'barafo', 'basa', 'red', 'blue', 'giant_snake', 'giant_goat', 'giant_fowl', 'giant_monkey', 'giant_panther', 'giant_whiteMmoatia', 'giant_goldMask', 'giant_goldLion', 'giant_goldSlime'])
        jobs.push(async () => { const im = await loadImg(`assets/portraits/${n}.png`); if (im) this.images[`portrait/${n}`] = im; });
      for (const n of ['panel', 'btn', 'btn_sel', 'kente', 'icon_life', 'icon_stamina', 'icon_power', 'diamond'])
        jobs.push(async () => { const im = await loadImg(`assets/ui/${n}.png`); if (im) this.images[`ui/${n}`] = im; });
      let done = 0; const total = jobs.length, pool = 12; let next = 0;
      const worker = async () => { while (next < total) { const j = jobs[next++]; await j(); done++; this.progress = done / total; } };
      await Promise.all(Array.from({ length: pool }, worker));
      this.ready = true;
    },
    img(k) { return this.images[k]; },
    has(key) { return !!this.anims[KEYMAP[key] || key]; },
    // pick the frame for an animation; time in seconds since the animation started
    frame(key, anim, time, fallbacks = []) {
      const set = this.anims[KEYMAP[key] || key]; if (!set) return null;
      let a = set[anim]; for (const f of fallbacks) if (!a) a = set[f];
      if (!a) a = set.idle || set.move || set.fly || set.loop || Object.values(set)[0];
      const fps = a.fps || KK.SPRITE_FPS;
      let i = Math.floor(time * fps);
      i = a.loop ? i % a.frames.length : Math.min(i, a.frames.length - 1);
      return { a, img: a.frames[i], done: !a.loop && time * fps >= a.frames.length };
    },
    // draws a character so its baseline sits on the object's feet and its body matches the object's height
    draw(ctx, key, anim, time, x, y, w, h, flip, fx = {}) {
      const f = this.frame(key, anim, time, fx.fallbacks); if (!f) return false;
      const a = f.a, img = f.img;
      let sc, dx, dy;
      if (a.body) { sc = h / a.body; dx = x + w / 2 - (a.w * sc) / 2; dy = y + h - (a.h - (a.base || 24)) * sc; }
      else { sc = Math.max(w / a.w, h / a.h) * (a.pickup ? 1.4 : a.proj ? 2.4 : 1); dx = x + w / 2 - (a.w * sc) / 2; dy = y + h / 2 - (a.h * sc) / 2; }
      const dw = a.w * sc, dh = a.h * sc;
      this.blit(ctx, img, dx, dy, dw, dh, flip, { ...fx, pixel: a.pixel });
      if (fx.sword) { const s = this.frame(key, anim + '_sword', time); if (s) this.blit(ctx, s.img, dx, dy, dw, dh, flip, { tint: fx.sword === 'gold' ? null : fx.sword, alpha: fx.alpha }); }
      return true;
    },
    // draw with optional colour tint / flash applied only to the painted pixels
    blit(ctx, img, dx, dy, dw, dh, flip, fx = {}) {
      ctx.save();
      if (fx.pixel) ctx.imageSmoothingEnabled = false;   // pixel art stays crisp
      if (fx.alpha != null) ctx.globalAlpha *= fx.alpha;
      let src = img;
      if (fx.tint || fx.flash) {
        const c = this._tmp || (this._tmp = document.createElement('canvas'));
        c.width = img.width; c.height = img.height; const t = c.getContext('2d');
        t.clearRect(0, 0, c.width, c.height); t.drawImage(img, 0, 0);
        t.globalCompositeOperation = 'source-atop';
        if (fx.tint) { t.globalAlpha = 0.55; t.fillStyle = fx.tint; t.fillRect(0, 0, c.width, c.height); }
        if (fx.flash) { t.globalAlpha = 1; t.fillStyle = fx.flash; t.fillRect(0, 0, c.width, c.height); }
        src = c;
      }
      if (flip) { ctx.translate(dx + dw, dy); ctx.scale(-1, 1); ctx.drawImage(src, 0, 0, dw, dh); }
      else ctx.drawImage(src, dx, dy, dw, dh);
      ctx.restore();
    },
  };
})();
