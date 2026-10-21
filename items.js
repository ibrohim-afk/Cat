/**
 * Items module for Kiko & Gua Kristal.
 * Handles item entities, animations, collection logic, and rendering:
 * - Blue, Green, Red gems (spinning & sparkling)
 * - Goldfish (heals 1 heart)
 * - Lantern (expands darkness vision for 15s)
 * - Star Feather (8s rainbow invincibility)
 * - Crystal Key & Exit Gate
 * - Checkpoint Flag
 */

import { sounds } from './audio.js';

export const ITEM_TYPES = {
  GEM_BLUE: 'gem-blue',
  GEM_GREEN: 'gem-green',
  GEM_RED: 'gem-red',
  GOLDFISH: 'goldfish',
  LANTERN: 'lantern',
  STAR_FEATHER: 'star-feather',
  KEY: 'key',
  GATE: 'gate',
  CHECKPOINT: 'checkpoint',
};

export class Item {
  constructor(type, x, y, options = {}) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.startY = y;
    this.w = 16;
    this.h = 16;
    this.collected = false;
    this.animTimer = Math.random() * 5;
    this.options = options;

    // For floating items
    this.floatOffset = 0;
    this.sparkleTimer = 0;

    // Specific item states
    if (type === ITEM_TYPES.CHECKPOINT) {
      this.isActivated = false;
    } else if (type === ITEM_TYPES.GATE) {
      this.isOpen = false;
      this.w = 16;
      this.h = 16;
    }
  }

  update(dt, player, addParticlesCallback) {
    if (this.collected && this.type !== ITEM_TYPES.GATE && this.type !== ITEM_TYPES.CHECKPOINT) {
      return;
    }

    this.animTimer += dt;
    this.sparkleTimer += dt;

    // Gentle bobbing motion
    if (this.type !== ITEM_TYPES.GATE && this.type !== ITEM_TYPES.CHECKPOINT) {
      this.floatOffset = Math.sin(this.animTimer * 4) * 2;
    }

    // Check collision with player
    const itemBox = {
      x: this.x + 2,
      y: this.y + this.floatOffset + 2,
      w: this.w - 4,
      h: this.h - 4,
    };

    if (
      player.x < itemBox.x + itemBox.w &&
      player.x + player.w > itemBox.x &&
      player.y < itemBox.y + itemBox.h &&
      player.y + player.h > itemBox.y
    ) {
      this.onCollect(player, addParticlesCallback);
    }
  }

  onCollect(player, addParticlesCallback) {
    switch (this.type) {
      case ITEM_TYPES.GEM_BLUE:
        if (this.collected) return;
        this.collected = true;
        player.gemsBlue++;
        player.score += 1;
        sounds.playGem('blue');
        if (addParticlesCallback) addParticlesCallback(this.x + 8, this.y + 8, 'sparkleBlue', 6);
        break;

      case ITEM_TYPES.GEM_GREEN:
        if (this.collected) return;
        this.collected = true;
        player.gemsGreen++;
        player.score += 5;
        sounds.playGem('green');
        if (addParticlesCallback) addParticlesCallback(this.x + 8, this.y + 8, 'sparkleGreen', 8);
        break;

      case ITEM_TYPES.GEM_RED:
        if (this.collected) return;
        this.collected = true;
        player.gemsRed++;
        player.score += 10;
        sounds.playGem('red');
        if (addParticlesCallback) addParticlesCallback(this.x + 8, this.y + 8, 'sparkleRed', 10);
        break;

      case ITEM_TYPES.GOLDFISH:
        if (this.collected) return;
        this.collected = true;
        if (player.hp < player.maxHp) {
          player.hp++;
        }
        player.score += 25;
        sounds.playFish();
        if (addParticlesCallback) addParticlesCallback(this.x + 8, this.y + 8, 'hearts', 8);
        break;

      case ITEM_TYPES.LANTERN:
        if (this.collected) return;
        this.collected = true;
        player.lanternTimer = 15.0; // 15 seconds wider vision
        player.score += 20;
        sounds.playPowerup();
        if (addParticlesCallback) addParticlesCallback(this.x + 8, this.y + 8, 'lanternGlow', 12);
        break;

      case ITEM_TYPES.STAR_FEATHER:
        if (this.collected) return;
        this.collected = true;
        player.starTimer = 8.0; // 8s invincibility
        player.score += 50;
        sounds.playPowerup();
        if (addParticlesCallback) addParticlesCallback(this.x + 8, this.y + 8, 'rainbowSparkles', 16);
        break;

      case ITEM_TYPES.KEY:
        if (this.collected) return;
        this.collected = true;
        player.hasKey = true;
        sounds.playCheckpoint();
        if (addParticlesCallback) addParticlesCallback(this.x + 8, this.y + 8, 'sparkleTosca', 12);
        break;

      case ITEM_TYPES.CHECKPOINT:
        if (!this.isActivated) {
          this.isActivated = true;
          player.checkpointX = this.x;
          player.checkpointY = this.y - 4;
          sounds.playCheckpoint();
          if (addParticlesCallback) addParticlesCallback(this.x + 8, this.y + 8, 'sparkleTosca', 14);
        }
        break;

      case ITEM_TYPES.GATE:
        if (player.hasKey && !this.isOpen) {
          this.isOpen = true;
          sounds.playLevelComplete();
          if (addParticlesCallback) addParticlesCallback(this.x + 8, this.y + 8, 'rainbowSparkles', 20);
        }
        if (this.isOpen && !player.levelCompleted) {
          player.levelCompleted = true;
        }
        break;
    }
  }

  draw(ctx) {
    if (this.collected && this.type !== ITEM_TYPES.GATE && this.type !== ITEM_TYPES.CHECKPOINT) {
      return;
    }

    const px = Math.round(this.x);
    const py = Math.round(this.y + this.floatOffset);

    switch (this.type) {
      case ITEM_TYPES.GEM_BLUE:
      case ITEM_TYPES.GEM_GREEN:
      case ITEM_TYPES.GEM_RED: {
        const isBlue = this.type === ITEM_TYPES.GEM_BLUE;
        const isGreen = this.type === ITEM_TYPES.GEM_GREEN;
        const baseColor = isBlue ? '#3d8bff' : isGreen ? '#3ddb7a' : '#ff4d6d';
        const lightColor = isBlue ? '#8fc0ff' : isGreen ? '#9bf5bf' : '#ffa3b3';
        const darkColor = isBlue ? '#2a63c0' : isGreen ? '#22a055' : '#b8243f';

        // 3D rotation wobble
        const rot = Math.cos(this.animTimer * 5);
        const wHalf = 6 * Math.abs(rot);

        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 1);
        ctx.lineTo(px + 8 + wHalf, py + 6);
        ctx.lineTo(px + 8, py + 15);
        ctx.lineTo(px + 8 - wHalf, py + 6);
        ctx.closePath();
        ctx.fill();

        // Shading split
        if (wHalf > 1) {
          ctx.fillStyle = lightColor;
          ctx.beginPath();
          ctx.moveTo(px + 8, py + 1);
          ctx.lineTo(px + 8 + wHalf, py + 6);
          ctx.lineTo(px + 8, py + 6);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = darkColor;
          ctx.beginPath();
          ctx.moveTo(px + 8 - wHalf, py + 6);
          ctx.lineTo(px + 8, py + 6);
          ctx.lineTo(px + 8, py + 15);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }

      case ITEM_TYPES.GOLDFISH: {
        // Body
        ctx.fillStyle = '#ffb03c';
        ctx.beginPath();
        ctx.ellipse(px + 7, py + 8, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail flapping
        const tailFlap = Math.sin(this.animTimer * 12) * 2;
        ctx.fillStyle = '#ff9a3c';
        ctx.beginPath();
        ctx.moveTo(px + 11, py + 8);
        ctx.lineTo(px + 15, py + 4 + tailFlap);
        ctx.lineTo(px + 15, py + 12 - tailFlap);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 3, py + 7, 2, 2);
        ctx.fillStyle = '#1b1033';
        ctx.fillRect(px + 3, py + 7, 1, 1);

        // Fin
        ctx.fillStyle = '#ffd27a';
        ctx.fillRect(px + 6, py + 5, 1, 6);
        break;
      }

      case ITEM_TYPES.LANTERN: {
        // Lantern fixture
        ctx.fillStyle = '#8a8a99';
        ctx.fillRect(px + 7, py, 2, 2);
        ctx.fillRect(px + 4, py + 2, 8, 2);
        ctx.fillRect(px + 4, py + 12, 8, 2);

        // Glowing glass
        ctx.fillStyle = '#ffd84d';
        ctx.fillRect(px + 4, py + 4, 8, 8);
        ctx.fillStyle = '#fff6b0';
        ctx.fillRect(px + 6, py + 6, 4, 4);
        ctx.fillStyle = '#e0b020';
        ctx.fillRect(px + 4, py + 4, 1, 8);
        break;
      }

      case ITEM_TYPES.STAR_FEATHER: {
        // 5-pointed star
        ctx.fillStyle = '#ffd84d';
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 1);
        ctx.lineTo(px + 10, py + 6);
        ctx.lineTo(px + 15, py + 6);
        ctx.lineTo(px + 11, py + 9);
        ctx.lineTo(px + 13, py + 15);
        ctx.lineTo(px + 8, py + 11);
        ctx.lineTo(px + 3, py + 15);
        ctx.lineTo(px + 5, py + 9);
        ctx.lineTo(px + 1, py + 6);
        ctx.lineTo(px + 6, py + 6);
        ctx.closePath();
        ctx.fill();

        // Star highlight
        ctx.fillStyle = '#fff6b0';
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 1);
        ctx.lineTo(px + 10, py + 6);
        ctx.lineTo(px + 8, py + 8);
        ctx.lineTo(px + 6, py + 6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ff9a3c';
        ctx.fillRect(px + 7, py + 7, 2, 2);
        break;
      }

      case ITEM_TYPES.KEY: {
        ctx.fillStyle = '#3ddbd9';
        ctx.fillRect(px + 1, py + 5, 6, 6);
        ctx.fillStyle = '#1b1033';
        ctx.fillRect(px + 3, py + 7, 2, 2);
        ctx.fillStyle = '#3ddbd9';
        ctx.fillRect(px + 7, py + 7, 8, 2);
        ctx.fillRect(px + 12, py + 9, 2, 3);
        ctx.fillStyle = '#a6f5f4';
        ctx.fillRect(px + 1, py + 5, 6, 1);
        break;
      }

      case ITEM_TYPES.GATE: {
        // Gate pillars
        ctx.fillStyle = '#2a2a5a';
        ctx.fillRect(px + 1, py, 14, 16);
        ctx.fillStyle = '#1b1033';
        ctx.fillRect(px + 3, py + 2, 10, 14);

        // Frame
        ctx.fillStyle = '#3ddbd9';
        ctx.fillRect(px + 3, py + 2, 1, 14);
        ctx.fillRect(px + 12, py + 2, 1, 14);
        ctx.fillRect(px + 3, py + 2, 10, 1);
        ctx.fillRect(px + 7, py + 2, 2, 14);

        // Core jewel (glows when unlocked)
        if (this.isOpen) {
          const glow = (Math.sin(this.animTimer * 8) + 1) * 0.5;
          ctx.fillStyle = '#3ddbd9';
          ctx.beginPath();
          ctx.moveTo(px + 8, py + 4);
          ctx.lineTo(px + 11, py + 8);
          ctx.lineTo(px + 8, py + 12);
          ctx.lineTo(px + 5, py + 8);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px + 7, py + 7, 2, 2);
        } else {
          ctx.fillStyle = '#ff9a3c';
          ctx.beginPath();
          ctx.moveTo(px + 8, py + 5);
          ctx.lineTo(px + 10, py + 8);
          ctx.lineTo(px + 8, py + 11);
          ctx.lineTo(px + 6, py + 8);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }

      case ITEM_TYPES.CHECKPOINT: {
        // Flag pole
        ctx.fillStyle = '#d9d9ef';
        ctx.fillRect(px + 3, py + 1, 1, 15);

        // Pennant flag
        const flagColor = this.isActivated ? '#3ddbd9' : '#6a6a8a';
        const flagLight = this.isActivated ? '#a6f5f4' : '#9a9aba';
        const wave = Math.sin(this.animTimer * 5) * 1.5;

        ctx.fillStyle = flagColor;
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 2);
        ctx.lineTo(px + 14 + wave, py + 5);
        ctx.lineTo(px + 4, py + 9);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = flagLight;
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 2);
        ctx.lineTo(px + 14 + wave, py + 5);
        ctx.lineTo(px + 4, py + 5);
        ctx.closePath();
        ctx.fill();
        break;
      }
    }
  }
}
