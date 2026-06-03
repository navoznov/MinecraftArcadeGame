const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const VERSION = '1.0.38';

const LEVEL_CONFIGS = [
  { theme: 'day',     mobType: 'zombie',   flyingMobType: null,      hasVillagers: false, portal: 'pipe',   startItem: 'sword',   hasOres: false },
  { theme: 'night',   mobType: 'zombie',   flyingMobType: 'phantom', hasVillagers: false, portal: 'pipe',   startItem: 'pickaxe', hasOres: false },
  { theme: 'mine',    mobType: 'zombie',   flyingMobType: null,      hasVillagers: false, portal: 'pipe',   startItem: null,      hasOres: true  },
  { theme: 'forest',  mobType: 'zombie',   flyingMobType: 'phantom', hasVillagers: false, portal: 'pipe',   startItem: null,      hasOres: false },
  { theme: 'mine',    mobType: 'zombie',   flyingMobType: null,      hasVillagers: false, portal: 'portal', startItem: null,      hasOres: true  },
  { theme: 'nether',  mobType: 'skeleton', flyingMobType: null,      hasVillagers: false, portal: 'portal', startItem: null,      hasOres: false },
  { theme: 'village', mobType: null,       flyingMobType: null,      hasVillagers: true,  portal: 'pipe',   startItem: null,      hasOres: false },
  { theme: 'desert',  mobType: 'husk',     flyingMobType: null,      hasVillagers: false, portal: 'pipe',   startItem: null,      hasOres: false },
  { theme: 'pyramid', mobType: 'husk',     flyingMobType: null,      hasVillagers: false, portal: 'pipe',   startItem: null,      hasOres: false },
  { theme: 'outpost',     mobType: 'pillager', flyingMobType: null,      hasVillagers: false, portal: 'pipe',   startItem: null,      hasOres: false },
  { theme: 'dark_forest', mobType: 'zombie',   flyingMobType: null,      hasVillagers: false, portal: 'pipe',   startItem: null,      hasOres: false },
  { theme: 'mansion',    mobType: 'pillager', flyingMobType: null,      hasVillagers: false, portal: 'pipe',   startItem: null,      hasOres: false },
  { theme: 'swamp',      mobType: 'zombie',   flyingMobType: null,      hasVillagers: false, portal: 'pipe',   startItem: null,      hasOres: false },
  { theme: 'underwater', mobType: 'drowned',  flyingMobType: null,      hasVillagers: false, portal: 'pipe',   startItem: null,      hasOres: false },
  { theme: 'ice',        mobType: 'ice_zombie', flyingMobType: null,     hasVillagers: false, portal: 'pipe',   startItem: null,      hasOres: false },
  { theme: 'end',        mobType: 'enderman',  flyingMobType: null,     hasVillagers: false, portal: 'portal', startItem: null,      hasOres: false },
  { theme: 'end',        mobType: 'enderman',  flyingMobType: null,     hasVillagers: false, portal: 'portal', startItem: null,      hasOres: false },
  { theme: 'end_castle', mobType: 'enderman',  flyingMobType: null,     hasVillagers: false, portal: 'portal', startItem: null,      hasOres: false },
];

function levelCfg() {
  return LEVEL_CONFIGS[(level - 1) % LEVEL_CONFIGS.length];
}
function nextLevelCfg() {
  return LEVEL_CONFIGS[level % LEVEL_CONFIGS.length];
}
function isPortalExit() {
  return levelCfg().portal === 'portal' ||
    nextLevelCfg().theme === 'end' || nextLevelCfg().theme === 'end_castle';
}

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

// Deterministic bubble positions for underwater level
const BUBBLES = [];
for (let i = 0; i < 35; i++) {
  BUBBLES.push({
    x: (i * 271 + 47) % (W - 20) + 10,
    y: (i * 149 + 29) % (GROUND_TOP - 30) + 10,
    s: i % 4 === 0 ? 3 : 2,
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

// Dark forest: fewer, much thicker dark oak trunks
const DARK_FOREST_TRUNKS = [
  { x:  28, w: 28 },
  { x: 190, w: 26 },
  { x: 380, w: 30 },
  { x: 555, w: 26 },
  { x: 718, w: 24 },
];

// Desert sky gradient
const desertGradient = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
desertGradient.addColorStop(0,   '#7AB8E8');
desertGradient.addColorStop(0.6, '#C8D8F0');
desertGradient.addColorStop(1,   '#E8D8A8');

// Pyramid (Egyptian) sky gradient — deep blue to golden horizon
const pyramidGradient = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
pyramidGradient.addColorStop(0,   '#3A80C0');
pyramidGradient.addColorStop(0.5, '#88BCDC');
pyramidGradient.addColorStop(1,   '#E0C060');

// Outpost sky gradient — overcast, ominous gray-blue
const outpostGradient = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
outpostGradient.addColorStop(0,   '#2A3848');
outpostGradient.addColorStop(0.5, '#48586A');
outpostGradient.addColorStop(1,   '#607080');

// Dark forest sky gradient — almost black, slight green tint
const darkForestGradient = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
darkForestGradient.addColorStop(0,   '#020404');
darkForestGradient.addColorStop(0.6, '#060C08');
darkForestGradient.addColorStop(1,   '#0C1610');

// Mansion sky gradient — deep gothic blue-black night
const mansionGradient = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
mansionGradient.addColorStop(0,   '#040408');
mansionGradient.addColorStop(0.5, '#060812');
mansionGradient.addColorStop(1,   '#0A0C18');

// Swamp sky gradient — murky dark teal-green foggy night
const swampGradient = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
swampGradient.addColorStop(0,   '#040A08');
swampGradient.addColorStop(0.5, '#081410');
swampGradient.addColorStop(1,   '#0E1C14');

// Underwater gradient — deep ocean blue-teal
const underwaterGradient = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
underwaterGradient.addColorStop(0,   '#04101A');
underwaterGradient.addColorStop(0.4, '#062234');
underwaterGradient.addColorStop(1,   '#083A48');

// Ice spikes sky gradient — pale arctic blue to frosty white horizon
const iceGradient = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
iceGradient.addColorStop(0,   '#88AECE');
iceGradient.addColorStop(0.5, '#C0D8EC');
iceGradient.addColorStop(1,   '#E4F0F8');

// The End void gradient — near-black with purple tint
const endGradient = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
endGradient.addColorStop(0,   '#04000C');
endGradient.addColorStop(0.5, '#0A0018');
endGradient.addColorStop(1,   '#180030');

// Deterministic snowflake positions for ice level
const SNOWFLAKES = [];
for (let i = 0; i < 50; i++) {
  SNOWFLAKES.push({
    x: (i * 337 + 53) % (W - 10) + 5,
    y: (i * 191 + 37) % (GROUND_TOP - 20) + 5,
    s: i % 5 === 0 ? 3 : 2,
  });
}

// Deterministic void particles for The End
const END_PARTICLES = [];
for (let i = 0; i < 80; i++) {
  END_PARTICLES.push({
    x: (i * 317 + 61) % (W - 10) + 5,
    y: (i * 173 + 29) % (GROUND_TOP - 20) + 5,
    s: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
    purple: i % 3 !== 0,
  });
}

// Desert background cactus X positions
const DESERT_CACTI = [
  { x: 55  },
  { x: 240 },
  { x: 475 },
  { x: 685 },
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
let villagers = [];
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

let emeraldCount = 0;
let ironCount    = 0;
let diamondCount = 0;
let tradeOpen    = false;
let tradePartner = null;   // 'farmer' | 'blacksmith'
let helpOpen     = false;

// ── Trade panel ───────────────────────────────────────────────
const TRADE_PW   = 560;
const TRADE_PH   = 310;
const TRADE_PX   = (W - TRADE_PW) >> 1;   // 120
const TRADE_PY   = (H - TRADE_PH) >> 1;   // 70
const TRADE_HALF = TRADE_PW >> 1;          // 280
const TSLOT      = 40;
const TGAP       = 3;
const FARMER_SHOP     = [{ id: 'apple',   price: 3, currency: 'emerald' }];
const BLACKSMITH_SHOP = [{ id: 'sword',   price: 4, currency: 'iron' },
                         { id: 'pickaxe', price: 4, currency: 'iron' }];

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
const EMERALD_ORE_BLOCKS = [];

function regenerateOreBlocks() {
  const all = [];
  IRON_ORE_BLOCKS.length = 0;
  DIAMOND_ORE_BLOCKS.length = 0;
  EMERALD_ORE_BLOCKS.length = 0;
  IRON_ORE_BLOCKS.push(...genOreBlocks(6, all));
  DIAMOND_ORE_BLOCKS.push(...genOreBlocks(3, all));
  EMERALD_ORE_BLOCKS.push(...genOreBlocks(4, all));
}
regenerateOreBlocks();

function initWorldItems() {
  worldItems = [];
  const top = platforms[5];
  const ix = top.x + Math.floor((top.w - ISLOT) / 2);
  const iy = top.y - ISLOT;
  const startItem = levelCfg().startItem;
  if (startItem) worldItems.push({ id: startItem, x: ix, y: iy });
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
  villagers = [];
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
  tradeOpen     = false;
  tradePartner  = null;
  helpOpen      = false;
  emeraldCount  = 0;
  ironCount     = 0;
  diamondCount  = 0;
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
    if (tradeOpen) { tradeOpen = false; tradePartner = null; } else { inventoryOpen = !inventoryOpen; }
    return;
  }

  if (!gameOver && !levelComplete && !paused && e.code === 'KeyR') {
    if (tradeOpen) { tradeOpen = false; tradePartner = null; }
    else { const t = findNearbyTrader(); if (t) { inventoryOpen = false; tradePartner = t.type; tradeOpen = true; } }
    return;
  }

  if (e.code === 'KeyH') { helpOpen = !helpOpen; return; }

  if (!gameOver && !levelComplete && !paused && e.code === 'KeyB') {
    levelKills = Math.max(levelKills, 5);
    pipeVisible = true;
    return;
  }

  if (!gameOver && !levelComplete && !paused && e.code === 'KeyN') {
    nextLevel();
    return;
  }

  if (inventoryOpen || tradeOpen || helpOpen) return;

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

  if (tradeOpen) {
    // Left panel: sell inventory item to farmer
    const gridW2    = 3 * TSLOT + 2 * TGAP;
    const gridLeft2 = TRADE_PX + ((TRADE_HALF - gridW2) >> 1);
    const gridTop2  = TRADE_PY + 32;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const sx = gridLeft2 + col * (TSLOT + TGAP);
        const sy = gridTop2  + row * (TSLOT + TGAP);
        if (cx >= sx && cx < sx + TSLOT && cy >= sy && cy < sy + TSLOT) {
          const idx = row * 3 + col;
          const it  = inventory[idx];
          if (it) {
            const shop = tradePartner === 'blacksmith' ? BLACKSMITH_SHOP : FARMER_SHOP;
            const si = shop.find(s => s.id === it);
            if (si) {
              inventory[idx] = null;
              if (si.currency === 'iron') {
                const ironSlot = inventory.indexOf('iron');
                if (ironSlot >= 0) { ironCount += si.price; }
                else { inventory[idx] = 'iron'; ironCount += si.price; }
              } else {
                const emSlot = inventory.indexOf('emerald');
                if (emSlot >= 0) { emeraldCount += si.price; }
                else { inventory[idx] = 'emerald'; emeraldCount += si.price; }
              }
            }
          }
          return;
        }
      }
    }
    // Right panel: buy item from shop
    const shopX2 = TRADE_PX + TRADE_HALF + 14;
    let shopY2 = TRADE_PY + 32;
    const currentShop2 = tradePartner === 'blacksmith' ? BLACKSMITH_SHOP : FARMER_SHOP;
    for (const si of currentShop2) {
      if (cx >= shopX2 && cx < TRADE_PX + TRADE_PW - 8 && cy >= shopY2 && cy < shopY2 + TSLOT) {
        const slot = inventory.indexOf(null);
        if (slot >= 0) {
          if (si.currency === 'iron') {
            if (ironCount >= si.price) {
              ironCount -= si.price;
              syncIronSlot();
              inventory[slot] = si.id;
            }
          } else {
            if (emeraldCount >= si.price) { emeraldCount -= si.price; inventory[slot] = si.id; syncEmeraldSlot(); }
          }
        }
        return;
      }
      shopY2 += TSLOT + 8;
    }
    // Click outside panel closes it
    if (cx < TRADE_PX || cx >= TRADE_PX + TRADE_PW || cy < TRADE_PY || cy >= TRADE_PY + TRADE_PH) {
      tradeOpen = false; tradePartner = null;
    }
    return;
  }

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
  for (let i = 0; i < EMERALD_ORE_BLOCKS.length; i++) {
    const ore = EMERALD_ORE_BLOCKS[i];
    if (Math.hypot(ore.x + 10 - px, ore.y + 10 - py) < MINE_REACH) {
      miningAnim = { active: true, timer: 20, maxTimer: 20, ore, oreArr: EMERALD_ORE_BLOCKS, oreIdx: i, oreType: 'emerald' };
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
  if (!levelCfg().flyingMobType) { phantoms = []; return; }

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
  if (spawnTimer >= spawnInterval && aliveMobs < 5 && !pipeVisible && levelCfg().mobType !== null) {
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

function drawHusk(x, y, facingRight, walking, frame, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const legOffset = walking ? (frame === 0 ? 3 : -3) : 0;
  drawSprite(HUSK_PALETTE, ZOMBIE, x, y, facingRight, legOffset);
  ctx.restore();
}

function drawDrowned(x, y, facingRight, walking, frame, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const legOffset = walking ? (frame === 0 ? 3 : -3) : 0;
  drawSprite(DROWNED_PALETTE, ZOMBIE, x, y, facingRight, legOffset);
  ctx.restore();
}

function drawIceZombie(x, y, facingRight, walking, frame, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const legOffset = walking ? (frame === 0 ? 3 : -3) : 0;
  drawSprite(ICE_ZOMBIE_PALETTE, ZOMBIE, x, y, facingRight, legOffset);

  // Ice chunks protruding from each shoulder (row 8 of sprite = y + 40)
  const shY = y + CELL * 7;
  const leftX  = facingRight ? x - CELL * 2 : x + SW;
  const rightX = facingRight ? x + SW        : x - CELL * 2;

  // Left ice chunk
  ctx.fillStyle = '#A0DDED';
  ctx.fillRect(leftX, shY, CELL * 2, CELL * 3);
  ctx.fillStyle = '#C8F4FF';
  ctx.fillRect(leftX, shY, CELL * 2, CELL);
  ctx.fillStyle = '#5AAAC0';
  ctx.fillRect(leftX + CELL, shY + CELL, CELL, CELL * 2);
  // inner spike
  ctx.fillStyle = '#C8F4FF';
  ctx.fillRect(leftX + 2, shY - CELL + 2, CELL - 2, CELL);

  // Right ice chunk
  ctx.fillStyle = '#A0DDED';
  ctx.fillRect(rightX, shY, CELL * 2, CELL * 3);
  ctx.fillStyle = '#C8F4FF';
  ctx.fillRect(rightX, shY, CELL * 2, CELL);
  ctx.fillStyle = '#5AAAC0';
  ctx.fillRect(rightX, shY + CELL, CELL, CELL * 2);
  // inner spike
  ctx.fillStyle = '#C8F4FF';
  ctx.fillRect(rightX + 2, shY - CELL + 2, CELL - 2, CELL);

  ctx.restore();
}

function drawEnderman(x, y, facingRight, walking, frame, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const legOffset = walking ? (frame === 0 ? 3 : -3) : 0;
  drawSprite(ENDERMAN_PALETTE, ZOMBIE, x, y, facingRight, legOffset);

  // Extra-long thin arms (Enderman hallmark)
  const shY = y + CELL * 7;
  const armW = CELL * 7;
  const armH = CELL * 2;
  const leftX  = facingRight ? x - armW : x + SW;
  const rightX = facingRight ? x + SW   : x - armW;

  ctx.fillStyle = '#1C1022';
  ctx.fillRect(leftX,  shY, armW, armH);
  ctx.fillRect(rightX, shY, armW, armH);
  ctx.fillStyle = '#0C0612';
  ctx.fillRect(leftX,  shY + armH - 2, armW, 2);
  ctx.fillRect(rightX, shY + armH - 2, armW, 2);

  ctx.restore();
}

function drawPillager(x, y, facingRight, walking, frame, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const legOffset = walking ? (frame === 0 ? 3 : -3) : 0;
  drawSprite(PILLAGER_PALETTE, PILLAGER, x, y, facingRight, legOffset);

  // Crossbow held forward
  const handY  = y + CELL * 9;
  const stockW = CELL * 4;
  const stockX = facingRight ? x + SW + 2 : x - stockW - 2;
  const limbX  = facingRight ? stockX + CELL * 3 : stockX;

  // Stock (horizontal barrel)
  ctx.fillStyle = '#5A3010';
  ctx.fillRect(stockX, handY, stockW, CELL);
  ctx.fillStyle = '#7A4820';
  ctx.fillRect(stockX, handY, stockW, 2);

  // Bow limbs (vertical, at far end)
  ctx.fillStyle = '#8B5A28';
  ctx.fillRect(limbX, handY - CELL * 2, CELL, CELL * 5);
  ctx.fillStyle = '#A07038';
  ctx.fillRect(limbX + 1, handY - CELL * 2, 2, CELL * 5);

  // Bowstring (two lines from tips to nock)
  ctx.fillStyle = '#D8C898';
  ctx.fillRect(limbX + 2, handY - CELL * 2, 1, CELL * 2);
  ctx.fillRect(limbX + 2, handY + CELL,     1, CELL * 2);

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

function initVillagers() {
  villagers = [
    { x: 110, vx:  0.6, facingRight: true,  walkFrame: 0, walkTimer: 0, minX:  50, maxX: 300, type: 'farmer' },
    { x: 420, vx: -0.5, facingRight: false, walkFrame: 0, walkTimer: 8, minX: 280, maxX: 540, type: 'blacksmith' },
    { x: 560, vx:  0.7, facingRight: true,  walkFrame: 0, walkTimer: 4, minX: 400, maxX: 650, type: 'villager' },
  ];
}

function updateVillagers() {
  if (!isVillage()) return;
  for (const v of villagers) {
    v.x += v.vx;
    v.walkTimer++;
    if (v.walkTimer > 16) { v.walkTimer = 0; v.walkFrame = 1 - v.walkFrame; }
    if (v.x < v.minX)        { v.vx = Math.abs(v.vx);  v.facingRight = true; }
    if (v.x + SW > v.maxX)   { v.vx = -Math.abs(v.vx); v.facingRight = false; }
  }
}

function drawVillager(x, y, facingRight, frame, type) {
  const legOffset = frame === 0 ? 3 : -3;
  if (type === 'farmer')      drawSprite(FARMER_PALETTE,     FARMER,   x, y, facingRight, legOffset);
  else if (type === 'blacksmith') drawSprite(BLACKSMITH_PALETTE, VILLAGER, x, y, facingRight, legOffset);
  else                        drawSprite(VILLAGER_PALETTE,   VILLAGER, x, y, facingRight, legOffset);
}

function syncEmeraldSlot() {
  if (emeraldCount <= 0) {
    emeraldCount = 0;
    const idx = inventory.indexOf('emerald');
    if (idx >= 0) inventory[idx] = null;
  }
}

function syncIronSlot() {
  if (ironCount <= 0) {
    ironCount = 0;
    const idx = inventory.indexOf('iron');
    if (idx >= 0) inventory[idx] = null;
  }
}

function syncDiamondSlot() {
  if (diamondCount <= 0) {
    diamondCount = 0;
    const idx = inventory.indexOf('diamond');
    if (idx >= 0) inventory[idx] = null;
  }
}

function stackCount(item) {
  if (item === 'emerald') return emeraldCount;
  if (item === 'iron')    return ironCount;
  if (item === 'diamond') return diamondCount;
  return 0;
}

function findNearbyTrader() {
  if (!isVillage()) return null;
  for (const v of villagers) {
    if (v.type !== 'farmer' && v.type !== 'blacksmith') continue;
    if (Math.abs((v.x + SW / 2) - (player.x + SW / 2)) < 80) return v;
  }
  return null;
}

function drawVillagers() {
  if (!isVillage()) return;
  for (const v of villagers) {
    drawVillager(v.x, GROUND_TOP - SH, v.facingRight, v.walkFrame, v.type);
  }
  if (!tradeOpen && !inventoryOpen) {
    const f = findNearbyTrader();
    if (f) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(f.x - 2, GROUND_TOP - SH - 20, 50, 14);
      ctx.fillStyle = '#FFFF99';
      ctx.font = '10px monospace';
      ctx.fillText('[R] торг.', f.x, GROUND_TOP - SH - 9);
    }
  }
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
    const mobType = levelCfg().mobType;
    if (mobType === 'skeleton') {
      drawSkeleton(mob.x, mob.y - SH, mob.vx > 0, mob.alive, mob.walkFrame, alpha);
    } else if (mobType === 'husk') {
      drawHusk(mob.x, mob.y - SH, mob.vx > 0, mob.alive, mob.walkFrame, alpha);
    } else if (mobType === 'drowned') {
      drawDrowned(mob.x, mob.y - SH, mob.vx > 0, mob.alive, mob.walkFrame, alpha);
    } else if (mobType === 'pillager') {
      drawPillager(mob.x, mob.y - SH, mob.vx > 0, mob.alive, mob.walkFrame, alpha);
    } else if (mobType === 'ice_zombie') {
      drawIceZombie(mob.x, mob.y - SH, mob.vx > 0, mob.alive, mob.walkFrame, alpha);
    } else if (mobType === 'enderman') {
      drawEnderman(mob.x, mob.y - SH, mob.vx > 0, mob.alive, mob.walkFrame, alpha);
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
  if (isDesert()) { drawGroundDesert(); return; }
  if (isPyramid())    { drawGroundPyramid(); return; }
  if (isOutpost())    { drawGroundOutpost(); return; }
  if (isDarkForest()) { drawGroundDarkForest(); return; }
  if (isMansion())    { drawGroundMansion(); return; }
  if (isSwamp())      { drawGroundSwamp(); return; }
  if (isUnderwater()) { drawGroundUnderwater(); return; }
  if (isIce())        { drawGroundIce(); return; }
  if (isEnd())        { drawGroundEnd(); return; }
  if (isEndCastle())  { drawGroundEndCastle(); return; }
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

function drawGroundDesert() {
  ctx.fillStyle = '#D4B870';
  ctx.fillRect(0, GROUND_TOP, W, 12);
  ctx.fillStyle = '#C49050';
  ctx.fillRect(0, GROUND_TOP + 12, W, H - GROUND_TOP - 12);
  ctx.fillStyle = '#B88840';
  for (let bx = 0; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, 5);
    ctx.fillRect(bx, GROUND_TOP, 1, 12);
  }
}

function drawGroundPyramid() {
  ctx.fillStyle = '#D4B060';
  ctx.fillRect(0, GROUND_TOP, W, 12);
  ctx.fillStyle = '#B88C3A';
  ctx.fillRect(0, GROUND_TOP + 12, W, H - GROUND_TOP - 12);
  ctx.fillStyle = '#9A7228';
  for (let bx = 0; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, 5);
    ctx.fillRect(bx, GROUND_TOP, 2, 12);
  }
}

function drawPlatform(p) {
  if (isMine()) { drawPlatformMine(p); return; }
  if (isForest()) { drawPlatformBranch(p); return; }
  if (isNether()) { drawPlatformNether(p); return; }
  if (isVillage()) { drawPlatformVillage(p); return; }
  if (isDesert()) { drawPlatformDesert(p); return; }
  if (isPyramid())    { drawPlatformPyramid(p); return; }
  if (isOutpost())    { drawPlatformOutpost(p); return; }
  if (isDarkForest()) { drawPlatformDarkForest(p); return; }
  if (isMansion())    { drawPlatformMansion(p); return; }
  if (isSwamp())      { drawPlatformSwamp(p); return; }
  if (isUnderwater()) { drawPlatformUnderwater(p); return; }
  if (isIce())        { drawPlatformIce(p); return; }
  if (isEnd())        { drawPlatformEnd(p); return; }
  if (isEndCastle())  { drawPlatformEndCastle(p); return; }
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

function isDesert()  { return levelCfg().theme === 'desert'; }
function isPyramid() { return levelCfg().theme === 'pyramid'; }
function isOutpost()    { return levelCfg().theme === 'outpost'; }
function isDarkForest() { return levelCfg().theme === 'dark_forest'; }
function isMansion()    { return levelCfg().theme === 'mansion'; }
function isSwamp()      { return levelCfg().theme === 'swamp'; }
function isUnderwater() { return levelCfg().theme === 'underwater'; }
function isIce()       { return levelCfg().theme === 'ice'; }
function isEnd()       { return levelCfg().theme === 'end'; }
function isEndCastle() { return levelCfg().theme === 'end_castle'; }
function isNight()      { return levelCfg().theme === 'night'; }
function isVillage() { return levelCfg().hasVillagers; }
function isMine()    { return levelCfg().theme === 'mine'; }
function isForest()  { return levelCfg().theme === 'forest'; }
function isNether()  { return levelCfg().theme === 'nether'; }

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

  for (const ore of EMERALD_ORE_BLOCKS) {
    ctx.fillStyle = '#485048';
    ctx.fillRect(ore.x, ore.y, 20, 20);
    ctx.fillStyle = '#5C6458';
    ctx.fillRect(ore.x, ore.y, 20, 2);
    ctx.fillRect(ore.x, ore.y, 2, 20);
    ctx.fillStyle = '#17DD62';
    ctx.fillRect(ore.x + 4,  ore.y + 3,  4, 6);
    ctx.fillRect(ore.x + 12, ore.y + 5,  4, 5);
    ctx.fillRect(ore.x + 5,  ore.y + 12, 3, 5);
    ctx.fillRect(ore.x + 13, ore.y + 11, 4, 5);
    ctx.fillStyle = '#5DFFAA';
    ctx.fillRect(ore.x + 5,  ore.y + 4,  2, 2);
    ctx.fillRect(ore.x + 13, ore.y + 6,  2, 1);
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

function drawPlatformDesert(p) {
  const platH = 24;
  ctx.fillStyle = '#C4A458';
  ctx.fillRect(p.x, p.y, p.w, platH);
  ctx.fillStyle = '#D8BC6C';
  ctx.fillRect(p.x, p.y, p.w, 8);
  ctx.fillStyle = '#A88840';
  for (let by = p.y + 8; by < p.y + platH; by += 8) {
    ctx.fillRect(p.x, by, p.w, 1);
  }
  ctx.fillStyle = '#B89448';
  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
    ctx.fillRect(bx, p.y, 2, platH);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 4);
}

function drawPlatformPyramid(p) {
  const platH = 24;
  // Limestone blocks — lighter top face, darker sides
  ctx.fillStyle = '#C8A84A';
  ctx.fillRect(p.x, p.y, p.w, platH);
  ctx.fillStyle = '#DEC06A';
  ctx.fillRect(p.x, p.y, p.w, 7);
  ctx.fillStyle = '#8A6820';
  for (let by = p.y + 8; by < p.y + platH; by += 8) {
    ctx.fillRect(p.x, by, p.w, 1);
  }
  ctx.fillStyle = '#A07C30';
  for (let bx = p.x; bx < p.x + p.w; bx += 20) {
    ctx.fillRect(bx, p.y, 2, platH);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 4);
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

  // Roof (stepped cobblestone) — narrow at top, wide at bottom
  ctx.fillStyle = '#888888';
  const steps = 4;
  const stepH = Math.ceil(h.rh / steps);
  for (let s = 0; s < steps; s++) {
    const stepW = Math.round(ww * (s + 1) / steps);
    const rx = wx + Math.round((ww - stepW) / 2);
    const ry = wy - h.rh + s * stepH;
    ctx.fillRect(rx, ry, stepW, stepH + 1);
  }
  // Highlight on the top (narrowest) step
  ctx.fillStyle = '#AAAAAA';
  const topW = Math.round(ww / steps);
  ctx.fillRect(wx + Math.round((ww - topW) / 2), wy - h.rh, topW, 3);

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

function drawCactus(bx) {
  const u = 8;
  const tx = bx - Math.round(u / 2);
  const h  = 60;
  const armY = 30;
  const armH = 20;
  const armW = 18;
  ctx.fillStyle = '#3A7A20';
  // Left arm: vertical goes UP, horizontal connector at base
  ctx.fillRect(tx - armW, GROUND_TOP - armY - armH, u, armH);
  ctx.fillRect(tx - armW, GROUND_TOP - armY,        armW, u);
  // Right arm: vertical goes UP at outer end, horizontal connector at base
  ctx.fillRect(tx + armW, GROUND_TOP - armY - armH, u, armH);
  ctx.fillRect(tx + u,    GROUND_TOP - armY,        armW, u);
  // Trunk (drawn over arm bases to clean up joints)
  ctx.fillRect(tx, GROUND_TOP - h, u, h);
  ctx.fillStyle = '#2A5A14';
  ctx.fillRect(tx + 5,        GROUND_TOP - h,           3, h);
  ctx.fillRect(tx - armW + 5, GROUND_TOP - armY - armH, 3, armH);
  ctx.fillRect(tx + armW + 5, GROUND_TOP - armY - armH, 3, armH);
}

function drawBackgroundDesert() {
  ctx.fillStyle = desertGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  // Hot sun (upper right, large with halo)
  ctx.fillStyle = '#FFEE60';
  ctx.fillRect(W - 104, 57, 52, 52);
  ctx.fillStyle = '#FFF8A0';
  ctx.fillRect(W - 96, 49, 36, 8);
  ctx.fillRect(W - 96, 109, 36, 8);
  ctx.fillRect(W - 112, 65, 8, 36);
  ctx.fillRect(W - 52,  65, 8, 36);

  // Far dunes
  ctx.fillStyle = '#B89050';
  const farDunes = [
    { cx: 90,  w: 220, h: 40 },
    { cx: 290, w: 180, h: 30 },
    { cx: 470, w: 250, h: 48 },
    { cx: 690, w: 200, h: 36 },
  ];
  for (const d of farDunes) {
    for (let s = 0; s < 5; s++) {
      const t  = (s + 1) / 5;
      const dw = Math.round(d.w * t);
      const dy = Math.round(d.h * (1 - t));
      ctx.fillRect(d.cx - Math.round(dw / 2), GROUND_TOP - d.h + dy, dw, d.h - dy + 2);
    }
  }

  // Near dunes (lighter)
  ctx.fillStyle = '#C8A060';
  const nearDunes = [
    { cx: 175, w: 160, h: 28 },
    { cx: 555, w: 190, h: 36 },
    { cx: 770, w: 120, h: 22 },
  ];
  for (const d of nearDunes) {
    for (let s = 0; s < 4; s++) {
      const t  = (s + 1) / 4;
      const dw = Math.round(d.w * t);
      const dy = Math.round(d.h * (1 - t));
      ctx.fillRect(d.cx - Math.round(dw / 2), GROUND_TOP - d.h + dy, dw, d.h - dy + 2);
    }
  }

  // Background cacti
  for (const c of DESERT_CACTI) drawCactus(c.x);
}

function drawEgyptPyramid(cx, baseW, steps) {
  const stepH = 9;
  const totalH = steps * stepH;
  const stepW = baseW / steps;
  for (let s = 0; s < steps; s++) {
    const w = Math.round(stepW * (s + 1));
    const y = GROUND_TOP - totalH + s * stepH;
    const x = cx - Math.round(w / 2);
    const half = Math.floor(w / 2);
    // Sun is upper-right → left half in shadow, right half lit
    ctx.fillStyle = '#7A5A18';
    ctx.fillRect(x, y, half, stepH);
    ctx.fillStyle = '#C89A3A';
    ctx.fillRect(x + half, y, w - half, stepH);
    ctx.fillStyle = '#A07828';
    ctx.fillRect(x, y, w, 2);
  }
}

function drawBackgroundPyramid() {
  ctx.fillStyle = pyramidGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  // Blazing Egyptian sun (upper right)
  ctx.fillStyle = '#FFD020';
  ctx.fillRect(W - 110, 44, 60, 60);
  ctx.fillStyle = '#FFE860';
  ctx.fillRect(W - 98, 28, 36, 10);
  ctx.fillRect(W - 98, 114, 36, 10);
  ctx.fillRect(W - 126, 60, 10, 28);
  ctx.fillRect(W - 46,  60, 10, 28);
  ctx.fillRect(W - 118, 40, 12, 12);
  ctx.fillRect(W - 46,  40, 12, 12);
  ctx.fillRect(W - 118, 100, 12, 12);
  ctx.fillRect(W - 46,  100, 12, 12);

  // Sand haze near horizon
  ctx.fillStyle = 'rgba(220,180,60,0.18)';
  ctx.fillRect(0, GROUND_TOP - 30, W, 30);

  // Far small pyramid (centre background)
  drawEgyptPyramid(390, 90, 9);

  // Medium pyramid (left)
  drawEgyptPyramid(165, 150, 14);

  // Large pyramid (right)
  drawEgyptPyramid(610, 210, 20);
}

function drawOutpostTree(tx) {
  // Dark spruce silhouette
  ctx.fillStyle = '#1A2C1A';
  ctx.fillRect(tx - 2,  GROUND_TOP - 130, 4, 130); // trunk
  ctx.fillStyle = '#223022';
  // Three triangular layers (bottom-up, getting narrower)
  ctx.fillRect(tx - 22, GROUND_TOP - 80,  44, 45);
  ctx.fillRect(tx - 16, GROUND_TOP - 115, 32, 40);
  ctx.fillRect(tx - 10, GROUND_TOP - 142, 20, 32);
  ctx.fillRect(tx - 5,  GROUND_TOP - 158, 10, 20);
}

function drawPillagerTower(cx) {
  const tw = 56;  // tower body width
  const tx = cx - Math.round(tw / 2);
  const th = 210; // full height from ground to top
  const ty = GROUND_TOP - th;

  // Main tower body — dark oak logs
  ctx.fillStyle = '#1E1008';
  ctx.fillRect(tx, ty, tw, th);

  // Horizontal log bands
  ctx.fillStyle = '#2E1A0C';
  for (let ly = ty; ly < GROUND_TOP; ly += 14) {
    ctx.fillRect(tx, ly, tw, 5);
  }

  // Vertical log dividers
  ctx.fillStyle = '#140C04';
  for (let lx = tx; lx <= tx + tw; lx += 14) {
    ctx.fillRect(lx, ty, 2, th);
  }

  // Arrow slits (two rows)
  ctx.fillStyle = '#060402';
  ctx.fillRect(tx + 10, ty + 50, 6, 18);
  ctx.fillRect(tx + 38, ty + 50, 6, 18);
  ctx.fillRect(tx + 10, ty + 110, 6, 18);
  ctx.fillRect(tx + 38, ty + 110, 6, 18);

  // Top platform overhang
  ctx.fillStyle = '#2A1408';
  ctx.fillRect(tx - 10, ty + 10, tw + 20, 12);
  ctx.fillStyle = '#140C04';
  for (let lx = tx - 10; lx <= tx + tw + 10; lx += 12) {
    ctx.fillRect(lx, ty + 10, 2, 12);
  }

  // Fence posts along top
  ctx.fillStyle = '#1E1008';
  for (let lx = tx - 8; lx <= tx + tw + 4; lx += 8) {
    ctx.fillRect(lx, ty, 4, 10);
  }

  // Banner hanging below overhang (left side)
  ctx.fillStyle = '#881414';
  ctx.fillRect(tx + 8, ty + 22, 14, 28);
  ctx.fillStyle = '#5A0C0C';
  ctx.fillRect(tx + 10, ty + 28, 10, 4);
  ctx.fillRect(tx + 10, ty + 36, 10, 4);
  // Banner pole
  ctx.fillStyle = '#7A5028';
  ctx.fillRect(tx + 7, ty + 14, 2, 36);

  // Second banner (right side)
  ctx.fillStyle = '#881414';
  ctx.fillRect(tx + tw - 22, ty + 22, 14, 28);
  ctx.fillStyle = '#5A0C0C';
  ctx.fillRect(tx + tw - 20, ty + 28, 10, 4);
  ctx.fillRect(tx + tw - 20, ty + 36, 10, 4);
  ctx.fillStyle = '#7A5028';
  ctx.fillRect(tx + tw - 9, ty + 14, 2, 36);
}

function drawBackgroundOutpost() {
  ctx.fillStyle = outpostGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  // Heavy overcast clouds
  ctx.fillStyle = 'rgba(100,120,140,0.5)';
  ctx.fillRect(0, 0, W, 70);
  ctx.fillStyle = 'rgba(90,110,130,0.4)';
  ctx.fillRect(30,  20, 220, 60);
  ctx.fillRect(330, 10, 240, 55);
  ctx.fillRect(620, 25, 200, 50);
  ctx.fillStyle = 'rgba(70,90,110,0.35)';
  ctx.fillRect(150, 40, 180, 45);
  ctx.fillRect(510, 35, 150, 40);

  // Far spruce trees (left side)
  drawOutpostTree(60);
  drawOutpostTree(140);
  drawOutpostTree(200);

  // Pillager outpost tower (centre-right background)
  drawPillagerTower(500);

  // Far spruce trees (right side)
  drawOutpostTree(660);
  drawOutpostTree(730);
}

function drawGroundOutpost() {
  // Dark coarse dirt / dark grass
  ctx.fillStyle = '#2A3A20';
  ctx.fillRect(0, GROUND_TOP, W, 12);
  ctx.fillStyle = '#1E2A14';
  ctx.fillRect(0, GROUND_TOP + 12, W, H - GROUND_TOP - 12);
  ctx.fillStyle = '#223018';
  for (let bx = 0; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, 5);
    ctx.fillRect(bx, GROUND_TOP, 1, 12);
  }
}

function drawPlatformOutpost(p) {
  const platH = 24;
  // Dark oak planks
  ctx.fillStyle = '#3A2010';
  ctx.fillRect(p.x, p.y, p.w, platH);
  ctx.fillStyle = '#4A2C18';
  ctx.fillRect(p.x, p.y, p.w, 7);
  ctx.fillStyle = '#241408';
  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
    ctx.fillRect(bx, p.y, 2, platH);
  }
  ctx.fillStyle = '#5A3820';
  for (let bx = p.x + 3; bx < p.x + p.w; bx += 16) {
    ctx.fillRect(bx, p.y + 1, 10, 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 4);
}

function drawBackgroundDarkForest() {
  ctx.fillStyle = darkForestGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  // A handful of stars in the gaps between canopy
  ctx.fillStyle = '#FFFFFF';
  for (const s of STARS) {
    if (s.x > 155 && s.x < 195) continue;
    if (s.x > 340 && s.x < 385) continue;
    if (s.x > 530 && s.x < 560) continue;
    if (s.y > 120) continue;
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }

  // Dim pale moon (partially obscured by canopy overhang)
  ctx.fillStyle = '#8A8870';
  ctx.fillRect(340, 18, 26, 26);
  ctx.fillStyle = '#6A6854';
  ctx.fillRect(346, 22, 8, 8);
  ctx.fillRect(338, 28, 6, 6);
  // Canopy overlap hiding lower half of moon
  ctx.fillStyle = '#060C04';
  ctx.fillRect(330, 34, 46, 12);

  // Background canopy silhouettes — massive dark oak crown shapes
  ctx.fillStyle = '#040A02';
  // Left-centre gap filler
  ctx.fillRect(110,  0, 130, 100);
  ctx.fillRect(118, 95, 114,  35);
  // Centre gap filler
  ctx.fillRect(305,  0, 140,  95);
  ctx.fillRect(315, 90, 120,  30);
  // Right-centre gap filler
  ctx.fillRect(480,  0, 130,  90);
  ctx.fillRect(490, 85, 110,  28);

  // Large brown mushroom (left mid-ground)
  ctx.fillStyle = '#3A1E0C';
  ctx.fillRect(244, GROUND_TOP - 68, 10, 68); // stem
  ctx.fillStyle = '#6B3010';
  ctx.fillRect(218, GROUND_TOP - 86, 62, 22); // cap bottom
  ctx.fillRect(226, GROUND_TOP - 104, 46, 20); // cap mid
  ctx.fillRect(234, GROUND_TOP - 116, 30, 14); // cap top
  ctx.fillStyle = '#B07850';
  ctx.fillRect(222, GROUND_TOP - 86, 8, 7);   // spore dots
  ctx.fillRect(238, GROUND_TOP - 90, 7, 7);
  ctx.fillRect(255, GROUND_TOP - 86, 8, 7);
  ctx.fillRect(266, GROUND_TOP - 86, 8, 7);

  // Smaller red mushroom (right mid-ground)
  ctx.fillStyle = '#3A1A0A';
  ctx.fillRect(520, GROUND_TOP - 48, 8, 48); // stem
  ctx.fillStyle = '#8A1A10';
  ctx.fillRect(500, GROUND_TOP - 64, 48, 18); // cap
  ctx.fillRect(508, GROUND_TOP - 76, 32, 14); // cap upper
  ctx.fillStyle = '#E8D8A0';
  ctx.fillRect(504, GROUND_TOP - 64, 6, 6);
  ctx.fillRect(519, GROUND_TOP - 68, 5, 5);
  ctx.fillRect(534, GROUND_TOP - 64, 6, 6);
}

function drawDarkForestTrees() {
  for (const t of DARK_FOREST_TRUNKS) {
    const cx = t.x + Math.floor(t.w / 2);

    // Massive canopy block at the top (covers ~top 35% of sky)
    ctx.fillStyle = '#060E04';
    ctx.fillRect(cx - 78, 0,   156, 100); // main canopy mass
    ctx.fillRect(cx - 60, 95,  120,  32); // lower canopy fringe
    ctx.fillRect(cx - 42, 122,  84,  18); // narrower base fringe
    ctx.fillStyle = '#040A02';
    ctx.fillRect(cx - 60, 0,   120,  50); // denser upper core

    // Thick trunk from canopy base to ground
    ctx.fillStyle = '#120A02';
    ctx.fillRect(t.x, 0, t.w, GROUND_TOP);
    ctx.fillStyle = '#201408';
    ctx.fillRect(t.x + 3, 0, Math.floor(t.w * 0.28), GROUND_TOP);
    ctx.fillStyle = '#0A0602';
    for (let ty = 24; ty < GROUND_TOP; ty += 26) {
      ctx.fillRect(t.x, ty, t.w, 2);
    }
    ctx.fillRect(t.x + t.w - 3, 0, 3, GROUND_TOP);
  }
}

function drawGroundDarkForest() {
  // Dark podzol — brown-gray surface
  ctx.fillStyle = '#2A1A0C';
  ctx.fillRect(0, GROUND_TOP, W, 12);
  ctx.fillStyle = '#1A100A';
  ctx.fillRect(0, GROUND_TOP + 12, W, H - GROUND_TOP - 12);
  ctx.fillStyle = '#341E10';
  for (let bx = 0; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, 4);
  }
  ctx.fillStyle = '#1E1208';
  for (let bx = 8; bx < W; bx += 40) {
    ctx.fillRect(bx, GROUND_TOP + 4, 6, 8);
  }
}

function drawPlatformDarkForest(p) {
  const platH = 24;
  // Dark oak planks — very dark brown
  ctx.fillStyle = '#2C1A0A';
  ctx.fillRect(p.x, p.y, p.w, platH);
  ctx.fillStyle = '#3C2214';
  ctx.fillRect(p.x, p.y, p.w, 7);
  ctx.fillStyle = '#1A1006';
  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
    ctx.fillRect(bx, p.y, 2, platH);
  }
  ctx.fillStyle = '#4A2C18';
  for (let bx = p.x + 3; bx < p.x + p.w; bx += 16) {
    ctx.fillRect(bx, p.y + 1, 10, 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 4);
}

function fillPrismarineBricks(x, y, w, h) {
  ctx.fillStyle = '#3A8878';
  ctx.fillRect(x, y, w, h);
  // Vertical mortar (alternating row offsets)
  ctx.fillStyle = '#2A6860';
  for (let row = 0; row * 12 < h; row++) {
    const xoff = (row % 2) * 10;
    for (let tx = x + xoff; tx < x + w; tx += 20) ctx.fillRect(tx, y + row * 12, 2, 12);
  }
  // Horizontal mortar drawn on top of verticals
  for (let ty = y; ty < y + h; ty += 12) ctx.fillRect(x, ty, w, 2);
  // Aqua highlight per brick
  ctx.fillStyle = '#50A090';
  for (let row = 0; row * 12 < h; row++) {
    const xoff = (row % 2) * 10;
    for (let tx = x + xoff + 3; tx < x + w - 2; tx += 20) ctx.fillRect(tx, y + row * 12 + 3, 10, 4);
  }
}

function drawSeaLantern(cx, cy, r) {
  ctx.fillStyle = 'rgba(160,230,200,0.35)';
  ctx.fillRect(cx - r - 3, cy - r - 3, (r + 3) * 2, (r + 3) * 2);
  ctx.fillStyle = '#90C8B0';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = '#C8ECD8';
  ctx.fillRect(cx - r + 2, cy - r + 2, r * 2 - 4, r * 2 - 4);
  ctx.fillStyle = '#E8F8F0';
  ctx.fillRect(cx - 2, cy - 2, 4, 4);
}

function drawKelp(tx) {
  const h = 50 + (tx * 7 + 33) % 45;
  ctx.fillStyle = '#1A6020';
  ctx.fillRect(tx - 2, GROUND_TOP - h, 5, h);
  ctx.fillStyle = '#286830';
  ctx.fillRect(tx - 1, GROUND_TOP - h, 2, h);
  ctx.fillStyle = '#1E7024';
  let alt = 0;
  for (let ky = GROUND_TOP - h + 8; ky < GROUND_TOP - 6; ky += 12) {
    ctx.fillRect(alt ? tx + 3 : tx - 13, ky, 12, 5);
    alt = 1 - alt;
  }
}

function drawOceanMonument() {
  const mc = 400;

  // Wings
  fillPrismarineBricks(118, GROUND_TOP - 72, 152, 72);
  fillPrismarineBricks(530, GROUND_TOP - 72, 152, 72);
  ctx.fillStyle = '#1E5048';
  ctx.fillRect(118, GROUND_TOP - 72, 152, 5);
  ctx.fillRect(530, GROUND_TOP - 72, 152, 5);
  drawSeaLantern(194, GROUND_TOP - 76, 7);
  drawSeaLantern(606, GROUND_TOP - 76, 7);

  // Main body
  fillPrismarineBricks(270, GROUND_TOP - 162, 260, 162);
  ctx.fillStyle = '#1E5048';
  ctx.fillRect(270, GROUND_TOP - 162, 260, 6);
  ctx.fillRect(270, GROUND_TOP - 162, 8, 162);
  ctx.fillRect(522, GROUND_TOP - 162, 8, 162);
  drawSeaLantern(296, GROUND_TOP - 130, 8);
  drawSeaLantern(504, GROUND_TOP - 130, 8);
  drawSeaLantern(mc,  GROUND_TOP -  58, 8);
  // Central entrance
  ctx.fillStyle = '#061820';
  ctx.fillRect(mc - 22, GROUND_TOP - 112, 44, 112);
  ctx.fillStyle = 'rgba(6,40,60,0.6)';
  ctx.fillRect(mc - 20, GROUND_TOP - 110, 40, 108);

  // Mid step
  fillPrismarineBricks(304, GROUND_TOP - 207, 192, 45);
  ctx.fillStyle = '#1E5048';
  ctx.fillRect(304, GROUND_TOP - 207, 192, 5);
  ctx.fillRect(304, GROUND_TOP - 207, 6, 45);
  ctx.fillRect(490, GROUND_TOP - 207, 6, 45);
  drawSeaLantern(336,  GROUND_TOP - 184, 7);
  drawSeaLantern(464,  GROUND_TOP - 184, 7);
  drawSeaLantern(mc,   GROUND_TOP - 184, 7);

  // Upper step
  fillPrismarineBricks(345, GROUND_TOP - 242, 110, 35);
  ctx.fillStyle = '#1E5048';
  ctx.fillRect(345, GROUND_TOP - 242, 110, 5);
  drawSeaLantern(mc, GROUND_TOP - 224, 6);

  // Spire base
  ctx.fillStyle = '#2A7068';
  ctx.fillRect(mc - 22, GROUND_TOP - 272, 44, 30);
  ctx.fillStyle = '#1E5048';
  ctx.fillRect(mc - 22, GROUND_TOP - 272, 44, 4);
  // Spire tip
  ctx.fillStyle = '#3A8878';
  ctx.fillRect(mc - 10, GROUND_TOP - 292, 20, 24);
  ctx.fillStyle = '#1E5048';
  ctx.fillRect(mc - 10, GROUND_TOP - 292, 20, 4);
  // Beacon lantern at very top
  drawSeaLantern(mc, GROUND_TOP - 300, 9);
}

function drawBackgroundUnderwater() {
  ctx.fillStyle = underwaterGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  // Light rays filtering from above
  ctx.fillStyle = 'rgba(60,160,180,0.05)';
  ctx.fillRect(168, 0, 42, GROUND_TOP);
  ctx.fillRect(355, 0, 30, GROUND_TOP);
  ctx.fillRect(558, 0, 36, GROUND_TOP);
  ctx.fillRect(700, 0, 24, GROUND_TOP);

  // Background kelp
  for (const kx of [28, 88, 208, 310, 482, 598, 708, 768]) drawKelp(kx);

  // Bubbles
  ctx.fillStyle = 'rgba(160,220,240,0.55)';
  for (const b of BUBBLES) ctx.fillRect(b.x, b.y, b.s, b.s);

  // Ocean monument
  drawOceanMonument();
}

function drawGroundUnderwater() {
  // Sandy ocean floor with stone/prismarine patches
  ctx.fillStyle = '#4A5840';
  ctx.fillRect(0, GROUND_TOP, W, 12);
  ctx.fillStyle = '#383C2C';
  ctx.fillRect(0, GROUND_TOP + 12, W, H - GROUND_TOP - 12);
  ctx.fillStyle = '#565C48';
  for (let bx = 0; bx < W; bx += BLOCK) ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, 5);
  // Prismarine patches near monument base
  ctx.fillStyle = '#2A6860';
  for (let bx = 20; bx < W; bx += 60) ctx.fillRect(bx, GROUND_TOP + 4, 22, 6);
}

function drawPlatformUnderwater(p) {
  const platH = 20;
  // Prismarine bricks
  ctx.fillStyle = '#3A8878';
  ctx.fillRect(p.x, p.y, p.w, platH);
  ctx.fillStyle = '#2A6860';
  for (let ty = p.y; ty < p.y + platH; ty += 10) ctx.fillRect(p.x, ty, p.w, 2);
  for (let row = 0; row * 10 < platH; row++) {
    const xoff = (row % 2) * 10;
    for (let bx = p.x + xoff; bx < p.x + p.w; bx += 20) ctx.fillRect(bx, p.y + row * 10, 2, 10);
  }
  ctx.fillStyle = '#50A090';
  ctx.fillRect(p.x, p.y, p.w, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 3);
}

function drawSwampOak(tx, trunkH) {
  const cy = GROUND_TOP - trunkH;
  const cw = 86;
  // Trunk — thick, dark brown
  ctx.fillStyle = '#2C1E0C';
  ctx.fillRect(tx - 7, cy, 14, trunkH);
  ctx.fillStyle = '#3C2A12';
  ctx.fillRect(tx - 5, cy, 6, trunkH);
  ctx.fillStyle = '#1E1408';
  ctx.fillRect(tx + 5, cy, 2, trunkH);
  // Wide flat canopy (3 layers)
  ctx.fillStyle = '#162408';
  ctx.fillRect(tx - cw,      cy - 38, cw * 2, 48);
  ctx.fillRect(tx - cw + 14, cy - 58, cw * 2 - 28, 24);
  ctx.fillRect(tx - cw + 28, cy - 70, cw * 2 - 56, 16);
  // Drooping canopy edges
  ctx.fillRect(tx - cw,      cy + 6, 26, 14);
  ctx.fillRect(tx + cw - 26, cy + 6, 26, 14);
  ctx.fillRect(tx - 14,      cy + 8, 28, 12);
  // Dark inner shade
  ctx.fillStyle = '#0E1804';
  ctx.fillRect(tx - cw + 10, cy - 26, cw * 2 - 20, 12);
  // Hanging vines
  ctx.fillStyle = '#1C3010';
  for (let vi = -cw + 14; vi < cw - 10; vi += 14) {
    const vl = 16 + (Math.abs(vi * 7 + 19) % 24);
    ctx.fillRect(tx + vi, cy + 18, 3, vl);
    ctx.fillStyle = '#142408';
    ctx.fillRect(tx + vi + 1, cy + 18, 1, vl);
    ctx.fillStyle = '#1C3010';
  }
}

function drawBackgroundSwamp() {
  ctx.fillStyle = swampGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  // A few dim stars at very top
  ctx.fillStyle = '#8AA080';
  for (const s of STARS) {
    if (s.y > 100) continue;
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }

  // Fog wisps layered from top
  ctx.fillStyle = 'rgba(20,40,28,0.22)';
  ctx.fillRect(0, GROUND_TOP - 300, W, 120);
  ctx.fillStyle = 'rgba(16,36,24,0.30)';
  ctx.fillRect(0, GROUND_TOP - 200, W, 130);

  // Murky swamp water — dark green-brown pool behind trees
  ctx.fillStyle = '#0C1A0E';
  ctx.fillRect(0, GROUND_TOP - 110, W, 110);
  ctx.fillStyle = '#081408';
  ctx.fillRect(0, GROUND_TOP - 90, W, 90);
  // Water surface shimmer
  ctx.fillStyle = '#163020';
  for (let wx = 10; wx < W; wx += 28) {
    ctx.fillRect(wx,      GROUND_TOP - 108, 18, 3);
    ctx.fillRect(wx + 10, GROUND_TOP - 98,  14, 2);
  }

  // Lily pads
  ctx.fillStyle = '#284818';
  for (const lx of [48, 140, 234, 350, 455, 555, 658, 744]) {
    ctx.fillRect(lx,     GROUND_TOP - 98, 24, 8);
    ctx.fillRect(lx + 6, GROUND_TOP - 104, 12, 7);
  }
  // Small red flowers on two lily pads
  ctx.fillStyle = '#882020';
  ctx.fillRect(144, GROUND_TOP - 108, 4, 4);
  ctx.fillRect(458, GROUND_TOP - 108, 4, 4);

  // Distant center tree
  ctx.fillStyle = '#101C06';
  ctx.fillRect(388, GROUND_TOP - 112, 8, 112);
  ctx.fillRect(328, GROUND_TOP - 136, 120, 32);
  ctx.fillRect(344, GROUND_TOP - 158, 88,  26);

  // Four flanking gnarled oaks
  drawSwampOak(65,  144);
  drawSwampOak(186, 158);
  drawSwampOak(592, 152);
  drawSwampOak(720, 140);
}

function drawGroundSwamp() {
  // Muddy dark mossy green surface
  ctx.fillStyle = '#1E2C12';
  ctx.fillRect(0, GROUND_TOP, W, 12);
  ctx.fillStyle = '#141E0C';
  ctx.fillRect(0, GROUND_TOP + 12, W, H - GROUND_TOP - 12);
  ctx.fillStyle = '#263818';
  for (let bx = 0; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, 5);
  }
  // Dark mud patches
  ctx.fillStyle = '#181408';
  for (let bx = 14; bx < W; bx += 52) ctx.fillRect(bx, GROUND_TOP + 4, 18, 6);
  ctx.fillStyle = '#100E06';
  for (let bx = 32; bx < W; bx += 48) ctx.fillRect(bx, GROUND_TOP + 8, 12, 4);
}

function drawPlatformSwamp(p) {
  const platH = 22;
  // Gnarled dark oak — dark reddish-brown
  ctx.fillStyle = '#3A2210';
  ctx.fillRect(p.x, p.y, p.w, platH);
  ctx.fillStyle = '#4A2E16';
  ctx.fillRect(p.x, p.y, p.w, 5);
  ctx.fillStyle = '#2A1808';
  for (let bx = p.x; bx < p.x + p.w; bx += 14) ctx.fillRect(bx, p.y, 2, platH);
  ctx.fillStyle = '#563A1E';
  for (let bx = p.x + 3; bx < p.x + p.w; bx += 14) ctx.fillRect(bx, p.y + 1, 8, 2);
  // Hanging moss at bottom
  ctx.fillStyle = '#1E3012';
  for (let bx = p.x + 4; bx < p.x + p.w; bx += 10) ctx.fillRect(bx, p.y + platH, 3, 5);
}

function drawMansionWindow(wx, wy) {
  const ww = 22, wh = 26;
  ctx.fillStyle = 'rgba(255,150,30,0.25)';
  ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
  ctx.fillStyle = '#E08010';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.fillStyle = '#FFC060';
  ctx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
  ctx.fillStyle = '#180C04';
  ctx.fillRect(wx, wy, ww, 2);
  ctx.fillRect(wx, wy + wh - 2, ww, 2);
  ctx.fillRect(wx, wy, 2, wh);
  ctx.fillRect(wx + ww - 2, wy, 2, wh);
  ctx.fillRect(wx + (ww >> 1) - 1, wy, 2, wh);
  ctx.fillRect(wx, wy + (wh >> 1) - 1, ww, 2);
}

function drawMansionTree(tx) {
  ctx.fillStyle = '#100A04';
  ctx.fillRect(tx - 5, GROUND_TOP - 120, 10, 120);
  ctx.fillStyle = '#1C1008';
  ctx.fillRect(tx - 3, GROUND_TOP - 120, 4, 120);
  ctx.fillStyle = '#0A1004';
  ctx.fillRect(tx - 38, GROUND_TOP - 162, 76, 52);
  ctx.fillRect(tx - 28, GROUND_TOP - 188, 56, 30);
  ctx.fillRect(tx - 18, GROUND_TOP - 202, 36, 18);
  ctx.fillStyle = '#0E1608';
  ctx.fillRect(tx - 32, GROUND_TOP - 148, 20, 18);
}

function drawMansion() {
  const mx = 262, mw = 276, mc = mx + (mw >> 1); // mc = 400

  // Foundation — stone bricks
  const fndY = GROUND_TOP - 20;
  ctx.fillStyle = '#585858';
  ctx.fillRect(mx, fndY, mw, 20);
  ctx.fillStyle = '#686868';
  for (let bx = mx; bx < mx + mw; bx += 22) ctx.fillRect(bx, fndY, 21, 9);
  ctx.fillStyle = '#484848';
  for (let bx = mx + 11; bx < mx + mw; bx += 22) ctx.fillRect(bx, fndY + 10, 21, 9);
  ctx.fillStyle = '#383838';
  ctx.fillRect(mx, fndY, mw, 1);

  // Floor 1
  const f1H = 62, f1Y = fndY - f1H;
  ctx.fillStyle = '#281408';
  ctx.fillRect(mx, f1Y, mw, f1H);
  ctx.fillStyle = '#180C04';
  for (let lx = mx; lx <= mx + mw; lx += 20) ctx.fillRect(lx, f1Y, 3, f1H);
  ctx.fillRect(mx, f1Y, mw, 3);
  ctx.fillRect(mx, f1Y + f1H - 3, mw, 3);
  drawMansionWindow(mx + 22, f1Y + 16);
  drawMansionWindow(mx + mw - 44, f1Y + 16);
  // Door
  ctx.fillStyle = '#1A0C04';
  ctx.fillRect(mc - 16, f1Y + 18, 32, 44);
  ctx.fillStyle = '#100802';
  ctx.fillRect(mc - 13, f1Y + 22, 11, 36);
  ctx.fillRect(mc + 2, f1Y + 22, 11, 36);
  ctx.fillStyle = '#C09030';
  ctx.fillRect(mc - 3, f1Y + 40, 5, 4);

  // Ledge floor 1→2
  const l12Y = f1Y - 10;
  ctx.fillStyle = '#2E1A0A';
  ctx.fillRect(mx - 12, l12Y, mw + 24, 10);
  ctx.fillStyle = '#1A0E04';
  for (let lx = mx - 12; lx < mx + mw + 12; lx += 14) ctx.fillRect(lx, l12Y, 2, 10);

  // Floor 2
  const f2H = 54, f2Y = l12Y - f2H;
  ctx.fillStyle = '#281408';
  ctx.fillRect(mx, f2Y, mw, f2H);
  ctx.fillStyle = '#180C04';
  for (let lx = mx; lx <= mx + mw; lx += 20) ctx.fillRect(lx, f2Y, 3, f2H);
  ctx.fillRect(mx, f2Y, mw, 3);
  ctx.fillRect(mx, f2Y + f2H - 3, mw, 3);
  drawMansionWindow(mx + 20, f2Y + 14);
  drawMansionWindow(mc - 11, f2Y + 14);
  drawMansionWindow(mx + mw - 42, f2Y + 14);

  // Ledge floor 2→3
  const l23Y = f2Y - 8;
  ctx.fillStyle = '#2E1A0A';
  ctx.fillRect(mx - 8, l23Y, mw + 16, 8);
  ctx.fillStyle = '#1A0E04';
  for (let lx = mx - 8; lx < mx + mw + 8; lx += 12) ctx.fillRect(lx, l23Y, 2, 8);

  // Floor 3 (attic — narrower)
  const f3W = mw - 54, f3X = mx + 27, f3H = 42, f3Y = l23Y - f3H;
  ctx.fillStyle = '#281408';
  ctx.fillRect(f3X, f3Y, f3W, f3H);
  ctx.fillStyle = '#180C04';
  for (let lx = f3X; lx <= f3X + f3W; lx += 20) ctx.fillRect(lx, f3Y, 3, f3H);
  ctx.fillRect(f3X, f3Y, f3W, 3);
  drawMansionWindow(mc - 11, f3Y + 8);

  // Gabled roof
  const roofH = 55, roofPeakY = f3Y - roofH;
  const roofHW = (f3W >> 1) + 20;
  ctx.fillStyle = '#1C0A04';
  for (let i = 0; i <= roofH; i++) {
    const hw = Math.round(roofHW * (roofH - i) / roofH);
    ctx.fillRect(mc - hw, f3Y - i, hw * 2, 2);
  }
  ctx.fillStyle = '#130702';
  for (let i = 6; i < roofH; i += 8) {
    const hw = Math.round(roofHW * (roofH - i) / roofH);
    ctx.fillRect(mc - hw, f3Y - i, hw * 2, 2);
  }
  ctx.fillStyle = '#3A1A08';
  ctx.fillRect(mc - 3, roofPeakY, 6, 8);

  // Chimneys
  ctx.fillStyle = '#484848';
  ctx.fillRect(mc - 52, roofPeakY - 22, 16, 30);
  ctx.fillStyle = '#585858';
  for (let cy = roofPeakY - 22; cy < roofPeakY + 8; cy += 8) ctx.fillRect(mc - 52, cy, 16, 3);
  ctx.fillStyle = '#303030';
  ctx.fillRect(mc - 54, roofPeakY - 22, 20, 5);
  ctx.fillStyle = '#484848';
  ctx.fillRect(mc + 36, roofPeakY - 18, 16, 26);
  ctx.fillStyle = '#585858';
  for (let cy = roofPeakY - 18; cy < roofPeakY + 8; cy += 8) ctx.fillRect(mc + 36, cy, 16, 3);
  ctx.fillStyle = '#303030';
  ctx.fillRect(mc + 34, roofPeakY - 18, 20, 5);

  // Ominous banners
  for (const bx of [mx + 6, mx + mw - 18]) {
    ctx.fillStyle = '#780808';
    ctx.fillRect(bx, f2Y - 32, 12, 28);
    ctx.fillStyle = '#4A0404';
    ctx.fillRect(bx + 2, f2Y - 28, 8, 4);
    ctx.fillRect(bx + 2, f2Y - 20, 8, 4);
    ctx.fillRect(bx + 2, f2Y - 12, 8, 4);
    ctx.fillStyle = '#7A5028';
    ctx.fillRect(bx - 1, f2Y - 40, 2, 40);
  }
}

function drawBackgroundMansion() {
  ctx.fillStyle = mansionGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  // A handful of stars (top only — mansion and trees block the rest)
  ctx.fillStyle = '#C8C8D8';
  for (const s of STARS) {
    if (s.y > 140) continue;
    if (s.x > 200 && s.x < 580) continue;
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }

  // Pale foggy moon (top-left)
  ctx.fillStyle = '#9090A8';
  ctx.fillRect(80, 20, 34, 34);
  ctx.fillStyle = '#707088';
  ctx.fillRect(86, 26, 10, 10);
  ctx.fillRect(78, 34, 8, 8);

  // Fog atmosphere — purple-gray haze at mid-horizon
  ctx.fillStyle = 'rgba(60,50,80,0.18)';
  ctx.fillRect(0, GROUND_TOP - 140, W, 140);
  ctx.fillStyle = 'rgba(60,50,80,0.10)';
  ctx.fillRect(0, GROUND_TOP - 240, W, 100);

  // Flanking dark oak trees
  drawMansionTree(58);
  drawMansionTree(148);
  drawMansionTree(650);
  drawMansionTree(742);

  // The mansion itself
  drawMansion();
}

function drawGroundMansion() {
  ctx.fillStyle = '#1A2010';
  ctx.fillRect(0, GROUND_TOP, W, 12);
  ctx.fillStyle = '#121508';
  ctx.fillRect(0, GROUND_TOP + 12, W, H - GROUND_TOP - 12);
  ctx.fillStyle = '#222C14';
  for (let bx = 0; bx < W; bx += BLOCK) ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, 4);
  // Stone cobblestone patches along mansion grounds
  ctx.fillStyle = '#404040';
  for (let bx = 8; bx < W; bx += 48) ctx.fillRect(bx, GROUND_TOP + 4, 18, 6);
  ctx.fillStyle = '#303030';
  for (let bx = 24; bx < W; bx += 56) ctx.fillRect(bx, GROUND_TOP + 8, 12, 4);
}

function drawPlatformMansion(p) {
  const platH = 24;
  ctx.fillStyle = '#2E1A0C';
  ctx.fillRect(p.x, p.y, p.w, platH);
  ctx.fillStyle = '#3E2414';
  ctx.fillRect(p.x, p.y, p.w, 6);
  ctx.fillStyle = '#1E1006';
  for (let bx = p.x; bx < p.x + p.w; bx += 18) ctx.fillRect(bx, p.y, 2, platH);
  ctx.fillStyle = '#4A2E18';
  for (let bx = p.x + 4; bx < p.x + p.w; bx += 18) ctx.fillRect(bx, p.y + 1, 10, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 4);
}

function drawIceSpike(tx, h, w) {
  // Tall narrow ice spike silhouette
  ctx.fillStyle = '#C8E0F0';
  ctx.beginPath();
  ctx.moveTo(tx - w / 2, GROUND_TOP);
  ctx.lineTo(tx, GROUND_TOP - h);
  ctx.lineTo(tx + w / 2, GROUND_TOP);
  ctx.fill();
  // Highlight edge
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.moveTo(tx - w / 2 + 2, GROUND_TOP);
  ctx.lineTo(tx - w / 4, GROUND_TOP - h + 10);
  ctx.lineTo(tx - w / 4 + 4, GROUND_TOP - h + 10);
  ctx.lineTo(tx + 4, GROUND_TOP);
  ctx.fill();
}

function drawBackgroundIce() {
  ctx.fillStyle = iceGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  // Distant snow-covered hills
  ctx.fillStyle = '#D8ECF4';
  ctx.fillRect(0,   GROUND_TOP - 80, 140, 80);
  ctx.fillRect(90,  GROUND_TOP - 110, 180, 110);
  ctx.fillRect(240, GROUND_TOP - 70,  140, 70);
  ctx.fillRect(340, GROUND_TOP - 120, 200, 120);
  ctx.fillRect(510, GROUND_TOP - 85,  160, 85);
  ctx.fillRect(640, GROUND_TOP - 100, 160, 100);
  // Rounded hill tops (arcs faked with stacked rects)
  ctx.fillStyle = '#E8F4F8';
  for (const [cx, r] of [[70,55],[180,72],[310,48],[440,78],[590,56],[720,64]]) {
    for (let dy = 0; dy < r; dy++) {
      const hw = Math.round(Math.sqrt(r * r - (r - dy) * (r - dy)));
      ctx.fillRect(cx - hw, GROUND_TOP - r * 2 + dy, hw * 2, 1);
    }
  }

  // Background ice spikes
  ctx.globalAlpha = 0.55;
  drawIceSpike(55,  130, 22);
  drawIceSpike(210, 170, 28);
  drawIceSpike(420, 145, 24);
  drawIceSpike(620, 160, 26);
  drawIceSpike(755, 120, 18);
  ctx.globalAlpha = 1;

  // Snowflakes
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  for (const f of SNOWFLAKES) ctx.fillRect(f.x, f.y, f.s, f.s);

  // Faint ground-level ice mist
  ctx.fillStyle = 'rgba(200,228,244,0.18)';
  ctx.fillRect(0, GROUND_TOP - 28, W, 28);
}

function drawGroundIce() {
  // Packed snow cap
  ctx.fillStyle = '#E8F4F8';
  ctx.fillRect(0, GROUND_TOP, W, 10);
  ctx.fillStyle = '#D0E8F2';
  for (let bx = 0; bx < W; bx += BLOCK) ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, 4);
  // Packed ice layer
  ctx.fillStyle = '#7AAECE';
  ctx.fillRect(0, GROUND_TOP + 10, W, H - GROUND_TOP - 10);
  ctx.fillStyle = '#6898BC';
  for (let bx = 0; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP + 10, BLOCK - 1, BLOCK - 1);
  }
  // Ice sheen highlights
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let bx = 4; bx < W; bx += BLOCK) ctx.fillRect(bx, GROUND_TOP + 11, 8, 3);
}

function drawPlatformIce(p) {
  const platH = 18;
  // Packed ice base
  ctx.fillStyle = '#88B8D8';
  ctx.fillRect(p.x, p.y, p.w, platH);
  // Ice crack lines (horizontal block seams)
  ctx.fillStyle = '#6898BC';
  for (let ty = p.y + 9; ty < p.y + platH; ty += 9) ctx.fillRect(p.x, ty, p.w, 1);
  // Vertical block seams
  ctx.fillStyle = '#6898BC';
  for (let bx = p.x + 18; bx < p.x + p.w; bx += 18) ctx.fillRect(bx, p.y, 1, platH);
  // Snow cap on top
  ctx.fillStyle = '#E8F4F8';
  ctx.fillRect(p.x, p.y, p.w, 4);
  // Sheen
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  for (let bx = p.x + 2; bx < p.x + p.w - 2; bx += 18) ctx.fillRect(bx, p.y + 4, 8, 2);
  // Shadow underside
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 3);
}

// ── The End ──────────────────────────────────────────────────────────────────

function drawEndCrystal(cx, cy) {
  // Light beam from sky down to crystal
  ctx.fillStyle = 'rgba(200, 80, 255, 0.18)';
  ctx.fillRect(cx - 2, 0, 4, cy);
  // Outer glass border (4 sides, translucent)
  ctx.fillStyle = 'rgba(190, 140, 255, 0.42)';
  ctx.fillRect(cx - 8, cy - 8, 16, 2);
  ctx.fillRect(cx - 8, cy + 6, 16, 2);
  ctx.fillRect(cx - 8, cy - 8, 2, 16);
  ctx.fillRect(cx + 6, cy - 8, 2, 16);
  // Inner glowing fire core
  ctx.fillStyle = '#FF1A1A';
  ctx.fillRect(cx - 4, cy - 4, 8, 8);
  ctx.fillStyle = '#FF7070';
  ctx.fillRect(cx - 2, cy - 2, 4, 4);
  ctx.fillStyle = '#FFBBBB';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
}

function drawBackgroundEnd() {
  ctx.fillStyle = endGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  // Distant floating End Stone island fragments
  ctx.fillStyle = '#AEAD78';
  ctx.fillRect(52,  GROUND_TOP - 205, 88, 16);
  ctx.fillRect(298, GROUND_TOP - 248, 66, 14);
  ctx.fillRect(548, GROUND_TOP - 188, 94, 16);
  ctx.fillStyle = '#8A8A54';  // underside shadow
  ctx.fillRect(52,  GROUND_TOP - 213, 88, 8);
  ctx.fillRect(298, GROUND_TOP - 256, 66, 8);
  ctx.fillRect(548, GROUND_TOP - 196, 94, 8);

  // Void particles
  for (const p of END_PARTICLES) {
    ctx.fillStyle = p.purple ? 'rgba(180, 80, 255, 0.75)' : 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(p.x, p.y, p.s, p.s);
  }

  // Obsidian pillars with End crystals
  const pillars = [
    { x: 72,  h: 205, w: 26 },
    { x: 215, h: 255, w: 30 },
    { x: 425, h: 228, w: 28 },
    { x: 618, h: 262, w: 32 },
    { x: 728, h: 185, w: 24 },
  ];
  for (const pil of pillars) {
    // Pillar body
    ctx.fillStyle = '#1A0828';
    ctx.fillRect(pil.x, GROUND_TOP - pil.h, pil.w, pil.h);
    ctx.fillStyle = '#100420';
    ctx.fillRect(pil.x, GROUND_TOP - pil.h, 4, pil.h);
    ctx.fillStyle = '#241038';
    ctx.fillRect(pil.x + pil.w - 4, GROUND_TOP - pil.h, 4, pil.h);
    // Bedrock cap
    ctx.fillStyle = '#0E0618';
    ctx.fillRect(pil.x - 3, GROUND_TOP - pil.h - 7, pil.w + 6, 7);

    const cx = pil.x + pil.w / 2 | 0;
    const cy = GROUND_TOP - pil.h - 22;
    drawEndCrystal(cx, cy);
  }

  // Faint purple ground mist
  ctx.fillStyle = 'rgba(120, 40, 180, 0.10)';
  ctx.fillRect(0, GROUND_TOP - 32, W, 32);
}

function drawGroundEnd() {
  // End Stone base fill
  ctx.fillStyle = '#DCDC8C';
  ctx.fillRect(0, GROUND_TOP, W, H - GROUND_TOP);
  // Block seams grid
  ctx.fillStyle = '#C8C870';
  for (let bx = 0; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, BLOCK - 1);
  }
  // Crack details
  ctx.fillStyle = '#B4B458';
  for (let bx = 4; bx < W; bx += BLOCK) {
    ctx.fillRect(bx,      GROUND_TOP + 12, 10, 1);
    ctx.fillRect(bx + 18, GROUND_TOP + 6,  8,  1);
  }
  // Top surface highlight
  ctx.fillStyle = '#EEEEDA';
  for (let bx = 2; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP + 1, 8, 2);
  }
}

function drawPlatformEnd(p) {
  const platH = 18;
  // End Stone base
  ctx.fillStyle = '#DCDC8C';
  ctx.fillRect(p.x, p.y, p.w, platH);
  // Horizontal seam
  ctx.fillStyle = '#C8C870';
  ctx.fillRect(p.x, p.y + 9, p.w, 1);
  // Vertical block seams
  for (let bx = p.x + BLOCK; bx < p.x + p.w; bx += BLOCK) {
    ctx.fillRect(bx, p.y, 1, platH);
  }
  // Crack details
  ctx.fillStyle = '#B4B458';
  ctx.fillRect(p.x + 6,  p.y + 4,  10, 1);
  ctx.fillRect(p.x + 20, p.y + 12, 8,  1);
  // Top highlight
  ctx.fillStyle = '#EEEEDA';
  ctx.fillRect(p.x, p.y, p.w, 3);
  // Shadow underside
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 3);
}

// ── End Castle ───────────────────────────────────────────────────────────────

function drawPurpurBlock(x, y, w, h) {
  ctx.fillStyle = '#6B2F5A';
  ctx.fillRect(x, y, w, h);
  // Horizontal mortar seams
  ctx.fillStyle = '#4E2242';
  for (let by = y + 15; by < y + h; by += 16) ctx.fillRect(x, by, w, 1);
  // Vertical seams
  for (let bx = x + 15; bx < x + w; bx += 16) ctx.fillRect(bx, y, 1, h);
  // Left edge shadow
  ctx.fillStyle = '#3D1A30';
  ctx.fillRect(x, y, 2, h);
  // Top highlight
  ctx.fillStyle = '#7A3A68';
  ctx.fillRect(x, y, w, 2);
}

function drawEndRod(x, y, h) {
  // Glow halo
  ctx.fillStyle = 'rgba(220, 220, 255, 0.35)';
  ctx.fillRect(x - 4, y - h, 8, h);
  // Rod body
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x - 1, y - h, 2, h);
  // Cap
  ctx.fillStyle = '#E0E0FF';
  ctx.fillRect(x - 3, y - h - 4, 6, 4);
}

function drawCastleBattlement(x, y, w) {
  const mW = 10, mH = 14, gap = 12;
  drawPurpurBlock(x, y, w, 6);
  for (let bx = x + 4; bx + mW <= x + w - 2; bx += mW + gap) {
    drawPurpurBlock(bx, y - mH, mW, mH);
  }
}

function drawBackgroundEndCastle() {
  ctx.fillStyle = endGradient;
  ctx.fillRect(0, 0, W, GROUND_TOP);

  // Void particles (shared with regular End)
  for (const p of END_PARTICLES) {
    ctx.fillStyle = p.purple ? 'rgba(180, 80, 255, 0.75)' : 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(p.x, p.y, p.s, p.s);
  }

  const gY = GROUND_TOP;

  // Far background silhouette towers (depth layer)
  ctx.fillStyle = '#2A1028';
  ctx.fillRect(14,  gY - 115, 42, 115);
  ctx.fillRect(56,  gY - 88,  32, 88);
  ctx.fillRect(746, gY - 115, 42, 115);
  ctx.fillRect(714, gY - 88,  32, 88);
  ctx.fillStyle = '#200C20';
  for (let bx = 14; bx < 56; bx += 16) ctx.fillRect(bx + 2, gY - 129, 9, 14);
  for (let bx = 56; bx < 88; bx += 16) ctx.fillRect(bx + 2, gY - 102, 9, 14);
  for (let bx = 746; bx < 788; bx += 16) ctx.fillRect(bx + 2, gY - 129, 9, 14);
  for (let bx = 714; bx < 746; bx += 16) ctx.fillRect(bx + 2, gY - 102, 9, 14);

  // === Main castle ===
  // Left outer tower
  drawPurpurBlock(110, gY - 240, 70, 240);
  // Left connecting wall
  drawPurpurBlock(180, gY - 148, 120, 148);
  // Central keep
  drawPurpurBlock(300, gY - 265, 200, 265);
  // Right connecting wall
  drawPurpurBlock(500, gY - 148, 120, 148);
  // Right outer tower
  drawPurpurBlock(620, gY - 240, 70, 240);

  // Central keep — gate archway
  ctx.fillStyle = '#0C0415';
  ctx.fillRect(366, gY - 96, 68, 96);   // doorway
  ctx.fillRect(360, gY - 116, 80, 22);  // arch crown
  // Gate frame highlight
  ctx.fillStyle = '#241040';
  ctx.fillRect(360, gY - 116, 4, 116);
  ctx.fillRect(436, gY - 116, 4, 116);

  // Keep windows — lower row (warm glow)
  for (const wx of [314, 346, 414, 446]) {
    ctx.fillStyle = '#FFE0A0';
    ctx.fillRect(wx, gY - 218, 18, 28);
    ctx.fillStyle = 'rgba(255, 215, 140, 0.30)';
    ctx.fillRect(wx - 2, gY - 220, 22, 32);
  }
  // Keep windows — upper row (purple End glow)
  for (const wx of [328, 430]) {
    ctx.fillStyle = '#C080FF';
    ctx.fillRect(wx, gY - 252, 14, 22);
    ctx.fillStyle = 'rgba(180, 80, 255, 0.28)';
    ctx.fillRect(wx - 2, gY - 254, 18, 26);
  }

  // Tower windows
  for (const wx of [130, 162]) {
    ctx.fillStyle = '#FFE0A0';
    ctx.fillRect(wx, gY - 195, 16, 24);
  }
  ctx.fillStyle = '#FFE0A0';
  ctx.fillRect(130, gY - 138, 16, 24);
  for (const wx of [638, 666]) {
    ctx.fillStyle = '#FFE0A0';
    ctx.fillRect(wx, gY - 195, 16, 24);
  }
  ctx.fillStyle = '#FFE0A0';
  ctx.fillRect(638, gY - 138, 16, 24);

  // === Battlements ===
  drawCastleBattlement(110, gY - 240, 70);
  drawCastleBattlement(180, gY - 148, 120);
  drawCastleBattlement(300, gY - 265, 200);
  drawCastleBattlement(500, gY - 148, 120);
  drawCastleBattlement(620, gY - 240, 70);

  // === End rods ===
  drawEndRod(145, gY - 256, 28);  // left tower peak
  drawEndRod(655, gY - 256, 28);  // right tower peak
  drawEndRod(368, gY - 282, 30);  // keep left
  drawEndRod(432, gY - 282, 30);  // keep right

  // Ground mist
  ctx.fillStyle = 'rgba(120, 40, 180, 0.12)';
  ctx.fillRect(0, gY - 30, W, 30);
}

function drawGroundEndCastle() {
  // Purpur floor
  ctx.fillStyle = '#6B2F5A';
  ctx.fillRect(0, GROUND_TOP, W, H - GROUND_TOP);
  ctx.fillStyle = '#4E2242';
  for (let bx = 0; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP, BLOCK - 1, BLOCK - 1);
  }
  // Cross-pattern dots
  ctx.fillStyle = '#3D1A30';
  for (let bx = 8; bx < W; bx += BLOCK) {
    ctx.fillRect(bx,      GROUND_TOP + 8,  4, 4);
    ctx.fillRect(bx + 16, GROUND_TOP + 20, 4, 4);
  }
  // Top highlight
  ctx.fillStyle = '#7A3A68';
  for (let bx = 2; bx < W; bx += BLOCK) {
    ctx.fillRect(bx, GROUND_TOP + 1, 10, 2);
  }
}

function drawPlatformEndCastle(p) {
  const platH = 18;
  ctx.fillStyle = '#6B2F5A';
  ctx.fillRect(p.x, p.y, p.w, platH);
  ctx.fillStyle = '#4E2242';
  ctx.fillRect(p.x, p.y + 9, p.w, 1);
  for (let bx = p.x + BLOCK; bx < p.x + p.w; bx += BLOCK) {
    ctx.fillRect(bx, p.y, 1, platH);
  }
  ctx.fillStyle = '#7A3A68';
  ctx.fillRect(p.x, p.y, p.w, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(p.x + 4, p.y + platH, p.w - 4, 3);
}

// ─────────────────────────────────────────────────────────────────────────────

function drawBackground() {
  if (isMine()) { drawBackgroundMine(); return; }
  if (isForest()) { drawBackgroundForest(); return; }
  if (isNether()) { drawBackgroundNether(); return; }
  if (isVillage()) { drawBackgroundVillage(); return; }
  if (isDesert()) { drawBackgroundDesert(); return; }
  if (isPyramid())    { drawBackgroundPyramid(); return; }
  if (isOutpost())    { drawBackgroundOutpost(); return; }
  if (isDarkForest()) { drawBackgroundDarkForest(); return; }
  if (isMansion())    { drawBackgroundMansion(); return; }
  if (isSwamp())      { drawBackgroundSwamp(); return; }
  if (isUnderwater()) { drawBackgroundUnderwater(); return; }
  if (isIce())        { drawBackgroundIce(); return; }
  if (isEnd())        { drawBackgroundEnd(); return; }
  if (isEndCastle())  { drawBackgroundEndCastle(); return; }
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

  const hudBadges = [
    { id: 'emerald', count: emeraldCount, color: '#17DD62' },
    { id: 'iron',    count: ironCount,    color: '#C8A060' },
    { id: 'diamond', count: diamondCount, color: '#50C8FF' },
  ];
  const bScale = 0.28;
  const bSz    = Math.round(ISLOT * bScale);
  let badgeY = H - 38;
  for (const b of hudBadges) {
    if (b.count <= 0) continue;
    const bx = W - 68;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(bx - 4, badgeY - 4, bSz + 38, bSz + 8);
    ctx.save();
    ctx.translate(bx, badgeY);
    ctx.scale(bScale, bScale);
    drawItemIcon(b.id, 0, 0);
    ctx.restore();
    ctx.fillStyle = b.color;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`x${b.count}`, W - 8, badgeY + bSz - 1);
    ctx.textAlign = 'left';
    badgeY -= bSz + 12;
  }

  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.textAlign = 'center';
  ctx.fillText('H — помощь', W / 2, H - 5);
  ctx.textAlign = 'left';

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
    case 'emerald': {
      ctx.fillStyle = '#17DD62';
      ctx.fillRect(x + 22, y +  4,   8,  4);
      ctx.fillRect(x + 18, y +  8,  16,  4);
      ctx.fillRect(x + 14, y + 12,  24,  4);
      ctx.fillRect(x + 12, y + 16,  28,  8);
      ctx.fillRect(x + 14, y + 24,  24,  4);
      ctx.fillRect(x + 18, y + 28,  16,  4);
      ctx.fillRect(x + 20, y + 32,  12,  4);
      ctx.fillRect(x + 22, y + 36,   8,  4);
      ctx.fillStyle = '#62FFB0';
      ctx.fillRect(x + 14, y + 16,  10,  4);
      ctx.fillStyle = '#0A8040';
      ctx.fillRect(x + 28, y + 16,  10,  4);
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
    for (const ore of EMERALD_ORE_BLOCKS) {
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
  if (item) {
    drawItemIcon(item, sx, sy);
    const cnt = stackCount(item);
    if (cnt > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`x${cnt}`, sx + ISLOT - 3, sy + ISLOT - 3);
      ctx.textAlign = 'left';
    }
  }
}

function drawHelp() {
  const pw = 380, ph = 292;
  const px = (W - pw) >> 1;
  const py = (H - ph) >> 1;

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#C6C6C6';
  ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(px, py, pw, 2);
  ctx.fillRect(px, py, 2, ph);
  ctx.fillStyle = '#555555';
  ctx.fillRect(px, py + ph - 2, pw, 2);
  ctx.fillRect(px + pw - 2, py, 2, ph);

  ctx.fillStyle = '#3F3F3F';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Управление', px + pw / 2, py + 24);

  const sep = py + 32;
  ctx.fillStyle = '#888888';
  ctx.fillRect(px + 10, sep, pw - 20, 1);

  const rows = [
    ['← →',        'Движение'],
    ['Пробел',      'Прыжок'],
    ['E',           'Использовать предмет'],
    ['Q',           'Инвентарь'],
    ['R',           'Торговля (рядом с фермером)'],
    ['P',           'Пауза'],
    ['M',           'Звук вкл / выкл'],
    ['H',           'Эта подсказка'],
  ];

  const colKey = px + 24;
  const colVal = px + 130;
  let ry = sep + 22;
  const step = 26;

  for (const [key, desc] of rows) {
    ctx.fillStyle = '#7A5500';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(key, colKey, ry);
    ctx.fillStyle = '#3F3F3F';
    ctx.font = '13px monospace';
    ctx.fillText(desc, colVal, ry);
    ry += step;
  }

  ctx.fillStyle = '#6A6A6A';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('H — закрыть', px + pw / 2, py + ph - 10);
  ctx.textAlign = 'left';
}

function drawTSlot(sx, sy, item) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(sx, sy, TSLOT, 2);
  ctx.fillRect(sx, sy, 2, TSLOT);
  ctx.fillStyle = '#555555';
  ctx.fillRect(sx,           sy + TSLOT - 2, TSLOT, 2);
  ctx.fillRect(sx + TSLOT - 2, sy,           2, TSLOT);
  ctx.fillStyle = '#373737';
  ctx.fillRect(sx + 2, sy + 2, TSLOT - 4, 2);
  ctx.fillRect(sx + 2, sy + 2, 2, TSLOT - 4);
  ctx.fillStyle = '#8B8B8B';
  ctx.fillRect(sx + 2, sy + TSLOT - 4, TSLOT - 4, 2);
  ctx.fillRect(sx + TSLOT - 4, sy + 2, 2, TSLOT - 4);
  ctx.fillStyle = '#595959';
  ctx.fillRect(sx + 4, sy + 4, TSLOT - 8, TSLOT - 8);
  if (item) {
    const sc = TSLOT / ISLOT;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(sc, sc);
    drawItemIcon(item, 0, 0);
    ctx.restore();
    const cnt = stackCount(item);
    if (cnt > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`x${cnt}`, sx + TSLOT - 2, sy + TSLOT - 2);
      ctx.textAlign = 'left';
    }
  }
}

function drawTradePanel() {
  const px = TRADE_PX, py = TRADE_PY, pw = TRADE_PW, ph = TRADE_PH;
  const midX = px + TRADE_HALF;

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#C6C6C6';
  ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(px, py, pw, 2);
  ctx.fillRect(px, py, 2, ph);
  ctx.fillStyle = '#555555';
  ctx.fillRect(px, py + ph - 2, pw, 2);
  ctx.fillRect(px + pw - 2, py, 2, ph);
  ctx.fillStyle = '#888888';
  ctx.fillRect(midX, py + 6, 2, ph - 12);

  // ── Left: player inventory ──
  ctx.fillStyle = '#3F3F3F';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Инвентарь', px + TRADE_HALF / 2, py + 22);

  const gridW    = 3 * TSLOT + 2 * TGAP;
  const gridLeft = px + ((TRADE_HALF - gridW) >> 1);
  const gridTop  = py + 32;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const sx = gridLeft + col * (TSLOT + TGAP);
      const sy = gridTop  + row * (TSLOT + TGAP);
      drawTSlot(sx, sy, inventory[row * 3 + col]);
      // Green tint on sellable items
      const it = inventory[row * 3 + col];
      const panelShop = tradePartner === 'blacksmith' ? BLACKSMITH_SHOP : FARMER_SHOP;
      if (it && panelShop.find(s => s.id === it)) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(sx + 2, sy + 2, TSLOT - 4, TSLOT - 4);
        ctx.restore();
      }
    }
  }

  // Currency count below grid
  const emY    = gridTop + 3 * (TSLOT + TGAP) - TGAP + 16;
  const emSc   = 0.27;
  const emSz   = Math.round(ISLOT * emSc);
  const emIconX = px + TRADE_HALF / 2 - 28;
  const isBlacksmith = tradePartner === 'blacksmith';
  const currencyIcon  = isBlacksmith ? 'iron' : 'emerald';
  const currencyCount = isBlacksmith ? ironCount : emeraldCount;
  ctx.save();
  ctx.translate(emIconX, emY - 4);
  ctx.scale(emSc, emSc);
  drawItemIcon(currencyIcon, 0, 0);
  ctx.restore();
  ctx.fillStyle = isBlacksmith ? '#C8A060' : '#17DD62';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`x${currencyCount}`, emIconX + emSz + 4, emY + emSz * 0.55);

  ctx.fillStyle = '#5A5A5A';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('клик по предмету — продать', px + TRADE_HALF / 2, py + ph - 8);

  // ── Right: farmer shop ──
  ctx.fillStyle = '#3F3F3F';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  const traderName = tradePartner === 'blacksmith' ? 'Кузнец' : 'Фермер';
  ctx.fillText(traderName, midX + TRADE_HALF / 2, py + 22);

  const shopX = midX + 14;
  let shopY = py + 32;
  const activeShop = tradePartner === 'blacksmith' ? BLACKSMITH_SHOP : FARMER_SHOP;
  const itemNames  = { apple: 'Яблоко', sword: 'Меч', pickaxe: 'Кирка' };

  for (const si of activeShop) {
    drawTSlot(shopX, shopY, si.id);

    const name = itemNames[si.id] || si.id;
    ctx.fillStyle = '#3F3F3F';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(name, shopX + TSLOT + 10, shopY + 15);

    // Price: tiny currency icon + count
    const pSc  = 0.22;
    const pSz  = Math.round(ISLOT * pSc);
    ctx.save();
    ctx.translate(shopX + TSLOT + 10, shopY + 20);
    ctx.scale(pSc, pSc);
    drawItemIcon(si.currency, 0, 0);
    ctx.restore();
    ctx.fillStyle = '#2A2A2A';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`x${si.price}`, shopX + TSLOT + 10 + pSz + 3, shopY + 33);

    // Buy button
    const availCurrency = si.currency === 'iron' ? ironCount : emeraldCount;
    const canBuy  = availCurrency >= si.price;
    const hasRoom = inventory.indexOf(null) >= 0;
    const btnX = midX + TRADE_HALF - 82;
    const btnW = 70;
    const btnH = 22;
    const btnY = shopY + (TSLOT - btnH) >> 1;
    ctx.fillStyle = (canBuy && hasRoom) ? '#2A7A2A' : '#5A5A5A';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Купить', btnX + btnW / 2, btnY + 15);

    shopY += TSLOT + 8;
  }

  ctx.fillStyle = '#5A5A5A';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('R — закрыть', midX + TRADE_HALF / 2, py + ph - 8);
  ctx.textAlign = 'left';
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
        const stackable = item.id === 'emerald' || item.id === 'iron' || item.id === 'diamond';
        if (stackable) {
          const existing = inventory.indexOf(item.id);
          if (existing >= 0) {
            if (item.id === 'emerald') emeraldCount++;
            else if (item.id === 'iron') ironCount++;
            else diamondCount++;
            worldItems.splice(i, 1);
          } else {
            const emptySlot = inventory.indexOf(null);
            if (emptySlot >= 0) {
              inventory[emptySlot] = item.id;
              if (item.id === 'emerald') emeraldCount++;
              else if (item.id === 'iron') ironCount++;
              else diamondCount++;
              worldItems.splice(i, 1);
            }
          }
        } else {
          const slot = inventory.indexOf(null);
          if (slot >= 0) { inventory[slot] = item.id; worldItems.splice(i, 1); }
        }
      }
    }

    if (pipeVisible) {
      const capLeft  = PIPE_X - PIPE_CAP_EXTRA;
      const capRight = PIPE_X + PIPE_W + PIPE_CAP_EXTRA;
      if (player.x + SW - 4 > capLeft && player.x + 4 < capRight) {
        levelComplete = true;
        stopBgMusic();
        if (isPortalExit()) playPortalEnter(); else playPipeEnter();
      }
    }
  }

  updateMobs();
  updatePhantoms();
  updateVillagers();

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
  pipeVisible   = isVillage();
  portalFrame   = 0;
  levelComplete = false;
  if (levelCfg().hasOres) regenerateOreBlocks();
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
  if (levelCfg().mobType !== null) {
    spawnMob(true, false);
    spawnMob(true, true);
  }
  villagers = [];
  if (isVillage()) initVillagers();
  phantoms = [];
  phantomTimer = Math.floor(spawnInterval / 2);
  paused       = false;
  tradeOpen    = false;
  tradePartner = null;
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
  if (isForest())     drawForestTrees();
  if (isDarkForest()) drawDarkForestTrees();
  platforms.forEach(drawPlatform);
  drawGround();
  if (pipeVisible) {
    if (isPortalExit()) { portalFrame++; drawNetherPortal(PIPE_X, GROUND_TOP); }
    else drawPipe(PIPE_X, GROUND_TOP);
  }
  drawWorldItems();
  drawPhantoms();
  drawMobs();
  drawVillagers();
  drawSteve(player.x, player.y - SH, player.facingRight, input.left || input.right, player.walkFrame);
  drawJoyRays();
  drawSwordSwing();
  drawHUD();
  if (levelComplete)  drawLevelComplete();
  if (gameOver)       drawGameOver();
  if (paused)         drawPaused();
  if (tradeOpen)      drawTradePanel();
  if (inventoryOpen)  drawInventory();
  if (helpOpen)       drawHelp();
}

function loop() {
  if (!gameOver && !paused && !inventoryOpen && !tradeOpen && !helpOpen) update();
  draw();
  requestAnimationFrame(loop);
}

loop();
