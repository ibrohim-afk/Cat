/**
 * Tiles module for Kiko & Gua Kristal.
 * Handles rendering of pixel-art tiles and interactive block states:
 * - Ground & one-way platforms
 * - Crumbling crystal blocks (breaks in 1s, respawns in 4s)
 * - Treasure chests (bump from below to spawn items)
 * - Moss springs (bounces player 1.8x higher)
 * - Spikes, acid pools, and ceiling falling rocks
 */

import { CONFIG } from './config.js';
import { sounds } from './audio.js';

export const TILE_TYPES = {
  EMPTY: 0,
  GROUND: 1,
  PLATFORM: 2,
  CRUMBLE: 3,
  CHEST: 4,
  SPRING: 5,
  SPIKES: 6,
  ACID: 7,
  ROCK: 8,
};

export class TileManager {
  constructor() {
    this.crumbleBlocks = [];
    this.chests = [];
    this.fallingRocks = [];
    this.acidTimer = 0;
  }

  reset() {
    this.crumbleBlocks = [];
    this.chests = [];
    this.fallingRocks = [];
    this.acidTimer = 0;
  }

  registerCrumble(x, y) {
    this.crumbleBlocks.push({
      x,
      y,
      state: 'intact', // intact | trembling | broken
      timer: 0,
      shakeX: 0,
    });
  }

  registerChest(x, y, contains = 'goldfish') {
    this.chests.push({
      x,
      y,
      isOpen: false,
      contains,
      bumpOffsetY: 0,
      bumpVel: 0,
    });
  }

  registerFallingRock(x, y) {
    this.fallingRocks.push({
      startX: x,
      startY: y,
      x: x + 2,
      y,
      w: 12,
      h: 14,
      vy: 0,
      state: 'hanging', // hanging | quivering | falling | shattered
      quiverTimer: 0,
      respawnTimer: 0,
      shakeX: 0,
    });
  }

  update(dt, player, spawnItemCallback, addParticlesCallback) {
    this.acidTimer += dt;

    // Update Crumble Blocks
    for (const cb of this.crumbleBlocks) {
      if (cb.state === 'trembling') {
        cb.timer += dt;
        cb.shakeX = (Math.sin(cb.timer * 45) * 1.5);
        if (cb.timer >= 1.0) {
          cb.state = 'broken';
          cb.timer = 0;
          sounds.playCrumble();
          if (addParticlesCallback) {
            addParticlesCallback(cb.x + 8, cb.y + 8, 'crystalShards', 10);
          }
        }
      } else if (cb.state === 'broken') {
        cb.timer += dt;
        if (cb.timer >= 4.0) {
          cb.state = 'intact';
          cb.timer = 0;
          cb.shakeX = 0;
          if (addParticlesCallback) {
            addParticlesCallback(cb.x + 8, cb.y + 8, 'shimmer', 6);
          }
        }
      }
    }

    // Update Chests bump physics
    for (const chest of this.chests) {
      if (chest.bumpOffsetY < 0 || chest.bumpVel !== 0) {
        chest.bumpOffsetY += chest.bumpVel * dt;
        chest.bumpVel += 800 * dt;
        if (chest.bumpOffsetY >= 0) {
          chest.bumpOffsetY = 0;
          chest.bumpVel = 0;
        }
      }
    }

    // Update Falling Rocks
    for (const rock of this.fallingRocks) {
      if (rock.state === 'hanging') {
        // Trigger if player is roughly below (within 40px X and below rock)
        const dx = Math.abs((player.x + player.w / 2) - (rock.x + rock.w / 2));
        const dy = player.y - rock.y;
        if (dx < 40 && dy > 0 && dy < 160) {
          rock.state = 'quivering';
          rock.quiverTimer = 0.35;
          sounds.playRockFall();
        }
      } else if (rock.state === 'quivering') {
        rock.quiverTimer -= dt;
        rock.shakeX = (Math.random() - 0.5) * 3;
        if (rock.quiverTimer <= 0) {
          rock.state = 'falling';
          rock.vy = 60;
          rock.shakeX = 0;
        }
      } else if (rock.state === 'falling') {
        rock.vy += CONFIG.GRAVITY * 1.1 * dt;
        rock.y += rock.vy * dt;

        // Check collision with player
        if (
          player.x < rock.x + rock.w &&
          player.x + player.w > rock.x &&
          player.y < rock.y + rock.h &&
          player.y + player.h > rock.y
        ) {
          player.takeDamage(1, 'rock');
          rock.state = 'shattered';
          rock.respawnTimer = 5.0;
          if (addParticlesCallback) {
            addParticlesCallback(rock.x + 6, rock.y + 7, 'rockDebris', 12);
          }
        }
      } else if (rock.state === 'shattered') {
        rock.respawnTimer -= dt;
        if (rock.respawnTimer <= 0) {
          rock.state = 'hanging';
          rock.x = rock.startX + 2;
          rock.y = rock.startY;
          rock.vy = 0;
        }
      }
    }
  }

  // Draw pure pixel art for each tile type
  drawTile(ctx, tileType, px, py, frameCount = 0) {
    const s = CONFIG.TILE_SIZE;

    switch (tileType) {
      case TILE_TYPES.GROUND: {
        // Base dirt rock
        ctx.fillStyle = '#6b4a3a';
        ctx.fillRect(px, py, s, s);
        // Crystal grass top layer
        ctx.fillStyle = '#2fb8b5';
        ctx.fillRect(px, py, s, 4);
        // Grass shadow line
        ctx.fillStyle = '#1d7f7d';
        ctx.fillRect(px, py + 4, s, 1);
        // Grass crystal highlights
        ctx.fillStyle = '#3ddbd9';
        ctx.fillRect(px + 2, py + 1, 2, 1);
        ctx.fillRect(px + 9, py + 2, 3, 1);
        // Subsurface stone textures
        ctx.fillStyle = '#4f3428';
        ctx.fillRect(px + 3, py + 8, 3, 2);
        ctx.fillRect(px + 10, py + 11, 3, 2);
        ctx.fillStyle = '#8a6350';
        ctx.fillRect(px + 7, py + 6, 1, 1);
        ctx.fillRect(px + 1, py + 13, 2, 1);
        break;
      }

      case TILE_TYPES.PLATFORM: {
        // Thin stone platform with crystal trim
        ctx.fillStyle = '#8a6350';
        ctx.fillRect(px, py, s, 5);
        ctx.fillStyle = '#3ddbd9';
        ctx.fillRect(px, py, s, 1);
        ctx.fillStyle = '#4f3428';
        ctx.fillRect(px, py + 4, s, 1);
        ctx.fillStyle = '#6b4a3a';
        ctx.fillRect(px + 3, py + 1, 1, 2);
        ctx.fillRect(px + 11, py + 1, 1, 2);
        break;
      }

      case TILE_TYPES.CRUMBLE: {
        // Find if this block is broken or trembling
        const cb = this.crumbleBlocks.find((b) => b.x === px && b.y === py);
        if (cb && cb.state === 'broken') {
          return; // Invisible when broken
        }
        const ox = cb ? cb.shakeX : 0;
        const drawX = px + ox;

        ctx.fillStyle = '#7a6bd6';
        ctx.fillRect(drawX, py, s, s);
        ctx.fillStyle = '#8f82e8';
        ctx.fillRect(drawX + 1, py + 1, 14, 14);

        // Crack line
        ctx.strokeStyle = '#2a2a5a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(drawX + 8, py + 1);
        ctx.lineTo(drawX + 6, py + 6);
        ctx.lineTo(drawX + 9, py + 9);
        ctx.lineTo(drawX + 7, py + 15);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(drawX + 9, py + 9);
        ctx.lineTo(drawX + 13, py + 11);
        ctx.stroke();

        // Shimmer glint
        ctx.fillStyle = '#c9c2ff';
        ctx.fillRect(drawX + 3, py + 3, 2, 1);
        break;
      }

      case TILE_TYPES.CHEST: {
        const chest = this.chests.find((c) => c.x === px && c.y === py);
        const bumpY = chest ? chest.bumpOffsetY : 0;
        const open = chest ? chest.isOpen : false;
        const drawY = py + bumpY;

        ctx.fillStyle = '#c8862e';
        ctx.fillRect(px, drawY, s, s);
        ctx.fillStyle = '#e0a040';
        ctx.fillRect(px + 1, drawY + 1, 14, 14);
        ctx.fillStyle = '#8a5a1a';
        ctx.fillRect(px, drawY + 7, s, 1);

        if (!open) {
          // Cyan Diamond Jewel on front
          ctx.fillStyle = '#3ddbd9';
          ctx.beginPath();
          ctx.moveTo(px + 8, drawY + 4);
          ctx.lineTo(px + 11, drawY + 7);
          ctx.lineTo(px + 8, drawY + 12);
          ctx.lineTo(px + 5, drawY + 7);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#a6f5f4';
          ctx.beginPath();
          ctx.moveTo(px + 8, drawY + 4);
          ctx.lineTo(px + 11, drawY + 7);
          ctx.lineTo(px + 8, drawY + 7);
          ctx.closePath();
          ctx.fill();
        } else {
          // Open dark slot
          ctx.fillStyle = '#4a2806';
          ctx.fillRect(px + 3, drawY + 2, 10, 4);
          ctx.fillStyle = '#c8862e';
          ctx.fillRect(px + 2, drawY, 12, 2);
        }
        break;
      }

      case TILE_TYPES.SPRING: {
        // Base plate
        ctx.fillStyle = '#6b4a3a';
        ctx.fillRect(px, py + 13, s, 3);
        // Moss pad
        ctx.fillStyle = '#5fbf5f';
        ctx.fillRect(px + 2, py + 11, 12, 2);
        // Spring coil zigzag
        ctx.strokeStyle = '#3f8f3f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 11);
        ctx.lineTo(px + 12, py + 9);
        ctx.lineTo(px + 4, py + 7);
        ctx.lineTo(px + 12, py + 5);
        ctx.stroke();
        // Top bounce cap
        ctx.fillStyle = '#8fe08f';
        ctx.fillRect(px + 3, py + 3, 10, 2);
        ctx.fillStyle = '#ffe8c2';
        ctx.fillRect(px + 5, py + 2, 2, 1);
        break;
      }

      case TILE_TYPES.SPIKES: {
        ctx.fillStyle = '#2a2a5a';
        ctx.fillRect(px, py + 13, s, 3);

        const drawSpike = (x0, y0, x1, y1, color) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(px + x0, py + 13);
          ctx.lineTo(px + (x0 + x1) / 2, py + y0);
          ctx.lineTo(px + x1, py + 13);
          ctx.closePath();
          ctx.fill();
        };

        drawSpike(0, 3, 4, 13, '#3ddbd9');
        drawSpike(4, 5, 8, 13, '#7ff0ee');
        drawSpike(8, 3, 12, 13, '#3ddbd9');
        drawSpike(12, 5, 16, 13, '#7ff0ee');
        break;
      }

      case TILE_TYPES.ACID: {
        const wave = Math.sin(frameCount * 0.1 + px * 0.2) * 1.5;
        // Glowing Acid pool
        ctx.fillStyle = '#9be15d';
        ctx.fillRect(px, py + 4, s, 12);
        // Surface highlight
        ctx.fillStyle = '#c8ff8a';
        ctx.fillRect(px, py + 4 + wave, s, 2);
        // Floating bubbles
        ctx.fillStyle = '#e6ffc0';
        if ((frameCount + px) % 40 < 20) {
          ctx.fillRect(px + 11, py + 7, 2, 2);
        }
        ctx.fillStyle = '#74b83a';
        ctx.fillRect(px + 2, py + 9, 3, 1);
        ctx.fillRect(px + 9, py + 12, 4, 1);
        break;
      }

      default:
        break;
    }
  }

  // Draw any active falling rocks
  drawFallingRocks(ctx) {
    for (const rock of this.fallingRocks) {
      if (rock.state === 'shattered') continue;
      const rx = rock.x + rock.shakeX;
      const ry = rock.y;

      ctx.fillStyle = '#7a7a8a';
      ctx.beginPath();
      ctx.moveTo(rx + 2, ry);
      ctx.lineTo(rx + 10, ry);
      ctx.lineTo(rx + 12, ry + 7);
      ctx.lineTo(rx + 8, ry + 13);
      ctx.lineTo(rx + 3, ry + 12);
      ctx.lineTo(rx, ry + 6);
      ctx.closePath();
      ctx.fill();

      // Rock highlights
      ctx.fillStyle = '#9a9aab';
      ctx.beginPath();
      ctx.moveTo(rx + 2, ry);
      ctx.lineTo(rx + 10, ry);
      ctx.lineTo(rx + 8, ry + 5);
      ctx.lineTo(rx + 4, ry + 5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#4a4a5a';
      ctx.fillRect(rx + 5, ry + 7, 3, 1);
      ctx.fillRect(rx + 7, ry + 5, 1, 3);
    }
  }
}
