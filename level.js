/**
 * Level module for Kiko & Gua Kristal.
 * Defines 3 rich levels with ascending difficulty and unique hazards:
 * Level 1: "Gua Lumut" (Moss Cave)
 * Level 2: "Gua Kristal" (Crystal Cave)
 * Level 3: "Gua Magma Dingin" (Cold Magma Abyss)
 */

import { CONFIG } from './config.js';
import { TILE_TYPES, TileManager } from './tiles.js';
import { Item, ITEM_TYPES } from './items.js';
import { Enemy } from './enemies.js';
import { sounds } from './audio.js';

export const LEVEL_DATA = [
  {
    id: 1,
    name: 'Gua Lumut',
    subtitle: 'Awal Petualangan Kucing Kiko',
    parTime: 40,
    map: [
      "################################################################",
      "#..............................................................#",
      "#..............................................................#",
      "#..................1...1...........................1...1.......#",
      "#..................#####...........................#####.......#",
      "#...........1..1....................?..........................#",
      "#.........====..==................#####.................1...1..#",
      "#.......................................................#####..#",
      "#..........................1...1...............................#",
      "#........................#######............s...F..............#",
      "#....P........######............^.....################.........#",
      "#..######.....................#####..................1.K.1.....#",
      "#...................................................#######...G#",
      "#..............................................................#",
      "################################################################",
    ],
  },
  {
    id: 2,
    name: 'Gua Kristal',
    subtitle: 'Kristal Berkilau & Tebing Retak',
    parTime: 55,
    map: [
      "################################################################################",
      "#..............................................................................#",
      "#..................................R...........................................#",
      "#..........................................................R...................#",
      "#...................................1..5..1....................................#",
      "#....................b.............CCCCCCCCC.....................b.............#",
      "#..................1...1........................................1...5..........#",
      "#..................#####.........................5.............#####...........#",
      "#..........L....................v.v.v...........===............................#",
      "#.........===..................#######...................v.v.v.................#",
      "#...................CCC.................................#######................#",
      "#...P...........^........5..................F.........................K........#",
      "#..####.......#####....#####.............#######....................#####.....G#",
      "#........v.v...................v.v.v.v.v..........v.v.v.v.v..................###",
      "################################################################################",
    ],
  },
  {
    id: 3,
    name: 'Gua Magma Dingin',
    subtitle: 'Laba-laba, Golem & Magma Asam',
    parTime: 70,
    map: [
      "################################################################################################",
      "#..............................................................................................#",
      "#........p....................................p...................................p............#",
      "#..............................................................................................#",
      "#....................................0............................*...........................#",
      "#...................0...0..........=====.......................=======..........................#",
      "#..................#######.....................................................................#",
      "#...........0...............................0...0...........................0...0..............#",
      "#..........===.............................#######.........................#######.............#",
      "#......................m..................................m....................................#",
      "#..................#########............^.............#########...........^..........K.........#",
      "#...P..................................###...............................###.......#####......G#",
      "#..####......F................................................................................##",
      "#.........~~~~~~~~~..............~~~~~~~~~~~~~................~~~~~~~~~......................###",
      "################################################################################################",
    ],
  },
];

export class Level {
  constructor(levelIndex = 0) {
    this.levelIndex = levelIndex;
    this.tileManager = new TileManager();
    this.enemies = [];
    this.items = [];
    this.grid = [];
    this.widthInTiles = 0;
    this.heightInTiles = 0;
    this.widthPx = 0;
    this.heightPx = 0;
    this.playerStartX = 32;
    this.playerStartY = 120;
    this.totalPossibleGemsValue = 0;
    this.meta = LEVEL_DATA[levelIndex] || LEVEL_DATA[0];

    this.load(levelIndex);
  }

  load(levelIndex) {
    this.levelIndex = levelIndex % LEVEL_DATA.length;
    this.meta = LEVEL_DATA[this.levelIndex];
    this.tileManager.reset();
    this.enemies = [];
    this.items = [];
    this.totalPossibleGemsValue = 0;

    const rawMap = this.meta.map;
    this.heightInTiles = rawMap.length;
    this.widthInTiles = rawMap[0].length;
    this.widthPx = this.widthInTiles * CONFIG.TILE_SIZE;
    this.heightPx = this.heightInTiles * CONFIG.TILE_SIZE;

    // Initialize tile grid
    this.grid = Array.from({ length: this.heightInTiles }, () =>
      new Array(this.widthInTiles).fill(TILE_TYPES.EMPTY)
    );

    for (let ty = 0; ty < this.heightInTiles; ty++) {
      const row = rawMap[ty];
      for (let tx = 0; tx < this.widthInTiles; tx++) {
        const ch = row[tx];
        const px = tx * CONFIG.TILE_SIZE;
        const py = ty * CONFIG.TILE_SIZE;

        switch (ch) {
          case '#':
            this.grid[ty][tx] = TILE_TYPES.GROUND;
            break;
          case '=':
            this.grid[ty][tx] = TILE_TYPES.PLATFORM;
            break;
          case 'C':
            this.grid[ty][tx] = TILE_TYPES.CRUMBLE;
            this.tileManager.registerCrumble(px, py);
            break;
          case '?':
            this.grid[ty][tx] = TILE_TYPES.CHEST;
            this.tileManager.registerChest(px, py, 'goldfish');
            break;
          case '^':
            this.grid[ty][tx] = TILE_TYPES.SPRING;
            break;
          case 'v':
            this.grid[ty][tx] = TILE_TYPES.SPIKES;
            break;
          case '~':
            this.grid[ty][tx] = TILE_TYPES.ACID;
            break;
          case 'R':
            this.tileManager.registerFallingRock(px, py);
            break;
          case 'P':
            this.playerStartX = px;
            this.playerStartY = py;
            break;
          case '1':
            this.items.push(new Item(ITEM_TYPES.GEM_BLUE, px, py));
            this.totalPossibleGemsValue += 1;
            break;
          case '5':
            this.items.push(new Item(ITEM_TYPES.GEM_GREEN, px, py));
            this.totalPossibleGemsValue += 5;
            break;
          case '0':
            this.items.push(new Item(ITEM_TYPES.GEM_RED, px, py));
            this.totalPossibleGemsValue += 10;
            break;
          case 'L':
            this.items.push(new Item(ITEM_TYPES.LANTERN, px, py));
            break;
          case '*':
            this.items.push(new Item(ITEM_TYPES.STAR_FEATHER, px, py));
            break;
          case 'K':
            this.items.push(new Item(ITEM_TYPES.KEY, px, py));
            break;
          case 'G':
            this.items.push(new Item(ITEM_TYPES.GATE, px, py));
            break;
          case 'F':
            this.items.push(new Item(ITEM_TYPES.CHECKPOINT, px, py));
            break;
          case 's':
            this.enemies.push(new Enemy('slime', px, py));
            break;
          case 'b':
            this.enemies.push(new Enemy('bat', px, py));
            break;
          case 'm':
            this.enemies.push(new Enemy('golem', px, py));
            break;
          case 'p':
            this.enemies.push(new Enemy('spider', px, py));
            break;
          default:
            this.grid[ty][tx] = TILE_TYPES.EMPTY;
            break;
        }
      }
    }
  }

  isSolidAt(x, y) {
    const tx = Math.floor(x / CONFIG.TILE_SIZE);
    const ty = Math.floor(y / CONFIG.TILE_SIZE);
    if (tx < 0 || tx >= this.widthInTiles || ty < 0 || ty >= this.heightInTiles) {
      return false;
    }
    const tile = this.grid[ty][tx];
    if (tile === TILE_TYPES.GROUND) return true;
    if (tile === TILE_TYPES.CHEST) return true;
    if (tile === TILE_TYPES.CRUMBLE) {
      const cb = this.tileManager.crumbleBlocks.find((b) => b.x === tx * CONFIG.TILE_SIZE && b.y === ty * CONFIG.TILE_SIZE);
      return !cb || cb.state !== 'broken';
    }
    return false;
  }

  // Returns solid AABB collision box on horizontal movement
  // Note: Only tests tiles overlapping player's body (excluding feet touching ground)
  getCollisionBox(x, y, w, h) {
    const s = CONFIG.TILE_SIZE;
    const startX = Math.floor(x / s);
    const endX = Math.floor((x + w - 1) / s);
    const startY = Math.floor((y + 1) / s);
    const endY = Math.floor((y + h - 2) / s);

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        if (tx < 0 || tx >= this.widthInTiles || ty < 0 || ty >= this.heightInTiles) continue;

        const tile = this.grid[ty][tx];
        let isSolid = tile === TILE_TYPES.GROUND || tile === TILE_TYPES.CHEST;

        if (tile === TILE_TYPES.CRUMBLE) {
          const cb = this.tileManager.crumbleBlocks.find((b) => b.x === tx * s && b.y === ty * s);
          isSolid = !cb || cb.state !== 'broken';
        }

        if (isSolid) {
          return { x: tx * s, y: ty * s, w: s, h: s };
        }
      }
    }
    return null;
  }

  // Vertical collision check (handles solids, springs, crumble blocks, and one-way platforms)
  getVerticalCollision(x, y, w, h, dy) {
    const s = CONFIG.TILE_SIZE;
    const startX = Math.floor((x + 2) / s);
    const endX = Math.floor((x + w - 3) / s);
    const startY = Math.floor(y / s);
    const endY = Math.floor((y + h) / s);

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        if (tx < 0 || tx >= this.widthInTiles || ty < 0 || ty >= this.heightInTiles) continue;

        const tile = this.grid[ty][tx];
        const tileTop = ty * s;
        const tileBottom = tileTop + s;

        // Falling down into ground, spring, crumble, or platform
        if (dy > 0) {
          if (tile === TILE_TYPES.GROUND || tile === TILE_TYPES.SPRING) {
            if (y + h - dy <= tileTop + 6) {
              return { top: tileTop, tileType: tile, tileX: tx * s, tileY: ty * s };
            }
          }
          if (tile === TILE_TYPES.CRUMBLE) {
            const cb = this.tileManager.crumbleBlocks.find((b) => b.x === tx * s && b.y === ty * s);
            if ((!cb || cb.state !== 'broken') && y + h - dy <= tileTop + 6) {
              return { top: tileTop, tileType: tile, tileX: tx * s, tileY: ty * s };
            }
          }
          if (tile === TILE_TYPES.PLATFORM) {
            // Semi-solid: only collide if player's feet were at or above platform top before step
            if (y + h - dy <= tileTop + 4) {
              return { top: tileTop, tileType: tile, tileX: tx * s, tileY: ty * s };
            }
          }
        }
        // Moving up into ceiling or chest
        else if (dy < 0) {
          if (tile === TILE_TYPES.GROUND || tile === TILE_TYPES.CHEST) {
            if (y - dy >= tileBottom - 6) {
              return { bottom: tileBottom, tileType: tile, tileX: tx * s, tileY: ty * s };
            }
          }
        }
      }
    }
    return null;
  }

  triggerCrumble(tileX, tileY) {
    const cb = this.tileManager.crumbleBlocks.find((b) => b.x === tileX && b.y === tileY);
    if (cb && cb.state === 'intact') {
      cb.state = 'trembling';
      cb.timer = 0;
      sounds.playCrumble();
    }
  }

  triggerChestBump(tileX, tileY, player) {
    const chest = this.tileManager.chests.find((c) => c.x === tileX && c.y === tileY);
    if (chest && !chest.isOpen) {
      chest.isOpen = true;
      chest.bumpVel = -180;
      sounds.playPowerup();

      // Spawn item above chest
      const itemType = chest.contains === 'goldfish' ? ITEM_TYPES.GOLDFISH : ITEM_TYPES.GEM_GREEN;
      this.items.push(new Item(itemType, tileX, tileY - 18));
    }
  }

  checkHazards(player, dt, addParticlesCallback) {
    const s = CONFIG.TILE_SIZE;
    const startX = Math.floor(player.x / s);
    const endX = Math.floor((player.x + player.w) / s);
    const startY = Math.floor(player.y / s);
    const endY = Math.floor((player.y + player.h) / s);

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        if (tx < 0 || tx >= this.widthInTiles || ty < 0 || ty >= this.heightInTiles) continue;
        const tile = this.grid[ty][tx];

        // Spikes: Instant heart loss
        if (tile === TILE_TYPES.SPIKES) {
          const spikeBox = { x: tx * s + 1, y: ty * s + 5, w: s - 2, h: 11 };
          if (
            player.x < spikeBox.x + spikeBox.w &&
            player.x + player.w > spikeBox.x &&
            player.y < spikeBox.y + spikeBox.h &&
            player.y + player.h > spikeBox.y
          ) {
            player.takeDamage(1, 'spikes');
            if (addParticlesCallback) {
              addParticlesCallback(player.x + 7, player.y + 7, 'sparkleTosca', 6);
            }
          }
        }

        // Acid: Damage per second
        if (tile === TILE_TYPES.ACID) {
          const acidBox = { x: tx * s, y: ty * s + 5, w: s, h: 11 };
          if (
            player.x < acidBox.x + acidBox.w &&
            player.x + player.w > acidBox.x &&
            player.y < acidBox.y + acidBox.h &&
            player.y + player.h > acidBox.y
          ) {
            player.takeDamage(1, 'acid');
            if (addParticlesCallback) {
              addParticlesCallback(player.x + 7, player.y + 12, 'acidBubbles', 8);
            }
          }
        }
      }
    }
  }

  update(dt, player, addParticlesCallback) {
    // Update tile manager (crumble, chest, falling rocks)
    this.tileManager.update(dt, player, (item) => this.items.push(item), addParticlesCallback);

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(dt, player, this, addParticlesCallback);
    }

    // Update items
    for (const item of this.items) {
      item.update(dt, player, addParticlesCallback);
    }
  }

  draw(ctx, camera, frameCount) {
    const s = CONFIG.TILE_SIZE;
    const startTx = Math.max(0, Math.floor(camera.x / s));
    const endTx = Math.min(this.widthInTiles - 1, Math.ceil((camera.x + camera.w) / s));
    const startTy = Math.max(0, Math.floor(camera.y / s));
    const endTy = Math.min(this.heightInTiles - 1, Math.ceil((camera.y + camera.h) / s));

    // Render tiles
    for (let ty = startTy; ty <= endTy; ty++) {
      for (let tx = startTx; tx <= endTx; tx++) {
        const tile = this.grid[ty][tx];
        if (tile !== TILE_TYPES.EMPTY) {
          this.tileManager.drawTile(ctx, tile, tx * s, ty * s, frameCount);
        }
      }
    }

    // Render falling rocks
    this.tileManager.drawFallingRocks(ctx);

    // Render items
    for (const item of this.items) {
      if (item.x + item.w >= camera.x && item.x <= camera.x + camera.w) {
        item.draw(ctx);
      }
    }

    // Render enemies
    for (const enemy of this.enemies) {
      if (enemy.x + enemy.w >= camera.x && enemy.x <= camera.x + camera.w) {
        enemy.draw(ctx);
      }
    }
  }
}
