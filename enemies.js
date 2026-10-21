/**
 * Enemies module for Kiko & Gua Kristal.
 * 4 distinct original enemy archetypes:
 * 1. Slime Lumut (green): patrols platform, turns at ledge, stompable from above.
 * 2. Kelelawar Kristal (purple): sine wave flight, swoops toward player within 5 tiles, defeated by Cakar Dash.
 * 3. Golem Batu (grey): heavy stone, immune to stomps, destroyed only after 2 Cakar Dashes.
 * 4. Laba-laba Gantung: hangs from ceiling on silk thread, descends and ascends.
 */

import { CONFIG } from './config.js';
import { sounds } from './audio.js';
import { canDashDefeat } from './src/rules.ts';

export class Enemy {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.vx = 0;
    this.vy = 0;
    this.w = 14;
    this.h = 14;
    this.facing = -1; // -1: left, 1: right
    this.isDead = false;
    this.animTimer = Math.random() * 2;
    this.hitFlashTimer = 0;

    switch (type) {
      case 'slime':
        this.hp = 1;
        this.speed = 30;
        this.vx = -this.speed;
        this.w = 14;
        this.h = 12;
        break;
      case 'bat':
        this.hp = 1;
        this.speed = 36;
        this.vx = -this.speed;
        this.w = 14;
        this.h = 12;
        this.flyBaseY = y;
        this.isAggro = false;
        break;
      case 'golem':
        this.hp = 2; // Needs 2 dashes!
        this.speed = 18;
        this.vx = -this.speed;
        this.w = 14;
        this.h = 14;
        break;
      case 'spider':
        this.hp = 1;
        this.speed = 26;
        this.w = 14;
        this.h = 14;
        this.threadMaxY = y + 70;
        this.state = 'descending'; // descending | pause_bottom | ascending | pause_top
        this.pauseTimer = 0;
        break;
    }
  }

  update(dt, player, tilemap, addParticlesCallback) {
    if (this.isDead) return;

    this.animTimer += dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    switch (this.type) {
      case 'slime':
        this.updateSlime(dt, tilemap);
        break;
      case 'bat':
        this.updateBat(dt, player);
        break;
      case 'golem':
        this.updateGolem(dt, tilemap);
        break;
      case 'spider':
        this.updateSpider(dt);
        break;
    }

    // Check interaction with player
    this.checkPlayerCombat(player, addParticlesCallback);
  }

  updateSlime(dt, tilemap) {
    // Slime gravity and ground snap
    this.vy = (this.vy || 0) + CONFIG.GRAVITY * dt;
    this.y += this.vy * dt;
    const footY = this.y + this.h;
    if (tilemap.isSolidAt(this.x + 2, footY) || tilemap.isSolidAt(this.x + this.w - 2, footY)) {
      this.y = Math.floor(footY / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE - this.h;
      this.vy = 0;
    }

    // Horizontal movement
    this.x += this.vx * dt;

    // Check cliff or wall ahead
    const checkAheadX = this.vx > 0 ? this.x + this.w + 2 : this.x - 2;
    const wallAhead = tilemap.isSolidAt(checkAheadX, this.y + this.h / 2);
    const groundAhead = tilemap.isSolidAt(checkAheadX, this.y + this.h + 4);

    if (wallAhead || !groundAhead) {
      this.vx = -this.vx;
      this.facing = this.vx > 0 ? 1 : -1;
    }
  }

  updateBat(dt, player) {
    const distToPlayer = Math.hypot(
      (player.x + player.w / 2) - (this.x + this.w / 2),
      (player.y + player.h / 2) - (this.y + this.h / 2)
    );

    // Aggro if within 5 tiles (80px)
    if (distToPlayer < 80) {
      this.isAggro = true;
      const targetDirX = player.x < this.x ? -1 : 1;
      this.vx = targetDirX * (this.speed * 1.3);
      this.facing = targetDirX;
      // Fly towards player altitude
      const dy = player.y - this.y;
      this.y += Math.sign(dy) * Math.min(Math.abs(dy), 25 * dt);
    } else {
      this.isAggro = false;
      // Normal sine wave patrol
      this.x += this.vx * dt;
      this.y = this.flyBaseY + Math.sin(this.animTimer * 4) * 10;
      // Turn at boundaries (70px range)
      if (Math.abs(this.x - this.startX) > 60) {
        this.vx = -this.vx;
        this.facing = this.vx > 0 ? 1 : -1;
      }
    }
  }

  updateGolem(dt, tilemap) {
    // Golem gravity
    this.vy = (this.vy || 0) + CONFIG.GRAVITY * dt;
    this.y += this.vy * dt;
    const footY = this.y + this.h;
    if (tilemap.isSolidAt(this.x + 2, footY) || tilemap.isSolidAt(this.x + this.w - 2, footY)) {
      this.y = Math.floor(footY / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE - this.h;
      this.vy = 0;
    }

    this.x += this.vx * dt;

    const checkAheadX = this.vx > 0 ? this.x + this.w + 2 : this.x - 2;
    const wallAhead = tilemap.isSolidAt(checkAheadX, this.y + this.h / 2);
    const groundAhead = tilemap.isSolidAt(checkAheadX, this.y + this.h + 4);

    if (wallAhead || !groundAhead) {
      this.vx = -this.vx;
      this.facing = this.vx > 0 ? 1 : -1;
    }
  }

  updateSpider(dt) {
    if (this.state === 'descending') {
      this.y += this.speed * dt;
      if (this.y >= this.threadMaxY) {
        this.y = this.threadMaxY;
        this.state = 'pause_bottom';
        this.pauseTimer = 1.0;
      }
    } else if (this.state === 'pause_bottom') {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) {
        this.state = 'ascending';
      }
    } else if (this.state === 'ascending') {
      this.y -= this.speed * dt;
      if (this.y <= this.startY) {
        this.y = this.startY;
        this.state = 'pause_top';
        this.pauseTimer = 0.8;
      }
    } else if (this.state === 'pause_top') {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) {
        this.state = 'descending';
      }
    }
  }

  checkPlayerCombat(player, addParticlesCallback) {
    if (player.hp <= 0) return;

    const overlap =
      player.x < this.x + this.w &&
      player.x + player.w > this.x &&
      player.y < this.y + this.h &&
      player.y + player.h > this.y;

    if (!overlap) return;

    // 1. Invincible Star Power kills any enemy immediately
    if (player.starTimer > 0) {
      this.defeat(player, addParticlesCallback);
      return;
    }

    // 2. Cakar Dash Attack
    if (player.isDashing) {
      const { canDamage, newHp, killed } = canDashDefeat(this.type, this.hp, true);
      if (canDamage) {
        this.hp = newHp;
        this.hitFlashTimer = 0.15;
        if (killed) {
          this.defeat(player, addParticlesCallback);
        } else {
          sounds.playHurt();
          if (addParticlesCallback) {
            addParticlesCallback(this.x + 8, this.y + 8, 'stoneChips', 8);
          }
        }
        return;
      }
    }

    // 3. Jump Stomp (Player coming down onto enemy head)
    const isStomp = player.vy > 0 && (player.y + player.h - player.vy * 0.03) <= this.y + 6;

    if (isStomp) {
      if (this.type === 'slime') {
        // Slime squashed!
        player.vy = -210; // bounce player
        player.canDoubleJump = true;
        this.defeat(player, addParticlesCallback);
        return;
      } else if (this.type === 'golem') {
        // Golem is hard rock! Player bounces off harmlessly without damage
        player.vy = -220;
        player.canDoubleJump = true;
        sounds.playSpring();
        return;
      }
    }

    // 4. Player takes damage
    player.takeDamage(1, this.type);
  }

  defeat(player, addParticlesCallback) {
    this.isDead = true;
    sounds.playEnemyDefeat();
    player.score += this.type === 'golem' ? 100 : 30;

    if (addParticlesCallback) {
      const pType = this.type === 'slime' ? 'mossPuff' : this.type === 'bat' ? 'crystalPurple' : this.type === 'golem' ? 'stoneDebris' : 'spiderPuff';
      addParticlesCallback(this.x + 8, this.y + 8, pType, 12);
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    const px = Math.round(this.x);
    const py = Math.round(this.y);
    const frame = Math.floor(this.animTimer * 6) % 2;
    const isFlashing = this.hitFlashTimer > 0;

    ctx.save();
    if (this.facing === 1 && this.type !== 'spider') {
      ctx.translate(px + 8, py + 8);
      ctx.scale(-1, 1);
      ctx.translate(-(px + 8), -(py + 8));
    }

    switch (this.type) {
      case 'slime': {
        const squash = frame === 0 ? 0 : 1;
        // Moss Slime Body
        ctx.fillStyle = isFlashing ? '#ffffff' : '#5fbf5f';
        ctx.fillRect(px + 2, py + 8 + squash, 12, 6 - squash);
        ctx.fillRect(px + 4, py + 5 + squash, 8, 3);
        ctx.fillRect(px + 6, py + 4 + squash, 4, 1);
        // Base shadow
        ctx.fillStyle = isFlashing ? '#ffffff' : '#3f8f3f';
        ctx.fillRect(px + 2, py + 13, 12, 1);
        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 4, py + 6 + squash, 2, 2);
        ctx.fillRect(px + 8, py + 6 + squash, 2, 2);
        ctx.fillStyle = '#1b1033';
        ctx.fillRect(px + 5, py + 7 + squash, 1, 1);
        ctx.fillRect(px + 9, py + 7 + squash, 1, 1);
        // Cute slime cheek highlight
        ctx.fillStyle = '#8fe08f';
        ctx.fillRect(px + 3, py + 10, 2, 1);
        break;
      }

      case 'bat': {
        // Wings flapping
        const wingY = frame === 0 ? py + 3 : py + 7;
        ctx.fillStyle = isFlashing ? '#ffffff' : '#9b5de5';
        ctx.fillRect(px + 6, py + 5, 4, 5);
        ctx.fillRect(px + 6, py + 3, 1, 2);
        ctx.fillRect(px + 9, py + 3, 1, 2);

        // Wings
        ctx.fillStyle = isFlashing ? '#ffffff' : '#6a35b5';
        ctx.beginPath();
        ctx.moveTo(px + 6, py + 6);
        ctx.lineTo(px, wingY);
        ctx.lineTo(px + 2, py + 8);
        ctx.lineTo(px + 3, py + 11);
        ctx.lineTo(px + 6, py + 10);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(px + 10, py + 6);
        ctx.lineTo(px + 16, wingY);
        ctx.lineTo(px + 14, py + 8);
        ctx.lineTo(px + 13, py + 11);
        ctx.lineTo(px + 10, py + 10);
        ctx.closePath();
        ctx.fill();

        // Glowing crystal eyes
        ctx.fillStyle = '#3ddbd9';
        ctx.fillRect(px + 7, py + 6, 1, 1);
        ctx.fillRect(px + 9, py + 6, 1, 1);
        // Fangs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 7, py + 9, 1, 1);
        ctx.fillRect(px + 9, py + 9, 1, 1);
        break;
      }

      case 'golem': {
        const step = frame === 0 ? 0 : 1;
        // Grey Stone Golem
        ctx.fillStyle = isFlashing ? '#ffffff' : '#8a8a99';
        ctx.fillRect(px + 3, py + 3, 10, 11);
        ctx.fillRect(px + 5, py + 1, 6, 2);
        // Arms
        ctx.fillStyle = isFlashing ? '#ffffff' : '#6a6a7a';
        ctx.fillRect(px + 1, py + 6 + step, 2, 6);
        ctx.fillRect(px + 13, py + 6 - step, 2, 6);
        // Heavy base
        ctx.fillStyle = '#5a5a6a';
        ctx.fillRect(px + 3, py + 12, 10, 2);
        // Glowing orange cyclops eye
        ctx.fillStyle = this.hp === 1 ? '#ff4d6d' : '#ff9a3c';
        ctx.fillRect(px + 5, py + 5, 2, 2);
        ctx.fillRect(px + 9, py + 5, 2, 2);
        // Mouth crack
        ctx.fillStyle = '#3a3a4a';
        ctx.fillRect(px + 6, py + 9, 4, 1);
        // Cracked fissure if damaged
        if (this.hp === 1) {
          ctx.strokeStyle = '#2a2a3a';
          ctx.beginPath();
          ctx.moveTo(px + 7, py + 2);
          ctx.lineTo(px + 9, py + 8);
          ctx.stroke();
        }
        break;
      }

      case 'spider': {
        // Silky thread from ceiling
        ctx.fillStyle = '#d9d9ef';
        ctx.fillRect(px + 8, this.startY - 16, 1, py - (this.startY - 16) + 6);

        // Body
        ctx.fillStyle = isFlashing ? '#ffffff' : '#3a2f55';
        ctx.fillRect(px + 5, py + 6, 7, 5);
        ctx.fillRect(px + 6, py + 5, 5, 1);

        // Glowing red eyes
        ctx.fillStyle = '#ff5a5a';
        ctx.fillRect(px + 6, py + 7, 2, 2);
        ctx.fillRect(px + 9, py + 7, 2, 2);

        // Twitching legs
        const legWiggle = frame === 0 ? 0 : 1;
        ctx.fillStyle = isFlashing ? '#ffffff' : '#3a2f55';
        ctx.fillRect(px + 2, py + 6 + legWiggle, 3, 1);
        ctx.fillRect(px + 1, py + 7 + legWiggle, 1, 3);
        ctx.fillRect(px + 2, py + 10 - legWiggle, 3, 1);

        ctx.fillRect(px + 12, py + 6 + legWiggle, 3, 1);
        ctx.fillRect(px + 15, py + 7 + legWiggle, 1, 3);
        ctx.fillRect(px + 12, py + 10 - legWiggle, 3, 1);
        break;
      }
    }

    ctx.restore();
  }
}
