// =============================================================
// KOFI KESE - tunable values
// Every gameplay number lives here so balancing never touches code.
// Damage values are the HARD difficulty; easier modes scale them down.
// =============================================================
window.KK = window.KK || {};

KK.CONFIG = {
  BETA: true,                 // shows the beta World Select button
  EMAIL_GATE: false,          // off during beta testing
  SHARE_URL: null,            // null = current page address (Netlify during beta)

  VIEW_W: 160,                // portrait view width in world pixels (height follows the screen)
  TV_VIEW_H: 232,             // TV / landscape mode view height
  TILE: 16,

  // ---------- Difficulty ----------
  // speed: how fast enemies move and think (timescale) | dmg: damage to Kofitia
  // bossHp: boss health | lull: quiet seconds between Samanteng's minions | respawn: arena pickups
  DIFFICULTY: {
    easy:   { label: 'EASY',   speed: 0.68, dmg: 0.45, bossHp: 0.75, lull: 5, respawn: 7 },
    normal: { label: 'NORMAL', speed: 0.84, dmg: 0.7,  bossHp: 0.9,  lull: 4, respawn: 10 },
    hard:   { label: 'HARD',   speed: 1.0,  dmg: 1.0,  bossHp: 1.0,  lull: 3, respawn: 13 },
  },

  // ---------- Physics ----------
  GRAVITY: 950,
  MAX_FALL: 340,
  RUN_SPEED: 98,
  ACCEL_GROUND: 900,
  ACCEL_AIR: 650,
  JUMP_VELOCITY: 345,         // about 3.9 tiles high
  JUMP_CUT: 0.45,
  COYOTE_TIME: 0.1,
  JUMP_BUFFER: 0.12,
  CLIMB_SPEED: 75,
  DROP_HOLD: 0.3,             // hold DOWN this long on a thin platform to drop through

  // ---------- Player ----------
  PLAYER_W: 12,
  PLAYER_H: 20,
  CROUCH_H: 13,               // hitbox height while crouching (push DOWN while standing)
  MAX_HEALTH: 100,
  INVULN_AFTER_HIT: 1.0,
  PIT_DAMAGE: 20,
  SPIKE_DAMAGE: 15,

  // Stamina (renewable)
  MAX_STAMINA: 100,
  JUMP_COST: 5,
  DODGE_COST: 25,
  HEAVY_STAMINA_COST: 25,
  SHIELD_START_COST: 8,       // airborne heavy 1 = spinning shield, held until stamina runs out
  SHIELD_DRAIN: 42,           // per second
  SHIELD_TICK: 0.22,
  SHIELD_DMG: 1.5,
  SHIELD_RADIUS: 18,
  REGEN_RATE: 17,
  REGEN_DELAY: 1.0,

  // Power (cocoa + landing normal hits)
  MAX_POWER: 100,
  POWER_ATTACK_COST: 25,
  COCOA_RESTORE: 25,
  POWER_PER_HIT: 1,           // each normal hit that lands charges power a little
  POWER_PER_COMBO_STEP: 0.5,  // bonus per combo step

  BANANA_HEAL: 20,
  GYE_NYAME_SCORE: 1000,

  // Dodge
  DODGE_SPEED: 275,
  DODGE_TIME: 0.2,
  DODGE_INVULN: 0.3,
  DODGE_DAMAGE: 1,
  AIR_DASH_SPEED: 380,        // mid-air dash: faster, longer, hits harder
  AIR_DASH_TIME: 0.24,
  AIR_DASH_DAMAGE: 2.5,
  MAX_STOMPS: 3,              // stomps in a row before touching the ground
  AIR_JUMPS: 1,               // double jump
  AIR_JUMP_COST: 8,
  STUN_TIME: 1.2,             // dizzy time when a stunning mob hits Kofitia
  CROUCH_ATTACKS: {
    crouchAttack: { dmg: 1,   startup: 0.05, active: 0.1,  recovery: 0.15, w: 20, h: 8,  kb: 30, stun: 0.6 },
    crouchHeavy:  { dmg: 2.5, startup: 0.14, active: 0.12, recovery: 0.25, w: 26, h: 10, kb: 60, stun: 1.4 },
  },
  // one mob type per level can stun Kofitia (the first of its kind, marked with stars)
  STUNNERS: { w1_l1: 'goat', w1_l2: 'snake', w2_l1: 'monkey', w2_l2: 'panther', w3_l1: 'goldMask', w3_l2: 'goldLion' },
  // mini-boss types per level, in the order they appear (left to right)
  MINIBOSS_TYPES: {
    w1_l1: ['fowl', 'snake', 'goat'], w1_l2: ['goat', 'snake', 'fowl'],
    w2_l1: ['monkey', 'whiteMmoatia', 'panther'], w2_l2: ['panther', 'monkey', 'whiteMmoatia'],
    w3_l1: ['goldSlime', 'goldMask', 'goldLion'], w3_l2: ['goldLion', 'goldSlime', 'goldMask'],
  },
  SHIELD_STUN: 2,             // seconds dizzy when the shield drains stamina to zero
  BOSS_HIT_CAP: 0.07,         // one hit can take at most 7% of a boss's health
  BOSS_HIT_GAP: 0.12,         // and bosses ignore hits for this long after being hit
  ENEMY_HP_MULT: 1.6,         // regular enemies are tougher
  AIR_DODGES: 1,

  // Stomp (landing on an enemy's head)
  STOMP_DMG: 2,
  STOMP_BOUNCE: 290,

  // Attacks: startup / active / recovery in seconds, hitbox in px
  ATTACKS: {
    normal:       { dmg: 1, startup: 0.04, active: 0.08, recovery: 0.10, w: 18, h: 16, kb: 50 },
    heavyStamina: { dmg: 3, startup: 0.12, active: 0.12, recovery: 0.2,  w: 24, h: 20, kb: 150 },
    heavyPower:   { dmg: 5, startup: 0.18, active: 0.14, recovery: 0.24, w: 26, h: 22, kb: 200 },
    airNormal:    { dmg: 1, startup: 0.03, active: 0.1,  recovery: 0.08, w: 20, h: 20, kb: 50 },
    airHeavyPower:{ dmg: 5, startup: 0.1,  active: 0.16, recovery: 0.2,  w: 28, h: 28, kb: 200 },
  },
  COMBO_DMG: [1, 1, 1.4, 1.6, 3],   // normal attack tapped up to 5 times
  COMBO_WINDOW: 0.4,                 // seconds to press again and keep the chain
  COMBO_FINISH_MULT: 0.3,            // heavy 1 after a combo: +30% damage per combo step
  AIR_HANG: 0.3,                     // aerial hits hold Kofitia in the air this long
  POWER_WAVE_SPEED: 260,             // power attack wave crosses the whole level and pierces

  // ---------- Enemies (dmg is HARD mode, out of 100 health) ----------
  ENEMIES: {
    snake:   { hp: 2, dmg: 10, speed: 26, w: 24, h: 12,  color: '#3fa34d' },
    goat:    { hp: 4, dmg: 18, speed: 30, w: 27, h: 22, color: '#8a5a2b', charge: 140 },
    fowl:    { hp: 1, dmg: 8,  speed: 70, w: 16, h: 16, color: '#f2efe6' },
    monkey:  { hp: 3, dmg: 10, speed: 80, w: 20, h: 21, color: '#7a4a24' },
    panther: { hp: 6, dmg: 15, speed: 50, w: 36, h: 20, color: '#1d1d24', pounce: 190 },
    whiteMmoatia: { hp: 3, dmg: 10, speed: 20, w: 16, h: 24, color: '#ffffff', flameDmg: 18, flameSpeed: 120, fireEvery: 2.2 },
    goldMask: { hp: 3, dmg: 15, speed: 45, w: 21, h: 24, color: '#e8b923' },
    goldLion: { hp: 8, dmg: 25, speed: 40, w: 39, h: 26, color: '#c9971a', charge: 170 },
    goldSlime:{ hp: 3, dmg: 10, speed: 60, w: 21, h: 15, color: '#f5d742' },
  },
  MINIBOSS: { scale: 2, hpMult: 7, dmgMult: 1.15 },
  DROP_BANANA: 0.15,
  DROP_COCOA: 0.03,          // cocoa is rare

  // ---------- Bosses ----------
  RED_MINION:  { hp: 20,  speed: 70, w: 14, h: 26, range: 150, windup: 0.9, projSpeed: 220, projDmg: 50, cooldown: 1.6, turn: 10 },
  BLUE_MINION: { hp: 24, speed: 92, w: 14, h: 26, hitEvery: 0.32, dmg: 7, staggerTime: 1.6, normalDmgMult: 0.25, turn: 10 },
  MINION_HEAL: 0.6,           // hp per second while resting beside Samanteng (no shield: healing is their only protection)
  MINION_RETREAT: 0.2,        // a minion runs home to heal below this share of its health
  SAMANTENG: {
    hp: 60, w: 20, h: 40, speed: 55,
    cycle: [ ['NORMAL', 4], ['RED', 6], ['REST', 2.5], ['BLUE', 6], ['REST', 2.5] ],
    clawDmg: 18, redProjDmg: 45, redWindup: 0.8, blueHitEvery: 0.3, blueDmg: 8, restDmgMult: 1.5,
  },
  SASABONSAM: {
    hp: 70, w: 26, h: 30, hover: 46,
    normalTime: 7, purpleTime: 6, idleEvery: 6, idleTime: 2.6,
    swoopDmg: 25, purpleDiveDmg: 50, purpleProjDmg: 22, contactDmg: 15,
    mult: { groundNormal: 0.2, groundHeavy: 0.35, airNormal: 0.6, airHeavy: 1.5, exposedAirHeavy: 2.5, dodge: 2, shield: 1.2 },
    exposedTime: 1.2,
  },
  BRAFO: {
    w: 40, h: 54, speed: 38,
    phase1Hits: 5, phase2Hits: 8,
    contactDmg: 8,             // walking into him (none while he recovers from a swing)
    slashDmg: 45, sweepDmg: 45, slamDmg: 40,   // three sword hits kill on HARD
    windup: { slash: 0.8, sweep: 0.65, slam: 0.7 },
    recover: 1.0,
  },

  // ---------- Score ----------
  SCORE_BASE: 50000,
  SCORE_LIFE_PENALTY: 15,     // per life point lost
  SCORE_TIME_PENALTY: 5,      // per second
  SCORE_DEATH_PENALTY: 1000,
  SCORE_DIFFICULTY_BONUS: { easy: 0, normal: 10000, hard: 25000 },

  // ---------- Controls ----------
  // UP (arrow, joystick or stick) jumps, or climbs when Kofitia stands at a ladder.
  KEYS: {
    MOVE_LEFT: ['ArrowLeft'],
    MOVE_RIGHT: ['ArrowRight'],
    UP: ['ArrowUp'],
    DOWN: ['ArrowDown'],
    JUMP: [' ', 'Spacebar'],
    DODGE: ['d', 'D'],
    NORMAL_ATTACK: ['q', 'Q'],
    HEAVY_ATTACK_STAMINA: ['a', 'A'],
    HEAVY_ATTACK_POWER: ['s', 'S'],
    PAUSE: ['Escape', 'Enter'],
    AIM: ['e', 'E'],            // press to lock Heavy 2 on the nearest enemy, press again to unlock
  },
  // Standard gamepad layout (PS5 / Xbox / Switch Pro): button index -> action
  PAD: {
    0: 'JUMP',                  // Cross / A
    1: 'DODGE',                 // Circle / B
    2: 'NORMAL_ATTACK',         // Square / X
    3: 'HEAVY_ATTACK_STAMINA',  // Triangle / Y
    4: 'DODGE',                 // L1
    5: 'HEAVY_ATTACK_POWER',    // R1
    6: 'AIM',                   // L2: lock on a target for Heavy 2
    7: 'HEAVY_ATTACK_POWER',    // R2
    9: 'PAUSE',                 // Options / Menu
    12: 'UP', 13: 'DOWN', 14: 'MOVE_LEFT', 15: 'MOVE_RIGHT',
  },
};
