// Steve pixel art: 8 wide × 18 tall, drawn at 5px per cell = 40×90
const PALETTE = [
  null,       // 0 transparent
  '#C68642',  // 1 skin
  '#513710',  // 2 dark brown hair
  '#4B8C9C',  // 3 teal shirt (Steve's iconic color)
  '#2A3A8C',  // 4 dark blue pants
  '#1A1008',  // 5 dark shoe
  '#8888AA',  // 6 Steve's gray-blue eyes
  '#2A5C6C',  // 7 shirt shadow (darker teal)
  '#1A2860',  // 8 pants shadow
  '#A06030',  // 9 skin shadow
];

// Steve sprite: 8 wide × 18 tall (5px per cell = 40×90 on canvas)
const STEVE = [
  [0,0,2,2,2,2,0,0], // row 0  hair top
  [0,2,2,2,2,2,2,0], // row 1  hair
  [2,2,2,2,2,2,2,2], // row 2  hair sides
  [2,1,1,1,1,1,1,2], // row 3  forehead
  [2,1,6,1,1,6,1,2], // row 4  eyes
  [2,1,6,1,1,6,1,2], // row 5  eyes bottom
  [2,1,1,1,1,1,1,2], // row 6  nose
  [2,1,9,2,2,9,1,2], // row 7  mouth/chin
  [0,3,3,3,3,3,3,0], // row 8  shoulders
  [3,3,3,3,3,3,3,3], // row 9  chest top
  [3,3,7,3,3,7,3,3], // row 10 chest
  [3,3,3,3,3,3,3,3], // row 11 chest lower
  [3,7,3,3,3,3,7,3], // row 12 waist
  [4,4,4,0,0,4,4,4], // row 13 hips
  [4,4,4,0,0,4,4,4], // row 14 upper legs
  [4,8,4,0,0,4,8,4], // row 15 mid legs
  [4,4,4,0,0,4,4,4], // row 16 lower legs
  [5,5,5,0,0,5,5,5], // row 17 shoes
];

// Zombie palette — зелёная кожа, светящиеся глаза, бурая рваная рубаха
const ZOMBIE_PALETTE = [
  null,       // 0 transparent
  '#5A9A48',  // 1 zombie green skin
  '#2A5A18',  // 2 dark green (hair / head)
  '#7A5A3A',  // 3 brown tattered shirt
  '#3A3040',  // 4 dark gray pants
  '#1A1010',  // 5 dark shoe
  '#FFFF80',  // 6 glowing yellow eyes
  '#4A3020',  // 7 shirt shadow
  '#1A1820',  // 8 pants shadow
  '#2A6028',  // 9 dark mouth
];

const ZOMBIE = [
  [0,0,2,2,2,2,0,0], // row 0  голова (тёмная макушка)
  [0,2,2,2,2,2,2,0], // row 1
  [2,2,1,1,1,1,2,2], // row 2  лоб
  [2,1,1,1,1,1,1,2], // row 3
  [2,1,6,1,1,6,1,2], // row 4  светящиеся глаза
  [2,1,6,1,1,6,1,2], // row 5
  [2,1,1,1,1,1,1,2], // row 6  нос
  [2,2,9,9,9,9,2,2], // row 7  открытый рот (зомби оскал)
  [0,3,3,3,3,3,3,0], // row 8  плечи
  [3,3,3,3,3,3,3,3], // row 9  грудь
  [3,3,7,3,3,7,3,3], // row 10
  [3,3,3,3,3,3,3,3], // row 11
  [3,7,3,3,3,3,7,3], // row 12 пояс
  [4,4,4,0,0,4,4,4], // row 13 бёдра
  [4,4,4,0,0,4,4,4], // row 14 ноги верх
  [4,8,4,0,0,4,8,4], // row 15 ноги
  [4,4,4,0,0,4,4,4], // row 16 ноги низ
  [5,5,5,0,0,5,5,5], // row 17 ботинки
];

// Skeleton palette — кость/серый, тёмные глазницы, белые зубы
const SKELETON_PALETTE = [
  null,       // 0 transparent
  '#C8C8C8',  // 1 кость (светло-серый)
  '#787878',  // 2 тёмно-серый (контур, тени)
  '#F0F0F0',  // 3 зубы (белёсый)
  '#1A1A1A',  // 4 глазницы (почти чёрный)
  '#A0A0A0',  // 5 средний серый (рёбра/тени)
];

// Skeleton: 8 wide × 18 tall (5px per cell = 40×90 on canvas)
const SKELETON = [
  [0,0,2,2,2,2,0,0], // row 0  череп верх
  [0,2,1,1,1,1,2,0], // row 1  череп
  [2,1,1,1,1,1,1,2], // row 2  лоб
  [2,1,1,1,1,1,1,2], // row 3  лоб низ
  [2,4,4,1,1,4,4,2], // row 4  глазницы (широкие)
  [2,4,4,1,1,4,4,2], // row 5  глазницы низ
  [2,1,1,1,1,1,1,2], // row 6  скулы
  [2,3,2,3,3,2,3,2], // row 7  зубы (чередующийся)
  [0,1,2,1,1,2,1,0], // row 8  ключица
  [2,1,5,1,1,5,1,2], // row 9  рёбра верх
  [2,5,1,5,5,1,5,2], // row 10 рёбра низ
  [2,1,5,1,1,5,1,2], // row 11 рёбра нижние
  [0,2,1,2,2,1,2,0], // row 12 таз
  [1,1,1,0,0,1,1,1], // row 13 бёдра
  [1,1,1,0,0,1,1,1], // row 14 ноги верх
  [1,2,1,0,0,1,2,1], // row 15 колени
  [1,1,1,0,0,1,1,1], // row 16 ноги низ
  [2,1,2,0,0,2,1,2], // row 17 ступни
];

const PHANTOM_PALETTE = [
  null,       // 0 transparent
  '#060C1C',  // 1 near-black (wing edges)
  '#102040',  // 2 very dark blue (outer wings)
  '#1C3868',  // 3 dark blue (wings)
  '#2A5490',  // 4 medium blue (body)
  '#4878B8',  // 5 lighter blue (belly)
  '#40E880',  // 6 green (eyes)
  '#88B0D8',  // 7 pale blue-grey (belly highlight)
];

// Phantom: 16 wide × 8 tall (80×40 px), viewed from the side
const PHANTOM = [
  [0,0,0,1,2,0,0,0,0,0,0,2,1,0,0,0], // row 0 wing tips
  [0,0,1,2,3,2,0,0,0,0,2,3,2,1,0,0], // row 1 upper wings
  [0,1,2,3,3,3,3,3,3,3,3,3,3,2,1,0], // row 2 wing span
  [1,2,3,3,3,4,4,4,4,4,4,3,3,3,2,1], // row 3 wing + body
  [0,1,3,3,4,4,5,7,7,5,4,4,3,3,1,0], // row 4 body/belly
  [0,0,2,3,4,5,6,7,7,6,5,4,3,2,0,0], // row 5 eyes + belly
  [0,0,0,3,4,5,5,5,5,5,5,4,3,0,0,0], // row 6 lower belly
  [0,0,0,0,2,3,3,4,4,3,3,2,0,0,0,0], // row 7 tail
];

const CELL = 5; // px per sprite cell
const SW = 8 * CELL;  // sprite width  = 40
const SH = 18 * CELL; // sprite height = 90

const PW = 16 * CELL; // phantom width  = 80 px
const PH = 8  * CELL; // phantom height = 40 px

function drawSprite(palette, sprite, x, y, facingRight, legOffset) {
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 8; col++) {
      const color = palette[sprite[row][col]];
      if (!color) continue;

      let drawCol = col;
      if (row >= 13) {
        if (col < 4) drawCol = col + (legOffset > 0 ? Math.round(legOffset * (row - 12) / 6) : 0);
        else         drawCol = col + (legOffset < 0 ? Math.round(legOffset * (row - 12) / 6) : 0);
      }

      // flip для зеркала
      const finalCol = facingRight ? drawCol : (7 - drawCol);
      ctx.fillStyle = color;
      ctx.fillRect(x + finalCol * CELL, y + row * CELL, CELL, CELL);
    }
  }
}
