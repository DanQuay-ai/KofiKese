// =============================================================
// KOFI KESE - level parsing, tile collision, world rendering
// =============================================================
(function () {
  const C = KK.CONFIG, T = C.TILE;

  const THEMES = {
    forge:      { sky: ['#2a1410', '#4a2414'], ground: '#5a4636', top: '#7d6650', plat: '#8a6a44', far: '#3a1c12', near: '#21100a' },
    forest:     { sky: ['#9fd6c2', '#e8f2c4'], ground: '#6b4a2b', top: '#4d9a3a', plat: '#8a6238', far: '#7fb79a', near: '#4f8a60' },
    forestDark: { sky: ['#556b5a', '#a4a77e'], ground: '#4e3622', top: '#3c6f34', plat: '#6e4c2b', far: '#4a5f4c', near: '#2f4635' },
    deepForest: { sky: ['#121427', '#2c2448'], ground: '#2b2a35', top: '#2f5a3a', plat: '#4a3a52', far: '#1d2240', near: '#141a2c' },
    clouds:     { sky: ['#f3d9ff', '#ffe9b8'], ground: '#fbf7ee', top: '#ffd76a', plat: '#f2e2b0', far: '#f7e6ff', near: '#fff3d6' },
  };
  KK.THEMES = THEMES;

  const ENEMY_CHARS = { s: 'snake', g: 'goat', f: 'fowl', m: 'monkey', p: 'panther', w: 'whiteMmoatia', k: 'goldMask', l: 'goldLion', y: 'goldSlime' };
  const TILE_CHARS = new Set(['#', '=', 'H', 'B', 'C', 'G', '^', 'h', 'W', 'Z', '[', ']', 'U']);

  class Level {
    constructor(id) {
      const def = KK.LEVELS[id];
      this.id = id; this.meta = def.meta;
      this.theme = THEMES[def.meta.theme] || THEMES.forest;
      this.h = def.map.length;
      this.w = Math.max(...def.map.map(r => r.length));
      this.pxW = this.w * T; this.pxH = this.h * T;
      this.tiles = [];
      this.spawns = { enemies: [], pickups: [], boxes: [], movers: [], crumbles: [], switches: [], checkpoints: [], signs: [], exits: [], portals: [], decor: [], minibosses: [] };
      this.leftGateClosed = false; this.rightGateOpen = false;
      this.usedBoxes = new Set();
      for (let y = 0; y < this.h; y++) {
        const row = def.map[y].padEnd(this.w, '.');
        this.tiles.push([]);
        let x = 0;
        while (x < this.w) {
          const c = row[x];
          let tile = '.';
          if (TILE_CHARS.has(c)) tile = c;
          else if (c === 'M' || c === 'V' || c === 'X') {
            let x2 = x; while (x2 + 1 < this.w && row[x2 + 1] === c) x2++;
            const list = c === 'X' ? this.spawns.crumbles : this.spawns.movers;
            list.push({ kind: c, x: x * T, y: y * T, w: (x2 - x + 1) * T });
            for (let i = x; i <= x2; i++) this.tiles[y].push('.');
            x = x2 + 1; continue;
          }
          else if (c === 'P') this.start = { x: x * T + 3, y: y * T + T - C.PLAYER_H };
          else if (c === 'K') this.spawns.checkpoints.push({ x: x * T, y: y * T });
          else if (c === 'E') this.spawns.exits.push({ x: x * T, y: y * T - T, w: T, h: T * 2 });
          else if (c === 'O') this.spawns.portals.push({ x: x * T - 4, y: y * T - T, w: T + 8, h: T * 2 });
          else if (c === '!') this.bossSpawn = { x: x * T, y: y * T };
          else if (c === 'S') this.spawns.switches.push({ x: x * T + 2, y: y * T + 2, w: 12, h: 12, tx: x, ty: y });
          else if (c === 'n' || c === 'o' || c === '*') this.spawns.pickups.push({ type: { n: 'banana', o: 'cocoa', '*': 'gye' }[c], x: x * T + 3, y: y * T + 3, key: `${x},${y}` });
          else if (c === 'Q') this.spawns.minibosses.push({ x: x * T, y: y * T });
          else if (ENEMY_CHARS[c]) this.spawns.enemies.push({ type: ENEMY_CHARS[c], x: x * T, y: y * T });
          else if (c >= '1' && c <= '9') this.spawns.signs.push({ n: c, x: x * T, y: y * T });
          else if (c === 'D' || c === 'F' || c === 'A') this.spawns.decor.push({ c, x: x * T, y: y * T });
          if (c === 'B' || c === 'C' || c === 'G') this.spawns.boxes.push({ x, y, c });
          this.tiles[y].push(tile);
          x++;
        }
      }
      if (!this.start) this.start = { x: 32, y: 32 };
      // gates: leftmost '[' column, ']' column
      this.leftGateX = this.findCol('['); this.rightGateX = this.findCol(']');
      this.buildSwitchClusters();
    }

    findCol(ch) { for (let x = 0; x < this.w; x++) for (let y = 0; y < this.h; y++) if (this.tiles[y][x] === ch) return x; return -1; }

    // W and Z cells form clusters; each cluster obeys the closest switch
    buildSwitchClusters() {
      this.cluster = {}; this.clusterOn = {};
      const seen = new Set(); let id = 0;
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const c = this.tiles[y][x];
        if ((c !== 'W' && c !== 'Z') || seen.has(x + ',' + y)) continue;
        const stack = [[x, y]], cells = []; seen.add(x + ',' + y);
        while (stack.length) {
          const [cx, cy] = stack.pop(); cells.push([cx, cy]);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny;
            if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h || seen.has(k)) continue;
            if (this.tiles[ny][nx] === c) { seen.add(k); stack.push([nx, ny]); }
          }
        }
        let best = -1, bd = 1e9;
        this.spawns.switches.forEach((s, i) => {
          for (const [cx, cy] of cells) { const d = Math.hypot(cx - s.tx, cy - s.ty); if (d < bd) { bd = d; best = i; } }
        });
        for (const [cx, cy] of cells) this.cluster[cx + ',' + cy] = best;
        id++;
      }
      this.switchOn = this.spawns.switches.map(() => false);
    }

    tile(tx, ty) {
      if (tx < 0 || tx >= this.w) return '#';
      if (ty < 0) return '.';
      if (ty >= this.h) return this.tiles[this.h - 1][tx] === '#' ? '#' : '.';   // ground continues below the map
      return this.tiles[ty][tx];
    }
    isSolid(tx, ty) {
      const c = this.tile(tx, ty);
      switch (c) {
        case '#': case 'B': case 'C': case 'G': case 'b': return true;
        case 'W': return this.switchOn[this.cluster[tx + ',' + ty]] === true;
        case 'Z': return this.switchOn[this.cluster[tx + ',' + ty]] !== true;
        case '[': return this.leftGateClosed;
        case ']': return !this.rightGateOpen;
        default: return false;
      }
    }
    isLadder(tx, ty) { return this.tile(tx, ty) === 'H'; }
    isOneWay(tx, ty) {
      const c = this.tile(tx, ty);
      if (c === '=') return true;
      if (c === 'H' && this.tile(tx, ty - 1) !== 'H') return true; // ladder top
      return false;
    }
    isHazard(tx, ty) { return this.tile(tx, ty) === '^'; }

    // ---------- rendering ----------
    drawBackground(ctx, cam, time, W, H) {
      const th = this.theme;
      const bgKey = { forge: 'forge', forest: 'w1_forest', forestDark: 'w1_samanteng', deepForest: 'w2_forest', clouds: 'w3_clouds' }[this.meta.theme];
      const far = KK.Sprites.img(`bg/${bgKey}/bg_far`);
      if (far) {
        for (const [n, par] of [['bg_far', 0.08], ['bg_mid', 0.25], ['bg_near', 0.5]]) {
          const im = KK.Sprites.img(`bg/${bgKey}/${n}`); if (!im) continue;
          const sc = H / im.height, w = im.width * sc;
          let ox = -((cam.x * par) % w); if (ox > 0) ox -= w;
          for (let x = ox; x < W; x += w) ctx.drawImage(im, x, 0, w + 0.5, H);
        }
        return;
      }
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const t = this.meta.theme;
      if (t === 'clouds') {
        for (let layer = 0; layer < 2; layer++) {
          const par = 0.15 + layer * 0.2;
          ctx.fillStyle = layer ? th.near : th.far;
          for (let i = -1; i < Math.ceil(W / 70) + 3; i++) {
            const bx = ((i * 70 - cam.x * par) % 560 + 560) % 560 - 60;
            const by = H * 0.22 + layer * H * 0.28 + Math.sin(i * 1.7 + time * 0.3) * 6;
            ctx.beginPath(); ctx.ellipse(bx, by, 40, 12, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(bx + 20, by - 8, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.fillStyle = 'rgba(255,215,106,0.25)';
        for (let i = 0; i < 18; i++) {
          const sx = ((i * 53 - cam.x * 0.05) % (W + 20) + W + 20) % (W + 20), sy = (i * 37) % H;
          const a = 0.5 + 0.5 * Math.sin(time * 2 + i);
          ctx.globalAlpha = a; ctx.fillRect(sx, sy, 2, 2);
        }
        ctx.globalAlpha = 1;
      } else if (t === 'forge') {
        ctx.fillStyle = th.far;
        for (let i = 0; i < 8; i++) ctx.fillRect(20 + i * 60 - cam.x * 0.2, H * 0.15, 26, H * 0.6);
      } else {
        // tree silhouettes, two parallax layers
        for (let layer = 0; layer < 2; layer++) {
          const par = 0.2 + layer * 0.25;
          ctx.fillStyle = layer ? th.near : th.far;
          const spacing = layer ? 46 : 34;
          for (let i = -1; i < Math.ceil(W / spacing) + 2; i++) {
            const seed = Math.abs(Math.sin((i + Math.floor(cam.x * par / spacing)) * 12.9898) * 43758.5453) % 1;
            const bx = i * spacing - ((cam.x * par) % spacing);
            const hgt = H * 0.33 + seed * H * 0.33 + layer * 20;
            ctx.fillRect(bx + 10, H - hgt, 6 + layer * 3, hgt);
            ctx.beginPath(); ctx.ellipse(bx + 13 + layer, H - hgt, 18 + seed * 10, 14 + seed * 6, 0, 0, Math.PI * 2); ctx.fill();
          }
        }
        if (t === 'deepForest') {
          for (let i = 0; i < 14; i++) {
            const fx = ((i * 61 - cam.x * 0.3) % (W + 20) + W + 20) % (W + 20), fy = H * 0.2 + (i * 29) % (H * 0.6) + Math.sin(time + i) * 5;
            ctx.fillStyle = `rgba(190,255,170,${0.4 + 0.4 * Math.sin(time * 3 + i)})`; ctx.fillRect(fx, fy, 1, 1);
          }
        }
      }
    }

    drawTiles(ctx, cam, time, playerBox) {
      const th = this.theme;
      const x0 = Math.floor(cam.x / T), x1 = Math.ceil((cam.x + C.VIEW_W) / T);
      const y0 = Math.floor(cam.y / T), y1 = Math.ceil((cam.y + C.VIEW_H) / T);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        const c = this.tile(tx, ty); if (c === '.' || c === 'h') continue;
        const x = tx * T - cam.x, y = ty * T - cam.y;
        if (ty < 0 || tx < 0 || tx >= this.w) continue;
        if (this.drawTileArt(ctx, c, tx, ty, x, y)) continue;
        switch (c) {
          case '#': {
            ctx.fillStyle = th.ground; ctx.fillRect(x, y, T, T);
            if (!this.isSolid(tx, ty - 1) && this.tile(tx, ty - 1) !== 'h') { ctx.fillStyle = th.top; ctx.fillRect(x, y, T, 4); }
            ctx.fillStyle = 'rgba(0,0,0,0.08)'; if ((tx + ty) % 2) ctx.fillRect(x + 4, y + 8, 3, 3);
            break;
          }
          case '=': ctx.fillStyle = th.plat; ctx.fillRect(x, y, T, 4); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + 4, T, 1); break;
          case 'H':
            ctx.fillStyle = '#9b6b3a'; ctx.fillRect(x + 3, y, 2, T); ctx.fillRect(x + 11, y, 2, T);
            ctx.fillRect(x + 3, y + 3, 10, 2); ctx.fillRect(x + 3, y + 11, 10, 2); break;
          case 'B': case 'C': case 'G':
            ctx.fillStyle = '#c98a2b'; ctx.fillRect(x, y, T, T);
            ctx.fillStyle = '#7a4d14'; ctx.strokeStyle = '#7a4d14'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
            ctx.fillStyle = '#fff3c4'; ctx.font = 'bold 13px "Baloo 2", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('?', x + T / 2 + 0.5, y + T / 2 + 1 + Math.sin(time * 4) * 0.5); break;
          case 'b': ctx.fillStyle = '#6d5536'; ctx.fillRect(x, y, T, T); ctx.strokeStyle = '#3d2f1d'; ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1); break;
          case '^':
            ctx.fillStyle = '#c9c9d1';
            for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + i * 4, y + T); ctx.lineTo(x + i * 4 + 2, y + 8); ctx.lineTo(x + i * 4 + 4, y + T); ctx.fill(); }
            break;
          case 'W':
            if (this.isSolid(tx, ty)) { ctx.fillStyle = '#3fb8a8'; ctx.fillRect(x, y, T, 6); ctx.fillStyle = '#1f6f66'; ctx.fillRect(x, y + 6, T, 2); }
            else { ctx.strokeStyle = 'rgba(63,184,168,0.6)'; ctx.setLineDash([2, 2]); ctx.strokeRect(x + 0.5, y + 0.5, T - 1, 6); ctx.setLineDash([]); }
            break;
          case 'Z':
            if (this.isSolid(tx, ty)) { ctx.fillStyle = '#5a5a6a'; ctx.fillRect(x, y, T, T); ctx.fillStyle = '#8a8aa0'; for (let i = 2; i < T; i += 5) ctx.fillRect(x + i, y, 2, T); }
            break;
          case '[': case ']':
            if (this.isSolid(tx, ty)) { ctx.fillStyle = '#7a1f1f'; ctx.fillRect(x + 3, y, 10, T); ctx.fillStyle = '#c23b3b'; ctx.fillRect(x + 5, y, 2, T); ctx.fillRect(x + 9, y, 2, T); }
            break;
          case 'U': {
            ctx.fillStyle = 'rgba(120,170,255,0.35)'; ctx.fillRect(x, y, T, T);
            ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.2 * Math.sin(time * 3 + tx)})`; ctx.fillRect(x + 4, y + (time * 20 + tx * 7) % T, 2, 3);
            break;
          }
        }
      }
    }

    // artwork tiles (assets/tiles/<world>/...); returns false to fall back to coloured shapes
    drawTileArt(ctx, c, tx, ty, x, y) {
      const set = { forge: 'forge', forest: 'w1', forestDark: 'w1', deepForest: 'w2', clouds: 'w3' }[this.meta.theme];
      const I = (n) => KK.Sprites.img(`tile/${set}/${n}`) || KK.Sprites.img(`obj/${n}`);
      const solid = (dx, dy) => this.isSolid(tx + dx, ty + dy) || this.tile(tx + dx, ty + dy) === 'h';
      let im = null, h = T, yo = 0;
      switch (c) {
        case '#':
          if (!I('ground_fill')) return false;
          if (!solid(0, -1)) im = !solid(-1, 0) ? I('ground_top_left') : !solid(1, 0) ? I('ground_top_right') : I('ground_top');
          else im = !solid(-1, 0) ? I('ground_side_left') : !solid(1, 0) ? I('ground_side_right') : I('ground_fill');
          im = im || I('ground_fill'); break;
        case '=': {
          const l = this.tile(tx - 1, ty) === '=', r = this.tile(tx + 1, ty) === '=';
          im = I(!l ? 'platform_left' : !r ? 'platform_right' : 'platform_middle'); h = 5; break;
        }
        case 'H': im = I('ladder'); break;
        case '^': im = I('spikes'); break;
        case 'B': case 'C': case 'G': im = I('box'); break;
        case 'b': im = I('box_used'); break;
        case 'Z': if (!this.isSolid(tx, ty)) return true; im = I('gate'); break;
        case '[': case ']': if (!this.isSolid(tx, ty)) return true; im = I('boss_gate'); break;
        case 'W': if (!this.isSolid(tx, ty)) return false; im = I('switch_platform'); h = 6; break;
        default: return false;
      }
      if (!im) return false;
      ctx.drawImage(im, x, y + yo, T + 0.4, h + (h === T ? 0.4 : 0));
      return true;
    }

    // hidden walls and the secret rooms behind them are drawn above actors; they fade when the player is inside
    buildSecrets() {
      this.secret = new Set();
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        if (this.tiles[y][x] !== 'h') continue;
        this.secret.add(x + ',' + y);
        for (const d of [1, -1]) {
          let nx = x + d;
          while (nx >= 0 && nx < this.w && this.tiles[y][nx] === '.') { this.secret.add(nx + ',' + y); nx += d; }
        }
      }
    }
    drawHidden(ctx, cam, playerBox) {
      if (!this.secret) this.buildSecrets();
      if (!this.secret.size) return;
      let inside = false;
      if (playerBox) {
        const cx = Math.floor((playerBox.x + playerBox.w / 2) / T), cy = Math.floor((playerBox.y + playerBox.h / 2) / T);
        inside = this.secret.has(cx + ',' + cy) || this.secret.has(cx + ',' + (cy + 1));
      }
      ctx.globalAlpha = inside ? 0.3 : 1;
      ctx.fillStyle = this.theme.ground;
      for (const k of this.secret) {
        const [tx, ty] = k.split(',').map(Number);
        const x = tx * T - cam.x, y = ty * T - cam.y;
        if (x < -T || y < -T || x > C.VIEW_W || y > C.VIEW_H) continue;
        const art = KK.Sprites.img(`tile/${{ forge: 'forge', forest: 'w1', forestDark: 'w1', deepForest: 'w2', clouds: 'w3' }[this.meta.theme]}/ground_fill`);
        if (art) ctx.drawImage(art, x, y, T + 0.4, T + 0.4); else ctx.fillRect(x, y, T, T);
      }
      ctx.globalAlpha = 1;
    }
  }
  KK.Level = Level;

  // ---------------- Physics body vs tiles + platforms ----------------
  KK.moveBody = function (b, level, dt, platforms, opts = {}) {
    const eps = 0.001;
    b.hitWall = 0; b.hitHead = null; const wasGround = b.onGround; b.onGround = false;
    // big creatures (mini-bosses) pass through floating boxes instead of getting stuck under them
    const level0 = level;
    if (opts.big) level = { __proto__: level0, isSolid(tx, ty) { const c = level0.tile(tx, ty); if (c === 'B' || c === 'C' || c === 'G' || c === 'b') return ty >= level0.h; return level0.isSolid(tx, ty); } };
    // X axis
    b.x += b.vx * dt;
    const r0 = Math.floor(b.y / T), r1 = Math.floor((b.y + b.h - eps) / T);
    if (b.vx > 0) {
      const tx = Math.floor((b.x + b.w - eps) / T);
      for (let ty = r0; ty <= r1; ty++) if (level.isSolid(tx, ty)) { b.x = tx * T - b.w; b.vx = 0; b.hitWall = 1; break; }
    } else if (b.vx < 0) {
      const tx = Math.floor(b.x / T);
      for (let ty = r0; ty <= r1; ty++) if (level.isSolid(tx, ty)) { b.x = (tx + 1) * T; b.vx = 0; b.hitWall = -1; break; }
    }
    // Y axis
    const prevBottom = b.y + b.h;
    b.y += b.vy * dt;
    const c0 = Math.floor(b.x / T), c1 = Math.floor((b.x + b.w - eps) / T);
    if (b.vy > 0) {
      const ty = Math.floor((b.y + b.h - eps) / T);
      for (let tx = c0; tx <= c1; tx++) {
        const solid = level.isSolid(tx, ty);
        const oneway = !opts.ignoreOneWay && level.isOneWay(tx, ty) && prevBottom <= ty * T + 0.5;
        if (solid || oneway) { b.y = ty * T - b.h; b.vy = 0; b.onGround = true; b.groundTile = { tx, ty, solid }; break; }
      }
    } else if (b.vy < 0) {
      const ty = Math.floor(b.y / T);
      const hits = [];
      for (let tx = c0; tx <= c1; tx++) if (level.isSolid(tx, ty)) hits.push({ tx, ty });
      if (hits.length) { b.y = (ty + 1) * T; b.vy = 0; b.hitHead = hits; }
    }
    // standing still on ground: probe one pixel below
    if (!b.onGround && b.vy === 0 && !b.hitHead) {
      const ty = Math.floor((b.y + b.h + 0.5) / T);
      for (let tx = c0; tx <= c1; tx++) {
        if (level.isSolid(tx, ty) || (!opts.ignoreOneWay && level.isOneWay(tx, ty) && Math.abs(b.y + b.h - ty * T) < 0.6)) { b.onGround = true; break; }
      }
    }
    // moving / crumbling platforms (one-way from above)
    b.platform = null;
    if (platforms && !opts.ignoreOneWay) for (const p of platforms) {
      if (!p.solid) continue;
      if (b.x + b.w <= p.x || b.x >= p.x + p.w) continue;
      const bottom = b.y + b.h;
      if (b.vy >= 0 && prevBottom <= p.y + 2.5 && bottom >= p.y - 0.5) {
        b.y = p.y - b.h; b.vy = 0; b.onGround = true; b.platform = p;
      }
    }
    b.justLanded = b.onGround && !wasGround;
  };

  KK.solidAt = (level, px, py) => level.isSolid(Math.floor(px / T), Math.floor(py / T));
  KK.groundAt = (level, px, py) => { const tx = Math.floor(px / T), ty = Math.floor(py / T); return level.isSolid(tx, ty) || level.isOneWay(tx, ty); };
})();
