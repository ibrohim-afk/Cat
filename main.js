/**
 * Main game engine for "Kiko & Gua Kristal".
 * Pixel-art 2D side-scrolling platformer using pure HTML5 Canvas & vanilla JS.
 * Features:
 * - Fixed 60 FPS timestep loop with delta time clamping
 * - 3-layer parallax cave background
 * - Dynamic darkness lighting with radial light mask around Kiko & Lantern
 * - Floating ambient dust motes and ceiling water drips
 * - Camera lerp smoothing and trauma screen shake
 * - Unified input hub (keyboard, touch, and auto-start)
 */

import { CONFIG } from './config.js';
import { Player } from './player.js';
import { Level, LEVEL_DATA } from './level.js';
import { UIManager } from './ui.js';
import { sounds } from './audio.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.lightCanvas = document.createElement('canvas');
    this.lightCtx = this.lightCanvas.getContext('2d');

    // Virtual resolution
    this.viewW = CONFIG.VIEW_WIDTH;
    this.viewH = CONFIG.VIEW_HEIGHT;
    this.canvas.width = this.viewW;
    this.canvas.height = this.viewH;
    this.lightCanvas.width = this.viewW;
    this.lightCanvas.height = this.viewH;

    // Crisp pixel art settings
    this.ctx.imageSmoothingEnabled = false;
    this.lightCtx.imageSmoothingEnabled = false;

    // Game state: 'title' | 'playing' | 'paused' | 'gameover'
    this.state = 'title';
    this.currentLevelIndex = 0;
    this.totalGameScore = 0;
    this.totalGameTime = 0;
    this.levelTime = 0;
    this.frameCount = 0;

    // Camera & Screen Shake
    this.camera = {
      x: 0,
      y: 0,
      w: this.viewW,
      h: this.viewH,
    };
    this.trauma = 0;

    // Ambient & Particle pools
    this.particles = [];
    this.dustMotes = [];
    this.waterDrips = [];
    this.initAmbientAtmosphere();

    // Input hub
    this.input = {
      left: false,
      right: false,
      jumpHeld: false,
      jumpPressed: false,
      dashPressed: false,
      touchKeys: { left: false, right: false, jump: false, dash: false },
      prevTouchKeys: { jump: false, dash: false },
    };

    // Instantiate game sub-systems
    this.level = new Level(this.currentLevelIndex);
    this.player = new Player(this.level.playerStartX, this.level.playerStartY);
    this.ui = new UIManager(this);

    this.bindInputs();

    // Check for ?autostart=1
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1') {
      this.startGame();
    } else {
      this.ui.showTitle();
    }

    // Start loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  initAmbientAtmosphere() {
    // 25 ambient floating dust motes
    for (let i = 0; i < 25; i++) {
      this.dustMotes.push({
        x: Math.random() * this.viewW,
        y: Math.random() * this.viewH,
        speedX: (Math.random() - 0.5) * 8,
        speedY: (Math.random() - 0.3) * 6,
        size: Math.random() < 0.3 ? 2 : 1,
        alpha: 0.2 + Math.random() * 0.4,
      });
    }

    // Water drips from cave ceiling
    for (let i = 0; i < 4; i++) {
      this.waterDrips.push({
        x: 40 + Math.random() * 800,
        y: 10 + Math.random() * 20,
        vy: 0,
        active: false,
        timer: Math.random() * 5,
        splashTimer: 0,
      });
    }
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      sounds.init();

      // Title screen quick-start
      if (this.state === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          this.startGame();
          return;
        }
      }

      // Pause toggle
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        this.togglePause();
        return;
      }

      // Mute toggle
      if (e.code === 'KeyM') {
        e.preventDefault();
        this.ui.muteBtn?.click();
        return;
      }

      // Movement & Actions
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.input.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.input.right = true;

      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (!this.input.jumpHeld) {
          this.input.jumpPressed = true;
        }
        this.input.jumpHeld = true;
      }

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyJ' || e.code === 'KeyX') {
        this.input.dashPressed = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.input.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.input.right = false;

      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.input.jumpHeld = false;
      }
    });

    // Clear inputs on blur so keys don't stick
    window.addEventListener('blur', () => {
      this.input.left = false;
      this.input.right = false;
      this.input.jumpHeld = false;
      this.input.jumpPressed = false;
      this.input.dashPressed = false;
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.input.left = false;
        this.input.right = false;
        this.input.jumpHeld = false;
        this.input.jumpPressed = false;
        this.input.dashPressed = false;
      }
    });
  }

  startGame() {
    this.currentLevelIndex = 0;
    this.totalGameScore = 0;
    this.totalGameTime = 0;
    this.loadLevel(0);
    this.state = 'playing';
    this.ui.showPlaying();
  }

  loadLevel(index) {
    this.currentLevelIndex = index;
    this.level = new Level(index);
    this.player = new Player(this.level.playerStartX, this.level.playerStartY);
    this.levelTime = 0;
    this.particles = [];
    this.camera.x = Math.max(0, this.player.x - this.viewW / 3);
    this.camera.y = Math.max(0, this.player.y - this.viewH / 2);
  }

  retryLevel() {
    this.player.reset(this.player.checkpointX, this.player.checkpointY);
    this.state = 'playing';
    this.ui.showPlaying();
  }

  restartLevel() {
    this.loadLevel(this.currentLevelIndex);
    this.state = 'playing';
    this.ui.showPlaying();
  }

  nextLevel() {
    const nextIdx = this.currentLevelIndex + 1;
    if (nextIdx < LEVEL_DATA.length) {
      this.loadLevel(nextIdx);
      this.state = 'playing';
      this.ui.showPlaying();
    } else {
      // Victory! Finished all 3 levels!
      this.state = 'victory';
      sounds.playLevelComplete();
      this.ui.showVictory(this.player.score, this.totalGameTime);
    }
  }

  restartGameFromBeginning() {
    this.startGame();
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.ui.showPaused();
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.ui.hidePaused();
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'playing';
      this.ui.hidePaused();
    }
  }

  goToTitle() {
    this.state = 'title';
    this.ui.showTitle();
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  addParticles(x, y, type, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 80;
      let color = '#3ddbd9';
      let life = 0.4 + Math.random() * 0.4;
      let size = 2;

      switch (type) {
        case 'dust':
          color = '#ffe8c2';
          size = 1.5;
          life = 0.3;
          break;
        case 'sparkleTosca':
          color = '#3ddbd9';
          break;
        case 'sparkleBlue':
          color = '#3d8bff';
          break;
        case 'sparkleGreen':
          color = '#3ddb7a';
          break;
        case 'sparkleRed':
          color = '#ff4d6d';
          break;
        case 'hearts':
          color = '#ff4d6d';
          size = 2.5;
          break;
        case 'mossPuff':
          color = '#5fbf5f';
          size = 2.5;
          break;
        case 'crystalPurple':
          color = '#9b5de5';
          break;
        case 'stoneDebris':
        case 'stoneChips':
        case 'rockDebris':
          color = '#8a8a99';
          size = 2.5;
          break;
        case 'spiderPuff':
          color = '#3a2f55';
          break;
        case 'crystalShards':
          color = '#7a6bd6';
          break;
        case 'acidBubbles':
          color = '#c8ff8a';
          break;
        case 'lanternGlow':
          color = '#ffd84d';
          break;
        case 'rainbowSparkles':
          color = `hsl(${Math.random() * 360}, 90%, 65%)`;
          break;
      }

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        color,
        size,
        life,
        maxLife: life,
      });
    }
  }

  loop(timestamp) {
    const rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Clamp dt to prevent physics tunneling
    const dt = Math.min(rawDt, 0.05);

    if (this.state === 'playing') {
      this.update(dt);
    }

    this.render();

    // Consume single-frame edge triggers
    this.input.jumpPressed = false;
    this.input.dashPressed = false;

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.frameCount++;
    this.levelTime += dt;
    this.totalGameTime += dt;

    // Merge Touch virtual inputs
    const touch = this.input.touchKeys;
    const prevTouch = this.input.prevTouchKeys;
    const mergedInput = {
      left: this.input.left || touch.left,
      right: this.input.right || touch.right,
      jumpHeld: this.input.jumpHeld || touch.jump,
      jumpPressed: this.input.jumpPressed || (touch.jump && !prevTouch.jump),
      dashPressed: this.input.dashPressed || (touch.dash && !prevTouch.dash),
    };
    this.input.prevTouchKeys = { ...touch };

    // Update Player
    const prevHp = this.player.hp;
    this.player.update(dt, mergedInput, this.level, (x, y, type, count) =>
      this.addParticles(x, y, type, count)
    );

    // Screen shake if took damage
    if (this.player.hp < prevHp) {
      this.addTrauma(0.5);
    }

    // Update Level entities (enemies, items, tiles)
    this.level.update(dt, this.player, (x, y, type, count) =>
      this.addParticles(x, y, type, count)
    );

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt; // slight particle gravity
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Ambient Drips & Dust
    this.updateAtmosphere(dt);

    // Camera smoothing (lerp to player)
    const targetCamX = this.player.x + this.player.w / 2 - this.viewW / 2;
    const targetCamY = this.player.y + this.player.h / 2 - this.viewH / 2;

    this.camera.x += (targetCamX - this.camera.x) * CONFIG.CAMERA_LERP;
    this.camera.y += (targetCamY - this.camera.y) * CONFIG.CAMERA_LERP;

    // Clamp camera within level bounds
    const maxX = Math.max(0, this.level.widthPx - this.viewW);
    const maxY = Math.max(0, this.level.heightPx - this.viewH);
    this.camera.x = Math.max(0, Math.min(this.camera.x, maxX));
    this.camera.y = Math.max(0, Math.min(this.camera.y, maxY));

    // Shake decay
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - CONFIG.SHAKE_DECAY * dt);
    }

    // Update HUD
    this.ui.updateHUD(this.player, this.level, this.levelTime);

    // Level Complete check
    if (this.player.levelCompleted && this.state === 'playing') {
      this.state = 'stage_clear';
      this.totalGameScore += this.player.score;
      this.ui.showStageClear(this.player, this.level, this.levelTime);
    }

    // Game Over check
    if (this.player.isDead && this.player.deathTimer >= 1.5 && this.state === 'playing') {
      this.state = 'gameover';
      this.ui.showGameOver({
        score: this.player.score,
        levelNum: this.level.levelIndex + 1,
        levelName: this.level.meta.name,
      });
    }
  }

  updateAtmosphere(dt) {
    // Dust motes drift
    for (const d of this.dustMotes) {
      d.x += d.speedX * dt;
      d.y += d.speedY * dt;
      if (d.x < 0) d.x = this.viewW;
      if (d.x > this.viewW) d.x = 0;
      if (d.y < 0) d.y = this.viewH;
      if (d.y > this.viewH) d.y = 0;
    }

    // Water drips from ceiling
    for (const drip of this.waterDrips) {
      drip.timer -= dt;
      if (!drip.active && drip.timer <= 0) {
        drip.active = true;
        drip.x = this.camera.x + 30 + Math.random() * (this.viewW - 60);
        drip.y = this.camera.y + 4;
        drip.vy = 20;
      } else if (drip.active) {
        drip.vy += 300 * dt;
        drip.y += drip.vy * dt;

        // Check if hit solid floor
        if (this.level.isSolidAt(drip.x, drip.y)) {
          drip.active = false;
          drip.timer = 3 + Math.random() * 6;
          this.addParticles(drip.x, drip.y - 2, 'sparkleTosca', 3);
        }
      }
    }
  }

  render() {
    const ctx = this.ctx;

    // Apply Screen Shake
    ctx.save();
    if (this.trauma > 0) {
      const shakeMag = this.trauma * this.trauma * 7;
      const ox = (Math.random() - 0.5) * shakeMag;
      const oy = (Math.random() - 0.5) * shakeMag;
      ctx.translate(Math.round(ox), Math.round(oy));
    }

    // 1. Clear background to dark purple #1b1033
    ctx.fillStyle = '#1b1033';
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    // 2. Parallax Layer 1: Far Cave Silhouette (scroll speed 0.1)
    this.drawParallaxFar(ctx);

    // 3. Parallax Layer 2: Mid Stalactites (scroll speed 0.3)
    this.drawParallaxMid(ctx);

    // 4. Parallax Layer 3: Near Crystal Formations (scroll speed 0.5)
    this.drawParallaxNear(ctx);

    // 5. World Rendering (Camera transform)
    ctx.save();
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    // Tiles, Items, Enemies
    this.level.draw(ctx, this.camera, this.frameCount);

    // Player (Kiko)
    this.player.draw(ctx);

    // Particles
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }

    // Water drips
    for (const drip of this.waterDrips) {
      if (drip.active) {
        ctx.fillStyle = '#7ff0ee';
        ctx.fillRect(Math.round(drip.x), Math.round(drip.y), 1, 3);
      }
    }

    ctx.restore();

    // 6. Dynamic Cave Darkness & Light Mask
    this.renderDarknessAndLighting(ctx);

    // 7. Ambient floating dust motes
    ctx.fillStyle = '#ffe8c2';
    for (const d of this.dustMotes) {
      ctx.globalAlpha = d.alpha;
      ctx.fillRect(Math.round(d.x), Math.round(d.y), d.size, d.size);
    }
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }

  drawParallaxFar(ctx) {
    const camX = this.camera.x * 0.1;
    ctx.fillStyle = '#221a42';

    // Rolling cave wall silhouettes
    ctx.beginPath();
    ctx.moveTo(0, this.viewH);
    for (let x = 0; x <= this.viewW + 40; x += 30) {
      const worldX = x + camX;
      const y = this.viewH - 50 - Math.sin(worldX * 0.02) * 20 - Math.cos(worldX * 0.007) * 25;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.viewW, this.viewH);
    ctx.closePath();
    ctx.fill();
  }

  drawParallaxMid(ctx) {
    const camX = this.camera.x * 0.25;
    ctx.fillStyle = '#2a2a5a';

    // Hanging stalactites from ceiling
    const stalactiteSpacing = 80;
    const startIdx = Math.floor(camX / stalactiteSpacing);
    for (let i = startIdx; i < startIdx + 8; i++) {
      const sx = i * stalactiteSpacing - camX;
      const height = 35 + ((i * 17) % 35);
      const width = 20;

      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx + width / 2, height);
      ctx.lineTo(sx + width, 0);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawParallaxNear(ctx) {
    const camX = this.camera.x * 0.45;

    // Glowing crystal clusters on ground and walls
    const crystalSpacing = 95;
    const startIdx = Math.floor(camX / crystalSpacing);
    for (let i = startIdx; i < startIdx + 6; i++) {
      const cx = i * crystalSpacing - camX;
      const cy = this.viewH - 15;
      const isPurple = i % 2 === 0;

      ctx.fillStyle = isPurple ? '#9b5de5' : '#3ddbd9';
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 6, cy - 22);
      ctx.lineTo(cx + 12, cy);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isPurple ? '#c9a6ff' : '#7ff0ee';
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy);
      ctx.lineTo(cx + 16, cy - 14);
      ctx.lineTo(cx + 22, cy);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }

  renderDarknessAndLighting(ctx) {
    const lCtx = this.lightCtx;

    // 1. Fill light canvas with cave darkness
    lCtx.clearRect(0, 0, this.viewW, this.viewH);
    lCtx.fillStyle = 'rgba(27, 16, 51, 0.82)';
    lCtx.fillRect(0, 0, this.viewW, this.viewH);

    // 2. Cut out light circle around Kiko using 'destination-out'
    lCtx.save();
    lCtx.globalCompositeOperation = 'destination-out';

    const playerScreenX = this.player.x + this.player.w / 2 - this.camera.x;
    const playerScreenY = this.player.y + this.player.h / 2 - this.camera.y;

    // Light radius: 65px base, expands to 160px when holding Lantern!
    const baseRadius = this.player.lanternTimer > 0 ? 155 : 68;
    // Gentle breathing flicker
    const flicker = Math.sin(this.frameCount * 0.1) * 3;
    const radius = baseRadius + flicker;

    const radial = lCtx.createRadialGradient(
      playerScreenX,
      playerScreenY,
      10,
      playerScreenX,
      playerScreenY,
      radius
    );
    radial.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    radial.addColorStop(0.5, 'rgba(0, 0, 0, 0.85)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

    lCtx.fillStyle = radial;
    lCtx.beginPath();
    lCtx.arc(playerScreenX, playerScreenY, radius, 0, Math.PI * 2);
    lCtx.fill();

    // 3. Cut out smaller glow for exit gate and key
    for (const item of this.level.items) {
      if (!item.collected) {
        const itemScreenX = item.x + item.w / 2 - this.camera.x;
        const itemScreenY = item.y + item.h / 2 - this.camera.y;

        if (
          itemScreenX >= -40 &&
          itemScreenX <= this.viewW + 40 &&
          itemScreenY >= -40 &&
          itemScreenY <= this.viewH + 40
        ) {
          const itemRadius = item.type === 'gate' ? 42 : 24;
          const itemGlow = lCtx.createRadialGradient(
            itemScreenX,
            itemScreenY,
            2,
            itemScreenX,
            itemScreenY,
            itemRadius
          );
          itemGlow.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
          itemGlow.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

          lCtx.fillStyle = itemGlow;
          lCtx.beginPath();
          lCtx.arc(itemScreenX, itemScreenY, itemRadius, 0, Math.PI * 2);
          lCtx.fill();
        }
      }
    }

    lCtx.restore();

    // 4. Composite darkness layer onto main canvas
    ctx.drawImage(this.lightCanvas, 0, 0);

    // 5. Warm amber glow around lantern if active
    if (this.player.lanternTimer > 0) {
      ctx.save();
      const warmGrad = ctx.createRadialGradient(
        playerScreenX,
        playerScreenY,
        10,
        playerScreenX,
        playerScreenY,
        radius * 0.7
      );
      warmGrad.addColorStop(0, 'rgba(255, 216, 77, 0.18)');
      warmGrad.addColorStop(1, 'rgba(255, 216, 77, 0.0)');
      ctx.fillStyle = warmGrad;
      ctx.beginPath();
      ctx.arc(playerScreenX, playerScreenY, radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// Boot game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.kikoGame = new Game();
});
