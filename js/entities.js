// =============================================================
// KOFI KESE - player, enemies, projectiles, pickups, platforms
// Gameplay objects are plain bodies; artwork is attached at draw time.
// =============================================================
(function () {
  const C = KK.CONFIG, T = C.TILE;
  const G = () => KK.game;
  const SWORD_GOLD = '#ffd23f', SWORD_LEAF = '#4fbf4a';   // Afenakwa / Habanfena (leaf sword)
  const FONT = '"Baloo 2", system-ui, sans-serif';

  // ---------- drawing helper: placeholder shape + procedural tint ----------
  // animation clock per object: restarts whenever the animation changes
  KK.animTime = function (owner, anim) {
    const now = KK.game ? KK.game.time : 0;
    if (owner._anim !== anim) { owner._anim = anim; owner._animStart = now; }
    return now - owner._animStart;
  };
  KK.drawActor = function (ctx, cam, e, color, opts = {}) {
    const x = Math.round(e.x - cam.x), y = Math.round(e.y - cam.y);
    const owner = opts.owner || e, anim = opts.anim || 'idle';
    if (opts.sprite && KK.Sprites.has(opts.sprite)) {
      const t = opts.time != null ? (KK.animTime(owner, anim), opts.time) : KK.animTime(owner, anim);
      if (KK.Sprites.draw(ctx, opts.sprite, anim, t, x, y, e.w, e.h, e.dir < 0, { tint: opts.tint, flash: opts.flash, alpha: opts.alpha, sword: opts.sword, fallbacks: opts.fallbacks })) return;
    }
    ctx.save();
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, e.w, e.h, Math.min(4, e.w / 4)) : ctx.rect(x, y, e.w, e.h); ctx.fill();
    if (opts.outline) { ctx.strokeStyle = opts.outline; ctx.lineWidth = 1; ctx.stroke(); }
    if (opts.eye !== false) {
      ctx.fillStyle = opts.eyeColor || '#111';
      const es = Math.max(2, Math.round(e.w / 6));
      const ex = e.dir > 0 ? x + e.w - es - 2 : x + 2;
      ctx.fillRect(ex, y + Math.max(3, Math.round(e.h / 5)), es, es);
    }
    if (opts.tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = opts.tint; ctx.fillRect(x, y, e.w, e.h); ctx.globalCompositeOperation = 'source-over'; }
    if (opts.flash) { ctx.fillStyle = opts.flash; ctx.fillRect(x, y, e.w, e.h); }
    ctx.restore();
  };
  // level object artwork (assets/objects): size = PNG size / 8, bottom-centred on (cx, bottom)
  KK.objArt = function (ctx, name, cx, bottom, frameIndex = null, loopTime = null) {
    let im = KK.Sprites.img('obj/' + name); if (!im) return false;
    if (Array.isArray(im)) im = im[frameIndex != null ? Math.min(frameIndex, im.length - 1) : Math.floor((loopTime || 0) * KK.SPRITE_FPS) % im.length];
    const w = im.width / 8, h = im.height / 8;
    ctx.drawImage(im, cx - w / 2, bottom - h, w, h); return true;
  };
  const ENEMY_ANIM = { patrol: 'move', tell: 'windup', crouch: 'windup', lunge: 'attack', charge: 'attack', pounce: 'attack' };

  // ---------- Particles and floating text ----------
  class Particle {
    constructor(x, y, vx, vy, color, life, size = 2, grav = 300) { Object.assign(this, { x, y, vx, vy, color, life, max: life, size, grav }); }
    update(dt) { this.vy += this.grav * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; return this.life > 0; }
    draw(ctx, cam) { ctx.globalAlpha = Math.max(0, this.life / this.max); ctx.fillStyle = this.color; ctx.fillRect(this.x - cam.x, this.y - cam.y, this.size, this.size); ctx.globalAlpha = 1; }
  }
  KK.Particle = Particle;
  class FloatText {
    constructor(x, y, text, color, size = 9) { Object.assign(this, { x, y, text, color, size, life: 0.9 }); }
    update(dt) { this.y -= 22 * dt; this.life -= dt; return this.life > 0; }
    draw(ctx, cam) {
      ctx.globalAlpha = Math.min(1, this.life * 2); ctx.font = `800 ${this.size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(this.text, this.x - cam.x, this.y - cam.y);
      ctx.fillStyle = this.color; ctx.fillText(this.text, this.x - cam.x, this.y - cam.y); ctx.globalAlpha = 1;
    }
  }
  KK.FloatText = FloatText;

  // ---------- Platforms ----------
  class MovingPlatform {
    constructor(d) { Object.assign(this, d); this.ox = d.x; this.oy = d.y; this.h = 6; this.t = Math.random() * 2; this.solid = true; this.dx = 0; this.dy = 0; }
    update(dt) {
      this.t += dt; const px = this.x, py = this.y;
      if (this.kind === 'M') this.x = this.ox + Math.sin(this.t * (Math.PI * 2 / 3.2)) * 32;
      else this.y = this.oy - (1 - Math.cos(this.t * (Math.PI * 2 / 3.6))) * 24;
      this.dx = this.x - px; this.dy = this.y - py;
    }
    draw(ctx, cam) {
      const x = this.x - cam.x, y = this.y - cam.y, th = G().level.theme;
      const art = KK.Sprites.img('obj/moving_platform'); if (art) { ctx.drawImage(art, x, y, this.w, this.h); return; }
      ctx.fillStyle = G().level.meta.theme === 'clouds' ? '#ffffff' : th.plat; ctx.fillRect(x, y, this.w, this.h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + this.h - 2, this.w, 2);
      ctx.fillStyle = '#e8c35a'; ctx.fillRect(x + this.w / 2 - 2, y + 1, 4, 2);
    }
  }
  class CrumblePlatform {
    constructor(d) { Object.assign(this, d); this.h = 6; this.state = 'idle'; this.t = 0; this.solid = true; this.dx = 0; this.dy = 0; }
    update(dt, player) {
      if (this.state === 'idle' && player.platform === this) { this.state = 'shake'; this.t = 0.5; }
      else if (this.state === 'shake') { this.t -= dt; if (this.t <= 0) { this.state = 'gone'; this.solid = false; this.t = 3; KK.Audio.sfx('land'); for (let i = 0; i < 8; i++) G().particles.push(new Particle(this.x + Math.random() * this.w, this.y, KK.rand(-30, 30), KK.rand(-40, 10), '#d8c9a8', 0.6)); } }
      else if (this.state === 'gone') { this.t -= dt; if (this.t <= 0) { this.state = 'idle'; this.solid = true; } }
    }
    draw(ctx, cam) {
      if (this.state === 'gone') return;
      const sh = this.state === 'shake' ? KK.rand(-1, 1) : 0;
      const x = this.x - cam.x + sh, y = this.y - cam.y;
      const fr = KK.Sprites.img('obj/crumble_platform');
      if (fr) { const i = this.state === 'idle' ? 0 : Math.min(fr.length - 1, 1 + Math.floor((0.5 - this.t) / 0.5 * (fr.length - 1))); ctx.drawImage(fr[i], x, y, this.w, this.h); return; }
      ctx.fillStyle = '#c9b48a'; ctx.fillRect(x, y, this.w, this.h);
      ctx.fillStyle = '#7d6a48'; for (let i = 3; i < this.w; i += 6) ctx.fillRect(x + i, y + 1, 1, this.h - 2);
    }
  }
  KK.MovingPlatform = MovingPlatform; KK.CrumblePlatform = CrumblePlatform;

  class Switch {
    constructor(d, index) { Object.assign(this, d); this.index = index; this.on = false; }
    draw(ctx, cam) {
      const x = this.x - cam.x, y = this.y - cam.y;
      if (KK.objArt(ctx, 'switch', x + this.w / 2, y + this.h + 2, this.on ? 1 : 0)) return;
      ctx.fillStyle = '#3a3a48'; ctx.fillRect(x, y, this.w, this.h);
      ctx.fillStyle = this.on ? '#3fe08a' : '#e04a3f'; ctx.fillRect(x + 3, y + 3, this.w - 6, this.h - 6);
    }
  }
  KK.Switch = Switch;

  // ---------- Pickups ----------
  class Pickup {
    constructor(type, x, y, key, physics = false) {
      Object.assign(this, { type, x, y, key, w: 10, h: 10, vx: 0, vy: physics ? -170 : 0, physics, t: Math.random() * 6, delay: physics ? 0.25 : 0 });
    }
    update(dt, level) {
      this.t += dt; this.delay -= dt;
      if (this.physics) { this.vy = Math.min(this.vy + C.GRAVITY * dt, C.MAX_FALL); KK.moveBody(this, level, dt, null); if (this.onGround) this.physics = false; }
    }
    draw(ctx, cam) {
      const bob = this.physics ? 0 : Math.sin(this.t * 3) * 1.5;
      const x = this.x - cam.x, y = this.y - cam.y + bob;
      if (KK.Sprites.draw(ctx, this.type, 'idle', this.t, x, y, this.w, this.h, false)) return;
      if (this.type === 'banana') {
        ctx.fillStyle = '#ffe135'; ctx.fillRect(x + 1, y + 5, 8, 3); ctx.fillRect(x + 6, y + 2, 3, 4); ctx.fillStyle = '#6b4a1c'; ctx.fillRect(x + 8, y + 1, 2, 2);
      } else if (this.type === 'cocoa') {
        ctx.fillStyle = '#b4652a'; ctx.beginPath(); ctx.ellipse(x + 5, y + 5, 4, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b3410'; ctx.fillRect(x + 4, y + 1, 2, 8);
      } else {
        const w = Math.max(2, 10 * (0.7 + 0.3 * Math.abs(Math.cos(this.t * 2))));
        ctx.fillStyle = '#ffc61a'; ctx.fillRect(x + (10 - w) / 2, y, w, 10);
        ctx.fillStyle = '#8a5a00'; if (w > 5) { ctx.fillRect(x + 4, y + 2, 2, 6); ctx.fillRect(x + 3, y + 4, 4, 2); }
      }
    }
  }
  KK.Pickup = Pickup;

  // ---------- Projectiles ----------
  class Projectile {
    constructor(o) {
      Object.assign(this, { w: 6, h: 6, vx: 0, vy: 0, dmg: 1, owner: 'enemy', color: '#ff5a2a', life: 3, kind: 'basic', grav: 0, hitIds: new Set() }, o);
    }
    update(dt, level) {
      this.life -= dt; this.vy += this.grav * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.kind === 'wave') {   // the power wave crosses the whole map
        if (this.x > level.pxW + 40 || this.x + this.w < -40 || this.y > level.pxH + 80 || this.y < -200) this.life = 0; else this.life = Math.max(this.life, 0.1);
        if (Math.random() < 0.6) G().particles.push(new Particle(this.x + this.w / 2, this.y + KK.rand(0, this.h), -this.vx * 0.1, KK.rand(-20, 20), '#7ac8ff', 0.3, 2, 0));
      } else if (KK.solidAt(level, this.x + this.w / 2, this.y + this.h / 2)) {
        this.life = 0; for (let i = 0; i < 5; i++) G().particles.push(new Particle(this.x + 3, this.y + 3, KK.rand(-60, 60), KK.rand(-80, 0), this.color, 0.4));
      }
      return this.life > 0;
    }
    draw(ctx, cam) {
      const x = this.x - cam.x, y = this.y - cam.y;
      if (KK.Sprites.draw(ctx, 'proj_' + this.kind, 'loop', KK.game.time, x, y, this.w, this.h, this.vx < 0)) return;
      if (this.kind === 'wave') {
        const g = ctx.createLinearGradient(x, 0, x + this.w, 0);
        const a = 'rgba(90,180,255,0)', b = 'rgba(140,210,255,0.9)';
        g.addColorStop(0, this.vx > 0 ? a : b); g.addColorStop(1, this.vx > 0 ? b : a);
        ctx.fillStyle = g; ctx.fillRect(x, y, this.w, this.h);
        ctx.fillStyle = '#e8f6ff'; ctx.fillRect(this.vx > 0 ? x + this.w - 3 : x, y + 2, 3, this.h - 4);
        return;
      }
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(x + this.w / 2, y + this.h / 2, this.w / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x + this.w / 2 - 1, y + this.h / 2 - 1, 2, 2);
    }
  }
  KK.Projectile = Projectile;

  // =============================================================
  // PLAYER - Kofitia
  // =============================================================
  class Player {
    constructor(x, y) {
      Object.assign(this, {
        x, y, w: C.PLAYER_W, h: C.PLAYER_H, vx: 0, vy: 0, dir: 1, onGround: false,
        health: C.MAX_HEALTH, maxHealth: C.MAX_HEALTH, stamina: C.MAX_STAMINA, maxStamina: C.MAX_STAMINA,
        power: 0, maxPower: C.MAX_POWER, stomps: 0, dizzyT: 0, airJumps: C.AIR_JUMPS, doubleJumpT: 0,
        coyote: 0, jumpBuffer: 0, staminaIdle: 0, invuln: 0, hurtT: 0, dodgeT: 0, dodgeDir: 1, airDodges: C.AIR_DODGES,
        attack: null, climbing: false, dropT: 0, dropHold: 0, dead: false, locked: false, animT: 0, trailT: 0, flashT: 0, flashColor: null,
        hasAfenakwa: true, safe: { x, y }, staminaFlash: 0, powerFlash: 0,
        combo: 0, comboT: 0, comboShow: 0, hangT: 0, shield: null, prevBottom: y + C.PLAYER_H,
      });
    }
    get palm() { return KK.weapon === 'palm' || !(this.hasAfenakwa || this.noSword); }   // palm-leaf sword: chosen, or Afenakwa stolen
    get swordColor() { return this.palm ? SWORD_LEAF : SWORD_GOLD; }
    useStamina(n) { this.stamina = Math.max(0, this.stamina - n); this.staminaIdle = 0; }

    update(dt) {
      const game = G(), level = game.level, I = KK.Input;
      this.animT += dt; this.prevBottom = this.y + this.h;
      for (const k of ['doubleJumpT', 'dizzyT', 'invuln', 'hurtT', 'flashT', 'dropT', 'staminaFlash', 'powerFlash', 'hangT', 'comboShow', 'landT', 'stompT', 'headT', 'receiveT']) this[k] = Math.max(0, this[k] - dt);
      this.comboT += dt;
      if (this.comboT > C.COMBO_WINDOW + 0.25 && !this.attack) this.combo = 0;
      if (this.dead) return;

      this.staminaIdle += dt;
      if (this.staminaIdle > C.REGEN_DELAY && !this.dodgeT && !this.shield) this.stamina = Math.min(this.maxStamina, this.stamina + C.REGEN_RATE * dt);
      if (game.beta.fullResources) { this.stamina = this.maxStamina; this.power = this.maxPower; }

      const ctl = !this.locked && !this.hurtT && !this.dizzyT;
      const left = ctl && I.held.MOVE_LEFT, right = ctl && I.held.MOVE_RIGHT;
      const up = ctl && I.held.UP, down = ctl && I.held.DOWN;
      const inputDir = (right ? 1 : 0) - (left ? 1 : 0);

      if (this.panDive) {   // automatic dive into the brass pan between worlds
        const d = this.panDive; d.t += dt; const k = Math.min(1, d.t / d.dur);
        this.x = d.x0 + (d.tx - d.x0) * k; this.y = d.y0 + (d.ty - d.y0) * k - Math.sin(k * Math.PI) * 50;
        this.dir = d.tx >= d.x0 ? 1 : -1; this.vx = this.vy = 0; return;
      }
      if (this.platform && this.platform.solid) { this.x += this.platform.dx; this.y += this.platform.dy; }

      // ladders decide whether UP climbs or jumps
      const cx = Math.floor((this.x + this.w / 2) / T);
      const onLadder = level.isLadder(cx, Math.floor((this.y + this.h - 1) / T)) || level.isLadder(cx, Math.floor((this.y + 2) / T));
      const ladderBelow = level.isLadder(cx, Math.floor((this.y + this.h + 1) / T));
      const jumpPressed = ctl && (I.pressed.JUMP || (I.pressed.UP && !onLadder && !this.climbing));
      const jumpHeld = I.held.JUMP || (I.held.UP && !this.climbing);

      // ---------- DODGE ----------
      if (ctl && I.pressed.DODGE && !this.dodgeT && !this.noSword) {
        const canAir = this.onGround || this.climbing || this.airDodges > 0;
        if (this.stamina >= C.DODGE_COST && canAir) {
          this.useStamina(C.DODGE_COST);
          if (!this.onGround && !this.climbing) this.airDodges--;
          this.climbing = false; this.attack = null; this.shield = null;
          this.airDash = !this.onGround && !this.climbing;
          this.dodgeT = this.airDash ? C.AIR_DASH_TIME : C.DODGE_TIME; this.dodgeDir = inputDir || this.dir; this.dir = this.dodgeDir;
          this.invuln = Math.max(this.invuln, C.DODGE_INVULN); this.dodgeHits = new Set(); this.vy = 0;
          KK.Audio.sfx('dodge');
        } else if (this.stamina < C.DODGE_COST) this.staminaFlash = 0.4;
      }
      if (this.dodgeT > 0) {
        this.dodgeT = Math.max(0, this.dodgeT - dt);
        this.vx = this.dodgeDir * (this.airDash ? C.AIR_DASH_SPEED : C.DODGE_SPEED); this.vy = 0;
        if (this.airDash && Math.random() < 0.6) game.particles.push(new Particle(this.x + this.w / 2, this.y + KK.rand(0, this.h), -this.dodgeDir * 80, KK.rand(-20, 20), '#ffffff', 0.25, 2, 0));
        this.trailT -= dt;
        if (this.trailT <= 0) { this.trailT = 0.025; game.ghosts.push({ x: this.x, y: this.y, w: this.w, h: this.h, life: 0.25, color: this.swordColor }); }
        game.dodgeHit(this);
        KK.moveBody(this, level, dt, game.platforms);
        if (this.dodgeT === 0) this.vx = this.dodgeDir * C.RUN_SPEED * 0.6;
        this.afterMove(dt);
        return;
      }

      // ---------- ATTACKS ----------
      if (ctl && !this.climbing && !this.noSword) this.handleAttacks(I, game);
      this.updateShield(dt, I, game);
      if (this.attack) {
        const a = this.attack; a.t += dt;
        const { startup, active, recovery } = a.d;
        a.phase = a.t < startup ? 'startup' : a.t < startup + active ? 'active' : a.t < startup + active + recovery ? 'recovery' : 'done';
        if (a.phase === 'active') {
          game.playerAttackHit(this, this.attackBox(), a);
          if (a.power && !a.fired) {
            a.fired = true;
            const tg = game.aimTarget; let vx = this.dir * C.POWER_WAVE_SPEED, vy = 0;
            if (tg && !tg.dead) { const ddx = tg.x + tg.w / 2 - (this.x + this.w / 2), ddy = tg.y + tg.h / 2 - (this.y + this.h / 2), dd = Math.hypot(ddx, ddy) || 1; vx = ddx / dd * C.POWER_WAVE_SPEED; vy = ddy / dd * C.POWER_WAVE_SPEED; }
            game.projectiles.push(new Projectile({ owner: 'player', kind: 'wave', x: vx > 0 ? this.x + this.w : this.x - 18, y: this.y - 4, w: 18, h: this.h + 6, vx, vy, dmg: a.d.dmg, color: '#7ac8ff', life: 60, air: a.air, heavy: true, power: true }));
          }
        }
        if (a.phase === 'done') { if (a.normal) this.comboT = 0; this.attack = null; }
      }

      // ---------- LADDERS ----------
      if (!this.climbing && !this.attack && !this.shield && ((up && onLadder) || (down && ladderBelow && this.onGround))) {
        this.climbing = true; this.x = cx * T + (T - this.w) / 2; this.vx = 0;
      }
      if (this.climbing) {
        this.airDodges = C.AIR_DODGES;
        this.vy = ((down ? 1 : 0) - (up ? 1 : 0)) * C.CLIMB_SPEED; this.vx = 0;
        if (ctl && (I.pressed.JUMP || (inputDir && !up && !down))) {
          this.climbing = false; this.vx = inputDir * C.RUN_SPEED;
          if (I.pressed.JUMP) { this.vy = -C.JUMP_VELOCITY * 0.75; KK.Audio.sfx('jump'); } else this.vy = 0;
        } else {
          const footRow = Math.floor((this.y + this.h - 1) / T);
          KK.moveBody(this, level, dt, null, { ignoreOneWay: true });
          const topRow = this.findLadderTop(level, cx, footRow);
          if (up && this.y + this.h <= topRow * T + 1) { this.y = topRow * T - this.h; this.vy = 0; this.climbing = false; this.onGround = true; }
          if (!level.isLadder(cx, Math.floor((this.y + this.h - 1) / T)) && !level.isLadder(cx, Math.floor((this.y + this.h + 1) / T))) this.climbing = false;
          if (down && this.onGround) this.climbing = false;
          this.afterMove(dt); return;
        }
      }

      // ---------- CROUCH (push DOWN while standing) ----------
      const wantCrouch = down && this.onGround && !ladderBelow && !(this.attack && !this.attack.low) && !this.dodgeT;
      if (wantCrouch && !this.crouching) { this.crouching = true; this.y += this.h - C.CROUCH_H; this.h = C.CROUCH_H; }
      else if (!wantCrouch && this.crouching) {
        const c0 = Math.floor(this.x / T), c1 = Math.floor((this.x + this.w - 0.01) / T), ty = Math.floor((this.y - (C.PLAYER_H - C.CROUCH_H)) / T);
        let blocked = false; for (let tx = c0; tx <= c1; tx++) if (level.isSolid(tx, ty)) blocked = true;
        if (!blocked) { this.crouching = false; this.y -= C.PLAYER_H - C.CROUCH_H; this.h = C.PLAYER_H; }
      }

      // ---------- HORIZONTAL ----------
      const slow = this.attack && this.attack.power && !this.attack.air;
      const target = slow || this.crouching ? 0 : inputDir * C.RUN_SPEED;
      const accel = this.onGround ? C.ACCEL_GROUND : C.ACCEL_AIR;
      if (this.hurtT > 0) { /* knockback keeps momentum */ }
      else if (this.vx < target) this.vx = Math.min(target, this.vx + accel * dt);
      else if (this.vx > target) this.vx = Math.max(target, this.vx - accel * dt);
      if (inputDir && !(this.attack && this.attack.phase === 'active')) this.dir = inputDir;

      // ---------- DROP THROUGH (hold DOWN on a thin platform) ----------
      if (down && this.onGround && this.standingOnOneWay(level) && !ladderBelow) { this.dropHold += dt; if (this.dropHold > C.DROP_HOLD) { this.dropT = 0.25; this.y += 2; this.dropHold = 0; } }
      else this.dropHold = 0;

      // ---------- JUMP ----------
      this.coyote = this.onGround ? C.COYOTE_TIME : Math.max(0, this.coyote - dt);
      if (jumpPressed) this.jumpBuffer = C.JUMP_BUFFER; else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      if (jumpPressed && !this.onGround && this.coyote <= 0 && this.airJumps > 0 && !this.climbing && !this.shield) {
        this.airJumps--; this.vy = -C.JUMP_VELOCITY * 0.88; this.useStamina(C.AIR_JUMP_COST); this.doubleJumpT = 0.35; this.jumpBuffer = 0;
        KK.Audio.sfx('jump'); for (let i = 0; i < 6; i++) game.particles.push(new Particle(this.x + this.w / 2, this.y + this.h, KK.rand(-50, 50), KK.rand(10, 40), '#ffffff', 0.3));
      }
      if (this.jumpBuffer > 0 && this.coyote > 0) {
        if (this.crouching) { this.crouching = false; this.y -= C.PLAYER_H - C.CROUCH_H; this.h = C.PLAYER_H; }
        this.vy = -C.JUMP_VELOCITY; this.useStamina(C.JUMP_COST); KK.Audio.sfx('jump');
        for (let i = 0; i < 4; i++) game.particles.push(new Particle(this.x + this.w / 2, this.y + this.h, KK.rand(-40, 40), KK.rand(-30, -5), '#d9cfb8', 0.3));
        this.jumpBuffer = 0; this.coyote = 0;
      }
      if (!jumpHeld && this.vy < 0 && !this.hurtT) this.vy *= Math.pow(C.JUMP_CUT, dt * 10);

      // ---------- GRAVITY + MOVE ----------
      let grav = C.GRAVITY;
      if (this.hangT > 0) { grav *= 0.12; this.vy = Math.min(this.vy, 25); }
      if (this.shield) { grav *= 0.3; this.vy = Math.min(this.vy, 70); }
      this.vy = Math.min(this.vy + grav * dt, C.MAX_FALL);
      KK.moveBody(this, level, dt, game.platforms, { ignoreOneWay: this.dropT > 0 });
      if (this.hitHead) { this.headT = 0.25; for (const h of this.hitHead) game.hitBox(h.tx, h.ty); }
      this.afterMove(dt);
    }

    handleAttacks(I, game) {
      const air = !this.onGround;
      const a = this.attack;
      // crouching attacks: low strikes that stun (Heavy 1 stuns longer)
      if (this.crouching && !air && !a) {
        let type = null;
        if (I.pressed.NORMAL_ATTACK) type = 'crouchAttack';
        else if (I.pressed.HEAVY_ATTACK_STAMINA) { if (this.stamina >= C.HEAVY_STAMINA_COST) { this.useStamina(C.HEAVY_STAMINA_COST); type = 'crouchHeavy'; } else { this.staminaFlash = 0.4; } }
        if (type) { this.attack = { type, t: 0, d: { ...C.CROUCH_ATTACKS[type] }, id: Math.random(), air: false, low: true, normal: type === 'crouchAttack', heavy: type === 'crouchHeavy', power: false, hits: new Set(), step: 1 }; KK.Audio.sfx(type === 'crouchHeavy' ? 'heavy' : 'attack'); return; }
      }
      // normal attack: tap repeatedly for a 5-hit combo
      if (I.pressed.NORMAL_ATTACK && (!a || (a.normal && a.phase === 'recovery'))) {
        const chain = (a && a.normal) || this.comboT < C.COMBO_WINDOW;
        this.combo = chain ? (this.combo % 5) + 1 : 1;
        const base = C.ATTACKS[air ? 'airNormal' : 'normal'];
        const speed = 1 - (this.combo - 1) * 0.06;
        const d = { ...base, startup: base.startup * speed, active: base.active, recovery: base.recovery * speed, dmg: C.COMBO_DMG[this.combo - 1] };
        if (this.combo === 5) { d.kb = 160; d.w += 4; }
        this.attack = { type: air ? 'airNormal' : 'normal', t: 0, d, id: Math.random(), air, normal: true, heavy: false, power: false, hits: new Set(), step: this.combo };
        this.comboShow = this.combo > 1 ? 0.9 : 0;
        KK.Audio.sfx('attack');
        return;
      }
      if (a && !(a.normal && a.phase === 'recovery')) return;
      if (I.pressed.HEAVY_ATTACK_STAMINA && !air) {
        if (this.stamina >= C.HEAVY_STAMINA_COST) {
          this.useStamina(C.HEAVY_STAMINA_COST);
          const finisher = this.combo >= 2 && (this.comboT < C.COMBO_WINDOW || (a && a.normal));
          const base = C.ATTACKS.heavyStamina;
          const d = { ...base };
          if (finisher) { d.dmg = base.dmg * (1 + C.COMBO_FINISH_MULT * this.combo); d.kb = 220; game.texts.push(new FloatText(this.x + this.w / 2, this.y - 10, 'COMBO FINISH', '#ffd23f', 10)); }
          this.attack = { type: 'heavyStamina', t: 0, d, id: Math.random(), air: false, heavy: true, power: false, hits: new Set(), finisher };
          this.combo = 0; KK.Audio.sfx('heavy');
        } else { this.staminaFlash = 0.4; KK.Audio.sfx('menu'); }
        return;
      }
      if (I.pressed.HEAVY_ATTACK_STAMINA && air && !this.shield) {
        if (this.stamina >= C.SHIELD_START_COST) {
          this.useStamina(C.SHIELD_START_COST);
          this.shield = { t: 0, tick: 0, id: Math.random(), act: Math.random() }; this.attack = null;
          KK.Audio.sfx('heavy');
        } else { this.staminaFlash = 0.4; KK.Audio.sfx('menu'); }
        return;
      }
      if (I.pressed.HEAVY_ATTACK_POWER) {
        if (this.power >= C.POWER_ATTACK_COST) {
          this.power -= C.POWER_ATTACK_COST;
          const type = air ? 'airHeavyPower' : 'heavyPower';
          this.attack = { type, t: 0, d: { ...C.ATTACKS[type] }, id: Math.random(), air, heavy: true, power: true, hits: new Set() };
          this.combo = 0; KK.Audio.sfx('power');
        } else { this.powerFlash = 0.4; KK.Audio.sfx('menu'); }
      }
    }

    updateShield(dt, I, game) {
      const s = this.shield; if (!s) return;
      if (this.stamina <= 0) {   // shield burned all stamina: Kofitia is dizzy
        this.shield = null; this.dizzyT = C.SHIELD_STUN; this.staminaFlash = 0.6; KK.Audio.sfx('hurt');
        game.texts.push(new FloatText(this.x + this.w / 2, this.y - 8, 'DIZZY', '#ffd23f', 10)); return;
      }
      if (!I.held.HEAVY_ATTACK_STAMINA || this.onGround || this.climbing || this.locked) { this.shield = null; return; }
      s.t += dt; s.tick -= dt;
      this.useStamina(C.SHIELD_DRAIN * dt);
      if (s.tick <= 0) { s.tick = C.SHIELD_TICK; s.id = Math.random(); }
      game.shieldHit(this, this.shieldBox(), s);
    }
    shieldBox() { const r = C.SHIELD_RADIUS; return { x: this.x + this.w / 2 - r, y: this.y + this.h / 2 - r, w: r * 2, h: r * 2 }; }

    findLadderTop(level, cx, row) { let r = row; while (r > 0 && level.isLadder(cx, r - 1)) r--; return r; }
    standingOnOneWay(level) {
      if (this.platform) return true;
      const ty = Math.floor((this.y + this.h + 1) / T), c0 = Math.floor(this.x / T), c1 = Math.floor((this.x + this.w - 0.01) / T);
      let one = false;
      for (let tx = c0; tx <= c1; tx++) { if (level.isSolid(tx, ty)) return false; if (level.isOneWay(tx, ty)) one = true; }
      return one;
    }

    afterMove(dt) {
      const game = G(), level = game.level;
      if (this.onGround) { this.airDodges = C.AIR_DODGES; this.stomps = 0; this.airJumps = C.AIR_JUMPS; }
      if (this.justLanded && !this.climbing) { this.landT = 0.22; KK.Audio.sfx('land'); for (let i = 0; i < 3; i++) game.particles.push(new Particle(this.x + this.w / 2, this.y + this.h, KK.rand(-30, 30), KK.rand(-20, 0), '#d9cfb8', 0.25)); }
      // remember the last safe spot (pit respawns)
      if (this.onGround && !this.platform) {
        const tx = Math.floor((this.x + this.w / 2) / T), ty = Math.floor((this.y + this.h + 1) / T);
        const ok = (x) => level.isSolid(x, ty) || level.isOneWay(x, ty);
        if (ok(tx) && ok(tx - 1) && ok(tx + 1) && !level.isHazard(tx, ty - 1) && level.tile(tx, ty) !== 'W') this.safe = { x: this.x, y: this.y };
      }
      // spikes
      const r0 = Math.floor(this.y / T), r1 = Math.floor((this.y + this.h - 1) / T), c0 = Math.floor(this.x / T), c1 = Math.floor((this.x + this.w - 1) / T);
      for (let ty = r0; ty <= r1; ty++) for (let tx = c0; tx <= c1; tx++)
        if (level.isHazard(tx, ty) && this.y + this.h > ty * T + 8 && this.invuln <= 0) { this.hurt(C.SPIKE_DAMAGE, this.x + this.w / 2 + (this.vx > 0 ? 8 : -8), { raw: true }); this.vy = -230; }
      // pits
      if (this.y > level.pxH + 24 && !this.dead) {
        this.hurt(C.PIT_DAMAGE, null, { force: true, raw: true });
        if (!this.dead) { this.x = this.safe.x; this.y = this.safe.y; this.vx = 0; this.vy = 0; this.invuln = 1.2; this.shield = null; }
      }
    }

    attackBox() {
      const a = this.attack, d = a.d;
      if (a.low) return { x: this.dir > 0 ? this.x + this.w - 2 : this.x - d.w + 2, y: this.y + this.h - d.h, w: d.w, h: d.h };
      if (a.air && (a.heavy || a.normal)) return { x: this.x + this.w / 2 - d.w / 2 + this.dir * 7, y: this.y + this.h / 2 - d.h / 2 + 2, w: d.w, h: d.h };
      const x = this.dir > 0 ? this.x + this.w - 2 : this.x - d.w + 2;
      return { x, y: this.y + this.h / 2 - d.h / 2, w: d.w, h: d.h };
    }

    // opts.raw: environmental damage (not scaled by difficulty); opts.force: ignores invulnerability
    hurt(dmg, srcX, opts = {}) {
      const game = G();
      if (this.dead) return;
      if (!opts.force && this.invuln > 0) return;
      if (!opts.raw) dmg = Math.max(1, Math.round(dmg * game.diff.dmg));
      if (game.beta.invincible) dmg = 0;
      this.health = Math.max(0, this.health - dmg);
      game.stats.lifeLost += dmg;
      this.invuln = C.INVULN_AFTER_HIT; this.hurtT = 0.25; this.attack = null; this.climbing = false; this.shield = null; this.combo = 0;
      if (srcX != null) { const d = this.x + this.w / 2 < srcX ? -1 : 1; this.vx = d * 130; this.vy = -170; }
      this.flashT = 0.18; this.flashColor = 'rgba(255,60,60,0.7)';
      KK.Audio.sfx('hurt'); game.shake(dmg >= 40 ? 5 : 2);
      if (dmg) game.texts.push(new FloatText(this.x + this.w / 2, this.y - 4, '-' + dmg, '#ff6a5a', 10));
      if (this.health <= 0) this.die();
    }
    die() {
      this.dead = true; KK.Audio.sfx('death');
      for (let i = 0; i < 24; i++) G().particles.push(new Particle(this.x + this.w / 2, this.y + this.h / 2, KK.rand(-120, 120), KK.rand(-200, 0), i % 2 ? '#d93a2b' : this.swordColor, 1));
      G().onPlayerDeath();
    }
    heal(n) { this.health = Math.min(this.maxHealth, this.health + n); }

    draw(ctx, cam) {
      if (this.dead) return;
      // while invulnerable Kofitia turns translucent (never disappears, so colours behind him never show through as his)
      let alpha = this.invuln > 0 && !this.dodgeT ? (Math.floor(this.invuln * 16) % 2 ? 0.4 : 0.85) : 1;
      if (this.panDive) alpha = Math.max(0, Math.min(1, (this.panDive.dur - this.panDive.t) / 0.35));
      const a = this.attack;
      const anim = this.panDive ? 'pan_jump' : this.dead ? 'death' : this.dizzyT > 0 ? 'dizzy' : this.hurtT > 0 ? 'hurt' : this.dodgeT ? (this.onGround ? 'dodge' : 'air_dash') : this.shield ? 'shield' : this.climbing ? 'climb'
        : a ? (a.low ? (a.type === 'crouchHeavy' ? 'crouch_heavy' : 'crouch_attack') : a.normal ? (a.air ? 'air_attack' : 'attack_' + a.step) : a.type === 'heavyStamina' ? 'heavy_1' : a.air ? 'air_heavy_2' : 'heavy_2')
        : this.receiveT > 0 ? 'receive_sword' : this.noSword ? 'release_sword'   // empty-handed: last frame of release_sword
        : !this.onGround ? (this.stompT > 0 ? 'stomp' : this.headT > 0 ? 'headbutt' : this.doubleJumpT > 0 ? 'double_jump' : this.vy < 0 ? 'jump' : 'fall')
        : this.crouching ? 'crouch' : Math.abs(this.vx) > 5 ? 'run' : this.locked && KK.game.dialog ? 'talk' : this.landT > 0 ? 'land' : 'idle';
      const squash = this.onGround && Math.abs(this.vx) > 5 ? Math.sin(this.animT * 20) : 0;
      const e = { x: this.x, y: this.y + this.h - C.PLAYER_H - squash, w: this.w, h: C.PLAYER_H + squash, dir: this.dir, animT: this.animT };
      if (this.crouching && !KK.Sprites.has('kofitia_afenakwa')) { e.y = this.y; e.h = this.h; }
      KK.drawActor(ctx, cam, e, '#d93a2b', { sprite: this.palm ? 'kofitia_palm' : 'kofitia_afenakwa', owner: this, anim, alpha, time: this.noSword && !this.receiveT ? 99 : null, flash: this.flashT > 0 ? this.flashColor : null, outline: '#7a1a12', fallbacks: ['idle'] });
      if (KK.Sprites.has('kofitia_afenakwa')) return;
      const x = this.x - cam.x, y = this.y - cam.y;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = this.swordColor;
      if (this.shield) {
        const r = C.SHIELD_RADIUS, cx = x + this.w / 2, cy = y + this.h / 2, t = this.shield.t;
        ctx.strokeStyle = this.swordColor; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.85;
        for (let i = 0; i < 3; i++) { const a0 = t * 14 + i * 2.1; ctx.beginPath(); ctx.arc(cx, cy, r - 2, a0, a0 + 1.1); ctx.stroke(); }
        ctx.globalAlpha = 0.15; ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      } else if (this.attack && this.attack.phase !== 'startup') {
        const b = this.attackBox(), bx = b.x - cam.x, by = b.y - cam.y, a = this.attack;
        ctx.globalAlpha = alpha * (a.phase === 'active' ? 0.9 : 0.35);
        if (a.air) {
          ctx.strokeStyle = a.power ? '#7ac8ff' : this.swordColor; ctx.lineWidth = a.heavy ? 4 : 2.5;
          const st = this.dir > 0 ? -1.2 : Math.PI - 1.2; ctx.beginPath(); ctx.arc(bx + b.w / 2, by + b.h / 2, b.w / 2, st, st + 2.4 * (this.dir > 0 ? 1 : 1)); ctx.stroke();
        } else {
          const th = a.heavy ? 6 : a.step === 5 ? 5 : 3;
          ctx.fillRect(bx, by + b.h / 2 - th / 2 + (a.normal && a.step % 2 ? -3 : 0), b.w, th);
          if (a.power) { ctx.fillStyle = '#bfe6ff'; ctx.fillRect(bx, by + b.h / 2 - 1, b.w, 2); }
          if (a.finisher) { ctx.fillStyle = '#fff2a8'; ctx.fillRect(bx, by + b.h / 2 - 1, b.w, 2); }
        }
      } else if (this.attack) {
        ctx.fillRect(this.dir > 0 ? x - 2 : x + this.w, y - 5, 2.5, 10);
      } else if (!this.climbing && !this.noSword) {
        ctx.fillRect(this.dir > 0 ? x - 1.5 : x + this.w - 1, y + 5, 2.5, 11);
      }
      if (this.dizzyT > 0) { ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { const an = this.animT * 6 + i * 2.1; ctx.fillRect(x + this.w / 2 + Math.cos(an) * 7 - 1, y - 5 + Math.sin(an) * 2, 2.5, 2.5); } }
      ctx.restore();
    }
  }
  KK.Player = Player;

  // =============================================================
  // ENEMIES
  // =============================================================
  class Enemy {
    constructor(type, x, y, mini = false) {
      const d0 = C.ENEMIES[type], m = C.MINIBOSS;
      const d = mini ? { ...d0, w: d0.w * m.scale, h: d0.h * m.scale, hp: Math.round(d0.hp * m.hpMult * G().diff.bossHp), dmg: Math.round(d0.dmg * m.dmgMult) } : d0;
      const hp0 = mini ? d.hp : Math.round(d.hp * C.ENEMY_HP_MULT);
      Object.assign(this, { type, d, w: d.w, h: d.h, x: x + (T - d.w) / 2, y: y + T - d.h, vx: 0, vy: 0, dir: -1, hp: hp0, maxHp: hp0, state: 'patrol', t: KK.rand(0, 1), cd: KK.rand(0.5, 1.5), stun: 0, flash: 0, dead: false, animT: 0, flying: type === 'goldMask', homeX: x, homeY: y, mini });
      this.contactDmg = d.dmg;
      if (mini) this.name = (KK.CHARACTERS['giant_' + type] || { name: 'Kɛseɛ' }).name;
    }
    update(dt) {
      const game = G(), p = game.player, level = game.level;
      this.animT += dt; this.flash = Math.max(0, this.flash - dt); this.cd -= dt; this.t += dt;
      if (this.stun > 0) {
        this.stun -= dt; this.vx *= Math.pow(0.02, dt);
        if (!this.flying) this.vy = Math.min(this.vy + C.GRAVITY * dt, C.MAX_FALL); else this.vy *= Math.pow(0.02, dt);
        KK.moveBody(this, level, dt, null, { big: this.h > 28 }); return;
      }
      const dx = (p.x + p.w / 2) - (this.x + this.w / 2), dy = (p.y + p.h / 2) - (this.y + this.h / 2), adx = Math.abs(dx);
      const sees = adx < (this.mini ? 220 : 160) && Math.abs(dy) < 70 && !p.dead;
      this['ai_' + this.type].call(this, dt, { dx, dy, adx, sees, sp: this.d.speed, p, game, level });
      if (!this.flying) {
        // never follow Kofitia off a cliff: airborne over a void, steer back
        if (!this.onGround && this.vx && !this.groundBelow(level, this.x + this.w / 2 + Math.sign(this.vx) * 4)) this.vx = -this.vx * 0.5;
        this.vy = Math.min(this.vy + C.GRAVITY * dt, C.MAX_FALL);
        KK.moveBody(this, level, dt, null, { big: this.h > 28 });
        if (this.y > level.pxH + 40) this.dead = true;
      } else { this.x += this.vx * dt; this.y += this.vy * dt; }
    }
    groundBelow(level, px, rows = 9) {
      const tx = Math.floor(px / T); let ty = Math.floor((this.y + this.h) / T);
      for (let i = 0; i < rows; i++, ty++) if (level.isSolid(tx, ty) || level.isOneWay(tx, ty)) return true;
      return false;
    }
    safeLanding(level, vx, airtime) { return this.groundBelow(level, this.x + this.w / 2 + vx * airtime) && this.groundBelow(level, this.x + this.w / 2 + vx * airtime * 0.5); }
    patrol(sp, level) {
      this.vx = this.dir * sp;
      const aheadX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
      if (this.hitWall || (this.onGround && !KK.groundAt(level, aheadX, this.y + this.h + 2))) { this.dir *= -1; this.vx = this.dir * sp; }
    }
    edgeAhead(level) { const aheadX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2; return this.onGround && !KK.groundAt(level, aheadX, this.y + this.h + 2); }

    ai_snake(dt, o) {
      if (this.state === 'lunge') { this.t2 -= dt; if (this.t2 <= 0 || this.hitWall || this.edgeAhead(o.level)) { this.state = 'patrol'; this.cd = 1.4; } else this.vx = this.dir * 120; return; }
      if (o.sees && o.adx < 55 && Math.abs(o.dy) < 16 && this.cd <= 0) { this.dir = Math.sign(o.dx) || 1; this.state = 'lunge'; this.t2 = 0.3; return; }
      this.patrol(o.sp, o.level);
    }
    ai_goat(dt, o) {
      if (this.state === 'tell') { this.t2 -= dt; this.vx = 0; if (this.t2 <= 0) { this.state = 'charge'; this.t2 = 1.3; } return; }
      if (this.state === 'charge') { this.t2 -= dt; this.vx = this.dir * this.d.charge; if (this.t2 <= 0 || this.hitWall || this.edgeAhead(o.level)) { this.state = 'patrol'; this.cd = this.mini ? 2.1 : 1.5; this.vx = 0; } return; }
      if (o.sees && o.adx < (this.mini ? 170 : 120) && Math.abs(o.dy) < 24 + this.h / 2 && this.cd <= 0) { this.dir = Math.sign(o.dx) || 1; this.state = 'tell'; this.t2 = this.mini ? 0.7 : 0.45; KK.Audio.sfx('warn'); return; }
      this.patrol(o.sp, o.level);
    }
    ai_fowl(dt, o) {
      this.patrol(o.sp, o.level);
      if (this.onGround && this.cd <= 0) { this.vy = -KK.rand(140, 220); this.cd = KK.rand(0.8, 1.8); if (Math.random() < 0.3) this.dir *= -1; if (!this.safeLanding(o.level, this.dir * o.sp, 0.4)) this.dir *= -1; }
    }
    ai_monkey(dt, o) {
      if (o.sees && o.adx < 150) {
        if (this.onGround && this.cd <= 0) {
          this.dir = Math.sign(o.dx) || 1; const vx = this.dir * KK.rand(60, 110);
          this.vy = -KK.rand(230, 290); this.vx = this.safeLanding(o.level, vx, 0.55) ? vx : 0; this.cd = KK.rand(0.6, 1.2) * (this.mini ? 1.7 : 1);   // a giant needs longer between leaps
        } else if (this.onGround) this.vx *= 0.8;
      } else this.patrol(o.sp, o.level);
    }
    ai_panther(dt, o) {
      if (this.state === 'crouch') { this.vx = 0; this.t2 -= dt; if (this.t2 <= 0) { this.state = 'pounce'; this.vx = this.dir * this.d.pounce; this.vy = -210; } return; }
      if (this.state === 'pounce') { if (this.onGround && this.vy >= 0) { this.state = 'patrol'; this.cd = this.mini ? 1.9 : 1.3; this.vx = 0; } return; }
      if (o.sees && o.adx < (this.mini ? 180 : 130) && Math.abs(o.dy) < 40 + this.h / 2 && this.cd <= 0) {
        const dir = Math.sign(o.dx) || 1;
        if (this.safeLanding(o.level, dir * this.d.pounce, 0.45)) { this.dir = dir; this.state = 'crouch'; this.t2 = this.mini ? 0.65 : 0.4; KK.Audio.sfx('warn'); return; }
      }
      this.patrol(o.sp, o.level);
    }
    ai_whiteMmoatia(dt, o) {
      this.vx = 0;
      if (o.adx < 220 && Math.abs(o.dy) < 90) {
        this.dir = Math.sign(o.dx) || 1;
        this.charging = this.cd <= 0.4 && this.cd > 0;
        if (this.cd <= 0) {
          this.charging = false; this.cd = this.d.fireEvery;
          const s = this.d.flameSpeed, vy = KK.clamp(Math.sin(Math.atan2(o.dy, o.dx)) * s, -50, 50);
          o.game.projectiles.push(new Projectile({ x: this.x + this.w / 2 - 4, y: this.y + 4, w: 8, h: 6, vx: this.dir * s, vy, dmg: this.d.flameDmg, color: '#ff7a1a', kind: 'flame', life: 2.5 }));
          KK.Audio.sfx('fire');
        }
      } else this.charging = false;
    }
    ai_goldMask(dt, o) {
      if (o.adx < 140 && Math.abs(o.dy) < 100 && !o.p.dead) {
        this.dir = Math.sign(o.dx) || 1;
        this.vx = KK.clamp(o.dx, -1, 1) * this.d.speed; this.vy = KK.clamp(o.dy, -1, 1) * this.d.speed * 0.8 + Math.sin(this.t * 4) * 30;
      } else { this.vx = Math.sin(this.t * 0.8) * 25; this.vy = (this.homeY - this.y) * 1.5 + Math.cos(this.t * 2) * 20; this.dir = this.vx >= 0 ? 1 : -1; }
    }
    ai_goldLion(dt, o) { this.ai_goat(dt, o); }
    ai_goldSlime(dt, o) {
      if (this.onGround) {
        this.vx *= Math.pow(0.4, dt);
        if (this.cd <= 0) {
          this.dir = o.sees ? Math.sign(o.dx) || 1 : (Math.random() < 0.5 ? -1 : 1);
          const vx = this.dir * this.d.speed * 1.4; this.vy = -150; this.vx = this.safeLanding(o.level, vx, 0.32) ? vx : 0; this.cd = KK.rand(0.6, 1.1);
        }
      }
      if (this.hitWall) this.dir *= -1;
    }

    takeHit(atk) {
      if (this.dead) return false;
      this.hp -= atk.dmg; this.flash = 0.12;
      const kbMul = (this.type === 'goldSlime' ? 2 : this.type === 'goldLion' ? 0.4 : 1) * (this.mini ? 0.5 : 1);
      // mid-charge or mid-pounce a mob does not flinch (only a heavy hit stops it)
      const armored = (this.state === 'charge' || this.state === 'pounce' || this.state === 'lunge') && !atk.heavy;
      if (!armored) {
        this.vx = atk.dir * (atk.kb || 80) * kbMul; if (!this.flying && !this.mini) this.vy = -90;
        this.stun = this.mini ? (atk.heavy ? 0.45 : 0.12) : atk.heavy ? 0.35 : 0.2;   // giants flinch briefly, so a combo can land
      }
      if (atk.stun) { this.stun = this.mini ? atk.stun * 0.5 : atk.stun; this.stunFx = this.stun; G().texts.push(new FloatText(this.x + this.w / 2, this.y - 6, 'STUN', '#ffd23f', 9)); }
      if (this.state !== 'charge' || atk.heavy) this.state = 'patrol';
      if (this.hp <= 0) this.die();
      return true;
    }
    die() {
      const game = G(); this.dead = true;
      for (let i = 0; i < (this.mini ? 40 : 14); i++) game.particles.push(new Particle(this.x + this.w / 2, this.y + this.h / 2, KK.rand(-90, 90), KK.rand(-160, -20), this.d.color, 0.7));
      if (this.mini) { for (const t of ['banana', 'cocoa', 'banana']) game.pickups.push(new Pickup(t, this.x + KK.rand(0, this.w), this.y, null, true)); game.collectGye(this.x + this.w / 2, this.y); KK.Audio.sfx('regen'); return; }
      const r = Math.random();
      if (r < C.DROP_BANANA) game.pickups.push(new Pickup('banana', this.x, this.y - 4, null, true));
      else if (r < C.DROP_BANANA + C.DROP_COCOA) game.pickups.push(new Pickup('cocoa', this.x, this.y - 4, null, true));
    }
    draw(ctx, cam) {
      let color = this.d.color, h = this.h, yOff = 0;
      if ((this.state === 'tell' || this.state === 'crouch') && Math.floor(this.t * 20) % 2) color = '#ff4a3a';
      if (this.state === 'crouch') { h = this.h - 3; yOff = 3; }
      const e = { x: this.x, y: this.y + yOff, w: this.w, h, dir: this.dir, animT: this.animT };
      let anim = ENEMY_ANIM[this.state] || 'idle';
      if (anim === 'move' && Math.abs(this.vx) < 4 && this.onGround !== false && !this.flying) anim = 'idle';
      if (this.type === 'whiteMmoatia') anim = this.charging ? 'windup' : this.cd > this.d.fireEvery - 0.3 ? 'attack' : 'idle';
      if (this.type === 'goldMask') anim = 'move';
      KK.drawActor(ctx, cam, e, color, { sprite: this.type, owner: this, anim, fallbacks: ['move', 'idle'], flash: this.flash > 0 ? 'rgba(255,255,255,0.85)' : null, outline: this.type === 'panther' ? '#6a6a80' : this.type === 'whiteMmoatia' || this.type === 'fowl' ? '#9a9a9a' : this.mini ? '#000' : null, eyeColor: this.type === 'panther' ? '#f2d23a' : this.type === 'whiteMmoatia' ? '#e0302a' : '#111' });
      if (this.stun > 0 && this.stunFx) { ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { const an = this.t * 6 + i * 2.1; ctx.fillRect(this.x - cam.x + this.w / 2 + Math.cos(an) * 8 - 1, this.y - cam.y - 5 + Math.sin(an) * 2, 2.5, 2.5); } }
      if (this.stunner) { ctx.strokeStyle = `rgba(190,120,255,${0.5 + 0.3 * Math.sin(this.t * 6)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(this.x - cam.x + this.w / 2, this.y - cam.y - 6, 3.5, 0, Math.PI * 2); ctx.stroke(); }
      if (this.charging) { ctx.fillStyle = '#ff7a1a'; ctx.fillRect(this.x - cam.x + (this.dir > 0 ? this.w : -3), this.y - cam.y + 4, 3, 3); }
    }
  }
  KK.Enemy = Enemy;
})();
