const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const VERSION = '1.0.3';

const W = 800;
const H = 450;
canvas.width = W;
canvas.height = H;

const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 3;
const BLOCK = 32;

// GROUND_TOP — Y-координата поверхности земли (куда встают ногами)
const GROUND_TOP = H - 48;

// Flies between level-1 platforms (GROUND_TOP-110) and level-2 (GROUND_TOP-220), centred at -165
const PHANTOM_FLY_Y = GROUND_TOP - 185;
const PHANTOM_SPEED = 1.8;

// Sky gradients — day and night
const dayGradient = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
dayGradient.addColorStop(0, '#87CEEB');
dayGradient.addColorStop(1, '#C9E8F5');

const nightGradient = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
nightGradient.addColorStop(0, '#050518');
nightGradient.addColorStop(1, '#0D1033');

// Deterministic star positions
const STARS = [];
for (let i = 0; i < 70; i++) {
  STARS.push({
    x: (i * 293 + 47) % (W - 20) + 10,
    y: (i * 137 + 23) % (GROUND_TOP - 40) + 10,
    s: i % 5 === 0 ? 3 : 2,
  });
}

// Mine / cave sky gradient
const mineGradient = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
mineGradient.addColorStop(0, '#0E0C0A');
mineGradient.addColorStop(1, '#1C1814');

// Nether sky gradient
const netherGradient = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
netherGradient.addColorStop(0, '#0A0002');
netherGradient.addColorStop(1, '#200408');

// Deterministic netherrack wall patches (background texture)
const NETHER_STONES = [];
for (let i = 0; i < 45; i++) {
  NETHER_STONES.push({
    x: (i * 251 + 43) % (W - 40) + 4,
    y: (i * 167 + 79) % (GROUND_TOP - 40) + 8,
    w: (i % 4 + 1) * 14,
    h: (i % 3 + 1) * 10,
  });
}

// Deterministic lava pools in Nether background
const NETHER_LAVA_POOLS = [];
for (let i = 0; i < 8; i++) {
  NETHER_LAVA_POOLS.push({
    x: (i * 379 + 61) % (W - 60) + 20,
    y: (i * 221 + 91) % (GROUND_TOP - 30) + 10,
    w: (i % 3 + 1) * 16 + 16,
    h: (i % 2 + 1) * 6 + 4,
  });
}

// Deterministic stone texture patches for cave background
const CAVE_STONES = [];
for (let i = 0; i < 55; i++) {
  CAVE_STONES.push({
    x: (i * 211 + 37) % (W - 40) + 4,
    y: (i * 157 + 71) % (GROUND_TOP - 40) + 8,
    w: (i % 4 + 1) * 14,
    h: (i % 3 + 1) * 10,
  });
}

// Forest trunk positions (decorative only — no collision)
const FOREST_TRUNKS = [
  { x: 110, w: 26 },
  { x: 400, w: 30 },
  { x: 628, w: 26 },
  { x: 208, w: 22 },
  { x: 508, w: 24 },
  { x: 338, w: 28 },
  { x: 52,  w: 18 },
  { x: 718, w: 20 },
];

// Deterministic coal ore spots
const CAVE_ORES = [];
for (let i = 0; i < 18; i++) {
  CAVE_ORES.push({
    x: (i * 317 + 83) % (W - 20) + 8,
    y: (i * 193 + 61) % (GROUND_TOP - 28) + 8,
  });
}

// Torch positions (placed on cave walls / near platforms)
const MINE_TORCHES = [
  { x: 24,      y: GROUND_TOP - 150 },
  { x: 24,      y: GROUND_TOP - 285 },
  { x: W - 52,  y: GROUND_TOP - 150 },
  { x: W - 52,  y: GROUND_TOP - 285 },
  { x: 362,     y: GROUND_TOP - 338 },
];

const keyInput = { left: false, right: false, jump: false };
const input    = { left: false, right: false, jump: false };

// ── Моб-система ────────────────────────────────────────────
let mobSpeed      = 1.4;
let spawnInterval = 240;
let score = 0;
let mobs = [];
let spawnTimer = 0;
let gameOver    = false;
let levelComplete = false;
let level       = 1;
let levelKills  = 0;
let pipeVisible = false;
let portalFrame = 0;

const PIPE_X         = 700;
const PIPE_W         = 44;
const PIPE_H         = 60;
const PIPE_CAP_EXTRA = 4;

let bgMusicMuted = true;
let paused = false;
let phantoms     = [];
let phantomTimer = 120;
const MUTE_BTN = { x: W - 56, y: 8, w: 48, h: 32 };

let useCooldown = 0;
let swordSwing  = { active: false, timer: 0 };
let joyRays     = [];
let miningAnim  = { active: false, timer: 0, maxTimer: 20, ore: null, oreArr: null, oreIdx: -1, oreType: '' };

// ── Inventory ─────────────────────────────────────────────────
let inventoryOpen = false;

const ISLOT   = 52;
const IGAP    = 4;
const IPW     = 240;
const IPH     = 350;
const IPX     = (W - IPW) >> 1;
const IPY     = (H - IPH) >> 1;
const IGRID_X = IPX + (IPW - (3 * (ISLOT + IGAP) - IGAP)) / 2 | 0;
const IGRID_Y = IPY + 34;
const IHAND_X = IGRID_X;
const IHAND_Y = IGRID_Y + 3 * (ISLOT + IGAP) - IGAP + 36;

let inventory = ['apple', null, null, null, null, null, null, null, null];
let handSlot  = null;

let worldItems = [];

const player = {
  x: W / 2 - 20,
  y: GROUND_TOP,
  vy: 0,
  onGround: false,
  facingRight: true,
  walkFrame: 0,
  walkTimer: 0,
};

// Платформы: y — верхняя поверхность (куда встают ногами)
const platforms = [
  { x: 60,  y: GROUND_TOP - 110, w: 128 },
  { x: 336, y: GROUND_TOP - 110, w: 160 },
  { x: 600, y: GROUND_TOP - 110, w: 128 },
  { x: 180, y: GROUND_TOP - 220, w: 128 },
  { x: 460, y: GROUND_TOP - 220, w: 128 },
  { x: 310, y: GROUND_TOP - 320, w: 160 },
];

function genOreBlocks(count, allBlocks) {
  const PLAT_H = 24, PAD = 16;
  const result = [];
  let attempts = 0;
  while (result.length < count && attempts < 2000) {
    const x = Math.floor(Math.random() * (W - 32)) + 8;
    const y = Math.floor(Math.random() * (GROUND_TOP - 48)) + 16;
    const tooCloseToOre = allBlocks.some(b => Math.hypot(b.x - x, b.y - y) < 40);
    const onPlatform = platforms.some(p =>
      x + 20 > p.x - PAD && x < p.x + p.w + PAD &&
      y + 20 > p.y - PAD && y < p.y + PLAT_H + PAD
    );
    if (!tooCloseToOre && !onPlatform) {
      const block = { x, y };
      result.push(block);
      allBlocks.push(block);
    }
    attempts++;
  }
  return result;
}
const IRON_ORE_BLOCKS    = [];
const DIAMOND_ORE_BLOCKS = [];

function regenerateOreBlocks() {
  const all = [];
  IRON_ORE_BLOCKS.length = 0;
  DIAMOND_ORE_BLOCKS.length = 0;
  IRON_ORE_BLOCKS.push(...genOreBlocks(6, all));
  DIAMOND_ORE_BLOCKS.push(...genOreBlocks(3, all));
}
regenerateOreBlocks();

function initWorldItems() {
  worldItems = [];
  const top = platforms[5];
  const ix = top.x + Math.floor((top.w - ISLOT) / 2);
  const iy = top.y - ISLOT;
  if (level === 1) worldItems.push({ id: 'sword',   x: ix, y: iy });
  else if (level === 2) worldItems.push({ id: 'pickaxe', x: ix, y: iy });
}

function resetGame() {
  player.x = W / 2 - 20;
  player.y = GROUND_TOP;
  player.vy = 0;
  player.onGround = true;
  player.facingRight = true;
  player.walkFrame = 0;
  player.walkTimer = 0;
  mobs = [];
  score = 0;
  spawnTimer = 0;
  level         = 1;
  levelKills    = 0;
  pipeVisible   = false;
  portalFrame   = 0;
  levelComplete = false;
  mobSpeed      = 1.4;
  spawnInterval = 240;
  mobs = [];
  spawnTimer = 0;
  spawnMob(true, false);
  spawnMob(true, true);
  phantoms = [];
  phantomTimer = 120;
  gameOver = false;
  paused = false;
  inventoryOpen = false;
  inventory = ['apple', null, null, null, null, null, null, null, null];
  handSlot = null;
  joyRays = [];
  swordSwing = { active: false, timer: 0 };
  useCooldown = 0;
  miningAnim = { active: false, timer: 0, maxTimer: 20, ore: null, oreArr: null, oreIdx: -1, oreType: '' };
  initWorldItems();
  startBgMusic();
}

document.addEventListener('keydown', e => {
  if (!bgMusicActive && !gameOver && !levelComplete && !paused) startBgMusic();
  if (levelComplete && (e.code === 'Space' || e.code === 'Enter')) { nextLevel(); return; }
  if (gameOver && (e.code === 'Space' || e.code === 'Enter')) { resetGame(); return; }
  if (!gameOver && e.code === 'KeyN') { nextLevel(); return; }

  if (!gameOver && !levelComplete && e.code === 'KeyP') {
    paused = !paused;
    if (paused) stopBgMusic();
    else startBgMusic();
    return;
  }

  if (e.code === 'KeyM') {
    bgMusicMuted = !bgMusicMuted;
    if (bgMusicMuted) {
      stopBgMusic();
    } else if (!gameOver && !levelComplete && !paused) {
      startBgMusic();
    }
    return;
  }

  if (!gameOver && !levelComplete && e.code === 'KeyQ') {
    inventoryOpen = !inventoryOpen;
    return;
  }

  if (inventoryOpen) return;

  if (paused && (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Space')) {
    paused = false;
    startBgMusic();
  }

  if (e.code === 'ArrowLeft')  keyInput.left  = true;
  if (e.code === 'ArrowRight') keyInput.right = true;
  if (e.code === 'Space')      keyInput.jump  = true;
  if (e.code === 'Space')      e.preventDefault();
  if (e.code === 'KeyE' && !gameOver && !levelComplete && !inventoryOpen && !paused) useItem();
});
document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft')  keyInput.left  = false;
  if (e.code === 'ArrowRight') keyInput.right = false;
  if (e.code === 'Space')      keyInput.jump  = false;
});

// Xbox Standard Mapping:
//   axes[0]      — left stick X
//   buttons[0]   — A (прыжок)
//   buttons[14]  — D-pad Left
//   buttons[15]  — D-pad Right
function pollGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gpLeft = false, gpRight = false, gpJump = false;
  for (const gp of gamepads) {
    if (!gp) continue;
    const stickX = gp.axes[0] ?? 0;
    gpLeft  = stickX < -0.3 || !!(gp.buttons[14]?.pressed);
    gpRight = stickX >  0.3 || !!(gp.buttons[15]?.pressed);
    gpJump  = !!(gp.buttons[0]?.pressed);
    if (gpLeft || gpRight || gpJump) audioCtx.resume();
    if (!bgMusicActive && !gameOver && !levelComplete && (gpLeft || gpRight || gpJump)) startBgMusic();
    if (levelComplete && gpJump) { nextLevel(); return; }
    if (gameOver && gpJump) { resetGame(); return; }
    break;
  }
  input.left  = keyInput.left  || gpLeft;
  input.right = keyInput.right || gpRight;
  input.jump  = keyInput.jump  || gpJump;
}

canvas.addEventListener('click', e => {
  const r  = canvas.getBoundingClientRect();
  const cx = (e.clientX - r.left) * (W / r.width);
  const cy = (e.clientY - r.top)  * (H / r.height);

  if (inventoryOpen) {
    if (cx >= IPX && cx < IPX + IPW && cy >= IPY && cy < IPY + IPH) {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const sx = IGRID_X + col * (ISLOT + IGAP);
          const sy = IGRID_Y + row * (ISLOT + IGAP);
          if (cx >= sx && cx < sx + ISLOT && cy >= sy && cy < sy + ISLOT) {
            const idx = row * 3 + col;
            const tmp = inventory[idx]; inventory[idx] = handSlot; handSlot = tmp;
            return;
          }
        }
      }
      if (cx >= IHAND_X && cx < IHAND_X + ISLOT && cy >= IHAND_Y && cy < IHAND_Y + ISLOT) {
        if (handSlot !== null) {
          const emptyIdx = inventory.indexOf(null);
          if (emptyIdx >= 0) { inventory[emptyIdx] = handSlot; handSlot = null; }
        }
      }
    } else {
      inventoryOpen = false;
    }
    return;
  }

  if (cx >= MUTE_BTN.x && cx <= MUTE_BTN.x + MUTE_BTN.w &&
      cy >= MUTE_BTN.y && cy <= MUTE_BTN.y + MUTE_BTN.h) {
    bgMusicMuted = !bgMusicMuted;
    if (bgMusicMuted) {
      stopBgMusic();
    } else if (!gameOver && !levelComplete) {
      startBgMusic();
    }
  }
});

function useItem() {
  if (!handSlot || useCooldown > 0) return;
  if (handSlot === 'sword') {
    activateSword();
    useCooldown = 18;
  } else if (handSlot === 'pickaxe') {
    if (!miningAnim.active) { mineOre(); useCooldown = 25; }
  } else if (handSlot === 'apple') {
    eatApple();
  }
}

function activateSword() {
  swordSwing = { active: true, timer: 12, facingRight: player.facingRight };
  playSwordSwing();
  const range  = 80;
  const plCX   = player.x + SW / 2;
  const plCY   = player.y - SH / 2;
  for (const mob of mobs) {
    if (!mob.alive) continue;
    const mCX    = mob.x + SW / 2;
    const mCY    = mob.y - SH / 2;
    const dx     = mCX - plCX;
    const inFront = player.facingRight ? dx > -10 && dx < range : dx < 10 && dx > -range;
    if (inFront && Math.abs(mCY - plCY) < SH * 0.75) {
      mob.alive = false;
      mob.dyingTimer = 20;
      score++;
      levelKills++;
      if (levelKills >= 5) pipeVisible = true;
      playSquish();
    }
  }
}

function eatApple() {
  handSlot = null;
  const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#98D8C8', '#FF8C00', '#7FFF00', '#FF69B4', '#00BFFF'];
  joyRays = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    joyRays.push({ angle, color: COLORS[i % COLORS.length], timer: 120, maxTimer: 120, maxLen: 45 + Math.random() * 25 });
  }
  playEatApple();
}

const MINE_REACH = 80;

function mineOre() {
  if (!isMine()) return;
  const px = player.x + SW / 2;
  const py = player.y - SH / 2;
  for (let i = 0; i < IRON_ORE_BLOCKS.length; i++) {
    const ore = IRON_ORE_BLOCKS[i];
    if (Math.hypot(ore.x + 10 - px, ore.y + 10 - py) < MINE_REACH) {
      miningAnim = { active: true, timer: 20, maxTimer: 20, ore, oreArr: IRON_ORE_BLOCKS, oreIdx: i, oreType: 'iron' };
      playPickaxeHit();
      return;
    }
  }
  for (let i = 0; i < DIAMOND_ORE_BLOCKS.length; i++) {
    const ore = DIAMOND_ORE_BLOCKS[i];
    if (Math.hypot(ore.x + 10 - px, ore.y + 10 - py) < MINE_REACH) {
      miningAnim = { active: true, timer: 20, maxTimer: 20, ore, oreArr: DIAMOND_ORE_BLOCKS, oreIdx: i, oreType: 'diamond' };
      playPickaxeHit();
      return;
    }
  }
}

function spawnMob(startOnScreen = false, fromRight = null) {
  if (fromRight === null) fromRight = Math.random() > 0.5;
  const x = startOnScreen
    ? (fromRight ? W - SW - 20 : 20)
    : (fromRight ? W + 10 : -SW - 10);
  mobs.push({
    x,
    y: GROUND_TOP,
    vx: fromRight ? -mobSpeed : mobSpeed,
    alive: true,
    walkFrame: 0,
    walkTimer: 0,
    dyingTimer: 0,
  });
}

spawnMob(true, false);
spawnMob(true, true);
initWorldItems();

function spawnPhantom() {
  const fromRight = Math.random() > 0.5;
  phantoms.push({
    x:   fromRight ? W + 10 : -PW - 10,
    vx:  fromRight ? -PHANTOM_SPEED : PHANTOM_SPEED,
    age: 0,
  });
}

function updatePhantoms() {
  if (!isNight() || isMine() || isNether()) { phantoms = []; return; }

  phantomTimer++;
  if (phantomTimer >= spawnInterval && phantoms.length < 3 && !pipeVisible) {
    phantomTimer = 0;
    spawnPhantom();
  }

  for (let i = phantoms.length - 1; i >= 0; i--) {
    const ph = phantoms[i];
    ph.x += ph.vx;
    ph.age++;

    if (ph.x < -PW - 60 || ph.x > W + 60) { phantoms.splice(i, 1); continue; }

    const drawY    = PHANTOM_FLY_Y + Math.round(Math.sin(ph.age * 0.04) * 12);
    const overlapX = player.x + 4 < ph.x + PW && player.x + SW - 4 > ph.x;
    const overlapY = player.y - SH < drawY + PH && player.y > drawY;
    if (overlapX && overlapY && !gameOver && !levelComplete) {
      gameOver = true;
      stopBgMusic();
      playGameOver();
    }
  }
}

function updateMobs() {
  spawnTimer++;
  const aliveMobs = mobs.filter(m => m.alive).length;
  if (spawnTimer >= spawnInterval && aliveMobs < 5 && !pipeVisible) {
    spawnTimer = 0;
    spawnMob();
  }

  mobs = mobs.filter(m => m.alive || m.dyingTimer > 0);

  const prevPlayerY = player.y - player.vy;

  for (const mob of mobs) {
    if (!mob.alive) {
      mob.dyingTimer--;
      continue;
    }

    mob.x += mob.vx;

    mob.walkTimer++;
    if (mob.walkTimer > 14) {
      mob.walkTimer = 0;
      mob.walkFrame = 1 - mob.walkFrame;
    }

    if (mob.x < -SW - 60 || mob.x > W + 60) {
      mob.alive = false;
      mob.dyingTimer = 0;
      continue;
    }

    const mobTop  = mob.y - SH;
    const mobLeft = mob.x + 4;
    const mobRight= mob.x + SW - 4;
    const plLeft  = player.x + 4;
    const plRight = player.x + SW - 4;

    const overlapX = plRight > mobLeft && plLeft < mobRight;
    if (!overlapX) continue;

    const overlapY = player.y > mobTop && player.y - SH < mob.y;
    if (!overlapY) continue;

    if (player.vy > 0 && prevPlayerY <= mobTop + 10) {
      mob.alive = false;
      mob.dyingTimer = 20;
      player.vy = JUMP_FORCE * 0.55;
      score++;
      levelKills++;
      if (levelKills >= 5) pipeVisible = true;
      playSquish();
    } else {
      gameOver = true;
      stopBgMusic();
      playGameOver();
    }
  }
}

// ── Рисование ───────────────────────────────────────────────

function drawSteve(x, y, facingRight, walking, frame) {
  const legOffset = walking ? (frame === 0 ? 3 : -3) : 0;
  drawSprite(PALETTE, STEVE, x, y, facingRight, legOffset);
}

function drawZombie(x, y, facingRight, walking, frame, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const legOffset = walking ? (frame === 0 ? 3 : -3) : 0;
  drawSprite(ZOMBIE_PALETTE, ZOMBIE, x, y, facingRight, legOffset);
  ctx.restore();
}

function drawSkeleton(x, y, facingRight, walking, frame, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const legOffset = walking ? (frame === 0 ? 3 : -3) : 0;
  drawSprite(SKELETON_PALETTE, SKELETON, x, y, facingRight, legOffset);

  // Меч (железный, held at arm level)
  const handY = y + CELL * 9;
  const bx = facingRight ? x + SW + 1 : x - CELL - 1;

  // Лезвие
  ctx.fillStyle = '#C0C0C0';
  ctx.fillRect(bx, handY - CELL * 5, CELL, CELL * 5);
  // Блик лезвия
  ctx.fillStyle = '#EFEFEF';
  ctx.fillRect(bx + (facingRight ? 0 : CELL - 1), handY - CELL * 5, 1, CELL * 5);
  // Гарда (крестовина)
  ctx.fillStyle = '#7A5028';
  ctx.fillRect(bx - CELL, handY, CELL * 3, CELL);
  // Рукоять
  ctx.fillStyle = '#4A2810';
  ctx.fillRect(bx, handY + CELL, CELL, CELL * 2);

  ctx.restore();
}

function drawMobs() {
  for (const mob of mobs) {
    const alpha = mob.alive ? 1 : mob.dyingTimer / 20;
    if (!mob.alive) {
      ctx.save();
      const cx = mob.x + SW / 2;
      const by = mob.y;
      ctx.translate(cx, by);
      const s = mob.dyingTimer / 20;
      ctx.scale(1 + (1 - s) * 0.5, s);
      ctx.translate(-cx, -by);
    }
    if (isNether()) {
      drawSkeleton(mob.x, mob.y - SH, mob.vx > 0, mob.alive, mob.walkFrame, alpha);
    } else {
      drawZombie(mob.x, mob.y - SH, mob.vx > 0, mob.alive, mob.walkFrame, alpha);
    }
    if (!mob.alive) ctx.restore();
  }
}

function drawPhantomSprite(ph) {
  const drawY = PHANTOM_FLY_Y + Math.round(Math.sin(ph.age * 0.04) * 12);
  const facingRight = ph.vx > 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 16; col++) {
      const color = PHANTOM_PALETTE[PHANTOM[row][col]];
      if (!color) continue;
      const c = facingRight ? col : (15 - col);
      ctx.fillStyle = color;
      ctx.fillRect(ph.x + c * CELL, drawY + row * CELL, CELL, CELL);
    }
  }
}

function drawPhantoms() {
  for (const ph of phantoms) drawPhantomSprite(ph);
}

function drawGround() {
  if (isMine()) { drawGroundMine(); return; }
  if (isForest()) { drawGroundForest(); return; }
  if (isNether()) { drawGroundNether(); return; }
  if (isVillage()) { drawGroundVillage(); return; }
  ctx.fillStyle = '#5A8A3C';
  ctx.fillRect(0, GROUND_TOP, W, 12);
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(0, GROUND_TOP + 12, W, H - GROUND_TOP - 12);
  ctx.fillStyle = '#4A7A2C';
  for (let bx = 0; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, 5);
  }
}

function drawGroundMine() {
  ctx.fillStyle = '#5C5650';
  ctx.fillRect(0, GROUND_TOP, W, 12);
  ctx.fillStyle = '#3C3830';
  ctx.fillRect(0, GROUND_TOP + 12, W, H - GROUND_TOP - 12);
  ctx.fillStyle = '#464240';
  for (let bx = 0; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, 5);
    ctx.fillRect(bx, GROUND_TOP, 1, 12);
  }
}

function drawGroundNether() {
  ctx.fillStyle = '#5A1008';
  ctx.fillRect(0, GROUND_TOP, W, 12);
  ctx.fillStyle = '#3D0805';
  ctx.fillRect(0, GROUND_TOP + 12, W, H - GROUND_TOP - 12);
  ctx.fillStyle = '#7A1410';
  for (let bx = 0; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, 5);
    ctx.fillRect(bx, GROUND_TOP, 1, 12);
  }
  ctx.fillStyle = '#FF4400';
  for (let bx = 8; bx < W; bx += 64) {
    ctx.fillRect(bx, GROUND_TOP + 6, 3, 6);
  }
}

function drawPlatform(p) {
  if (isMine()) { drawPlatformMine(p); return; }
  if (isForest()) { drawPlatformBranch(p); return; }
  if (isNether()) { drawPlatformNether(p); return; }
  if (isVillage()) { drawPlatformVillage(p); return; }
  const platH = 24;
  ctx.fillStyle = '#5A8A3C';
  ctx.fillRect(p.x, p.y, p.w, 10);
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(p.x, p.y + 10, p.w, platH - 10);
  ctx.fillStyle = '#4A7A2C';
  for (let bx = p.x; bx < p.x + p.w; bx += BLOCK) {
    ctx.fillRect(bx, p.y, Math.min(BLOCK - 1, p.x + p.w - bx), 4);
  }
  ctx.fillStyle = '#3A4A2080';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 4);
}

function drawPlatformMine(p) {
  const platH = 24;
  ctx.fillStyle = '#7A5418';
  ctx.fillRect(p.x, p.y, p.w, platH);
  ctx.fillStyle = '#B07C28';
  ctx.fillRect(p.x, p.y, p.w, 8);
  ctx.fillStyle = '#4A2C08';
  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
    ctx.fillRect(bx, p.y, 2, platH);
  }
  ctx.fillStyle = '#986618';
  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
    ctx.fillRect(bx + 2, p.y + 3, 10, 2);
  }
  ctx.fillStyle = '#C89030';
  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
    ctx.fillRect(bx + 2, p.y + 1, 10, 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 4);
}

function drawPlatformNether(p) {
  const platH = 24;
  ctx.fillStyle = '#5A1008';
  ctx.fillRect(p.x, p.y, p.w, platH);
  ctx.fillStyle = '#7A1C10';
  ctx.fillRect(p.x, p.y, p.w, 8);
  ctx.fillStyle = '#3A0806';
  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
    ctx.fillRect(bx, p.y, 2, platH);
  }
  ctx.fillStyle = '#8A2018';
  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
    ctx.fillRect(bx + 2, p.y + 1, 10, 2);
  }
  ctx.fillStyle = '#FF4400';
  for (let bx = p.x + 8; bx < p.x + p.w; bx += 32) {
    ctx.fillRect(bx, p.y + 6, 4, 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 4);
}

function isNight() {
  return level % 2 === 0;
}

function isVillage() {
  return level === 7;
}

function isMine() {
  return level % 4 === 3 && !isVillage();
}

function isForest() {
  return level % 4 === 0;
}

function isNether() {
  return level === 6;
}

function drawTorch(x, y) {
  ctx.fillStyle = '#FFFFA0';
  ctx.fillRect(x + 3, y,     2, 3);
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x + 2, y + 2, 4, 3);
  ctx.fillStyle = '#FF8800';
  ctx.fillRect(x + 1, y + 4, 6, 3);
  ctx.fillStyle = '#7A4A14';
  ctx.fillRect(x + 3, y + 7, 2, 9);
  ctx.fillStyle = '#5A3008';
  ctx.fillRect(x + 2, y + 14, 4, 2);
}

function drawBackgroundMine() {
  ctx.fillStyle = mineGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  const stoneShades = ['#1C1A16', '#201D18', '#181614', '#242018'];
  for (const s of CAVE_STONES) {
    ctx.fillStyle = stoneShades[(s.x + s.y) % 4];
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#2A2620';
    ctx.fillRect(s.x, s.y, s.w, 2);
    ctx.fillRect(s.x, s.y, 2, s.h);
  }

  for (const ore of CAVE_ORES) {
    ctx.fillStyle = '#0C0C0F';
    ctx.fillRect(ore.x,     ore.y,     10, 8);
    ctx.fillRect(ore.x + 6, ore.y + 6, 8,  6);
    ctx.fillStyle = '#1A1A1E';
    ctx.fillRect(ore.x + 2, ore.y + 2, 4, 4);
  }

  for (const ore of IRON_ORE_BLOCKS) {
    ctx.fillStyle = '#545050';
    ctx.fillRect(ore.x, ore.y, 20, 20);
    ctx.fillStyle = '#686460';
    ctx.fillRect(ore.x, ore.y, 20, 2);
    ctx.fillRect(ore.x, ore.y, 2, 20);
    ctx.fillStyle = '#C8A868';
    ctx.fillRect(ore.x + 3,  ore.y + 3,  4, 4);
    ctx.fillRect(ore.x + 11, ore.y + 5,  5, 3);
    ctx.fillRect(ore.x + 4,  ore.y + 12, 3, 5);
    ctx.fillRect(ore.x + 12, ore.y + 12, 4, 4);
    ctx.fillStyle = '#D8B878';
    ctx.fillRect(ore.x + 4,  ore.y + 4,  2, 2);
    ctx.fillRect(ore.x + 13, ore.y + 13, 2, 2);
  }

  for (const ore of DIAMOND_ORE_BLOCKS) {
    ctx.fillStyle = '#4C5058';
    ctx.fillRect(ore.x, ore.y, 20, 20);
    ctx.fillStyle = '#606470';
    ctx.fillRect(ore.x, ore.y, 20, 2);
    ctx.fillRect(ore.x, ore.y, 2, 20);
    ctx.fillStyle = '#48D8F0';
    ctx.fillRect(ore.x + 4,  ore.y + 4,  4, 3);
    ctx.fillRect(ore.x + 12, ore.y + 3,  4, 4);
    ctx.fillRect(ore.x + 3,  ore.y + 13, 5, 3);
    ctx.fillRect(ore.x + 13, ore.y + 12, 4, 5);
    ctx.fillStyle = '#88F0FF';
    ctx.fillRect(ore.x + 5,  ore.y + 5,  2, 1);
    ctx.fillRect(ore.x + 13, ore.y + 4,  2, 1);
    ctx.fillRect(ore.x + 14, ore.y + 13, 2, 1);
  }

  for (const t of MINE_TORCHES) {
    const gx = t.x + 4, gy = t.y + 6;
    const glow = ctx.createRadialGradient(gx, gy, 2, gx, gy, 110);
    glow.addColorStop(0,    'rgba(255, 165, 20, 0.30)');
    glow.addColorStop(0.35, 'rgba(255, 130, 10, 0.14)');
    glow.addColorStop(1,    'rgba(255, 100,  0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, GROUND_TOP);
  }

  for (const t of MINE_TORCHES) drawTorch(t.x, t.y);
}

function drawBackgroundForest() {
  ctx.fillStyle = nightGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  ctx.fillStyle = '#FFFFFF';
  for (const s of STARS) ctx.fillRect(s.x, s.y, s.s, s.s);

  ctx.fillStyle = '#E8E8D0';
  ctx.fillRect(8, 48, 40, 40);
  ctx.fillStyle = '#D0D0A8';
  ctx.fillRect(2,  62, 6, 6);
  ctx.fillRect(50, 62, 6, 6);
  ctx.fillRect(22, 42, 6, 6);
  ctx.fillRect(22, 88, 6, 6);
  ctx.fillStyle = '#C0C098';
  ctx.fillRect(16, 56, 8, 8);
  ctx.fillRect(28, 68, 6, 6);

  // Distant tree silhouettes in background
  const bgTrees = [
    { x: 20,  h: 150 }, { x: 160, h: 125 }, { x: 285, h: 162 },
    { x: 440, h: 138 }, { x: 575, h: 155 }, { x: 700, h: 128 }, { x: 755, h: 142 },
  ];
  ctx.fillStyle = '#0A1808';
  for (const t of bgTrees) {
    ctx.fillRect(t.x + 6, GROUND_TOP - t.h, 10, t.h);
    ctx.fillRect(t.x,     GROUND_TOP - t.h - 20, 22, 22);
    ctx.fillRect(t.x + 4, GROUND_TOP - t.h - 38, 14, 22);
    ctx.fillRect(t.x + 7, GROUND_TOP - t.h - 52, 8,  18);
  }
}

function drawGroundForest() {
  ctx.fillStyle = '#243818';
  ctx.fillRect(0, GROUND_TOP, W, 12);
  ctx.fillStyle = '#141E0C';
  ctx.fillRect(0, GROUND_TOP + 12, W, H - GROUND_TOP - 12);
  ctx.fillStyle = '#2E4820';
  for (let bx = 0; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, 5);
  }
  ctx.fillStyle = '#1A2C10';
  for (let bx = 12; bx < W; bx += 48) {
    ctx.fillRect(bx, GROUND_TOP + 4, 4, 8);
  }
}

function drawPlatformBranch(p) {
  const platH = 24;
  ctx.fillStyle = '#4A2A0C';
  ctx.fillRect(p.x, p.y, p.w, platH);
  ctx.fillStyle = '#7A4A20';
  ctx.fillRect(p.x, p.y, p.w, 9);
  ctx.fillStyle = '#331A06';
  for (let bx = p.x; bx < p.x + p.w; bx += 18) {
    ctx.fillRect(bx, p.y, 2, platH);
  }
  ctx.fillStyle = '#9A6030';
  for (let bx = p.x; bx < p.x + p.w; bx += 18) {
    ctx.fillRect(bx + 3, p.y + 1, 12, 3);
  }
  ctx.fillStyle = '#2A5A18';
  ctx.fillRect(p.x + 5, p.y, 10, 4);
  ctx.fillRect(p.x + p.w - 20, p.y, 14, 3);
  if (p.w > 100) ctx.fillRect(p.x + Math.floor(p.w / 2) - 6, p.y, 12, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 4);
}

function drawForestTrees() {
  for (const t of FOREST_TRUNKS) {
    ctx.fillStyle = '#3C1E08';
    ctx.fillRect(t.x, 0, t.w, GROUND_TOP);
    ctx.fillStyle = '#6B3A18';
    ctx.fillRect(t.x + 4, 0, Math.floor(t.w * 0.35), GROUND_TOP);
    ctx.fillStyle = '#2A1204';
    for (let ty = 20; ty < GROUND_TOP; ty += 32) {
      ctx.fillRect(t.x, ty, t.w, 2);
    }
    ctx.fillRect(t.x + t.w - 3, 0, 3, GROUND_TOP);
  }
}

function drawBackgroundNether() {
  ctx.fillStyle = netherGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  const stoneShades = ['#3D0C06', '#4A1008', '#320A05', '#551008'];
  for (const s of NETHER_STONES) {
    ctx.fillStyle = stoneShades[(s.x + s.y) % 4];
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#5A140A';
    ctx.fillRect(s.x, s.y, s.w, 2);
    ctx.fillRect(s.x, s.y, 2, s.h);
  }

  for (const lava of NETHER_LAVA_POOLS) {
    const gx = lava.x + lava.w / 2, gy = lava.y + lava.h / 2;
    const glow = ctx.createRadialGradient(gx, gy, 2, gx, gy, 80);
    glow.addColorStop(0,   'rgba(255, 120, 0, 0.35)');
    glow.addColorStop(0.5, 'rgba(255, 80,  0, 0.15)');
    glow.addColorStop(1,   'rgba(255, 50,  0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(Math.max(0, gx - 80), Math.max(0, gy - 80), 160, 160);
    ctx.fillStyle = '#FF6600';
    ctx.fillRect(lava.x, lava.y, lava.w, lava.h);
    ctx.fillStyle = '#FF9900';
    ctx.fillRect(lava.x + 2, lava.y, lava.w - 4, 3);
    ctx.fillStyle = '#FFCC00';
    ctx.fillRect(lava.x + 4, lava.y + 1, 6, 1);
  }
}

// Village house positions for background silhouettes
const VILLAGE_HOUSES = [
  { x: 15,  ww: 95,  wh: 95,  rh: 32 },
  { x: 185, ww: 72,  wh: 80,  rh: 26 },
  { x: 330, ww: 115, wh: 110, rh: 40 },
  { x: 530, ww: 80,  wh: 88,  rh: 28 },
  { x: 682, ww: 90,  wh: 92,  rh: 30 },
];

function drawHouse(h) {
  const base = GROUND_TOP;
  const wx = h.x, wy = base - h.wh, ww = h.ww, wh = h.wh;

  // Wall
  ctx.fillStyle = '#C8A060';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.fillStyle = '#A07840';
  ctx.fillRect(wx + ww - 6, wy, 6, wh);
  ctx.fillStyle = '#785020';
  for (let sy = wy + 12; sy < wy + wh; sy += 16) {
    ctx.fillRect(wx, sy, ww, 2);
  }

  // Roof (stepped cobblestone)
  ctx.fillStyle = '#888888';
  const steps = 4;
  for (let s = 0; s < steps; s++) {
    const rx = wx + s * (ww / (steps * 2));
    const rw = ww - s * (ww / steps);
    const ry = wy - h.rh + s * Math.ceil(h.rh / steps);
    ctx.fillRect(rx, ry, rw, Math.ceil(h.rh / steps) + 1);
  }
  ctx.fillStyle = '#AAAAAA';
  ctx.fillRect(wx + 2, wy - h.rh, ww - 4, 4);

  // Windows
  ctx.fillStyle = '#90C8F0';
  const winY = wy + Math.floor(wh * 0.25);
  const winH = Math.floor(wh * 0.28);
  const winW = Math.floor(ww * 0.18);
  ctx.fillRect(wx + 8,          winY, winW, winH);
  ctx.fillRect(wx + ww - 8 - winW, winY, winW, winH);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(wx + 8 + winW / 2 - 1, winY, 2, winH);
  ctx.fillRect(wx + 8, winY + winH / 2 - 1, winW, 2);
  ctx.fillRect(wx + ww - 8 - winW + winW / 2 - 1, winY, 2, winH);
  ctx.fillRect(wx + ww - 8 - winW, winY + winH / 2 - 1, winW, 2);

  // Door
  ctx.fillStyle = '#5A3010';
  const dw = Math.floor(ww * 0.2);
  const dh = Math.floor(wh * 0.35);
  const dx = wx + Math.floor((ww - dw) / 2);
  ctx.fillRect(dx, wy + wh - dh, dw, dh);
  ctx.fillStyle = '#7A5030';
  ctx.fillRect(dx + 2, wy + wh - dh + 3, 4, 4);
}

function drawBackgroundVillage() {
  // Day sky
  ctx.fillStyle = dayGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  // Sun
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(680, 30, 44, 44);
  ctx.fillStyle = '#FFF176';
  ctx.fillRect(674, 44, 6, 6);
  ctx.fillRect(724, 44, 6, 6);
  ctx.fillRect(694, 24, 6, 6);
  ctx.fillRect(694, 74, 6, 6);

  // Clouds
  drawCloud(80,  55);
  drawCloud(310, 35);
  drawCloud(530, 65);

  // Houses
  for (const h of VILLAGE_HOUSES) drawHouse(h);
}

function drawGroundVillage() {
  // Dirt base
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(0, GROUND_TOP, W, H - GROUND_TOP);

  // Cobblestone top layer
  ctx.fillStyle = '#999999';
  ctx.fillRect(0, GROUND_TOP, W, 14);
  const shades = ['#888888', '#919191', '#7A7A7A', '#9A9A9A'];
  for (let bx = 0; bx < W; bx += 20) {
    ctx.fillStyle = shades[(bx / 20) % 4];
    ctx.fillRect(bx, GROUND_TOP, 19, 13);
    ctx.fillStyle = '#555555';
    ctx.fillRect(bx, GROUND_TOP,      19, 1);
    ctx.fillRect(bx, GROUND_TOP,       1, 13);
    ctx.fillRect(bx, GROUND_TOP + 12, 19, 1);
  }
  // Dirt sub-layer blocks
  ctx.fillStyle = '#7A5810';
  for (let bx = 10; bx < W; bx += 32) {
    ctx.fillRect(bx, GROUND_TOP + 14, 2, H - GROUND_TOP - 14);
  }
}

function drawPlatformVillage(p) {
  const platH = 16;
  // Oak planks
  ctx.fillStyle = '#C8A060';
  ctx.fillRect(p.x, p.y, p.w, platH);
  ctx.fillStyle = '#A07840';
  ctx.fillRect(p.x, p.y, p.w, 3);
  ctx.fillStyle = '#785020';
  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
    ctx.fillRect(bx, p.y, 1, platH);
  }
  ctx.fillStyle = '#D4B070';
  for (let bx = p.x + 4; bx < p.x + p.w; bx += 16) {
    ctx.fillRect(bx, p.y + 1, 8, 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 4);
}

function drawBackground() {
  if (isMine()) { drawBackgroundMine(); return; }
  if (isForest()) { drawBackgroundForest(); return; }
  if (isNether()) { drawBackgroundNether(); return; }
  if (isVillage()) { drawBackgroundVillage(); return; }
  const night = isNight();
  ctx.fillStyle = night ? nightGradient : dayGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  if (night) {
    ctx.fillStyle = '#FFFFFF';
    for (const s of STARS) ctx.fillRect(s.x, s.y, s.s, s.s);

    ctx.fillStyle = '#E8E8D0';
    ctx.fillRect(8, 48, 40, 40);
    ctx.fillStyle = '#D0D0A8';
    ctx.fillRect(2,  62, 6, 6);
    ctx.fillRect(50, 62, 6, 6);
    ctx.fillRect(22, 42, 6, 6);
    ctx.fillRect(22, 88, 6, 6);
    ctx.fillStyle = '#C0C098';
    ctx.fillRect(16, 56, 8, 8);
    ctx.fillRect(28, 68, 6, 6);
  } else {
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(8, 48, 40, 40);
    ctx.fillStyle = '#FFF176';
    ctx.fillRect(2,  62, 6, 6);
    ctx.fillRect(50, 62, 6, 6);
    ctx.fillRect(22, 42, 6, 6);
    ctx.fillRect(22, 88, 6, 6);

    drawCloud(100, 60);
    drawCloud(350, 40);
    drawCloud(580, 70);
  }
}

function drawCloud(cx, cy) {
  ctx.fillStyle = '#FFFFFFCC';
  ctx.fillRect(cx,      cy + 8,  48, 16);
  ctx.fillRect(cx + 8,  cy,      32, 16);
  ctx.fillRect(cx + 16, cy - 8,  16, 16);
}

function drawSwordSwing() {
  if (!swordSwing.active) return;
  const alpha = swordSwing.timer / 12;
  const dir   = swordSwing.facingRight ? 1 : -1;
  const baseX = player.x + (swordSwing.facingRight ? SW : 0);
  const baseY = player.y - SH * 0.88;
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const t  = i / 6;
    const sx = baseX + dir * t * 64;
    const sy = baseY + t * SH * 0.65;
    const sz = Math.round(8 - t * 5);
    ctx.globalAlpha = alpha * (1 - t * 0.35);
    ctx.fillStyle = t < 0.3 ? '#FFFFFF' : t < 0.6 ? '#FFFF88' : '#FFD700';
    ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
  }
  ctx.restore();
}

function drawJoyRays() {
  if (!joyRays.length) return;
  const cx = player.x + SW / 2;
  const cy = player.y - SH / 2;
  ctx.save();
  for (const r of joyRays) {
    const progress = 1 - r.timer / r.maxTimer;
    const dist  = 18 + Math.min(progress * 2.5, 1) * r.maxLen;
    ctx.globalAlpha = r.timer / r.maxTimer;
    ctx.fillStyle = r.color;
    const rx = cx + Math.cos(r.angle) * dist;
    const ry = cy + Math.sin(r.angle) * dist;
    ctx.fillRect(rx - 3, ry - 3, 6, 6);
    ctx.globalAlpha = (r.timer / r.maxTimer) * 0.5;
    const rx2 = cx + Math.cos(r.angle) * (dist + 9);
    const ry2 = cy + Math.sin(r.angle) * (dist + 9);
    ctx.fillRect(rx2 - 2, ry2 - 2, 4, 4);
  }
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(8, 8, 210, 32);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`Score: ${score}   Lv.${level}`, 18, 30);


  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(MUTE_BTN.x, MUTE_BTN.y, MUTE_BTN.w, MUTE_BTN.h);
  ctx.fillStyle = bgMusicMuted ? '#FF6666' : '#FFD700';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(bgMusicMuted ? '✕♪' : '♪', MUTE_BTN.x + MUTE_BTN.w / 2, MUTE_BTN.y + 22);
  ctx.textAlign = 'left';

  if (handSlot) {
    const scale = 0.5;
    const slotPx = ISLOT * scale;           // 26px
    const sx = 8;
    const sy = H - slotPx - 14;            // 14px снизу: 5px отступ + 9px под текст [E]
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(scale, scale);
    drawSlot(0, 0, handSlot);
    ctx.restore();
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText('[E]', sx + slotPx / 2, sy + slotPx + 9);
    ctx.textAlign = 'left';
  }

  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.textAlign = 'right';
  ctx.fillText(`v${VERSION}`, W - 6, H - 5);
  ctx.textAlign = 'left';
}

function drawItemIcon(id, x, y) {
  switch (id) {
    case 'sword': {
      ctx.fillStyle = '#C8C8C8';
      ctx.fillRect(x + 23, y +  5, 6, 26);
      ctx.fillStyle = '#909090';
      ctx.fillRect(x + 27, y +  5, 2, 26);
      ctx.fillStyle = '#DCDCDC';
      ctx.fillRect(x + 24, y +  3, 4,  4);
      ctx.fillRect(x + 25, y +  2, 2,  3);
      ctx.fillStyle = '#9A6A1A';
      ctx.fillRect(x + 11, y + 31, 30,  5);
      ctx.fillStyle = '#C08820';
      ctx.fillRect(x + 13, y + 31, 26,  2);
      ctx.fillStyle = '#6B4812';
      ctx.fillRect(x + 23, y + 36, 6, 10);
      ctx.fillStyle = '#9A6A1A';
      ctx.fillRect(x + 21, y + 46, 10,  4);
      break;
    }
    case 'pickaxe': {
      ctx.fillStyle = '#888888';
      ctx.fillRect(x +  4, y +  7, 44, 12);
      ctx.fillStyle = '#AAAAAA';
      ctx.fillRect(x +  6, y +  7, 40,  4);
      ctx.fillStyle = '#686868';
      ctx.fillRect(x +  4, y +  7,  8, 16);
      ctx.fillRect(x +  4, y + 19,  6,  4);
      ctx.fillRect(x + 40, y +  7,  8, 14);
      ctx.fillRect(x + 42, y + 17,  6,  4);
      ctx.fillStyle = '#8B6418';
      ctx.fillRect(x + 22, y + 17,  8, 30);
      ctx.fillStyle = '#B07E20';
      ctx.fillRect(x + 22, y + 17,  4, 30);
      break;
    }
    case 'apple': {
      ctx.fillStyle = '#3A2010';
      ctx.fillRect(x + 24, y +  4,  4,  7);
      ctx.fillStyle = '#1A881A';
      ctx.fillRect(x + 27, y +  4, 10,  6);
      ctx.fillStyle = '#22AA22';
      ctx.fillRect(x + 28, y +  5,  7,  3);
      ctx.fillStyle = '#CC1818';
      ctx.fillRect(x +  9, y + 10, 34,  4);
      ctx.fillRect(x +  5, y + 14, 42, 18);
      ctx.fillRect(x +  9, y + 32, 34,  4);
      ctx.fillStyle = '#FF4848';
      ctx.fillRect(x +  9, y + 13, 12,  8);
      ctx.fillStyle = '#AA1010';
      ctx.fillRect(x + 18, y + 34, 16,  2);
      break;
    }
    case 'iron': {
      ctx.fillStyle = '#B0A090';
      ctx.fillRect(x + 10, y +  8, 32,  6);
      ctx.fillRect(x +  8, y + 14, 36, 22);
      ctx.fillRect(x + 10, y + 36, 32,  6);
      ctx.fillStyle = '#D0C0B0';
      ctx.fillRect(x + 12, y + 10, 24,  2);
      ctx.fillRect(x + 12, y + 16, 10,  4);
      ctx.fillStyle = '#807060';
      ctx.fillRect(x +  8, y + 36, 36,  2);
      break;
    }
    case 'diamond': {
      ctx.fillStyle = '#18B8B8';
      ctx.fillRect(x + 20, y +  4,  12,  4);
      ctx.fillRect(x + 16, y +  8,  20,  4);
      ctx.fillRect(x + 10, y + 12,  32,  4);
      ctx.fillRect(x +  6, y + 16,  40,  4);
      ctx.fillRect(x + 10, y + 20,  32,  4);
      ctx.fillRect(x + 16, y + 24,  20,  4);
      ctx.fillRect(x + 20, y + 28,  12,  4);
      ctx.fillRect(x + 22, y + 32,   8,  4);
      ctx.fillRect(x + 24, y + 36,   4,  6);
      ctx.fillStyle = '#6CDDDD';
      ctx.fillRect(x + 12, y + 12, 12,  6);
      ctx.fillStyle = '#38C8C8';
      ctx.fillRect(x + 24, y + 12,  8,  4);
      break;
    }
  }
}

function drawMiningFx() {
  if (!isMine()) return;

  // Highlight nearest reachable ore when pickaxe is equipped
  if (handSlot === 'pickaxe' && !miningAnim.active) {
    const px = player.x + SW / 2;
    const py = player.y - SH / 2;
    let nearest = null, nearestDist = Infinity;
    for (const ore of IRON_ORE_BLOCKS) {
      const d = Math.hypot(ore.x + 10 - px, ore.y + 10 - py);
      if (d < MINE_REACH && d < nearestDist) { nearest = ore; nearestDist = d; }
    }
    for (const ore of DIAMOND_ORE_BLOCKS) {
      const d = Math.hypot(ore.x + 10 - px, ore.y + 10 - py);
      if (d < MINE_REACH && d < nearestDist) { nearest = ore; nearestDist = d; }
    }
    if (nearest) {
      const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 120);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = 2;
      ctx.strokeRect(nearest.x - 2, nearest.y - 2, 24, 24);
      ctx.restore();
    }
  }

  if (!miningAnim.active || !miningAnim.ore) return;
  const progress = 1 - miningAnim.timer / miningAnim.maxTimer;
  const ore = miningAnim.ore;
  const oreX = ore.x + 10;
  const oreY = ore.y + 10;

  // White flash on ore block during mining
  ctx.save();
  ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.55;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(ore.x, ore.y, 20, 20);
  ctx.restore();

  // Pickaxe swings in an arc from player's hand toward the ore
  const handX = player.x + (player.facingRight ? SW + 2 : -2);
  const handY = player.y - SH * 0.68;
  const t = progress;
  const pickX = handX + (oreX - handX) * t;
  const pickY = handY + (oreY - handY) * t - Math.sin(t * Math.PI) * 40;
  const angle = Math.atan2(oreY - handY, oreX - handX) + (Math.PI / 3) * (1 - t * 2);

  ctx.save();
  ctx.translate(pickX, pickY);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#AAAAAA';
  ctx.fillRect(-14, -4, 28, 8);
  ctx.fillRect(-16, -6, 10, 12);
  ctx.fillRect( 14, -6,  5, 10);
  ctx.fillStyle = '#8B6418';
  ctx.fillRect(-3, 4, 6, 14);
  ctx.restore();

  // Spark burst at impact point
  if (progress > 0.62) {
    const sp = (progress - 0.62) / 0.38;
    ctx.save();
    ctx.globalAlpha = 1 - sp;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = sp * 24;
      ctx.fillStyle = i % 2 === 0 ? '#FFFF00' : '#FF8800';
      ctx.fillRect(oreX + Math.cos(a) * r - 2, oreY + Math.sin(a) * r - 2, 4, 4);
    }
    ctx.restore();
  }
}

function drawWorldItems() {
  for (const item of worldItems) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(item.x + 3, item.y + 3, ISLOT, ISLOT);
    ctx.fillStyle = '#8B8B8B';
    ctx.fillRect(item.x, item.y, ISLOT, ISLOT);
    ctx.fillStyle = '#595959';
    ctx.fillRect(item.x + 4, item.y + 4, ISLOT - 8, ISLOT - 8);
    drawItemIcon(item.id, item.x, item.y);
  }
}

function drawSlot(sx, sy, item) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(sx, sy, ISLOT, 2);
  ctx.fillRect(sx, sy, 2, ISLOT);
  ctx.fillStyle = '#555555';
  ctx.fillRect(sx,           sy + ISLOT - 2, ISLOT, 2);
  ctx.fillRect(sx + ISLOT - 2, sy,           2, ISLOT);
  ctx.fillStyle = '#373737';
  ctx.fillRect(sx + 2, sy + 2, ISLOT - 4, 2);
  ctx.fillRect(sx + 2, sy + 2, 2, ISLOT - 4);
  ctx.fillStyle = '#8B8B8B';
  ctx.fillRect(sx + 2, sy + ISLOT - 4, ISLOT - 4, 2);
  ctx.fillRect(sx + ISLOT - 4, sy + 2,  2, ISLOT - 4);
  ctx.fillStyle = '#595959';
  ctx.fillRect(sx + 4, sy + 4, ISLOT - 8, ISLOT - 8);
  if (item) drawItemIcon(item, sx, sy);
}

function drawInventory() {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#C6C6C6';
  ctx.fillRect(IPX, IPY, IPW, IPH);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(IPX, IPY, IPW, 2);
  ctx.fillRect(IPX, IPY, 2, IPH);
  ctx.fillStyle = '#555555';
  ctx.fillRect(IPX,         IPY + IPH - 2, IPW, 2);
  ctx.fillRect(IPX + IPW - 2, IPY,         2, IPH);

  ctx.fillStyle = '#3F3F3F';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Inventory', IPX + IPW / 2, IPY + 24);
  ctx.textAlign = 'left';

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const sx = IGRID_X + col * (ISLOT + IGAP);
      const sy = IGRID_Y + row * (ISLOT + IGAP);
      drawSlot(sx, sy, inventory[row * 3 + col]);
    }
  }

  const sepY = IHAND_Y - 18;
  ctx.fillStyle = '#555555';
  ctx.fillRect(IPX + 8, sepY,     IPW - 16, 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(IPX + 8, sepY + 1, IPW - 16, 1);

  ctx.fillStyle = '#3F3F3F';
  ctx.font = '13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Hand:', IHAND_X, IHAND_Y - 3);
  drawSlot(IHAND_X, IHAND_Y, handSlot);

  ctx.fillStyle = '#6A6A6A';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Q — закрыть', IPX + IPW / 2, IPY + IPH - 35);
  ctx.fillText('клик по слоту — экипировать', IPX + IPW / 2, IPY + IPH - 22);
  ctx.textAlign = 'left';
}

function update() {
  pollGamepad();

  if (!levelComplete) {
    const moving = input.left || input.right;

    if (input.left) {
      player.x -= MOVE_SPEED;
      player.facingRight = false;
    }
    if (input.right) {
      player.x += MOVE_SPEED;
      player.facingRight = true;
    }

    if (moving) {
      player.walkTimer++;
      if (player.walkTimer > 12) {
        player.walkTimer = 0;
        player.walkFrame = 1 - player.walkFrame;
      }
    } else {
      player.walkFrame = 0;
      player.walkTimer = 0;
    }

    if (input.jump && player.onGround) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
      playPew();
    }

    player.vy += GRAVITY;
    const prevY = player.y;
    player.y += player.vy;

    player.onGround = false;

    if (player.y >= GROUND_TOP) {
      player.y = GROUND_TOP;
      player.vy = 0;
      player.onGround = true;
    }

    if (player.vy >= 0) {
      for (const p of platforms) {
        if (prevY <= p.y && player.y >= p.y &&
            player.x + SW > p.x + 4 && player.x < p.x + p.w - 4) {
          player.y = p.y;
          player.vy = 0;
          player.onGround = true;
          break;
        }
      }
    }

    player.x = Math.max(0, Math.min(W - SW, player.x));

    for (let i = worldItems.length - 1; i >= 0; i--) {
      const item = worldItems[i];
      const overlapX = player.x + SW > item.x && player.x < item.x + ISLOT;
      const overlapY = player.y > item.y && player.y - SH < item.y + ISLOT;
      if (overlapX && overlapY) {
        const slot = inventory.indexOf(null);
        if (slot >= 0) { inventory[slot] = item.id; worldItems.splice(i, 1); }
      }
    }

    if (pipeVisible) {
      const capLeft  = PIPE_X - PIPE_CAP_EXTRA;
      const capRight = PIPE_X + PIPE_W + PIPE_CAP_EXTRA;
      if (player.x + SW - 4 > capLeft && player.x + 4 < capRight) {
        levelComplete = true;
        stopBgMusic();
        if (level === 5 || level === 6) playPortalEnter(); else playPipeEnter();
      }
    }
  }

  updateMobs();
  updatePhantoms();

  if (useCooldown > 0) useCooldown--;
  if (swordSwing.active && --swordSwing.timer <= 0) swordSwing.active = false;
  for (let i = joyRays.length - 1; i >= 0; i--) {
    if (--joyRays[i].timer <= 0) joyRays.splice(i, 1);
  }
  if (miningAnim.active) {
    miningAnim.timer--;
    if (miningAnim.timer <= 0) {
      miningAnim.oreArr.splice(miningAnim.oreIdx, 1);
      worldItems.push({ id: miningAnim.oreType, x: miningAnim.ore.x, y: miningAnim.ore.y });
      miningAnim = { active: false, timer: 0, maxTimer: 20, ore: null, oreArr: null, oreIdx: -1, oreType: '' };
    }
  }
}

function drawPipe(x, y) {
  const capX = x - PIPE_CAP_EXTRA;
  const capW = PIPE_W + PIPE_CAP_EXTRA * 2;
  const capH = 14;
  ctx.fillStyle = '#1A5C17';
  ctx.fillRect(x + 4,    y - PIPE_H + 4, PIPE_W, PIPE_H);
  ctx.fillRect(capX + 4, y - PIPE_H + 4, capW,   capH);
  ctx.fillStyle = '#2EA829';
  ctx.fillRect(x,   y - PIPE_H, PIPE_W, PIPE_H);
  ctx.fillStyle = '#38C032';
  ctx.fillRect(capX, y - PIPE_H, capW, capH);
  ctx.fillStyle = '#50D84A';
  ctx.fillRect(x + 6,    y - PIPE_H + capH, 8, PIPE_H - capH - 4);
  ctx.fillRect(capX + 6, y - PIPE_H + 2, 12, capH - 4);
}

function drawNetherPortal(x, y) {
  const fw = PIPE_W;
  const fh = 80;
  const ft = 8;
  const top = y - fh;

  // Obsidian frame
  ctx.fillStyle = '#14091E';
  ctx.fillRect(x, top, fw, fh);

  // Animated purple interior
  const ix = x + ft;
  const iy = top + ft;
  const iw = fw - ft * 2;
  const ih = fh - ft;
  const t = portalFrame * 0.05;
  const purples = ['#4B00A0', '#6611CC', '#7722DD', '#5500B8'];
  for (let i = 0; i < iw; i++) {
    const wave = (Math.sin(t + i * 0.45) + 1) * 0.5;
    ctx.fillStyle = purples[Math.floor(wave * purples.length) % purples.length];
    ctx.fillRect(ix + i, iy, 1, ih);
  }
  const glowAlpha = 0.25 + (Math.sin(t * 1.4) + 1) * 0.1;
  ctx.globalAlpha = glowAlpha;
  ctx.fillStyle = '#BB88FF';
  ctx.fillRect(ix + 4, iy + 4, iw - 8, ih - 8);
  ctx.globalAlpha = 1.0;

  // Frame highlight
  ctx.fillStyle = '#2A1248';
  ctx.fillRect(x, top, fw, 2);
  ctx.fillRect(x, top, 2, fh);
  ctx.fillStyle = '#0A0514';
  ctx.fillRect(x + fw - 2, top, 2, fh);
}

function drawLevelComplete() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 52px monospace';
  ctx.fillText('LEVEL COMPLETE!', W / 2, H / 2 - 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`Score: ${score}   Level: ${level}`, W / 2, H / 2 + 20);
  ctx.fillStyle = '#AAFFAA';
  ctx.font = '18px monospace';
  ctx.fillText('Space / Enter / A — next level', W / 2, H / 2 + 56);
  ctx.textAlign = 'left';
}

function nextLevel() {
  level++;
  levelKills    = 0;
  pipeVisible   = false;
  portalFrame   = 0;
  levelComplete = false;
  if (isMine()) regenerateOreBlocks();
  mobSpeed      = Math.min(mobSpeed * 1.15, 4.0);
  spawnInterval = Math.max(Math.floor(spawnInterval * 0.85), 80);
  player.x = W / 2 - 20;
  player.y = GROUND_TOP;
  player.vy = 0;
  player.onGround = true;
  player.facingRight = true;
  player.walkFrame = 0;
  player.walkTimer = 0;
  mobs = [];
  spawnTimer = 0;
  spawnMob(true, false);
  spawnMob(true, true);
  phantoms = [];
  phantomTimer = Math.floor(spawnInterval / 2);
  paused = false;
  joyRays = [];
  swordSwing = { active: false, timer: 0 };
  useCooldown = 0;
  miningAnim = { active: false, timer: 0, maxTimer: 20, ore: null, oreArr: null, oreIdx: -1, oreType: '' };
  initWorldItems();
  startBgMusic();
}

function drawPaused() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 56px monospace';
  ctx.fillText('PAUSE', W / 2, H / 2 - 20);
  ctx.fillStyle = '#AAAAFF';
  ctx.font = '18px monospace';
  ctx.fillText('P / ← → Space — resume', W / 2, H / 2 + 24);
  ctx.textAlign = 'left';
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF3333';
  ctx.font = 'bold 60px monospace';
  ctx.fillText('GAME OVER', W / 2, H / 2 - 24);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`Score: ${score}`, W / 2, H / 2 + 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '18px monospace';
  ctx.fillText('Space / Enter / A — restart', W / 2, H / 2 + 56);
  ctx.textAlign = 'left';
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawMiningFx();
  if (isForest()) drawForestTrees();
  platforms.forEach(drawPlatform);
  drawGround();
  if (pipeVisible) {
    if (level === 5 || level === 6) { portalFrame++; drawNetherPortal(PIPE_X, GROUND_TOP); }
    else drawPipe(PIPE_X, GROUND_TOP);
  }
  drawWorldItems();
  drawPhantoms();
  drawMobs();
  drawSteve(player.x, player.y - SH, player.facingRight, input.left || input.right, player.walkFrame);
  drawJoyRays();
  drawSwordSwing();
  drawHUD();
  if (levelComplete)  drawLevelComplete();
  if (gameOver)       drawGameOver();
  if (paused)         drawPaused();
  if (inventoryOpen)  drawInventory();
}

function loop() {
  if (!gameOver && !paused && !inventoryOpen) update();
  draw();
  requestAnimationFrame(loop);
}

loop();
