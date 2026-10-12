# Kofi Kese, a NeoAkan game (beta)

Browser platformer. Plain HTML + JavaScript, no build step, no install.

## Put it online (Netlify)
The `_headers` file tells Netlify not to cache old versions, so every new upload shows up straight away.
1. Go to https://app.netlify.com/drop
2. Drag the whole `kofi-kese` folder onto the page.
3. Netlify gives you a link. Every new version: drag the folder again (or link the folder to a Netlify site and use "Deploys > drag and drop").

## Controls
Players can change every keyboard key and controller button in **Controls** (title screen or pause menu).
Choices are saved on their device; **Reset to default** restores this table.

| Action | Touch | Keyboard | PS5 / Xbox controller |
| --- | --- | --- | --- |
| Move | Joystick left / right | ← → | Left stick or D-pad |
| Jump (hold = higher); jump again in the air = double jump | Joystick up | ↑ or Space | Cross / A (or stick up) |
| Climb ladders | Joystick up / down at a ladder | ↑ / ↓ | Stick up / down |
| Crouch | Joystick down while standing | ↓ | Stick down |
| Crouch + Attack: low strike, short stun / Crouch + Heavy 1: longer stun | Joystick down + ATK / H1 | ↓ + Q / A | Stick down + Square / Triangle |
| Drop through thin platform | Hold joystick down | Hold ↓ | Hold stick down |
| Attack (tap up to 5x for a combo) | ATK | Q | Square / X |
| Heavy 1; in the air: hold for shield | H1 | A | Triangle / Y |
| Heavy 2 (power wave) | H2 | S | R1 or R2 |
| Dodge; in the air: dash | DODGE | D | Circle / B or L1 |
| Lock Heavy 2 on the nearest enemy (press = on, press again = off) | LOCK | E | L2 |
| Pause / skip dialogue | Pause button, SKIP | Esc or Enter | Options / Menu |
| Mute | | M | |

Combos: tap ATTACK a few times then HEAVY 1 for a finisher. Jump on an enemy's head to stomp it (3 in a row max).
The shield drains stamina; if it hits zero, Kofitia is dizzy for 2 seconds.
One mob type per level (marked with a purple ring) stuns Kofitia for about a second when it hits him.
Mini-bosses are giant mobs (3 per level); some talk to Kofitia the first time he walks up to them (`js/story.js`, keys `mini_<level>_<n>`).

## Playing on a TV
Best: open the game link in a browser on a laptop or smart TV connected to the TV and pair a PS5/Xbox controller
by Bluetooth. When a controller is connected on a landscape screen the game switches to TV mode (full screen, no
touch buttons). TV mode can also be forced by adding `?tv` to the link.
Phone screen mirroring (AirPlay, Smart View, Chromecast) also works but shows the portrait phone screen.

## Beta tools
The green **BETA** button (bottom left) jumps to any level, the ending or the score screen,
and toggles invincibility, infinite stamina/power, hitboxes, TV mode and mute.
Turn it off for release: `BETA: false` in `js/config.js`.

## Where things live
| File | What to edit |
| --- | --- |
| `js/config.js` | Every number: jump height, stamina costs, damage, boss timings, score formula, keys |
| `js/story.js` | All dialogue and tutorial signs (English now, Twi later) |
| `js/levels.js` | Level maps. One character = one tile; the legend is at the top of the file |
| `js/sprites.js` | Sprite list (empty until artwork arrives) |
| `assets/fonts/Koradin.otf` | Kradin font, used for character names |

## Artwork
Pixel art made in Adwinifie (repo DanQuay-ai/adwinifie) is installed:
- Kofitia: `assets/sprites/kofitia_afenakwa` (gold afena) and `assets/sprites/kofitia_palm` (palm-leaf sword).
  The palm version shows while Afenakwa is stolen, or always when the player picks **SWORD: PALM LEAF** in the title or pause menu.
- Decor: tiles, level objects, pickups and parallax backgrounds (`assets/tiles`, `assets/objects`, `assets/sprites/banana|cocoa|gye_nyame`, `assets/backgrounds`).
Everything else (enemies, bosses, story characters, projectiles, effects) is still drawn by code.
Sources and generators live in Adwinifie (`exports/kofi`, `exports/kofi_palm`, `tools/decor_gen.py`).

- Animated things: `assets/sprites/<character>/<action>/` with frames named `01.png, 02.png, ...`
  (`1.png, 2.png` or Procreate's `Layer 1.png, Layer 2.png` also work). Any number of frames, played at 12 per second
  unless the sprite definition in `js/sprites.js` sets an `fps` for that action.
- Single images (tiles, objects, backgrounds, portraits): `assets/tiles/...`, `assets/objects/...` etc., names as in the pack.
- Keep the canvas sizes and the anchor: the feet centre sits at the middle of the canvas width, 24 px above the bottom,
  on every frame of every action. Wide poses use the empty space around the body; never crop or resize a frame.
- Anything missing keeps its code drawing, so art can arrive one character at a time.

Not wired yet (coming later): enemy death animations, projectile start/impact, the `vfx/` effects, touch-button art,
cutscene backdrops and Kofitia's cutscene actions (receive sword, pan jump, release sword).
