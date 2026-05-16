# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build step. Open `index.html` directly in a browser:

```
open index.html
```

Or serve it locally to avoid any browser file-restrictions:

```
python3 -m http.server 8080
```

## Architecture

Everything lives in a single file: `index.html`. HTML, CSS, and game logic are all inline — no external scripts, no build tooling, no dependencies.

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
