// =============================================================
// KOFI KESE - game controller: scenes, levels, combat routing,
// scripts/dialogue, camera + zoom, HUD, score, sharing, beta tools
// =============================================================
(function () {
  const C = KK.CONFIG, T = C.TILE;
  const BASE_W = C.VIEW_W;
  let VW = BASE_W, VH = 300;            // base view in world pixels (portrait); updated on resize
  const FONT = '"Baloo 2", system-ui, sans-serif';
  const FONT_KR = '"KoradinPixel", "Koradin", serif';
  const SAVE_KEY = 'kofikese_save_v2';
  const DIFFS = ['easy', 'normal', 'hard'];
  const COL = { life: '#e8443a', stamina: '#ff9a2a', power: '#3a9cff', gold: '#ffd23f', cream: '#f5e6c8', muted: '#b39b7a' };

  class Game {
    constructor(canvas) {
      KK.game = this;
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.S = 1; this.ox = 0; this.oy = 0; this.zoom = 1; this.time = 0; this.scene = 'title'; this.menu = 'main'; this.menuIndex = 0; this.menuRects = [];
      this.beta = { invincible: false, fullResources: false, hitboxes: false };
      this.cam = { x: 0, y: 0 }; this.anchorY = null; this.shakeT = 0; this.shakeMag = 0; this.stopT = 0;
      this.particles = []; this.texts = []; this.ghosts = []; this.effects = []; this.respawns = [];
      this.fade = null; this.dialog = null; this.script = null; this.paused = false;
      this.setDifficulty(KK.store.get('kofikese_diff') || 'normal');
      this.gyeTotals = this.countGye();
      this.newRun();
      this.save = KK.store.get(SAVE_KEY);
      this.resize();
      window.addEventListener('resize', () => this.resize());
      canvas.addEventListener('pointerdown', (e) => this.onPointer(e));
      let last = performance.now(), acc = 0;
      const frame = (now) => {
        const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
        let steps = 0;
        while (acc >= 1 / 60 && steps < 5) { KK.Input.update(); this.update(1 / 60); this.tapped = false; acc -= 1 / 60; steps++; }
        if (steps === 5) acc = 0;
        this.render();
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }

    setDifficulty(k) { this.diffKey = DIFFS.includes(k) ? k : 'normal'; this.diff = C.DIFFICULTY[this.diffKey]; KK.store.set('kofikese_diff', this.diffKey); }
    newRun() {
      this.stats = { time: 0, gye: { 1: 0, 2: 0, 3: 0 }, lifeLost: 0, deaths: 0 };
      this.collected = {}; this.checkpoint = null; this.carry = null; this.seen = new Set(); this.swordGiven = false;
    }
    countGye() {
      const t = { 1: 0, 2: 0, 3: 0 };
      for (const id of KK.LEVEL_ORDER) { const L = KK.LEVELS[id], w = L.meta.world; if (!(w in t)) continue; for (const row of L.map) for (const c of row) if (c === '*' || c === 'G' || c === 'Q') t[w]++; }
      return t;
    }
    get gyeTotal() { return this.gyeTotals[1] + this.gyeTotals[2] + this.gyeTotals[3]; }
    get gyeCount() { return this.stats.gye[1] + this.stats.gye[2] + this.stats.gye[3]; }

    // ---------------- display sizing ----------------
    resize() {
      const host = this.canvas.parentElement, r = host.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
      if (!r.width || !r.height) return;
      const tv = document.body.classList.contains('tv');
      if (tv) { VH = C.TV_VIEW_H; VW = Math.round(VH * r.width / r.height); }
      else { VW = BASE_W; VH = Math.round(KK.clamp(VW * r.height / r.width, 140, 440)); }
      this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
      this.canvas.style.width = r.width + 'px'; this.canvas.style.height = r.height + 'px';
      this.S = Math.min(this.canvas.width / VW, this.canvas.height / VH);
      this.ox = (this.canvas.width - VW * this.S) / 2; this.oy = (this.canvas.height - VH * this.S) / 2;
      this.dpr = dpr; C.VIEW_W = VW; C.VIEW_H = VH;
    }
    onPointer(e) {
      KK.Audio.unlock();
      const r = this.canvas.getBoundingClientRect();
      const p = { x: ((e.clientX - r.left) * this.dpr - this.ox) / this.S, y: ((e.clientY - r.top) * this.dpr - this.oy) / this.S };
      for (const m of this.menuRects) if (p.x >= m.x && p.x <= m.x + m.w && p.y >= m.y && p.y <= m.y + m.h) { KK.Audio.sfx('menu'); m.go(); return; }
      this.tapped = true;
    }

    // ---------------- level management ----------------
    loadLevel(id, opts = {}) {
      const L = this.level = new KK.Level(id);
      this.levelId = id;
      const col = this.collected[id] = this.collected[id] || new Set();
      for (const b of L.spawns.boxes) if (col.has('b:' + b.x + ',' + b.y)) L.tiles[b.y][b.x] = 'b';
      const cp = this.checkpoint && this.checkpoint.level === id ? this.checkpoint : null;
      const start = cp ? { x: cp.x + 2, y: cp.y + T - C.PLAYER_H } : L.start;
      const p = this.player = new KK.Player(start.x, start.y);
      if (this.carry) Object.assign(p, this.carry);
      if (opts.respawn) { p.health = p.maxHealth; p.stamina = p.maxStamina; }
      if (L.meta.fullResources) { p.stamina = p.maxStamina; p.power = p.maxPower; }
      p.hasAfenakwa = KK.LEVEL_ORDER.indexOf(id) <= KK.LEVEL_ORDER.indexOf('w1_boss');
      p.noSword = id === 'forge' && !this.swordGiven;
      p.safe = { x: p.x, y: p.y };
      this.enemies = L.spawns.enemies.map(e => new KK.Enemy(e.type, e.x, e.y));
      const miniTypes = C.MINIBOSS_TYPES[id] || [];
      [...L.spawns.minibosses].sort((a, b) => a.x - b.x).forEach((m, i) => {
        if (col.has('m:' + m.x + ',' + m.y)) return;
        const type = miniTypes[i % Math.max(1, miniTypes.length)] || { 1: 'goat', 2: 'panther', 3: 'goldLion' }[L.meta.world];
        const e = new KK.Enemy(type, m.x, m.y, true); e.key = 'm:' + m.x + ',' + m.y; e.talkKey = id + '_' + i; this.enemies.push(e);
      });
      const st = C.STUNNERS[id]; if (st) { const e = this.enemies.find(e => e.type === st && !e.mini); if (e) e.stunner = true; }
      this.platforms = L.spawns.movers.map(m => new KK.MovingPlatform(m)).concat(L.spawns.crumbles.map(c => new KK.CrumblePlatform(c)));
      this.switches = L.spawns.switches.map((s, i) => new KK.Switch(s, i));
      this.checkpoints = L.spawns.checkpoints.map(c => ({ ...c, active: !!(cp && cp.x === c.x && cp.y === c.y) }));
      this.projectiles = []; this.particles = []; this.texts = []; this.ghosts = []; this.effects = []; this.bumps = []; this.respawns = [];
      this.boss = null; this.minions = null; this.bossStarted = false; this.bossBar = null; this.bossDone = false; this.exiting = false;
      this.dialog = null; this.script = null; this.paused = false; this.deathT = 0; this.zoom = 1; this.anchorY = null;
      this.arena = null;
      if (L.meta.boss) {
        const bs = L.bossSpawn;
        this.arena = { x0: (L.leftGateX + 1) * T, x1: L.rightGateX * T, groundY: KK.Bosses.groundBelow(L, bs.x + 8, bs.y) };
        if (L.meta.boss === 'sasabonsam') { this.boss = new KK.Bosses.Sasabonsam(bs.x, bs.y + T, this.arena); this.enemies.push(this.boss); }
        if (L.meta.boss === 'samanteng') { this.boss = new KK.Bosses.Samanteng(bs.x, this.arena.groundY); this.enemies.push(this.boss); }
      }
      // pickups; those inside a boss arena come back a few seconds after being eaten
      this.pickups = [];
      for (const k of L.spawns.pickups) {
        const inArena = this.arena && k.x > this.arena.x0 && k.x < this.arena.x1 && k.type !== 'gye';
        if (!inArena && col.has('p:' + k.key)) continue;
        const pk = new KK.Pickup(k.type, k.x, k.y, inArena ? null : k.key); pk.respawnDef = inArena ? k : null; this.pickups.push(pk);
      }
      this.snapCamera();
      this.scene = 'play';
      if (L.meta.intro && !opts.respawn && !opts.noCard) this.showCard();
      if (L.meta.cutscene === 'opening' && !this.swordGiven) this.openingScript();
      this.saveGame();
    }

    nextLevel() {
      const p = this.player;
      this.carry = { health: p.health, stamina: p.stamina, power: p.power };
      this.checkpoint = null;
      const next = this.level.meta.next;
      if (next === 'ending') return this.startEnding();
      this.transition(() => this.loadLevel(next));
    }
    transition(mid, color = '#000') { this.fade = { t: 0, dur: 0.45, mid, done: false, color }; }

    saveGame() {
      const col = {}; for (const [k, v] of Object.entries(this.collected)) col[k] = [...v];
      KK.store.set(SAVE_KEY, { level: this.levelId, stats: this.stats, collected: col, checkpoint: this.checkpoint, carry: this.carry, swordGiven: this.swordGiven, seen: [...this.seen], diff: this.diffKey });
      this.save = KK.store.get(SAVE_KEY);
    }
    continueGame() {
      const s = this.save; if (!s) return this.startNew(this.diffKey);
      this.newRun(); this.stats = s.stats; this.checkpoint = s.checkpoint; this.carry = s.carry; this.swordGiven = s.swordGiven; this.seen = new Set(s.seen || []);
      if (s.diff) this.setDifficulty(s.diff);
      for (const [k, v] of Object.entries(s.collected || {})) this.collected[k] = new Set(v);
      this.transition(() => this.loadLevel(s.level));
    }
    startNew(diff) { this.setDifficulty(diff); this.newRun(); KK.UI.hideShare(); this.transition(() => this.loadLevel('forge')); }
    jumpTo(id) {   // beta world select
      this.checkpoint = null; this.carry = null; this.paused = false; KK.UI.hideShare();
      if (KK.LEVEL_ORDER.indexOf(id) > 0) this.swordGiven = true;
      this.loadLevel(id);
    }
    onPlayerDeath() { this.stats.deaths++; this.deathT = 1.3; }
    showCard() { const m = this.level.meta; this.card = { t: 0, dur: 2.4, title: 'WORLD ' + m.world, sub: m.name }; }

    // ---------------- scripts & dialogue ----------------
    runScript(steps) { this.script = { steps, i: 0, t: 0 }; if (this.player) this.player.locked = true; KK.Input.releaseAll(); }
    updateScript(dt) {
      const s = this.script; if (!s) return;
      while (s.i < s.steps.length) {
        const st = s.steps[s.i];
        if (st.dialog) {
          if (!s.opened) {
            if ((st.once && this.seen.has(st.dialog)) || s.skipDialogs) { s.i++; continue; }   // already heard (e.g. retrying a boss): skip
            if (st.once) this.seen.add(st.dialog);
            this.openDialog(st.dialog); s.opened = true;
          }
          if (this.dialog) return;
          s.opened = false; s.i++; continue;
        }
        if (st.wait != null) { s.t += dt; if (s.t < st.wait) return; s.t = 0; s.i++; continue; }
        if (st.until) { s.t += dt; if (!st.until() && s.t < (st.max || 5)) return; s.t = 0; s.i++; continue; }
        if (st.fn) { st.fn(); s.i++; if (this.script !== s) return; continue; }
        s.i++;
      }
      this.script = null; if (this.player) this.player.locked = false;
    }
    openDialog(key) { const lines = typeof key === 'string' ? KK.DIALOGUE[key] : key; this.dialog = { lines, i: 0, chars: 0 }; }
    // skip: closes the current dialogue and any dialogue still queued in this scene
    skip() {
      if (this.scene === 'ending') { this.script = null; this.dialog = null; this.transition(() => this.showScore()); return; }
      this.dialog = null; if (this.script) this.script.skipDialogs = true; KK.Audio.sfx('menu');
    }
    updateDialog(dt) {
      const d = this.dialog; if (!d) return;
      if (KK.Input.pressed.PAUSE) { this.skip(); return; }
      const line = d.lines[d.i], prev = Math.floor(d.chars);
      d.chars = Math.min(line.t.length, d.chars + dt * 50);
      if (Math.floor(d.chars) !== prev && Math.floor(d.chars) % 3 === 0) KK.Audio.sfx('blip');
      if (KK.Input.confirm() || this.tapped) {
        if (d.chars < line.t.length) d.chars = line.t.length;
        else { d.i++; d.chars = 0; KK.Audio.sfx('menu'); if (d.i >= d.lines.length) this.dialog = null; }
      }
    }
    openingScript() {
      this.runScript([
        { wait: 0.6 }, { dialog: 'opening' },
        { fn: () => {
          this.swordGiven = true; this.player.noSword = false; this.player.hasAfenakwa = true; this.player.receiveT = 0.5; KK.Audio.sfx('gold'); this.odadeGive = this.time;
          for (let i = 0; i < 24; i++) this.particles.push(new KK.Particle(this.player.x + 6, this.player.y, KK.rand(-80, 80), KK.rand(-150, -20), '#ffd23f', 0.9));
          this.texts.push(new KK.FloatText(this.player.x + 6, this.player.y - 10, 'AFENAKWA', '#ffd23f', 11));
        } },
        { wait: 0.8 },
      ]);
    }

    // ---------------- boss flows ----------------
    startBoss() {
      const L = this.level, bs = L.bossSpawn, type = L.meta.boss;
      this.bossStarted = true; L.leftGateClosed = true; KK.Audio.sfx('boss'); this.shake(3);
      if (type === 'samanteng') {
        const b = this.boss;
        this.runScript([
          { wait: 0.4 }, { dialog: 'samantengIntro', once: true },
          { fn: () => {
            const gy = this.arena.groundY;
            this.minions = [new KK.Bosses.RedMinion(b.x - 36, gy), new KK.Bosses.BlueMinion(b.x + 36, gy)];
            for (const m of this.minions) { this.enemies.push(m); for (let i = 0; i < 12; i++) this.particles.push(new KK.Particle(m.x + 6, m.y + 10, KK.rand(-60, 60), KK.rand(-90, 0), '#e9e3d0', 0.6)); }
            b.phase = 'watch'; b.turn = null;
            this.bossBar = { label: 'samanteng', target: b, locked: true };
          } },
        ]);
      } else if (type === 'sasabonsam') {
        this.runScript([{ wait: 0.4 }, { dialog: 'sasabonsamIntro', once: true }, { fn: () => { this.boss.phase = 'fight'; this.bossBar = { label: 'sasabonsam', target: this.boss }; } }]);
      } else if (type === 'brafo') {
        const b = this.boss = new KK.Bosses.Brafo(bs.x, this.arena.groundY); b.arenaX0 = this.arena.x0; b.arenaX1 = this.arena.x1;
        this.enemies.push(b);
        for (let i = 0; i < 20; i++) this.particles.push(new KK.Particle(b.x + 20, b.y + 26, KK.rand(-90, 90), KK.rand(-120, 0), '#3a2f2a', 0.7));
        this.runScript([{ wait: 0.6 }, { dialog: 'brafoIntro', once: true }, { fn: () => { b.phase = 'fight'; this.bossBar = { label: 'brafo', target: b, hits: true }; } }]);
      }
    }

    bossEvent(ev, who) {
      const b = this.boss;
      if (ev === 'minionDead') {
        if (this.minions && this.minions.every(m => m.dead)) {
          const p = this.player;
          this.runScript([
            { wait: 0.5 }, { dialog: 'samantengSeize', once: true },
            { fn: () => { b.phase = 'script'; b.scriptVx = Math.sign(p.x - b.x) * 170; } },
            { until: () => Math.abs((p.x + p.w / 2) - (b.x + b.w / 2)) < 26, max: 2.5 },
            { fn: () => { b.scriptVx = 0; p.hasAfenakwa = false; b.holding = true; KK.Audio.sfx('clang'); this.shake(3); } },
            { wait: 0.5 },
            { fn: () => { b.holding = false; KK.Audio.sfx('dodge'); this.effects.push({ kind: 'thrown', x: b.x + b.w / 2, y: b.y - 10, vx: -b.dir * 160 - 60, vy: -260, rot: 0, life: 2 }); } },
            { wait: 0.8 },
            { dialog: 'samantengThrow', once: true },
            { fn: () => {
              KK.Audio.sfx('pickup');
              for (let i = 0; i < 16; i++) this.particles.push(new KK.Particle(p.x + 6, p.y + 6, KK.rand(-60, 60), KK.rand(-100, -10), '#b8733a', 0.7));
              b.phase = 'fight'; b.invulnerable = false; b.setMode(0); this.bossBar.locked = false;
            } },
          ]);
        }
      } else if (ev === 'bossDead') {
        const type = this.level.meta.boss;
        this.bossDone = true; this.bossBar = null; this.projectiles = this.projectiles.filter(pr => pr.owner === 'player');
        this.enemies.forEach(e => { if (e.minion) e.dead = true; });
        const open = { fn: () => { this.level.rightGateOpen = true; KK.Audio.sfx('switch'); this.shake(2); } };
        if (type === 'samanteng') this.runScript([{ wait: 0.8 }, { dialog: 'samantengDefeat' }, open]);
        if (type === 'sasabonsam') this.runScript([{ wait: 0.8 }, { dialog: 'sasabonsamDefeat' }, open]);
        if (type === 'brafo') this.runScript([
          { wait: 0.8 }, { dialog: 'brafoDefeat' },
          { fn: () => { this.effects.push({ kind: 'return', x: who.x + who.w / 2, y: who.y, t: 0, life: 1 }); } },
          { wait: 0.9 },
          { fn: () => { this.player.hasAfenakwa = true; KK.Audio.sfx('gold'); this.texts.push(new KK.FloatText(this.player.x + 6, this.player.y - 10, 'AFENAKWA', '#ffd23f', 11)); } },
          open,
        ]);
      } else if (ev === 'brafoRegen') {
        who.state = 'regen';
        this.runScript([
          { wait: 0.4 }, { dialog: 'brafoRegen', once: true },
          { fn: () => { KK.Audio.sfx('regen'); for (let i = 0; i < 40; i++) this.particles.push(new KK.Particle(who.x + KK.rand(0, who.w), who.y + who.h, KK.rand(-20, 20), KK.rand(-140, -40), '#ffd23f', 1.2, 2, -40)); } },
          { wait: 1.4 }, { fn: () => who.startPhase2() },
        ]);
      }
    }

    // ---------------- ending ----------------
    startEnding() {
      if (this.player) this.player.locked = true;
      this.transition(() => {
        this.scene = 'ending';
        const E = this.end = { swordY: KK.Sprites.has('kofitia_afenakwa') ? 30 : -20, swordOn: false, basa: false, caught: false, theEnd: false };
        const dl = KK.DIALOGUE.ending;
        this.script = { steps: [
          { wait: 0.8 }, { fn: () => { E.swordOn = true; } },
          { dialog: [dl[0]] }, { fn: () => { E.basa = true; } },
          { dialog: [dl[1]] }, { until: () => E.caught, max: 6 },
          { dialog: dl.slice(2) }, { fn: () => { E.theEnd = true; KK.Audio.sfx('portal'); } },
          { wait: 3 }, { fn: () => this.transition(() => this.showScore()) },
        ], i: 0, t: 0 };
      }, '#ffffff');
    }
    showScore() {
      this.scene = 'score';
      const s = this.stats;
      this.final = {
        time: s.time, gye: this.gyeCount, gyeTotal: this.gyeTotal, lifeLost: s.lifeLost, deaths: s.deaths, diff: this.diffKey,
        score: Math.max(0, Math.round(C.SCORE_BASE + C.SCORE_DIFFICULTY_BONUS[this.diffKey] + this.gyeCount * C.GYE_NYAME_SCORE - s.lifeLost * C.SCORE_LIFE_PENALTY - Math.floor(s.time) * C.SCORE_TIME_PENALTY - s.deaths * C.SCORE_DEATH_PENALTY)),
      };
      KK.store.del(SAVE_KEY); this.save = null;
      KK.UI.showShare(this.final);
    }
    harderDiff() { const i = DIFFS.indexOf(this.diffKey); return DIFFS[Math.min(2, i + 1)]; }
    playAgainHarder() { this.startNew(this.harderDiff()); }

    // ---------------- combat routing ----------------
    playerAttackHit(p, box, a) {
      for (const e of this.enemies) {
        if (e.dead || a.hits.has(e) || !KK.overlap(box, e)) continue;
        a.hits.add(e);
        e.takeHit({ dmg: a.d.dmg, kb: a.d.kb, kind: a.heavy ? (a.power ? 'heavyPower' : 'heavyStamina') : 'normal', heavy: a.heavy, power: a.power, air: a.air, dir: p.dir, normal: a.normal, stun: a.d.stun });
        this.hitSpark(box, e, a.heavy || a.step === 5);
        if (!e.isBoss) KK.Audio.sfx('hit');
        if (a.normal) p.power = Math.min(p.maxPower, p.power + C.POWER_PER_HIT + (a.step - 1) * C.POWER_PER_COMBO_STEP);
        if (a.air) { p.hangT = C.AIR_HANG; p.vy = Math.min(p.vy, 0); }
        if (a.heavy || a.step === 5) this.hitstop(0.05);
      }
      for (const s of this.switches) if (!s.on && KK.overlap(box, s)) this.activateSwitch(s);
    }
    shieldHit(p, box, s) {
      for (const e of this.enemies) {
        if (e.dead || e._shieldTick === s.id || !KK.overlap(box, e)) continue;
        e._shieldTick = s.id;
        e.takeHit({ dmg: C.SHIELD_DMG, kb: 110, kind: 'shield', heavy: true, power: false, air: true, dir: Math.sign(e.x - p.x) || 1, shieldId: s.act });
        this.hitSpark(box, e, false);
      }
      for (const q of this.projectiles) if (q.owner === 'enemy' && q.life > 0 && KK.overlap(box, q)) { q.life = 0; this.burst(q.x, q.y, q.color, 6); }
      for (const sw of this.switches) if (!sw.on && KK.overlap(box, sw)) this.activateSwitch(sw);
    }
    dodgeHit(p) {
      for (const e of this.enemies) {
        if (e.dead || p.dodgeHits.has(e) || !KK.overlap(p, e)) continue;
        p.dodgeHits.add(e);
        e.takeHit({ dmg: p.airDash ? C.AIR_DASH_DAMAGE : C.DODGE_DAMAGE, kb: p.airDash ? 160 : 40, kind: 'dodge', heavy: false, power: false, air: !p.onGround, dir: p.dodgeDir });
        this.hitSpark(p, e, false);
      }
    }
    hitSpark(a, e, big) {
      const x = (Math.max(a.x, e.x) + Math.min(a.x + a.w, e.x + e.w)) / 2, y = (Math.max(a.y, e.y) + Math.min(a.y + a.h, e.y + e.h)) / 2;
      for (let i = 0; i < (big ? 10 : 5); i++) this.particles.push(new KK.Particle(x, y, KK.rand(-100, 100), KK.rand(-100, 50), big ? '#fff2a8' : '#ffffff', 0.25, 2, 0));
    }
    burst(x, y, color, n) { for (let i = 0; i < n; i++) this.particles.push(new KK.Particle(x + 3, y + 3, KK.rand(-80, 80), KK.rand(-80, 20), color, 0.4)); }
    activateSwitch(s) { s.on = true; this.level.switchOn[s.index] = true; KK.Audio.sfx('switch'); this.texts.push(new KK.FloatText(s.x + 6, s.y - 6, 'ON', '#3fe08a', 10)); this.shake(1); }
    hitBox(tx, ty) {
      const L = this.level, c = L.tile(tx, ty);
      if (c !== 'B' && c !== 'C' && c !== 'G') { if (c === 'b' || c === '#') KK.Audio.sfx('land'); return; }
      L.tiles[ty][tx] = 'b'; this.collected[this.levelId].add('b:' + tx + ',' + ty);
      this.bumps.push({ tx, ty, t: 0.15 }); KK.Audio.sfx('box');
      for (const e of this.enemies) if (!e.dead && !e.isBoss && !e.mini && e.x < (tx + 1) * T && e.x + e.w > tx * T && Math.abs(e.y + e.h - ty * T) < 3) e.takeHit({ dmg: 99, dir: 1, kb: 0 });
      if (c === 'G') this.collectGye(tx * T + 8, ty * T - 8);
      else this.pickups.push(new KK.Pickup(c === 'B' ? 'banana' : 'cocoa', tx * T + 3, ty * T - 10, null, true));
    }
    collectGye(x, y) {
      const w = this.level.meta.world || 1;
      this.stats.gye[w] = (this.stats.gye[w] || 0) + 1; KK.Audio.sfx('gold');
      this.texts.push(new KK.FloatText(x, y, '+1', '#ffd23f', 11));
      for (let i = 0; i < 10; i++) this.particles.push(new KK.Particle(x, y, KK.rand(-60, 60), KK.rand(-120, -20), '#ffc61a', 0.6));
    }
    collect(k) {
      const p = this.player;
      if (k.key) this.collected[this.levelId].add('p:' + k.key);
      if (k.respawnDef) this.respawns.push({ def: k.respawnDef, t: this.diff.respawn });
      if (k.type === 'banana') { p.heal(C.BANANA_HEAL); KK.Audio.sfx('pickup'); this.texts.push(new KK.FloatText(k.x + 5, k.y - 4, '+' + C.BANANA_HEAL, '#ff7a6a', 11)); p.flashT = 0.25; p.flashColor = 'rgba(255,120,110,0.5)'; }
      else if (k.type === 'cocoa') { p.power = Math.min(p.maxPower, p.power + C.COCOA_RESTORE); KK.Audio.sfx('pickup'); this.texts.push(new KK.FloatText(k.x + 5, k.y - 4, '+' + C.COCOA_RESTORE, '#7ac8ff', 11)); p.flashT = 0.25; p.flashColor = 'rgba(80,170,255,0.5)'; }
      else this.collectGye(k.x + 5, k.y);
    }
    shake(m) { this.shakeMag = Math.max(this.shakeMag, m); this.shakeT = 0.25; }
    hitstop(t) { this.stopT = Math.max(this.stopT, t); }

    // =============================================================
    // UPDATE
    // =============================================================
    update(dt) {
      this.time += dt;
      const I = KK.Input;
      if (this.fade) {
        const f = this.fade; f.t += dt;
        if (!f.done && f.t >= f.dur) { f.done = true; f.mid && f.mid(); }
        if (f.t >= f.dur * 2) this.fade = null;
        if (!f.done) return;
      }
      if (KK.UI.controlsOpen) { if (I.pressed.PAUSE && !KK.captureKey && !KK.capturePad) KK.UI.closeControls(); return; }
      if (this.scene === 'title') return this.updateMenu();
      if (this.scene === 'ending') { this.updateEnding(dt); this.updateDialog(dt); this.updateScript(dt); return; }
      if (this.scene === 'score') {
        if (I.pressed.PAUSE) { KK.Audio.sfx('menu'); this.toTitle(); }
        else if (I.pressed.JUMP || I.pressed.NORMAL_ATTACK) { KK.Audio.sfx('portal'); this.playAgainHarder(); }
        return;
      }
      if (this.scene !== 'play') return;
      if (this.card) { this.card.t += dt; if (this.card.t > this.card.dur || (this.card.t > 0.6 && (I.confirm() || this.tapped))) this.card = null; return; }
      if (this.paused) return this.updateMenu();
      if (I.pressed.PAUSE && !this.dialog && !this.script) return this.pause();

      if (this.dialog) { this.updateDialog(dt); return; }
      this.updateScript(dt);
      if (this.dialog) return;
      if (!this.script) this.stats.time += dt;
      if (this.stopT > 0) { this.stopT -= dt; return; }
      // a mini-boss with something to say talks once, when Kofitia first walks up to it
      const mf = this.miniFocus;
      if (mf && !mf.dead && !this.script && !mf.talked && mf.talkKey && KK.DIALOGUE['mini_' + mf.talkKey] && this.player.onGround && Math.abs(mf.x + mf.w / 2 - (this.player.x + this.player.w / 2)) < 130) {
        mf.talked = true; this.runScript([{ dialog: 'mini_' + mf.talkKey, once: true }]); return;
      }
      this.shakeT = Math.max(0, this.shakeT - dt); if (!this.shakeT) this.shakeMag = 0;

      const p = this.player, L = this.level, edt = dt * this.diff.speed;
      for (const pl of this.platforms) pl.update(dt, p);
      p.update(dt);
      // L2 / E held: lock Heavy 2 on the nearest enemy (bosses first)
      this.aimTarget = null;
      if (KK.Input.pressed.AIM) { this.lockOn = !this.lockOn; KK.Audio.sfx('menu'); const lb = document.querySelector('.btn.lock'); if (lb) lb.classList.toggle('on', this.lockOn); }
      if (this.lockOn && !p.dead) {
        let best = null, bd = 1e9;
        for (const e of this.enemies) {
          if (e.dead || (e.minion && e.safe)) continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y) - (e.isBoss ? 120 : 0) + ((e.x - p.x) * p.dir < 0 ? 60 : 0);
          if (Math.abs(e.x - p.x) < 300 && Math.abs(e.y - p.y) < 220 && d < bd) { bd = d; best = e; }
        }
        this.aimTarget = best;
        if (best && !p.attack) p.dir = Math.sign(best.x + best.w / 2 - (p.x + p.w / 2)) || p.dir;
      }
      if (p.dead) {
        this.deathT -= dt;
        if (this.deathT <= 0 && !this.fade) { this.carry = { health: p.maxHealth, stamina: p.maxStamina, power: p.power }; this.transition(() => this.loadLevel(this.levelId, { respawn: true })); this.deathT = 99; }
      }

      for (const e of this.enemies) if (!e.dead) {
        if (Math.abs(e.x - p.x) < 440 || e.isBoss) e.update(edt);
        if (e.dead || p.dead || !KK.overlap(e, p)) continue;
        const stomp = p.vy > 30 && p.prevBottom <= e.y + 7 && !p.dodgeT && p.stomps < C.MAX_STOMPS;
        if (stomp) {
          e.takeHit({ dmg: C.STOMP_DMG, kb: 40, kind: 'stomp', heavy: false, power: false, air: true, dir: p.dir });
          p.y = e.y - p.h; p.vy = -C.STOMP_BOUNCE; p.airDodges = C.AIR_DODGES; p.stomps++; p.stompT = 0.25; KK.Audio.sfx('box');
          this.texts.push(new KK.FloatText(p.x + 6, p.y - 4, 'STOMP', '#ffffff', 9));
        } else if (e.contactDmg && !p.dodgeT && !p.shield) {
          const before = p.health; p.hurt(e.contactDmg, e.x + e.w / 2);
          if (e.stunner && p.health < before && !p.dead) { p.dizzyT = C.STUN_TIME; p.invuln = Math.max(p.invuln, C.STUN_TIME + 0.6); /* no stun-lock */ this.texts.push(new KK.FloatText(p.x + 6, p.y - 8, 'STUNNED', '#c78bff', 10)); }
        }
      }
      for (const e of this.enemies) if (e.dead && e.mini && e.key && !e.counted) { e.counted = true; this.collected[this.levelId].add(e.key); }
      this.enemies = this.enemies.filter(e => !e.dead || e === this.boss);

      for (const pr of this.projectiles) {
        if (!pr.update(pr.owner === 'enemy' ? edt : dt, L)) continue;
        if (pr.owner === 'player') {
          for (const e of this.enemies) if (!e.dead && !pr.hitIds.has(e) && KK.overlap(pr, e)) { pr.hitIds.add(e); e.takeHit({ dmg: pr.dmg, kb: 120, kind: 'wave', heavy: true, power: true, air: pr.air, dir: Math.sign(pr.vx) }); this.hitSpark(pr, e, true); }
          for (const q of this.projectiles) if (q.owner === 'enemy' && q.life > 0 && KK.overlap(pr, q)) { q.life = 0; this.burst(q.x, q.y, q.color, 6); }
          for (const s of this.switches) if (!s.on && KK.overlap(pr, s)) this.activateSwitch(s);
        } else if (!p.dead && KK.overlap(pr, p)) {
          if (p.invuln > 0 || p.shield) continue;
          p.hurt(pr.dmg, pr.x + pr.w / 2); if (pr.kind !== 'shock') pr.life = 0;
        }
      }
      this.projectiles = this.projectiles.filter(pr => pr.life > 0);

      for (const k of this.pickups) { k.update(dt, L); if (!p.dead && k.delay <= 0 && KK.overlap(k, p)) { k.taken = true; this.collect(k); } }
      this.pickups = this.pickups.filter(k => !k.taken && k.y < L.pxH + 50);
      for (const r of this.respawns) { r.t -= dt; if (r.t <= 0) { const pk = new KK.Pickup(r.def.type, r.def.x, r.def.y, null); pk.respawnDef = r.def; this.pickups.push(pk); this.burst(r.def.x, r.def.y, '#fff6c8', 6); } }
      this.respawns = this.respawns.filter(r => r.t > 0);

      for (const c of this.checkpoints) if (!c.active && Math.abs(p.x - c.x) < 14 && Math.abs(p.y + p.h - (c.y + T)) < 24) {
        this.checkpoints.forEach(o => o.active = false); c.active = true;
        this.checkpoint = { level: this.levelId, x: c.x, y: c.y };
        KK.Audio.sfx('switch'); this.texts.push(new KK.FloatText(c.x + 8, c.y - 10, 'CHECKPOINT', '#ffd23f', 10)); this.saveGame();
      }
      if (L.meta.boss && !this.bossStarted && p.x > (L.leftGateX + 2) * T) this.startBoss();
      if (!this.exiting && !p.dead) {
        for (const e of L.spawns.exits) if (KK.overlap(p, e)) { this.exiting = true; KK.Audio.sfx('portal'); this.nextLevel(); }
        for (const o of L.spawns.portals) if (KK.overlap(p, o)) {
          this.exiting = true;
          const tx = o.x + o.w / 2 - p.w / 2, ty = o.y - 2;
          this.runScript([{ dialog: 'portalHint', once: true },
            { fn: () => { p.panDive = { t: 0, x0: p.x, y0: p.y, tx, ty, dur: 1.2 }; KK.Audio.sfx('jump'); } },
            { until: () => !p.panDive || p.panDive.t >= p.panDive.dur, max: 2 },
            { fn: () => { KK.Audio.sfx('portal'); this.portalFx = 1; for (let i = 0; i < 20; i++) this.particles.push(new KK.Particle(tx + 6, ty + 4, KK.rand(-60, 60), KK.rand(-140, -20), '#9fd8ff', 0.7)); } },
            { wait: 0.6 }, { fn: () => this.nextLevel() }]);
        }
        const cx = Math.floor((p.x + p.w / 2) / T), cy = Math.floor((p.y + p.h / 2) / T);
        if (L.tile(cx, cy) === 'U' || L.tile(cx, cy + 1) === 'U') { this.exiting = true; this.startEnding(); }
      }

      for (const g of this.ghosts) g.life -= dt; this.ghosts = this.ghosts.filter(g => g.life > 0);
      this.particles = this.particles.filter(q => q.update(dt));
      this.texts = this.texts.filter(t => t.update(dt));
      for (const b of this.bumps) b.t -= dt; this.bumps = this.bumps.filter(b => b.t > 0);
      for (const fx of this.effects) {
        if (fx.kind === 'thrown') { fx.vy += 500 * dt; fx.x += fx.vx * dt; fx.y += fx.vy * dt; fx.rot += dt * 20; fx.life -= dt; }
        if (fx.kind === 'return') { fx.t += dt; fx.x += (p.x + 6 - fx.x) * Math.min(1, dt * 4); fx.y += (p.y - fx.y) * Math.min(1, dt * 4); fx.life = fx.t > 0.9 ? 0 : 1; }
      }
      this.effects = this.effects.filter(fx => fx.life > 0);
      this.updateCamera(dt);
    }

    // the big foe the camera keeps in frame (boss fight, or a nearby mini-boss)
    focusFoe() {
      const p = this.player;
      if (this.boss && this.bossStarted && !this.bossDone && !this.boss.dead) {
        const kid = this.minions && this.minions.find(m => !m.dead && m.role === 'active');
        return kid || this.boss;
      }
      const L = this.level; if (!L.secret) L.buildSecrets();
      const inSecret = (o) => L.secret.has(Math.floor((o.x + o.w / 2) / T) + ',' + Math.floor((o.y + o.h - 2) / T));
      for (const e of this.enemies) if (e.mini && !e.dead && Math.abs(e.x - p.x) < 260 && Math.abs(e.y - p.y) < 160 && (!inSecret(e) || inSecret(p))) return e;
      return null;
    }
    updateCamera(dt) {
      const p = this.player, c = this.cam, k = 1 - Math.exp(-dt * 6);
      const foe = this.focusFoe();
      this.miniFocus = foe && foe.mini ? foe : null;
      let cx = p.x + p.w / 2 + p.dir * 14, ty, zt = 1;
      if (foe) {
        // zoom out just enough to keep Kofitia and the foe on screen together
        const x0 = Math.min(p.x, foe.x) - 30, x1 = Math.max(p.x + p.w, foe.x + foe.w) + 30;
        const y0 = Math.min(p.y, foe.y) - 30, y1 = Math.max(p.y + p.h, foe.y + foe.h);
        zt = KK.clamp(Math.max((x1 - x0) / VW, (y1 - y0) / (VH * 0.6)), 1, 2.3);
        cx = (x0 + x1) / 2;
        const vhz = VH * zt; ty = Math.min(y1 - vhz * (document.body.classList.contains('tv') ? 0.8 : 0.62), y0 - 30);
      }
      this.zoom += (zt - this.zoom) * (1 - Math.exp(-dt * 3));
      const vw = VW * this.zoom, vh = VH * this.zoom;
      if (!foe) {
        // platformer camera: hold the last ground height so jumps don't swing the view
        if (this.anchorY == null || p.onGround || p.climbing || p.y > this.anchorY + 4 || p.y < this.anchorY - vh * 0.3) this.anchorY = p.y;
        ty = this.anchorY + p.h - vh * (document.body.classList.contains('tv') ? 0.72 : 0.6);
      }
      c.x += (cx - vw / 2 - c.x) * k; c.y += (ty - c.y) * k;
      c.x = KK.clamp(c.x, p.x + p.w + 24 - vw, p.x - 24);   // Kofitia never leaves the screen
      this.clampCamera(vw, vh);
    }
    snapCamera() { const p = this.player; this.anchorY = p.y; const vw = VW * this.zoom, vh = VH * this.zoom; this.cam.x = p.x + p.w / 2 - vw / 2; this.cam.y = p.y + p.h - vh * (document.body.classList.contains('tv') ? 0.72 : 0.6); this.clampCamera(vw, vh); }
    clampCamera(vw, vh) {
      const L = this.level, c = this.cam;
      c.x = L.pxW <= vw ? (L.pxW - vw) / 2 : KK.clamp(c.x, 0, L.pxW - vw);
      const maxY = L.pxH + 4 * T - vh;   // the ground continues a few rows under the map
      c.y = Math.min(c.y, maxY); c.y = Math.max(c.y, Math.min(-T * 2, maxY));
    }

    // ---------------- menus (title, difficulty, pause) ----------------
    menuItems() {
      if (this.scene === 'title' && this.menu === 'main') {
        const o = [];
        if (this.save) o.push({ label: 'CONTINUE', go: () => this.continueGame() });
        o.push({ label: 'NEW GAME', go: () => { this.menu = 'diff'; this.menuIndex = DIFFS.indexOf(this.diffKey); } });
        o.push({ label: 'SWORD: ' + (KK.weapon === 'palm' ? 'PALM LEAF' : 'AFENA'), go: () => { KK.setWeapon(KK.weapon === 'palm' ? 'afena' : 'palm'); } });
        o.push({ label: 'CONTROLS', go: () => KK.UI.openControls() });
        return o;
      }
      if (this.scene === 'title' && this.menu === 'diff') return [
        ...DIFFS.map(d => ({ label: C.DIFFICULTY[d].label, hint: { easy: 'slower, calmer enemies', normal: 'balanced', hard: 'fast and deadly' }[d], go: () => this.startNew(d) })),
        { label: 'BACK', go: () => { this.menu = 'main'; this.menuIndex = 0; } },
      ];
      return [
        { label: 'RESUME', go: () => { this.paused = false; } },
        { label: 'RESTART LEVEL', go: () => { this.paused = false; this.transition(() => this.loadLevel(this.levelId, { respawn: true })); } },
        { label: 'DIFFICULTY: ' + this.diff.label, go: () => { this.setDifficulty(DIFFS[(DIFFS.indexOf(this.diffKey) + 1) % 3]); } },
        { label: 'SWORD: ' + (KK.weapon === 'palm' ? 'PALM LEAF' : 'AFENA'), go: () => { KK.setWeapon(KK.weapon === 'palm' ? 'afena' : 'palm'); } },
        { label: 'CONTROLS', go: () => KK.UI.openControls() },
        { label: 'TITLE SCREEN', go: () => { this.saveGame(); this.toTitle(); } },
      ];
    }
    pause() { this.paused = true; this.menuIndex = 0; KK.Audio.sfx('menu'); }
    updateMenu() {
      const I = KK.Input, items = this.menuItems(), n = items.length;
      if (this.menuIndex >= n) this.menuIndex = 0;
      if (I.pressed.UP || I.pressed.MOVE_LEFT) { this.menuIndex = (this.menuIndex + n - 1) % n; KK.Audio.sfx('menu'); }
      if (I.pressed.DOWN || I.pressed.MOVE_RIGHT) { this.menuIndex = (this.menuIndex + 1) % n; KK.Audio.sfx('menu'); }
      if (this.paused && I.pressed.PAUSE) { this.paused = false; return; }
      if (I.pressed.JUMP || I.pressed.NORMAL_ATTACK || (!this.paused && I.pressed.PAUSE)) { KK.Audio.unlock(); KK.Audio.sfx('menu'); items[this.menuIndex].go(); }
    }
    toTitle() { KK.UI.hideShare(); this.scene = 'title'; this.menu = 'main'; this.menuIndex = 0; this.paused = false; this.save = KK.store.get(SAVE_KEY); }

    updateEnding(dt) {
      const E = this.end; if (!E) return;
      if (E.swordOn && !E.caught) { E.swordY += dt * (E.basa ? 70 : 32); if (E.basa && E.swordY >= VH * 0.58 - 44) { E.caught = true; KK.Audio.sfx('gold'); } }
    }

    // =============================================================
    // RENDER
    // =============================================================
    render() {
      const ctx = this.ctx;
      ctx.imageSmoothingEnabled = false;   // the artwork is pixel art: keep its pixels crisp
      const touch = this.scene === 'play' && !this.paused && !this.dialog && !this.script && !this.card && !KK.UI.controlsOpen;
      if (touch !== this._touchShown) { this._touchShown = touch; document.body.classList.toggle('show-touch', touch); }
      const skipV = (this.scene === 'play' || this.scene === 'ending') && !!(this.dialog || this.script) && !this.fade;
      if (skipV !== this._skipShown) { this._skipShown = skipV; const sb = document.getElementById('skipBtn'); if (sb) sb.hidden = !skipV; }
      const showPause = this.scene === 'play' && !this.paused;
      if (showPause !== this._pauseShown) { this._pauseShown = showPause; const pb = document.getElementById('pauseBtn'); if (pb) pb.hidden = !showPause; }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0c0705'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(this.S, 0, 0, this.S, this.ox, this.oy); ctx.imageSmoothingEnabled = false;
      this.menuRects = [];
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
      if (this.scene === 'title') this.drawTitle(ctx);
      else if (this.scene === 'play') this.drawPlay(ctx);
      else if (this.scene === 'ending') this.drawEnding(ctx);
      else if (this.scene === 'score') this.drawScore(ctx);
      if (this.fade) { const f = this.fade, a = f.t < f.dur ? f.t / f.dur : 1 - (f.t - f.dur) / f.dur; ctx.globalAlpha = KK.clamp(a, 0, 1); ctx.fillStyle = f.color; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
      ctx.restore();
    }

    text(ctx, str, x, y, { size = 9, font = FONT, weight = 700, color = '#fff', align = 'left', base = 'top', stroke = 'rgba(0,0,0,0.6)' } = {}) {
      ctx.font = font === FONT ? `${weight} ${size}px ${font}` : `${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = base;
      if (stroke) { ctx.lineWidth = Math.max(1.5, size / 5); ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
      ctx.fillStyle = color; ctx.fillText(str, x, y);
    }
    wrapText(ctx, str, x, y, maxW, lineH, style) {
      const setFont = () => { ctx.font = `${style.weight || 600} ${style.size}px ${FONT}`; };
      setFont();
      const words = str.split(' '); let line = '', yy = y;
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) { this.text(ctx, line, x, yy, style); setFont(); line = w; yy += lineH; }
        else line = test;
      }
      if (line) this.text(ctx, line, x, yy, style);
      return yy + lineH;
    }
    // ---- Akan UI kit (art: assets/ui, made with adwinifie/tools/ui_gen.py; 1 art px = 0.5 game px)
    nine(ctx, key, x, y, w, h, c) {
      const im = KK.Sprites.img('ui/' + key); if (!im) return false;
      const C2 = c * 8, W = im.width, H = im.height;
      const sx = [0, C2, W - C2], sw = [C2, W - 2 * C2, C2], dx = [x, x + c, x + w - c], dw = [c, w - 2 * c, c];
      const sy = [0, C2, H - C2], sh = [C2, H - 2 * C2, C2], dy = [y, y + c, y + h - c], dh = [c, h - 2 * c, c];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (dw[i] > 0 && dh[j] > 0 && sw[i] > 0 && sh[j] > 0) ctx.drawImage(im, sx[i], sy[j], sw[i], sh[j], dx[i], dy[j], dw[i], dh[j]);
      return true;
    }
    wood(ctx, x, y, w, h, alpha = 1) {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, `rgba(46,26,13,${alpha})`); g.addColorStop(1, `rgba(20,11,6,${alpha})`);
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,190,120,0.035)';
      for (let yy = y + 3, i = 0; yy < y + h - 2; yy += 2.5 + (i * 7) % 4 * 0.5, i++) ctx.fillRect(x + 2 + (i * 13) % 9, yy, w - 4 - (i * 5) % 14, 0.5);
    }
    kente(ctx, x, y, w) {
      const im = KK.Sprites.img('ui/kente'); x = Math.round(x * 2) / 2; y = Math.round(y * 2) / 2;
      if (!im) { ctx.fillStyle = '#c9971a'; ctx.fillRect(x, y, w, 2); return; }
      for (let i = 0; i < w; i += 8) { const k = Math.min(8, w - i); ctx.drawImage(im, 0, 0, k * 8, im.height, x + i, y, k, im.height / 8); }
    }
    icon(ctx, key, x, y, size = 8) { const im = KK.Sprites.img('ui/' + key); if (im) ctx.drawImage(im, Math.round(x * 2) / 2, Math.round(y * 2) / 2, size, size); return !!im; }
    panel(ctx, x, y, w, h, r = 6) {
      x = Math.round(x * 2) / 2; y = Math.round(y * 2) / 2; w = Math.round(w * 2) / 2; h = Math.round(h * 2) / 2;
      if (KK.Sprites.img('ui/panel')) { this.wood(ctx, x + 1, y + 1, w - 2, h - 2); this.nine(ctx, 'panel', x, y, w, h, 6); return; }
      ctx.fillStyle = 'rgba(20,12,7,0.9)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
      ctx.strokeStyle = 'rgba(201,151,26,0.85)'; ctx.lineWidth = 1; ctx.stroke();
    }
    // gold-framed gauge: trough, fill with a light top edge, tenth ticks
    gauge(ctx, x, y, w, h, v, max, col, flash) {
      ctx.fillStyle = '#1a0d07'; ctx.fillRect(x, y, w, h);
      const f = KK.clamp(v / max, 0, 1) * w;
      if (f > 0) {
        ctx.fillStyle = col; ctx.fillRect(x, y, f, h);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, f, 0.5);
        ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x, y + h - 1, f, 1);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; for (let i = 1; i < 10; i++) ctx.fillRect(x + Math.round(w * i / 10 * 2) / 2, y, 0.5, h);
      ctx.strokeStyle = flash > 0 && Math.floor(flash * 20) % 2 ? '#ffffff' : '#c9971a'; ctx.lineWidth = 0.5; ctx.strokeRect(x - 0.25, y - 0.25, w + 0.5, h + 0.5);
      ctx.strokeStyle = 'rgba(26,15,13,0.9)'; ctx.strokeRect(x - 0.75, y - 0.75, w + 1.5, h + 1.5);
    }
    drawMenu(ctx, items, y0, gap = 20) {
      const art = !!KK.Sprites.img('ui/btn');
      items.forEach((o, i) => {
        const sel = i === this.menuIndex, w = 140, x = VW / 2 - w / 2, y = y0 + i * gap, h = gap - 4;
        if (art) {
          this.wood(ctx, x + 1, y + 1, w - 2, h - 2, sel ? 0.97 : 0.85);
          if (sel) { ctx.fillStyle = 'rgba(255,198,26,0.12)'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2); }
          this.nine(ctx, sel ? 'btn_sel' : 'btn', x, y, w, h, 3);
          if (sel) { const b = Math.sin(this.time * 6) * 1; this.icon(ctx, 'diamond', x - 6 + b, y + h / 2 - 2, 4); this.icon(ctx, 'diamond', x + w + 2 - b, y + h / 2 - 2, 4); }
        } else {
          ctx.fillStyle = sel ? 'rgba(255,210,63,0.18)' : 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.fill();
          if (sel) { ctx.strokeStyle = COL.gold; ctx.lineWidth = 1; ctx.stroke(); }
        }
        this.text(ctx, o.label, VW / 2, y + h / 2 + (o.hint ? -3 : 0.5), { size: 10, align: 'center', base: 'middle', color: sel ? '#ffe08a' : '#d8c4a0', weight: 800, stroke: sel ? 'rgba(60,30,0,0.7)' : null });
        if (o.hint) this.text(ctx, o.hint, VW / 2, y + h / 2 + 6, { size: 6.5, align: 'center', base: 'middle', color: COL.muted, weight: 600, stroke: null });
        this.menuRects.push({ x, y, w, h, go: () => { this.menuIndex = i; o.go(); } });
      });
    }

    drawTitle(ctx) {
      const t = this.time;
      // the forge at night: parallax art if loaded, warm gradient otherwise
      const far = KK.Sprites.img('bg/forge/bg_far'), mid = KK.Sprites.img('bg/forge/bg_mid');
      if (far) {
        for (const [im, sp] of [[far, 2], [mid, 5]]) { if (!im) continue; const h = VH, w = im.width / im.height * h; const ox = -((t * sp) % w); for (let x = ox; x < VW; x += w) ctx.drawImage(im, x, 0, w, h); }
        const v = ctx.createLinearGradient(0, 0, 0, VH); v.addColorStop(0, 'rgba(12,6,3,0.82)'); v.addColorStop(0.55, 'rgba(30,12,4,0.55)'); v.addColorStop(1, 'rgba(12,6,3,0.92)');
        ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
      } else { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#1b0f08'); g.addColorStop(1, '#5a2a10'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
      for (let i = 0; i < 36; i++) { const a = 0.25 + 0.4 * Math.sin(t * 2 + i); ctx.fillStyle = `rgba(255,${150 + (i * 13) % 80},40,${a})`; ctx.fillRect((i * 47 + Math.sin(t + i) * 4) % VW, VH - ((i * 29 + t * 9) % VH), 1, 1); }
      const top = Math.max(12, VH * 0.07);
      // logo plaque
      this.panel(ctx, 14, top, VW - 28, 66);
      this.kente(ctx, 18, top + 4, VW - 36);
      this.text(ctx, 'KOFI KESE', VW / 2, top + 11, { size: 26, align: 'center', color: COL.gold, weight: 800, stroke: '#5a2a00' });
      this.text(ctx, 'Kofi Kese', VW / 2, top + 38, { size: 21.43, font: FONT_KR, align: 'center', color: COL.cream, stroke: null });
      this.kente(ctx, 18, top + 58, VW - 36);
      // Kofitia with his sword, big, on a glowing step
      const ky = top + 140, sc = 2.6, key = KK.weapon === 'palm' ? 'kofitia_palm' : 'kofitia_afenakwa';
      const glow = ctx.createRadialGradient(VW / 2, ky, 2, VW / 2, ky, 46); glow.addColorStop(0, 'rgba(255,170,60,0.35)'); glow.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = glow; ctx.fillRect(VW / 2 - 50, ky - 60, 100, 70);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(VW / 2, ky, 16, 3, 0, 0, Math.PI * 2); ctx.fill();
      if (KK.Sprites.has(key)) {
        ctx.save(); ctx.translate(VW / 2, ky); ctx.scale(sc, sc);
        KK.Sprites.draw(ctx, key, 'idle', t, -C.PLAYER_W / 2, -C.PLAYER_H, C.PLAYER_W, C.PLAYER_H, false, { fallbacks: ['idle'] });
        ctx.restore();
      }
      this.text(ctx, 'A NEOAKAN GAME', VW / 2, ky + 6, { size: 7, align: 'center', color: '#e8c35a', weight: 800, stroke: null });
      const my = ky + 20;
      if (this.menu === 'diff') this.text(ctx, 'CHOOSE DIFFICULTY', VW / 2, my - 2, { size: 7, align: 'center', color: COL.muted, stroke: null });
      this.drawMenu(ctx, this.menuItems(), my + (this.menu === 'diff' ? 8 : 0), this.menu === 'diff' ? 26 : 21);
    }

    drawPlay(ctx) {
      const L = this.level, z = this.zoom, vw = VW * z, vh = VH * z;
      const cam = { x: this.cam.x, y: this.cam.y };
      if (this.shakeT > 0) { cam.x += KK.rand(-this.shakeMag, this.shakeMag); cam.y += KK.rand(-this.shakeMag, this.shakeMag); }
      L.drawBackground(ctx, cam, this.time, VW, VH);
      ctx.save(); ctx.scale(1 / z, 1 / z);
      C.VIEW_W = vw; C.VIEW_H = vh;
      L.drawTiles(ctx, cam, this.time);
      for (const b of this.bumps) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(b.tx * T - cam.x, b.ty * T - cam.y - 3, T, 3); }
      this.drawDecor(ctx, cam);
      for (const s of this.switches) s.draw(ctx, cam);
      for (const pl of this.platforms) pl.draw(ctx, cam);
      for (const k of this.pickups) k.draw(ctx, cam);
      for (const g of this.ghosts) { ctx.globalAlpha = g.life / 0.25 * 0.5; ctx.fillStyle = g.color; ctx.fillRect(g.x - cam.x, g.y - cam.y, g.w, g.h); ctx.globalAlpha = 1; }
      // contact shadows: everyone stands on the ground (fades with height when jumping or flying)
      for (const e of this.enemies) if (!e.dead && e.x + e.w > cam.x - 40 && e.x < cam.x + vw + 40) this.drawShadow(ctx, cam, e);
      if (!this.player.dead && !this.player.climbing) this.drawShadow(ctx, cam, this.player);
      for (const e of this.enemies) if (!e.dead && e.x + e.w > cam.x - 40 && e.x < cam.x + vw + 40) e.draw(ctx, cam);
      this.player.draw(ctx, cam);
      for (const pr of this.projectiles) pr.draw(ctx, cam);
      for (const fx of this.effects) { ctx.save(); ctx.translate(fx.x - cam.x, fx.y - cam.y); ctx.rotate(fx.rot || 0); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-1.5, -9, 3, 18); ctx.fillStyle = '#7a4d14'; ctx.fillRect(-4, 6, 8, 2); ctx.restore(); }
      for (const q of this.particles) q.draw(ctx, cam);
      L.drawHidden(ctx, cam, this.player);
      for (const t of this.texts) t.draw(ctx, cam);
      if (this.aimTarget) {
        const tg = this.aimTarget, cx = tg.x + tg.w / 2 - cam.x, cy = tg.y + tg.h / 2 - cam.y, r = Math.max(tg.w, tg.h) / 2 + 6 + Math.sin(this.time * 8) * 1.5;
        ctx.strokeStyle = '#7ac8ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        for (const a of [0, 1, 2, 3]) { const an = a * Math.PI / 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * (r - 4), cy + Math.sin(an) * (r - 4)); ctx.lineTo(cx + Math.cos(an) * (r + 4), cy + Math.sin(an) * (r + 4)); ctx.stroke(); }
      }
      if (this.beta.hitboxes) this.drawHitboxes(ctx, cam);
      ctx.restore();
      C.VIEW_W = VW; C.VIEW_H = VH;
      if (this.portalFx) { ctx.fillStyle = `rgba(150,220,255,${Math.min(0.6, this.portalFx)})`; ctx.fillRect(0, 0, VW, VH); this.portalFx = Math.max(0, this.portalFx - 0.02); }
      this.drawHUD(ctx);
      this.drawSign(ctx);
      if (this.dialog) this.drawDialog(ctx);
      if (this.card) this.drawCard(ctx);
      if (this.paused) this.drawPause(ctx);
      if (this.player.dead) this.text(ctx, 'KOFITIA FELL', VW / 2, VH / 2 - 8, { size: 16, align: 'center', color: '#ff6a5a', weight: 800 });
    }

    drawShadow(ctx, cam, e) {
      const L = this.level, feet = e.y + e.h, cx = e.x + e.w / 2;
      let gy = null;
      for (let ty = Math.floor((feet - 2) / T); ty < Math.floor(feet / T) + 8; ty++) {
        const tx = Math.floor(cx / T);
        if (L.isSolid(tx, ty) || L.isOneWay(tx, ty)) { gy = ty * T; break; }
      }
      if (gy == null || gy < feet - 3) return;
      const k = KK.clamp(1 - (gy - feet) / 70, 0, 1); if (k <= 0) return;
      const w = Math.max(6, e.w * 0.62) * (0.55 + 0.45 * k);
      ctx.fillStyle = `rgba(10,6,4,${0.32 * k})`;
      ctx.beginPath(); ctx.ellipse(cx - cam.x, gy - cam.y - 0.3, w, Math.max(1.2, w * 0.18), 0, 0, Math.PI * 2); ctx.fill();
    }
    drawDecor(ctx, cam) {
      const L = this.level, t = this.time;
      for (const d of L.spawns.decor) {
        const x = d.x - cam.x, y = d.y - cam.y;
        if (d.c === 'F' && KK.objArt(ctx, 'forge', x + 8, y + 16)) { KK.objArt(ctx, 'forge_fire', x + 8, y + 12, null, t); continue; }
        if (d.c === 'A' && KK.objArt(ctx, 'anvil', x + 8, y + 16)) { if (!this.swordGiven) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 1, y + 4, 14, 2); } continue; }
        if (d.c === 'F') {
          ctx.fillStyle = '#5a2a1a'; ctx.fillRect(x - 4, y - 16, 24, 32); ctx.fillStyle = '#2a1008'; ctx.fillRect(x, y - 6, 16, 14);
          for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#ffb52a' : '#ff5a1a'; const h = 4 + Math.abs(Math.sin(t * 9 + i * 1.7)) * 8; ctx.fillRect(x + 1 + i * 3, y + 8 - h, 3, h); }
          ctx.fillStyle = `rgba(255,120,30,${0.08 + 0.04 * Math.sin(t * 7)})`; ctx.fillRect(x - 30, y - 40, 80, 60);
        } else if (d.c === 'A') {
          ctx.fillStyle = '#3a3a44'; ctx.fillRect(x, y + 6, 16, 4); ctx.fillRect(x + 5, y + 10, 6, 6); ctx.fillRect(x + 2, y + 15, 12, 1);
          if (!this.swordGiven) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 1, y + 4, 14, 2); ctx.fillStyle = '#7a4d14'; ctx.fillRect(x + 12, y + 3, 2, 4); }
        } else if (d.c === 'D') {
          const e = { x: d.x + 1, y: d.y - 10, w: 14, h: 26, dir: this.player && this.player.x > d.x ? 1 : -1 };
          KK.drawActor(ctx, cam, e, '#1a1a1a', { sprite: 'odade', owner: d, anim: this.odadeGive != null && this.time - this.odadeGive < 0.6 ? 'give' : this.dialog ? 'talk' : this.swordGiven ? 'hammer' : 'idle', fallbacks: ['idle'], eyeColor: '#f5e6c8', outline: '#5a4a3a' });
          if (KK.Sprites.has('odade')) continue;
          const hy = Math.sin(t * 6) > 0.6 && !this.dialog ? -4 : 0;
          ctx.fillStyle = '#8a8a96'; ctx.fillRect(x + (e.dir > 0 ? 15 : -4), y - 2 + hy, 6, 5); ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x + (e.dir > 0 ? 16 : -3), y + 3 + hy, 2, 7);
        }
      }
      for (const c of this.checkpoints) {
        const x = c.x - cam.x, y = c.y - cam.y;
        if (KK.objArt(ctx, 'checkpoint', x + 8, y + 16, c.active ? 1 + Math.floor(this.time * KK.SPRITE_FPS) % 6 : 0)) continue;
        ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x + 7, y - 4, 2, 20);
        ctx.fillStyle = c.active ? '#ffd23f' : '#8a8a8a'; ctx.fillRect(x + 9, y - 3 + (c.active ? Math.sin(this.time * 6) : 0), 8, 6);
      }
      for (const e of L.spawns.exits) {
        const x = e.x - cam.x, y = e.y - cam.y;
        if (KK.objArt(ctx, 'exit', x + 8, y + 32)) continue;
        ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 3, y - 2, 22, 34); ctx.fillStyle = '#120a06'; ctx.fillRect(x, y + 2, 16, 30);
        ctx.fillStyle = `rgba(255,210,63,${0.3 + 0.2 * Math.sin(this.time * 3)})`; ctx.fillRect(x + 2, y + 4, 12, 28);
      }
      for (const o of L.spawns.portals) {
        const x = o.x - cam.x, y = o.y - cam.y;
        if (KK.objArt(ctx, 'nyamedua_pan', x + 12, y + 32)) { KK.objArt(ctx, 'pan_water', x + 12, y + 32, null, this.time); continue; }
        ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x + 11, y + 12, 3, 20); ctx.fillRect(x + 6, y + 6, 2, 8); ctx.fillRect(x + 17, y + 6, 2, 8); ctx.fillRect(x + 7, y + 11, 11, 2);
        ctx.fillStyle = '#c08a2a'; ctx.beginPath(); ctx.ellipse(x + 12, y + 6, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(120,200,255,${0.7 + 0.3 * Math.sin(this.time * 4)})`; ctx.beginPath(); ctx.ellipse(x + 12, y + 5, 8, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(200,240,255,0.8)'; ctx.fillRect(x + 6 + ((this.time * 10 + i * 5) % 12), y + 1 - ((this.time * 12 + i * 7) % 12), 1, 1); }
      }
      for (const s of L.spawns.signs) {
        const x = s.x - cam.x, y = s.y - cam.y;
        if (KK.objArt(ctx, 'sign', x + 8, y + 16)) continue;
        ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x + 7, y + 8, 2, 8); ctx.fillStyle = '#a77a45'; ctx.fillRect(x + 1, y + 1, 14, 8); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 3, y + 3, 10, 1); ctx.fillRect(x + 3, y + 6, 7, 1);
      }
    }
    drawHitboxes(ctx, cam) {
      ctx.lineWidth = 0.5;
      const r = (b, c) => { ctx.strokeStyle = c; ctx.strokeRect(b.x - cam.x, b.y - cam.y, b.w, b.h); };
      r(this.player, '#00ff00');
      if (this.player.attack) r(this.player.attackBox(), '#ffff00');
      if (this.player.shield) r(this.player.shieldBox(), '#ff9a2a');
      for (const e of this.enemies) if (!e.dead) r(e, '#ff00ff');
      for (const p of this.projectiles) r(p, '#00ffff');
    }

    drawHUD(ctx) {
      const p = this.player;
      this.panel(ctx, 3, 3, 98, 41);
      const rows = [['icon_life', 'LIFE', p.health, p.maxHealth, COL.life, 0], ['icon_stamina', 'STAMINA', p.stamina, p.maxStamina, COL.stamina, p.staminaFlash], ['icon_power', 'POWER', p.power, p.maxPower, COL.power, p.powerFlash]];
      rows.forEach(([ic, label, v, max, col, flash], i) => {
        const y = 7 + i * 11.5;
        if (!this.icon(ctx, ic, 7, y, 9)) { ctx.fillStyle = col; ctx.fillRect(8, y + 2, 6, 6); }
        this.text(ctx, label, 19, y - 1, { size: 4.8, color: col, weight: 800, stroke: 'rgba(0,0,0,0.7)' });
        this.gauge(ctx, 19, y + 5, 77, 4, v, max, col, flash);
      });
      this.text(ctx, String(Math.ceil(p.health)), 96, 5.8, { size: 5, color: '#fff', align: 'right', weight: 800, stroke: 'rgba(0,0,0,0.7)' });
      this.panel(ctx, VW - 54, 3, 51, 27);
      if (!(KK.Sprites.has('gye') && KK.Sprites.draw(ctx, 'gye', 'idle', this.time, VW - 52, 6, 8, 8, false))) { ctx.fillStyle = '#ffc61a'; ctx.fillRect(VW - 50, 8, 7, 7); }
      this.text(ctx, String(this.gyeCount).padStart(2, '0') + '/' + this.gyeTotal, VW - 40, 7, { size: 7, color: COL.gold, weight: 800, stroke: 'rgba(0,0,0,0.6)' });
      this.text(ctx, KK.fmtTime(this.stats.time), VW - 49, 18, { size: 6.5, color: COL.cream, weight: 700, stroke: null });
      if (this.lockOn) this.text(ctx, this.aimTarget ? 'LOCKED ON' : 'LOCK: NO TARGET', VW / 2, 36, { size: 6.5, align: 'center', color: '#7ac8ff', weight: 800 });
      if (p.comboShow > 0 && p.combo > 1) this.text(ctx, `${p.combo} HIT COMBO`, VW / 2, 96, { size: 11, align: 'center', color: COL.gold, weight: 800 });
      const bb = this.bossBar && !this.bossBar.target.dead ? this.bossBar : this.miniFocus ? { label: null, target: this.miniFocus, name: this.miniFocus.name } : null;
      if (bb && !this.dialog) {
        const b = bb.target, w = VW - 28, x = 14, y = 76;
        const name = bb.label ? KK.CHARACTERS[bb.label].name : bb.name;
        this.panel(ctx, x - 6, y - 26, w + 12, 38);
        this.text(ctx, name, x, y - 23, { size: 14.29, font: FONT_KR, color: COL.gold, stroke: null });
        this.text(ctx, name.toUpperCase(), x + w, y - 19, { size: 6, color: COL.muted, align: 'right', weight: 700, stroke: null });
        this.kente(ctx, x, y - 7, w);
        ctx.fillStyle = '#1a0d07'; ctx.fillRect(x, y, w, 6);
        ctx.strokeStyle = '#c9971a'; ctx.lineWidth = 0.5; ctx.strokeRect(x - 0.25, y - 0.25, w + 0.5, 6.5);
        if (bb.hits) {
          const n = b.hitsNeeded, segW = w / n;
          for (let i = 0; i < n; i++) { ctx.fillStyle = i < n - b.hits ? '#d8342a' : '#3a2a2a'; ctx.fillRect(x + i * segW + 1, y, segW - 2, 6); }
          this.text(ctx, `HEAVY HITS ${b.hits}/${n}`, x + w / 2, y - 16, { size: 6, color: COL.gold, align: 'center', weight: 800, stroke: null });
        } else {
          ctx.fillStyle = bb.locked ? '#8a8a9a' : '#d8342a'; ctx.fillRect(x, y, w * Math.max(0, b.hp) / b.maxHp, 6);
          if (bb.locked) {
            const lull = b.turn && b.turn.phase === 'lull' && this.minions && this.minions.some(m => !m.dead);
            this.text(ctx, lull ? `CATCH YOUR BREATH  ${Math.ceil(b.lullLeft || 0)}` : 'DEFEAT HER CHILDREN', x + w / 2, y - 16, { size: 6, color: lull ? '#9ff0a0' : '#d0d0e0', align: 'center', weight: 800, stroke: null });
            if (this.minions) this.minions.forEach((m, i) => { const bx = x + i * (w / 2 + 2), bw = w / 2 - 2; this.text(ctx, i ? 'BLUE' : 'RED', bx, y + 9, { size: 5.5, color: i ? '#8fb0ff' : '#ff8a80', weight: 800, stroke: null }); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(bx + 20, y + 10, bw - 20, 4); if (!m.dead) { ctx.fillStyle = i ? '#4a7aff' : '#e03030'; ctx.fillRect(bx + 20, y + 10, (bw - 20) * m.hp / m.maxHp, 4); } });
          }
        }
      }
    }
    drawSign(ctx) {
      if (this.dialog || this.script) return;
      const p = this.player, signs = KK.SIGNS[this.levelId] || {};
      for (const s of this.level.spawns.signs) {
        if (Math.abs(p.x + p.w / 2 - (s.x + 8)) < 20 && Math.abs(p.y - s.y) < 30 && signs[s.n]) {
          ctx.font = `600 9px ${FONT}`;
          const lines = Math.ceil(ctx.measureText(signs[s.n]).width / (VW - 44)) + 1;
          this.panel(ctx, 10, 54, VW - 20, 8 + lines * 11);
          this.wrapText(ctx, signs[s.n], 18, 58, VW - 36, 11, { size: 9, color: COL.cream, stroke: null });
          return;
        }
      }
    }
    drawDialog(ctx) {
      const d = this.dialog, line = d.lines[d.i], ch = KK.CHARACTERS[line.s] || KK.CHARACTERS.narrator;
      const h = 96, x = 5, y = VH - h - 5, w = VW - 10;
      this.panel(ctx, x, y, w, h);
      let tx = x + 10, ty = y + 10;
      if (ch.name) {
        const key = line.s === 'brafo' ? 'barafo' : line.s, pimg = KK.Sprites.img('portrait/' + key);
        const px = x + 6, py = y + 6, ps = 44;
        const bg = ctx.createRadialGradient(px + ps * 0.6, py + ps * 0.4, 2, px + ps / 2, py + ps / 2, ps * 0.75);
        bg.addColorStop(0, ch.color || '#6a3a1a'); bg.addColorStop(1, '#120905');
        ctx.fillStyle = bg; ctx.fillRect(px, py, ps, ps);
        if (pimg) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(pimg, px + 1, py + 1, ps - 2, ps - 2); ctx.restore(); }
        else {
          ctx.fillStyle = ch.color; ctx.fillRect(px + 10, py + 10, 24, 32);
          ctx.fillStyle = line.s === 'odade' ? '#f5e6c8' : '#111'; ctx.fillRect(px + 26, py + 18, 3, 3);
        }
        if (!this.nine(ctx, 'panel', px - 2, py - 2, ps + 4, ps + 4, 6)) { ctx.strokeStyle = '#c9971a'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, ps - 1, ps - 1); }
        // name plate: Kradin name on a kente band
        const nx = px + ps + 7;
        ctx.font = `700 5.5px ${FONT}`; const lw = ctx.measureText(ch.name.toUpperCase()).width;
        ctx.font = `14.29px ${FONT_KR}`; const kw = ctx.measureText(ch.name).width, room = x + w - 9 - lw - 4 - nx;
        const ks = 14.29;
        this.text(ctx, ch.name, nx, y + 5 + (14.29 - ks) * 0.7, { size: ks, font: FONT_KR, color: COL.gold, stroke: 'rgba(0,0,0,0.6)' });
        this.kente(ctx, nx, y + 22, x + w - nx - 8);
        if (kw <= room) this.text(ctx, ch.name.toUpperCase(), x + w - 9, y + 7.5, { size: 5.5, color: COL.muted, align: 'right', weight: 700, stroke: null });
        tx = nx; ty = y + 30;
      }
      this.wrapText(ctx, line.t.slice(0, Math.floor(d.chars)), tx, ty, x + w - tx - 10, 11.5, { size: 9.5, color: COL.cream, stroke: null, weight: 600 });
      if (d.chars >= line.t.length && Math.floor(this.time * 3) % 2) this.icon(ctx, 'diamond', x + w - 14, y + h - 13, 5);
    }
    drawCard(ctx) {
      const c = this.card, a = Math.min(1, c.t / 0.3, (c.dur - c.t) / 0.4);
      ctx.globalAlpha = KK.clamp(a, 0, 1); ctx.fillStyle = '#0a0604'; ctx.fillRect(0, 0, VW, VH);
      this.kente(ctx, 20, VH / 2 - 34, VW - 40);
      this.text(ctx, c.title, VW / 2, VH / 2 - 22, { size: 20, align: 'center', color: COL.gold, weight: 800 });
      this.text(ctx, c.sub.toUpperCase(), VW / 2, VH / 2 + 6, { size: 10, align: 'center', color: COL.cream, weight: 700 });
      this.kente(ctx, 20, VH / 2 + 22, VW - 40);
      ctx.globalAlpha = 1;
    }
    drawPause(ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, VW, VH);
      const items = this.menuItems(), top = VH * 0.22, h = 40 + items.length * 24;
      this.panel(ctx, 4, top - 8, VW - 8, h);
      this.text(ctx, 'PAUSED', VW / 2, top, { size: 16, align: 'center', color: COL.gold, weight: 800 });
      this.kente(ctx, 14, top + 19, VW - 28);
      this.drawMenu(ctx, items, top + 28, 24);
    }
    drawEnding(ctx) {
      const E = this.end; if (!E) return;
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#7fc8ff'); g.addColorStop(1, '#ffe9b8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 6; i++) { const cx = (i * 70 + this.time * 10) % (VW + 60) - 30; ctx.beginPath(); ctx.ellipse(cx, 20 + i * 12, 30, 8, 0, 0, Math.PI * 2); ctx.fill(); }
      const gy = VH * 0.58;
      ctx.fillStyle = '#5a8a3a'; ctx.fillRect(0, gy, VW, VH - gy); ctx.fillStyle = '#3a6a2a'; for (let i = 0; i < 12; i++) ctx.fillRect(i * 28, gy - 12 - (i % 3) * 6, 16, 16);
      if (E.basa && KK.Sprites.has('basa')) {
        const near = E.swordOn && (E.caught || E.swordY > gy - 90);
        if (near && E.catchAt == null) E.catchAt = this.time;
        KK.Sprites.draw(ctx, 'basa', near ? 'catch' : 'idle', near ? this.time - E.catchAt : this.time, VW / 2 - 7, gy - 30, 14, 30, true, { fallbacks: ['idle'] });
      } else if (E.basa) { ctx.fillStyle = '#c9971a'; ctx.fillRect(VW / 2 - 9, gy - 32, 18, 32); ctx.fillStyle = '#7a4d14'; ctx.fillRect(VW / 2 - 9, gy - 22, 18, 4); ctx.fillStyle = '#111'; ctx.fillRect(VW / 2 + 3, gy - 27, 2.5, 2.5); }
      // Kofitia kneels at the hole in the clouds and lets Afenakwa fall
      if (KK.Sprites.has('kofitia_afenakwa')) {
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.ellipse(VW / 2 - 6, 34, 46, 9, 0, 0, Math.PI * 2); ctx.fill();
        const kt = E.swordOn ? this.time - (E.releaseAt = E.releaseAt == null ? this.time : E.releaseAt) : 0;
        KK.Sprites.draw(ctx, 'kofitia_afenakwa', E.swordOn ? 'release_sword' : 'idle', E.swordOn ? kt : this.time, VW / 2 - 22, 10, 12, 20, false, { fallbacks: ['idle'] });
      }
      if (E.swordOn) {
        const y = E.caught ? gy - 44 : E.swordY;
        ctx.fillStyle = `rgba(255,230,120,${0.15 + 0.1 * Math.sin(this.time * 5)})`; ctx.beginPath(); ctx.arc(VW / 2, y + 9, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(VW / 2 - 1.5, y, 3, 18); ctx.fillStyle = '#7a4d14'; ctx.fillRect(VW / 2 - 4, y + (E.caught ? 14 : 0), 8, 2);
        if (!E.caught) for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,230,120,0.6)'; ctx.fillRect(VW / 2 - 1 + KK.rand(-2, 2), y - 6 - i * 6, 2, 3); }
      }
      if (E.theEnd) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, VH * 0.3, VW, 56); this.text(ctx, 'THE END', VW / 2, VH * 0.3 + 8, { size: 18, align: 'center', color: COL.gold, weight: 800 }); this.text(ctx, 'Kofi Kese', VW / 2, VH * 0.3 + 30, { size: 14.29, font: FONT_KR, align: 'center', color: '#fff', stroke: null }); }
      if (this.dialog) this.drawDialog(ctx);
    }
    drawScore(ctx) {
      const f = this.final; if (!f) return;
      ctx.fillStyle = '#120a06'; ctx.fillRect(0, 0, VW, VH);
      const x = 14, w = VW - 28, y = 14;
      this.panel(ctx, x, y, w, 150, 8);
      this.text(ctx, 'FINAL SCORE', VW / 2, y + 10, { size: 14, align: 'center', color: COL.gold, weight: 800, stroke: null });
      this.text(ctx, C.DIFFICULTY[f.diff].label + ' MODE', VW / 2, y + 28, { size: 7, align: 'center', color: COL.muted, weight: 700, stroke: null });
      const rows = [['TIME', KK.fmtTime(f.time)], ['GYE NYAME', `${String(f.gye).padStart(2, '0')} / ${f.gyeTotal}`], ['LIFE POINTS LOST', String(f.lifeLost)]];
      rows.forEach(([k, v], i) => { this.text(ctx, k, x + 12, y + 46 + i * 17, { size: 8.5, color: COL.cream, stroke: null }); this.text(ctx, v, x + w - 12, y + 46 + i * 17, { size: 8.5, color: '#fff', align: 'right', weight: 800, stroke: null }); });
      this.kente(ctx, x + 12, y + 98, w - 24);
      this.text(ctx, 'SCORE', x + 12, y + 112, { size: 9, color: COL.gold, weight: 800, stroke: null });
      this.text(ctx, String(f.score).padStart(6, '0'), x + w - 12, y + 106, { size: 20, color: COL.gold, align: 'right', weight: 800, stroke: null });
      this.text(ctx, 'W1 ' + this.stats.gye[1] + '/' + this.gyeTotals[1] + '    W2 ' + this.stats.gye[2] + '/' + this.gyeTotals[2] + '    W3 ' + this.stats.gye[3] + '/' + this.gyeTotals[3], VW / 2, y + 136, { size: 6.5, color: COL.muted, align: 'center', stroke: null });
    }
  }
  KK.Game = Game;

  // =============================================================
  // DOM UI: share panel, beta panel, TV mode
  // =============================================================
  KK.UI = {
    shareOpen: false,
    shareText(f) {
      const url = KK.CONFIG.SHARE_URL || (location.origin + location.pathname);
      return { url, text: `Hey guys, I'm playing Kofi Kese, a NeoAkan game! Score ${String(f.score).padStart(6, '0')} on ${C.DIFFICULTY[f.diff].label}, Gye Nyame ${f.gye}/${f.gyeTotal}. Try it out at ${url}` };
    },
    makeCard(f) {
      const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
      x.fillStyle = '#120a06'; x.fillRect(0, 0, 1080, 1350);
      x.strokeStyle = '#c9971a'; x.lineWidth = 14; x.strokeRect(60, 60, 960, 1230);
      x.textAlign = 'center'; x.fillStyle = '#ffd23f'; x.font = '800 120px "Baloo 2"'; x.fillText('KOFI KESE', 540, 270);
      x.fillStyle = '#f5e6c8'; x.font = '84px Koradin'; x.fillText('Kofi Kese', 540, 390);
      x.font = '700 36px "Baloo 2"'; x.fillStyle = '#e8c35a'; x.fillText('A NEOAKAN GAME  ·  ' + C.DIFFICULTY[f.diff].label, 540, 470);
      x.font = '700 48px "Baloo 2"'; x.fillStyle = '#f5e6c8';
      [['TIME', KK.fmtTime(f.time)], ['GYE NYAME', `${f.gye}/${f.gyeTotal}`], ['LIFE LOST', String(f.lifeLost)]].forEach(([k, v], i) => { x.textAlign = 'left'; x.fillText(k, 170, 640 + i * 100); x.textAlign = 'right'; x.fillText(v, 910, 640 + i * 100); });
      x.fillStyle = '#c9971a'; x.fillRect(170, 900, 740, 6);
      x.textAlign = 'center'; x.fillStyle = '#ffd23f'; x.font = '800 54px "Baloo 2"'; x.fillText('SCORE', 540, 1010);
      x.font = '800 150px "Baloo 2"'; x.fillText(String(f.score).padStart(6, '0'), 540, 1170);
      return c;
    },
    showShare(f) {
      const el = document.getElementById('share'); if (!el) return;
      this.shareOpen = true; el.hidden = false;
      const { url, text } = this.shareText(f), card = this.makeCard(f), g = KK.game;
      const harder = g.harderDiff();
      el.querySelector('[data-share=again]').textContent = harder === f.diff ? 'PLAY AGAIN' : 'PLAY AGAIN · ' + C.DIFFICULTY[harder].label;
      el.querySelector('[data-share=native]').onclick = async () => {
        try {
          const blob = await new Promise(r => card.toBlob(r, 'image/png'));
          const file = new File([blob], 'kofi-kese-score.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text, title: 'Kofi Kese' });
          else if (navigator.share) await navigator.share({ text, url, title: 'Kofi Kese' });
          else { await navigator.clipboard.writeText(text); this.toast('Copied! Paste it anywhere.'); }
        } catch (e) { /* share cancelled */ }
      };
      el.querySelector('[data-share=x]').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
      el.querySelector('[data-share=fb]').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '&quote=' + encodeURIComponent(text);
      el.querySelector('[data-share=copy]').onclick = async () => { try { await navigator.clipboard.writeText(text); this.toast('Copied: paste it in Instagram or Snapchat'); } catch (e) { this.toast(text); } };
      el.querySelector('[data-share=save]').onclick = () => { const a = document.createElement('a'); a.download = 'kofi-kese-score.png'; a.href = card.toDataURL('image/png'); a.click(); };
      el.querySelector('[data-share=again]').onclick = () => g.playAgainHarder();
      el.querySelector('[data-share=menu]').onclick = () => g.toTitle();
    },
    hideShare() { const el = document.getElementById('share'); if (el) el.hidden = true; this.shareOpen = false; },
    toast(msg) { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(this._tt); this._tt = setTimeout(() => t.hidden = true, 2400); },

    controlsOpen: false,
    ACTION_LABELS: { MOVE_LEFT: 'Move left', MOVE_RIGHT: 'Move right', UP: 'Jump / climb up', DOWN: 'Crouch (+ attack = stun) / climb down / drop', JUMP: 'Jump (again in the air: double jump)', NORMAL_ATTACK: 'Attack (tap for combo)', HEAVY_ATTACK_STAMINA: 'Heavy 1 (in the air: hold for shield)', HEAVY_ATTACK_POWER: 'Heavy 2 (power wave)', DODGE: 'Dodge (in the air: dash)', AIM: 'Lock-on for Heavy 2 (press on / off)', PAUSE: 'Pause / skip dialogue' },
    PAD_NAMES: ['Cross / A', 'Circle / B', 'Square / X', 'Triangle / Y', 'L1 / LB', 'R1 / RB', 'L2 / LT', 'R2 / RT', 'Create / View', 'Options / Menu', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'PS / Home'],
    keyName(k) { return { ' ': 'Space', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Escape: 'Esc', Spacebar: 'Space' }[k] || (k.length === 1 ? k.toUpperCase() : k); },
    openControls() { this.controlsOpen = true; document.getElementById('controlsPanel').hidden = false; this.renderControls(); },
    closeControls() { this.controlsOpen = false; KK.captureKey = null; KK.capturePad = null; document.getElementById('controlsPanel').hidden = true; KK.Input.releaseAll(); },
    renderControls() {
      const C2 = KK.CONFIG, t = document.getElementById('cpTable');
      let h = '<tr><th>Action</th><th>Keyboard</th><th>Controller</th></tr>';
      for (const [a, label] of Object.entries(this.ACTION_LABELS)) {
        const keys = [...new Set((C2.KEYS[a] || []).map(k => this.keyName(k)))].join(' / ') || '-';
        const pads = Object.entries(C2.PAD).filter(([, v]) => v === a).map(([i]) => this.PAD_NAMES[i] || 'Button ' + i).join(' / ') || '-';
        h += `<tr><td>${label}</td><td><button data-k="${a}">${keys}</button></td><td><button data-p="${a}">${pads}</button></td></tr>`;
      }
      h += '<tr><td>Move (always)</td><td>-</td><td>Left stick</td></tr>';
      t.innerHTML = h;
      t.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => {
        b.classList.add('listening'); b.textContent = 'Press a key…';
        KK.captureKey = (key) => {
          const a = b.dataset.k;
          for (const k of Object.keys(C2.KEYS)) C2.KEYS[k] = C2.KEYS[k].filter(x => x.toLowerCase() !== key.toLowerCase());
          C2.KEYS[a] = key.length === 1 ? [key.toLowerCase(), key.toUpperCase()] : [key];
          KK.rebuildKeys(); this.renderControls();
        };
      });
      t.querySelectorAll('button[data-p]').forEach(b => b.onclick = () => {
        b.classList.add('listening'); b.textContent = 'Press a button…'; KK.Input._padHeldIdx = true;
        KK.capturePad = (i) => {
          const a = b.dataset.p;
          for (const [k, v] of Object.entries(C2.PAD)) if (v === a) delete C2.PAD[k];
          C2.PAD[i] = a; KK.rebuildKeys(); this.renderControls();
        };
      });
    },
    buildControls() {
      document.getElementById('cpClose').onclick = () => this.closeControls();
      document.getElementById('cpReset').onclick = () => { KK.CONFIG.KEYS = JSON.parse(JSON.stringify(KK.DEFAULT_KEYS)); KK.CONFIG.PAD = JSON.parse(JSON.stringify(KK.DEFAULT_PAD)); KK.rebuildKeys(); this.renderControls(); };
      document.getElementById('skipBtn').onclick = () => KK.game && KK.game.skip();
    },

    setTV(on) {
      document.body.classList.toggle('tv', !!on);
      const cb = document.querySelector('#betaPanel input[name=tv]'); if (cb) cb.checked = !!on;
      setTimeout(() => KK.game && KK.game.resize(), 30);
    },
    buildBeta() {
      if (!KK.CONFIG.BETA) return;
      const btn = document.getElementById('betaBtn'), panel = document.getElementById('betaPanel');
      btn.hidden = false;
      const list = panel.querySelector('.levels');
      for (const id of KK.LEVEL_ORDER) {
        const m = KK.LEVELS[id].meta, b = document.createElement('button');
        b.textContent = (m.world ? 'W' + m.world + ' · ' : '') + m.name;
        b.onclick = () => { KK.game.jumpTo(id); panel.hidden = true; };
        list.appendChild(b);
      }
      const end = document.createElement('button'); end.textContent = 'Ending + score';
      end.onclick = () => { panel.hidden = true; const g = KK.game; if (!g.level) g.loadLevel('w3_boss'); g.startEnding(); };
      list.appendChild(end);
      btn.onclick = () => { panel.hidden = !panel.hidden; };
      panel.querySelectorAll('input[type=checkbox]').forEach(cb => cb.onchange = () => {
        if (cb.name === 'mute') KK.Audio.muted = cb.checked;
        else if (cb.name === 'tv') KK.UI.setTV(cb.checked);
        else KK.game.beta[cb.name] = cb.checked;
      });
    },
  };
})();
