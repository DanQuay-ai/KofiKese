// =============================================================
// KOFI KESE - bosses and minions (state machines)
// =============================================================
(function () {
  const C = KK.CONFIG, T = C.TILE;
  const G = () => KK.game;
  const P = (...a) => new KK.Particle(...a);
  const txt = (x, y, s, c) => G().texts.push(new KK.FloatText(x, y, s, c, 10));

  function groundBelow(level, x, y) {
    let ty = Math.floor(y / T);
    while (ty < level.h && !level.isSolid(Math.floor(x / T), ty)) ty++;
    return ty * T;
  }
  function burst(x, y, color, n = 16, sp = 120) { for (let i = 0; i < n; i++) G().particles.push(P(x, y, KK.rand(-sp, sp), KK.rand(-sp * 1.4, 0), color, 0.8)); }

  class BossBase {
    constructor(x, y, w, h) {
      Object.assign(this, { x, y, w, h, vx: 0, vy: 0, dir: -1, flash: 0, stun: 0, dead: false, animT: 0, t: 0, isBoss: true, invulnerable: false, contactDmg: 15 });
    }
    tick(dt) { this.animT += dt; this.t += dt; this.flash = Math.max(0, this.flash - dt); }
    toPlayer() { const p = G().player; const dx = (p.x + p.w / 2) - (this.x + this.w / 2), dy = (p.y + p.h / 2) - (this.y + this.h / 2); return { p, dx, dy, adx: Math.abs(dx) }; }
    walk(dt, speed) { this.vy = Math.min(this.vy + C.GRAVITY * dt, C.MAX_FALL); this.vx = speed; KK.moveBody(this, G().level, dt, null); }
    clang() { KK.Audio.sfx('clang'); G().particles.push(P(this.x + this.w / 2, this.y + this.h / 3, KK.rand(-60, 60), KK.rand(-80, -20), '#ffffff', 0.25)); txt(this.x + this.w / 2, this.y - 4, 'CLANG', '#cfd8ff'); }
    damage(n) {
      // no single combo or Heavy 2 can melt a boss: cap per hit + short pause between hits
      const now = G().time;
      if (!this.minion && now - (this._lastHit || -9) < C.BOSS_HIT_GAP) return;
      this._lastHit = now; if (!this.minion) n = Math.min(n, this.maxHp * C.BOSS_HIT_CAP);
      this.hp = Math.max(0, this.hp - n); this.flash = 0.12; KK.Audio.sfx('hit');
      if (n >= 3) G().shake(2);
      txt(this.x + this.w / 2, this.y - 4, String(Math.round(n * 10) / 10), '#ffffff');
    }
  }

  // ---------------- Samanteng's children ----------------
  // They take turns: one fights, then runs back to Samanteng to heal while a quiet pause lets Kofitia recover.
  class Minion extends BossBase {
    constructor(x, y, d) { super(x, y - d.h, d.w, d.h); this.d = d; this.maxHp = Math.round(d.hp * G().diff.bossHp); this.hp = this.maxHp; this.minion = true; this.role = 'home'; this.state = 'idle'; }
    get safe() { return false; }
    homeUpdate(dt) {
      const mom = G().boss; const hx = mom.x + mom.w / 2 + this.homeOffset - this.w / 2;
      const dx = hx - this.x;
      this.dir = Math.abs(dx) > 4 ? Math.sign(dx) : -1;
      this.walk(dt, Math.abs(dx) > 4 ? Math.sign(dx) * this.d.speed * 1.2 : 0);
      if (Math.abs(dx) <= 6) { this.role = 'home'; this.hp = Math.min(this.maxHp, this.hp + C.MINION_HEAL * dt); }
      this.contactDmg = 0;
    }
    guardedHit(atk) { if (false) { this.clang(); txt(this.x + this.w / 2, this.y - 14, 'PROTECTED', '#e9e3d0'); return true; } return false; }
    finish() { this.dead = true; this.role = 'dead'; G().bossEvent('minionDead', this); }
    drawHome(ctx, cam) { if (this.role === 'home') { ctx.strokeStyle = 'rgba(233,227,208,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(this.x - cam.x - 2, this.y - cam.y - 2, this.w + 4, this.h + 4); } }
  }

  class RedMinion extends Minion {
    constructor(x, y) { super(x, y, C.RED_MINION); this.homeOffset = -34; this.cd = 1.2; }
    update(dt) {
      this.tick(dt); if (this.role !== 'active') return this.homeUpdate(dt);
      this.contactDmg = 20;
      const { dx, dy, adx, p } = this.toPlayer(), d = this.d; this.cd -= dt;
      if (this.state === 'stagger') { this.st -= dt; this.walk(dt, this.vx * Math.pow(0.05, dt)); if (this.st <= 0) this.state = 'run'; return; }
      if (this.state === 'windup') {
        this.wt -= dt; if (this.wt > 0.25) { this.aim = Math.atan2(dy, dx); this.dir = Math.sign(dx) || 1; }
        this.walk(dt, 0);
        if (this.wt <= 0) {
          G().projectiles.push(new KK.Projectile({ x: this.x + this.w / 2 - 5, y: this.y + 6, w: 10, h: 10, vx: Math.cos(this.aim) * d.projSpeed, vy: Math.sin(this.aim) * d.projSpeed, dmg: d.projDmg, color: '#ff1f1f', kind: 'red', life: 2.5 }));
          KK.Audio.sfx('fire'); this.state = 'run'; this.cd = d.cooldown;
        }
        return;
      }
      this.dir = Math.sign(dx) || 1;
      let sp = 0; if (adx > d.range * 0.75) sp = this.dir * d.speed; else if (adx < 50) sp = -this.dir * d.speed * 0.7;
      this.walk(dt, sp);
      if (adx < d.range && this.cd <= 0 && !p.dead) { this.state = 'windup'; this.wt = d.windup; KK.Audio.sfx('warn'); }
    }
    takeHit(atk) {
      if (this.dead) return false; if (this.guardedHit(atk)) return true;
      if (atk.stun) { this.state = 'stagger'; this.st = atk.stun; }
      if (atk.power && this.state === 'windup') { this.state = 'stagger'; this.st = 1.5; txt(this.x + this.w / 2, this.y - 12, 'BREAK!', '#7ac8ff'); }
      this.damage(atk.dmg); this.vx = atk.dir * 60;
      if (this.hp <= 0) { burst(this.x + this.w / 2, this.y + this.h / 2, '#ff2a2a'); this.finish(); }
      return true;
    }
    draw(ctx, cam) {
      KK.drawActor(ctx, cam, this, '#c41e1e', { sprite: 'minionred', owner: this, anim: this.role === 'home' ? 'heal' : this.state === 'windup' ? 'windup' : this.state === 'stagger' ? 'stagger' : Math.abs(this.vx) > 4 ? 'run' : 'idle', fallbacks: ['idle'], flash: this.flash > 0 ? 'rgba(255,255,255,0.8)' : null, alpha: this.role === 'active' ? 1 : 0.75 });
      this.drawHome(ctx, cam);
      if (this.role === 'active' && this.state === 'windup') {
        const sx = this.x + this.w / 2 - cam.x, sy = this.y + 11 - cam.y;
        ctx.strokeStyle = `rgba(255,40,40,${0.3 + 0.5 * (1 - this.wt / this.d.windup)})`; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(this.aim) * 240, sy + Math.sin(this.aim) * 240); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }

  class BlueMinion extends Minion {
    constructor(x, y) { super(x, y, C.BLUE_MINION); this.homeOffset = 34; this.hitT = 0; this.state = 'chase'; }
    update(dt) {
      this.tick(dt); if (this.role !== 'active') return this.homeUpdate(dt);
      this.contactDmg = 8;
      const { dx, dy, adx, p } = this.toPlayer(), d = this.d;
      if (this.state === 'stagger') { this.st -= dt; this.walk(dt, this.vx * Math.pow(0.05, dt)); if (this.st <= 0) this.state = 'chase'; return; }
      this.dir = Math.sign(dx) || 1;
      this.walk(dt, adx > 6 ? this.dir * d.speed * (this.state === 'attack' ? 0.85 : 1) : 0);
      if (adx < 22 && Math.abs(dy) < 26) this.state = 'attack';
      if (this.state === 'attack') {
        this.hitT -= dt;
        if (this.hitT <= 0) {
          this.hitT = d.hitEvery; this.swing = 0.12;
          const hb = { x: this.dir > 0 ? this.x + this.w : this.x - 16, y: this.y + 2, w: 16, h: this.h - 4 };
          if (KK.overlap(hb, p) && !p.dead) p.hurt(d.dmg, this.x + this.w / 2);
          KK.Audio.sfx('attack');
        }
        if (adx > 60) this.state = 'chase';
      }
      this.swing = Math.max(0, (this.swing || 0) - dt);
    }
    takeHit(atk) {
      if (this.dead) return false; if (this.guardedHit(atk)) return true;
      if (atk.stun && !atk.heavy) { this.state = 'stagger'; this.st = atk.stun; }
      if (atk.heavy) {
        const mult = this.state === 'stagger' ? 1.5 : 1;
        this.state = 'stagger'; this.st = this.d.staggerTime; this.vx = atk.dir * 120;
        this.damage(atk.dmg * mult); txt(this.x + this.w / 2, this.y - 12, 'STOPPED', '#9ad0ff');
      } else this.damage(atk.dmg * this.d.normalDmgMult);
      if (this.hp <= 0) { burst(this.x + this.w / 2, this.y + this.h / 2, '#2a5aff'); this.finish(); }
      return true;
    }
    draw(ctx, cam) {
      KK.drawActor(ctx, cam, this, '#2a5aff', { sprite: 'minionblue', owner: this, anim: this.role === 'home' ? 'heal' : this.state === 'attack' ? 'attack' : this.state === 'stagger' ? 'stagger' : Math.abs(this.vx) > 4 ? 'run' : 'idle', fallbacks: ['idle'], flash: this.flash > 0 ? 'rgba(255,255,255,0.8)' : null, alpha: this.role === 'active' ? 1 : 0.75 });
      this.drawHome(ctx, cam);
      if (this.swing > 0) { ctx.fillStyle = '#bcd0ff'; ctx.fillRect((this.dir > 0 ? this.x + this.w : this.x - 16) - cam.x, this.y + 8 - cam.y, 16, 3); }
    }
  }

  // ---------------- Samanteng ----------------
  class Samanteng extends BossBase {
    constructor(x, y) {
      const d = C.SAMANTENG; super(x, y - d.h, d.w, d.h); this.d = d; this.maxHp = Math.round(d.hp * G().diff.bossHp); this.hp = this.maxHp;
      this.phase = 'watch'; this.mode = 'NORMAL'; this.ci = 0; this.modeT = d.cycle[0][1]; this.cd = 1; this.invulnerable = true; this.contactDmg = 15;
      this.name = 'samanteng'; this.turn = null;
    }
    setMode(i) { this.ci = i % this.d.cycle.length; this.mode = this.d.cycle[this.ci][0]; this.modeT = this.d.cycle[this.ci][1]; this.sub = null; this.cd = 0.6; if (this.mode !== 'REST') KK.Audio.sfx('boss'); }

    // children take turns; quiet pause between turns
    runTurns(dt) {
      const kids = (G().minions || []).filter(m => !m.dead);
      if (!kids.length) return;
      const tr = this.turn = this.turn || { phase: 'lull', t: 1.5, next: 0 };
      tr.t -= dt / G().diff.speed;   // turn timing runs in real seconds on every difficulty
      if (tr.phase === 'lull') {
        this.lullLeft = Math.max(0, tr.t);
        if (tr.t <= 0) {
          const all = G().minions; let i = tr.next % all.length; let guard = 0;
          while (all[i].dead && guard++ < 4) i = (i + 1) % all.length;
          tr.kid = all[i]; tr.next = i + 1; tr.kid.role = 'active'; tr.phase = 'active'; tr.t = tr.kid.d.turn;
          KK.Audio.sfx('warn'); txt(tr.kid.x + tr.kid.w / 2, tr.kid.y - 14, 'HERE IT COMES', '#ffd23f');
        }
      } else if (tr.phase === 'active') {
        const k = tr.kid;
        if (k.dead) { tr.phase = 'lull'; tr.t = G().diff.lull; return; }
        if (tr.t <= 0 || k.hp < k.maxHp * C.MINION_RETREAT) { k.role = 'returning'; k.state = k instanceof BlueMinion ? 'chase' : 'run'; tr.phase = 'returning'; txt(k.x + k.w / 2, k.y - 14, 'RETREAT', '#e9e3d0'); }
      } else if (tr.phase === 'returning') {
        if (tr.kid.dead || tr.kid.role === 'home' || tr.t < -6) { tr.phase = 'lull'; tr.t = G().diff.lull; }
      }
    }

    update(dt) {
      this.tick(dt); const { dx, dy, adx, p } = this.toPlayer(); const d = this.d;
      this.contactDmg = this.phase === 'fight' ? 15 : 0;   // harmless while she watches her children fight
      if (this.phase === 'watch') { this.dir = Math.sign(dx) || 1; this.walk(dt, 0); this.runTurns(dt); return; }
      if (this.phase === 'script') { this.dir = Math.sign(dx) || 1; this.walk(dt, this.scriptVx || 0); return; }
      if (this.phase !== 'fight') { this.walk(dt, 0); return; }
      this.modeT -= dt; this.cd -= dt;
      if (this.modeT <= 0) this.setMode(this.ci + 1);
      if (this.mode !== 'REST') this.dir = Math.sign(dx) || 1;
      switch (this.mode) {
        case 'NORMAL':
          if (this.sub === 'claw') {
            this.st -= dt; this.walk(dt, 0);
            if (this.st <= 0.12 && !this.clawDone) { this.clawDone = true; if (KK.overlap(this.clawBox(), p)) p.hurt(d.clawDmg, this.x + this.w / 2); KK.Audio.sfx('attack'); }
            if (this.st <= 0) { this.sub = null; this.cd = 0.8; }
          } else {
            this.walk(dt, adx > 20 ? this.dir * d.speed : 0);
            if (adx < 34 && Math.abs(dy) < 34 && this.cd <= 0) { this.sub = 'claw'; this.st = 0.42; this.clawDone = false; }
          }
          break;
        case 'RED':
          if (this.sub === 'windup') {
            this.st -= dt; this.walk(dt, 0); if (this.st > 0.2) this.aim = Math.atan2(dy, dx);
            if (this.st <= 0) {
              G().projectiles.push(new KK.Projectile({ x: this.x + this.w / 2 - 5, y: this.y + 8, w: 10, h: 10, vx: Math.cos(this.aim) * 210, vy: Math.sin(this.aim) * 210, dmg: d.redProjDmg, color: '#ff1f1f', kind: 'red', life: 2.5 }));
              KK.Audio.sfx('fire'); this.sub = null; this.cd = 1.5;
            }
          } else {
            let sp = 0; if (adx < 90) sp = -this.dir * d.speed; else if (adx > 150) sp = this.dir * d.speed;
            this.walk(dt, sp);
            if (this.cd <= 0) { this.sub = 'windup'; this.st = d.redWindup; KK.Audio.sfx('warn'); }
          }
          break;
        case 'BLUE':
          this.walk(dt, adx > 8 ? this.dir * d.speed * 1.8 : 0);
          if (adx < 26 && Math.abs(dy) < 34) {
            this.hitT = (this.hitT || 0) - dt;
            if (this.hitT <= 0) { this.hitT = d.blueHitEvery; this.swing = 0.1; if (KK.overlap(this.clawBox(), p)) p.hurt(d.blueDmg, this.x + this.w / 2); KK.Audio.sfx('attack'); }
          }
          this.swing = Math.max(0, (this.swing || 0) - dt);
          break;
        case 'REST': this.walk(dt, 0); break;
      }
    }
    clawBox() { return { x: this.dir > 0 ? this.x + this.w - 2 : this.x - 22, y: this.y + 6, w: 24, h: this.h - 8 }; }
    takeHit(atk) {
      if (this.dead) return false;
      if (this.invulnerable || this.phase !== 'fight') { this.clang(); return true; }
      let n = atk.dmg;
      if (this.mode === 'REST') n *= this.d.restDmgMult;
      if (this.mode === 'BLUE' && atk.heavy) { this.setMode(this.ci + 1); txt(this.x + this.w / 2, this.y - 12, 'STOPPED', '#9ad0ff'); }
      if (this.mode === 'RED' && atk.power && this.sub === 'windup') { this.sub = null; this.cd = 1.5; txt(this.x + this.w / 2, this.y - 12, 'BREAK!', '#7ac8ff'); }
      this.damage(n);
      if (this.hp <= 0) { this.dead = true; this.phase = 'dead'; burst(this.x + this.w / 2, this.y + this.h / 2, '#e9e3d0', 30); G().bossEvent('bossDead', this); }
      return true;
    }
    draw(ctx, cam) {
      const rest = this.phase === 'fight' && this.mode === 'REST';
      const e = { x: this.x, y: this.y + (rest ? 10 : 0), w: this.w, h: this.h - (rest ? 10 : 0), dir: this.dir, animT: this.animT };
      const tint = this.phase === 'fight' ? (this.mode === 'RED' ? '#ff4a4a' : this.mode === 'BLUE' ? '#6a8aff' : null) : null;
      const sa = this.holding ? 'seize' : this.phase !== 'fight' ? (Math.abs(this.vx) > 4 ? 'walk' : 'idle') : this.mode === 'REST' ? 'rest' : this.mode === 'BLUE' ? 'frenzy' : this.sub === 'claw' ? 'claw' : this.sub === 'windup' ? 'shoot' : Math.abs(this.vx) > 4 ? 'walk' : 'idle';
      if (KK.Sprites.has('samanteng')) { KK.drawActor(ctx, cam, this, '#e9e3d0', { sprite: 'samanteng', owner: this, anim: sa, tint, flash: this.flash > 0 ? 'rgba(255,255,255,0.8)' : null }); return; }
      KK.drawActor(ctx, cam, e, '#e9e3d0', { sprite: 'samanteng', anim: sa, tint, flash: this.flash > 0 ? 'rgba(255,255,255,0.8)' : null, eyeColor: '#e0102a' });
      const x = this.x - cam.x, y = this.y - cam.y;
      ctx.fillStyle = '#2a2420'; ctx.fillRect(this.dir > 0 ? x - 4 : x + this.w - 1, y + (rest ? 10 : 0), 5, this.h - 10);
      if (this.sub === 'claw' || this.swing > 0) { const b = this.clawBox(); ctx.fillStyle = this.mode === 'BLUE' ? '#9ab4ff' : '#ffffff'; ctx.globalAlpha = (this.sub === 'claw' && this.st > 0.12) ? 0.3 : 0.9; ctx.fillRect(b.x - cam.x, b.y + 8 - cam.y, b.w, 3); ctx.fillRect(b.x - cam.x, b.y + 15 - cam.y, b.w, 3); ctx.globalAlpha = 1; }
      if (this.mode === 'RED' && this.sub === 'windup') {
        const sx = this.x + this.w / 2 - cam.x, sy = this.y + 12 - cam.y;
        ctx.strokeStyle = 'rgba(255,30,30,0.7)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(this.aim) * 240, sy + Math.sin(this.aim) * 240); ctx.stroke(); ctx.setLineDash([]);
      }
      if (this.holding) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + this.w / 2 - 1, y - 14, 2.5, 14); }
    }
  }

  // ---------------- Sasabonsam ----------------
  class Sasabonsam extends BossBase {
    constructor(x, y, arena) {
      const d = C.SASABONSAM; super(x, y - 70, d.w, d.h); this.d = d; this.maxHp = Math.round(d.hp * G().diff.bossHp); this.hp = this.maxHp;
      this.arena = arena; this.groundY = arena.groundY; this.baseY = this.groundY - d.hover - d.h;
      this.phase = 'script'; this.mode = 'NORMAL'; this.modeT = d.normalTime; this.state = 'hover'; this.cd = 2; this.shootCd = 1.5; this.exposed = 0; this.idleCd = d.idleEvery;
      this.name = 'sasabonsam'; this.flying = true; this.holding = false; this.contactDmg = d.contactDmg;
    }
    update(dt) {
      this.tick(dt); const { dx, dy, p } = this.toPlayer(); const d = this.d;
      this.exposed = Math.max(0, this.exposed - dt);
      const cx = (this.arena.x0 + this.arena.x1) / 2, range = (this.arena.x1 - this.arena.x0) / 2 - 34;
      if (this.phase !== 'fight') { this.y += (this.baseY - this.y) * Math.min(1, dt * 2); this.dir = Math.sign(dx) || 1; return; }
      this.modeT -= dt; this.cd -= dt; this.shootCd -= dt; this.idleCd -= dt;
      if (this.modeT <= 0) { this.mode = this.mode === 'NORMAL' ? 'PURPLE' : 'NORMAL'; this.modeT = this.mode === 'NORMAL' ? d.normalTime : d.purpleTime; KK.Audio.sfx('boss'); }
      if (this.state === 'hover') {
        this.contactDmg = d.contactDmg;
        const tx = cx + Math.sin(this.t * 0.4) * range, ty = this.baseY + Math.sin(this.t * 2) * 7;
        this.x += (tx - this.x) * Math.min(1, dt * 0.8); this.y += (ty - this.y) * Math.min(1, dt * 3);
        this.dir = Math.sign(dx) || 1;
        if (this.mode === 'PURPLE' && this.shootCd <= 0) {
          this.shootCd = 1.6; const a = Math.atan2(dy, dx);
          for (const off of [-0.25, 0, 0.25]) G().projectiles.push(new KK.Projectile({ x: this.x + this.w / 2 - 4, y: this.y + this.h / 2, w: 8, h: 8, vx: Math.cos(a + off) * 150, vy: Math.sin(a + off) * 150, dmg: d.purpleProjDmg, color: '#b44dff', kind: 'purple', life: 3 }));
          KK.Audio.sfx('fire');
        }
        if (this.idleCd <= 0) { this.state = 'perch'; this.st = d.idleTime; this.idleCd = d.idleEvery + d.idleTime; }
        else if (this.cd <= 0 && !p.dead) { this.state = 'tell'; this.st = 0.6; this.target = { x: KK.clamp(p.x + p.w / 2, this.arena.x0 + 2 + this.w / 2, this.arena.x1 - 2 - this.w / 2), y: Math.min(p.y + p.h / 2, this.groundY - this.h / 2) }; KK.Audio.sfx('warn'); }
      } else if (this.state === 'perch') {
        // catches his breath, wings slow, sinks lower: the opening to strike
        this.st -= dt; this.contactDmg = d.contactDmg;
        this.y += ((this.baseY + 16) - this.y) * Math.min(1, dt * 2); this.dir = Math.sign(dx) || 1;
        if (this.st <= 0) { this.state = 'hover'; this.cd = 1.2; }
      } else if (this.state === 'tell') {
        this.st -= dt; this.y -= 18 * dt; if (this.st <= 0) { this.state = 'dive'; this.diveT = 1.6; }
      } else if (this.state === 'dive') {
        this.contactDmg = this.mode === 'PURPLE' ? d.purpleDiveDmg : d.swoopDmg;
        const tx = this.target.x - this.w / 2, ty = this.target.y - this.h / 2;
        const ddx = tx - this.x, ddy = ty - this.y, dist = Math.hypot(ddx, ddy), sp = this.mode === 'PURPLE' ? 280 : 230;
        this.diveT -= dt;
        // diveT: never gets stuck against a wall
        if (dist < 6 || this.y + this.h >= this.groundY || this.diveT <= 0) { this.state = 'rise'; this.y = Math.min(this.y, this.groundY - this.h); }
        else { this.x += ddx / dist * sp * dt; this.y += ddy / dist * sp * dt; }
      } else if (this.state === 'rise') {
        this.contactDmg = d.contactDmg; this.y -= 100 * dt;
        if (this.y <= this.baseY) { this.state = 'hover'; this.cd = this.mode === 'PURPLE' ? 2.2 : 3; }
      }
      this.x = KK.clamp(this.x, this.arena.x0 + 2, this.arena.x1 - this.w - 2);
    }
    takeHit(atk) {
      if (this.dead) return false;
      if (this.phase !== 'fight') { this.clang(); return true; }
      const m = this.d.mult; let n;
      if (atk.kind === 'dodge') { n = m.dodge; this.exposed = this.d.exposedTime; txt(this.x + this.w / 2, this.y - 14, 'EXPOSED', '#ffd23f'); }
      else if (atk.kind === 'shield') n = atk.dmg * (this.exposed > 0 ? m.exposedAirHeavy : m.shield);
      else if (atk.air && atk.heavy) n = atk.dmg * (this.exposed > 0 ? m.exposedAirHeavy : m.airHeavy);
      else if (atk.air) n = atk.dmg * m.airNormal;
      else if (atk.heavy) n = atk.dmg * m.groundHeavy;
      else n = atk.dmg * m.groundNormal;
      if (this.state === 'perch') n *= 1.3;
      if (n < atk.dmg * 0.5 && atk.kind !== 'dodge') txt(this.x + this.w / 2, this.y - 14, 'weak', '#bbbbbb');
      this.damage(n);
      if (this.state === 'dive' && atk.heavy) this.state = 'rise';
      if (this.hp <= 0) { this.dead = true; burst(this.x + this.w / 2, this.y + this.h / 2, '#7b3fa0', 30); G().bossEvent('bossDead', this); }
      return true;
    }
    draw(ctx, cam) {
      const x = this.x - cam.x, y = this.y - cam.y;
      const flapSpeed = this.state === 'dive' ? 30 : this.state === 'perch' ? 5 : 12;
      const flap = Math.sin(this.t * flapSpeed) * 7;
      const purple = this.mode === 'PURPLE' && this.phase === 'fight';
      ctx.fillStyle = purple ? '#4a1070' : '#3a2050';
      if (!KK.Sprites.has('sasabonsam')) { ctx.beginPath(); ctx.moveTo(x + 2, y + 9); ctx.lineTo(x - 20, y + 2 + flap); ctx.lineTo(x - 8, y + 22); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + this.w - 2, y + 9); ctx.lineTo(x + this.w + 20, y + 2 + flap); ctx.lineTo(x + this.w + 8, y + 22); ctx.fill(); }
      const tellFlash = this.state === 'tell' && Math.floor(this.t * 20) % 2;
      KK.drawActor(ctx, cam, this, tellFlash ? '#ff4a3a' : '#7b3fa0', { sprite: 'sasabonsam', owner: this, anim: { hover: 'fly', rise: 'fly', tell: 'windup' }[this.state] || this.state, fallbacks: ['fly'], tint: purple ? '#c070ff' : null, flash: this.flash > 0 ? 'rgba(255,255,255,0.8)' : null, eyeColor: '#ff3030' });
      if (purple) { ctx.strokeStyle = `rgba(200,100,255,${0.4 + 0.3 * Math.sin(this.t * 8)})`; ctx.lineWidth = 2; ctx.strokeRect(x - 2, y - 2, this.w + 4, this.h + 4); }
      if (this.exposed > 0) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1; ctx.strokeRect(x - 3.5, y - 3.5, this.w + 7, this.h + 7); }
    }
  }

  // ---------------- Barafo Boneng ----------------
  class Brafo extends BossBase {
    constructor(x, y) {
      const d = C.BRAFO; super(x, y - d.h, d.w, d.h); this.d = d;
      this.phase = 'script'; this.stage = 1; this.hitsNeeded = d.phase1Hits; this.hits = 0;
      this.state = 'walk'; this.st = 0; this.cd = 1.2; this.iframe = 0; this.contactDmg = C.BRAFO.contactDmg; this.name = 'brafo'; this.dir = -1; this.shieldIds = new Set();
    }
    get hp() { return this.hitsNeeded - this.hits; }
    get maxHp() { return this.hitsNeeded; }
    swordBox() {
      const a = this.attackType, x = this.x, w = this.w, y = this.y;
      if (a === 'slash') return { x: this.dir > 0 ? x + w - 4 : x - 48, y: y - 8, w: 52, h: this.h + 8 };
      if (a === 'sweep') return { x: this.dir > 0 ? x + w - 4 : x - 64, y: y + this.h - 16, w: 68, h: 16 };
      return { x: x - 12, y: y + this.h - 14, w: w + 24, h: 14 };
    }
    update(dt) {
      this.tick(dt); const { dx, adx, p } = this.toPlayer(); const d = this.d;
      this.iframe = Math.max(0, this.iframe - dt);
      if (this.phase !== 'fight') { this.walk(dt, 0); this.dir = Math.sign(dx) || 1; return; }
      this.cd -= dt;
      this.contactDmg = this.state === 'recover' ? 0 : this.d.contactDmg;   // off balance after a swing: bumping him is safe
      switch (this.state) {
        case 'walk': {
          this.dir = Math.sign(dx) || 1;
          this.walk(dt, adx > 46 ? this.dir * d.speed : 0);
          if (this.cd <= 0 && !p.dead) {
            const r = Math.random();
            this.attackType = adx > 120 || (p.y + p.h < this.y + 10 && adx > 56) ? 'slam' : adx < 80 ? (r < 0.5 ? 'slash' : 'sweep') : (r < 0.6 ? 'slam' : 'sweep');
            this.state = 'windup'; this.st = d.windup[this.attackType]; KK.Audio.sfx('warn');
            if (this.attackType === 'slam') { const tx = KK.clamp(p.x + p.w / 2 - this.w / 2, this.arenaX0 || 0, (this.arenaX1 || 1e9) - this.w); this.leapVx = (tx - this.x) / 0.6; }
          }
          break;
        }
        case 'windup':
          this.st -= dt; this.walk(dt, 0);
          if (this.st <= 0) { this.state = 'active'; this.hitDone = false; if (this.attackType === 'slam') { this.vy = -330; this.airborne = true; this.st = 1.2; } else this.st = 0.18; KK.Audio.sfx('heavy'); }
          break;
        case 'active':
          if (this.attackType === 'slam') {
            this.vy = Math.min(this.vy + C.GRAVITY * dt, C.MAX_FALL); this.vx = this.leapVx; KK.moveBody(this, G().level, dt, null);
            this.st -= dt;
            if ((this.onGround && this.vy >= 0 && this.airborne && this.st < 1.1) || this.st <= 0) {
              this.airborne = false; G().shake(6); KK.Audio.sfx('hit');
              if (KK.overlap(this.swordBox(), p)) p.hurt(d.slamDmg, this.x + this.w / 2);
              for (const s of [-1, 1]) G().projectiles.push(new KK.Projectile({ x: this.x + this.w / 2 - 7 + s * 22, y: this.y + this.h - 10, w: 14, h: 10, vx: s * 150, dmg: d.slamDmg, color: '#ffe08a', kind: 'shock', life: 1.4 }));
              for (let i = 0; i < 16; i++) G().particles.push(P(this.x + this.w / 2, this.y + this.h, KK.rand(-140, 140), KK.rand(-120, -10), '#f5e6c8', 0.6));
              this.state = 'recover'; this.st = d.recover; this.vx = 0;
            }
          } else {
            this.walk(dt, 0); this.st -= dt;
            if (!this.hitDone && KK.overlap(this.swordBox(), p)) { this.hitDone = true; p.hurt(this.attackType === 'slash' ? d.slashDmg : d.sweepDmg, this.x + this.w / 2); }
            if (this.st <= 0) { this.state = 'recover'; this.st = d.recover; if (this.attackType === 'slash') G().shake(3); }
          }
          break;
        case 'recover': this.st -= dt; this.walk(dt, 0); if (this.st <= 0) { this.state = 'walk'; this.cd = KK.rand(0.4, 1.0); } break;
        case 'regen': this.walk(dt, 0); break;
      }
    }
    takeHit(atk) {
      if (this.dead) return false;
      if (this.phase !== 'fight' || this.state === 'regen') { this.clang(); return true; }
      if (!atk.heavy || atk.kind === 'dodge' || atk.kind === 'stomp') { this.clang(); return true; }
      if (atk.kind === 'shield') { if (this.shieldIds.has(atk.shieldId)) return true; this.shieldIds.add(atk.shieldId); }  // a shield counts once
      if (this.iframe > 0) return true;
      this.iframe = 0.35; this.hits++; this.flash = 0.15; KK.Audio.sfx('hit'); G().shake(3); G().hitstop(0.06);
      txt(this.x + this.w / 2, this.y - 6, `${this.hits}/${this.hitsNeeded}`, '#ffd23f');
      if (this.hits >= this.hitsNeeded) {
        if (this.stage === 1) G().bossEvent('brafoRegen', this);
        else { this.dead = true; burst(this.x + this.w / 2, this.y + this.h / 2, '#3a2f2a', 40); G().bossEvent('bossDead', this); }
      }
      return true;
    }
    startPhase2() { this.stage = 2; this.hits = 0; this.hitsNeeded = this.d.phase2Hits; this.state = 'walk'; this.cd = 1; }
    draw(ctx, cam) {
      const x = this.x - cam.x, y = this.y - cam.y;
      const tell = this.state === 'windup' && Math.floor(this.t * 16) % 2;
      const ba = this.state === 'regen' ? 'regenerate' : this.state === 'recover' ? 'recover' : this.state === 'windup' ? (this.attackType === 'slam' ? 'leap' : this.attackType + '_windup') : this.state === 'active' ? (this.attackType === 'slam' ? (this.airborne ? 'leap' : 'slam') : this.attackType) : Math.abs(this.vx) > 4 ? 'walk' : 'idle';
      KK.drawActor(ctx, cam, this, tell ? '#7a2a20' : '#3a2f2a', { sprite: 'brafo', owner: this, anim: ba, fallbacks: ['idle'], flash: this.flash > 0 ? 'rgba(255,255,255,0.7)' : null, eyeColor: '#ff5030', outline: '#5a4a40' });
      if (this.state === 'regen') { ctx.strokeStyle = `rgba(255,210,63,${0.5 + 0.5 * Math.sin(this.t * 12)})`; ctx.lineWidth = 2; ctx.strokeRect(x - 3, y - 3, this.w + 6, this.h + 6); }
      if (this.dead || KK.Sprites.has('brafo')) return;
      ctx.fillStyle = '#ffd23f';
      if (this.state === 'windup' && this.attackType === 'slash') ctx.fillRect(this.dir > 0 ? x + this.w - 7 : x + 4, y - 32, 3.5, 34);
      else if (this.state === 'active' && this.attackType !== 'slam') { const b = this.swordBox(); ctx.globalAlpha = 0.85; ctx.fillRect(b.x - cam.x, b.y - cam.y + (this.attackType === 'sweep' ? 7 : b.h / 2), b.w, 4); ctx.globalAlpha = 1; }
      else if (this.state === 'windup' && this.attackType === 'sweep') ctx.fillRect(this.dir > 0 ? x - 26 : x + this.w, y + this.h - 12, 26, 3.5);
      else ctx.fillRect(this.dir > 0 ? x + this.w : x - 3.5, y + 8, 3.5, 32);
    }
  }

  KK.Bosses = { RedMinion, BlueMinion, Samanteng, Sasabonsam, Brafo, groundBelow };
})();
