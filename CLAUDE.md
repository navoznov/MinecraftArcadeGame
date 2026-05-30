# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

Development happens directly in `main`. Do **not** create separate branches or pull requests unless the user explicitly asks for it.

When implementing any feature, update `README.md` to reflect the changes — add a changelog entry describing what was added or modified.

Before every commit, bump the `VERSION` constant in `game.js` (patch increment by default, e.g. `1.0.0 → 1.0.1`).

```
# ... make changes ...
# bump VERSION in game.js
git add ...
git commit -m "..."
git push
```

## Implemented Features

The full list of implemented features and changelog is maintained in [README.md](README.md) under the **Changelog** section.

## Running the Game

No build step. Open `index.html` directly in a browser:

```
open index.html
```

## Architecture

The project is split into four files — no build tooling, no dependencies:

| File | Contents |
|------|----------|
| `index.html` | HTML skeleton, `<link>` to CSS, three `<script src>` tags |
| `style.css` | Page and canvas styles |
| `sprites.js` | Sprite pixel-art arrays (`STEVE`, `ZOMBIE`, `PHANTOM`), palettes, dimensions (`CELL`, `SW`, `SH`, `PW`, `PH`), and the `drawSprite()` utility |
| `audio.js` | `audioCtx`, all `play*()` sound functions, `MARIO_MELODY` data, background-music state and `startBgMusic`/`stopBgMusic` |
| `game.js` | Everything else: canvas/constants, game state, physics, all `draw*()` and `update()` functions, input handling, game loop |

All variables are global — scripts share scope via plain `<script src>` tags loaded in order: `sprites.js` → `audio.js` → `game.js`.

### Coordinate System

- Canvas is 800×450 px.
- `GROUND_TOP = H - 48` is the Y coordinate of the ground surface (where feet land).
- `player.y` tracks the **bottom** of the player (feet), not the top-left corner.
- Platform objects `{x, y, w}` — `y` is also the **top surface** (landing surface).
- Steve is drawn at `player.y - SH` so the sprite sits above the foot position.

### Steve Sprite

Pixel art defined as a 2D array `STEVE` (8 columns × 18 rows), indexed into `PALETTE`. Rendered at `CELL = 5` px per cell, giving a final size of `SW = 40` × `SH = 90` px. Facing direction is handled by a horizontal `ctx.scale(-1, 1)` flip. Walk animation shifts leg pixels left/right using `legOffset` based on `walkFrame` (0 or 1).

### Game Loop

`requestAnimationFrame` drives a fixed `loop()` → `update()` → `draw()` cycle. No delta-time smoothing; physics constants (`GRAVITY`, `JUMP_FORCE`, `MOVE_SPEED`) are tuned for ~60 fps.

### Physics & Collision

- Gravity accumulates into `player.vy` each frame.
- Platform collision checks only downward landings (`player.vy >= 0`) using `prevY` (before gravity applied) vs. `player.y` (after), with a 4 px horizontal inset on each platform edge.
- Ground collision is a simple floor clamp.

### Audio

Web Audio API (`AudioContext`) synthesizes the jump sound (`playPew`) — a sine wave sweeping 660 Hz → 220 Hz over 0.22 s. The context is resumed on first key press to satisfy autoplay policy.
