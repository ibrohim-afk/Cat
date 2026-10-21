/**
 * UI & Game State Manager for Kiko & Gua Kristal.
 * Handles:
 * - HUD (Hearts sockets, Gem count, Level info, Timer, Dash cooldown bar, Powerup badges)
 * - Title Screen with custom Kiko emblem & data-start="true"
 * - Pause Modal (P / Esc)
 * - Level Complete Modal (Stars 1-3 rating & next level button)
 * - Game Over Modal (Retry from checkpoint / restart)
 * - Victory Screen (Final score, mastery stats, play again)
 * - Touch screen on-screen controls for mobile
 */

import { sounds } from './audio.js';
import { calculateLevelStars } from './src/rules.ts';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.highScore = parseInt(localStorage.getItem('kiko_high_score') || '0', 10);

    // Cache DOM Elements
    this.titleScreen = document.getElementById('title-screen');
    this.hudElement = document.getElementById('hud');
    this.pauseModal = document.getElementById('pause-modal');
    this.gameOverModal = document.getElementById('game-over-modal');
    this.stageClearModal = document.getElementById('stage-clear-modal');
    this.victoryModal = document.getElementById('victory-modal');
    this.touchControls = document.getElementById('touch-controls');

    this.hudHearts = document.getElementById('hud-hearts');
    this.hudGems = document.getElementById('hud-gems');
    this.hudLevel = document.getElementById('hud-level');
    this.hudTimer = document.getElementById('hud-timer');
    this.hudDashFill = document.getElementById('hud-dash-fill');
    this.hudBuffs = document.getElementById('hud-buffs');
    this.muteBtn = document.getElementById('btn-mute');

    this.bindEvents();
    this.updateMuteButtonVisual();
  }

  bindEvents() {
    // Start Game from Title
    const startBtn = document.getElementById('btn-start-game');
    if (startBtn) {
      startBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        sounds.init();
        this.game.startGame();
      });
    }

    // Sound Mute Toggle
    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        const muted = sounds.toggleMute();
        this.updateMuteButtonVisual();
      });
    }

    // Pause button in HUD
    const pauseBtn = document.getElementById('btn-hud-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.game.togglePause();
      });
    }

    // Pause Modal buttons
    document.getElementById('btn-resume')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.game.resume();
    });
    document.getElementById('btn-restart-pause')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.game.restartLevel();
    });
    document.getElementById('btn-title-pause')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.game.goToTitle();
    });

    // Game Over buttons
    document.getElementById('btn-retry-checkpoint')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.game.retryLevel();
    });
    document.getElementById('btn-title-gameover')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.game.goToTitle();
    });

    // Stage Clear button
    document.getElementById('btn-next-level')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.game.nextLevel();
    });

    // Victory button
    document.getElementById('btn-play-again')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.game.restartGameFromBeginning();
    });

    // Setup Touch Virtual Controls
    this.bindTouchControls();
  }

  bindTouchControls() {
    const bindBtn = (id, keyName) => {
      const el = document.getElementById(id);
      if (!el) return;

      const handlePress = (e) => {
        e.preventDefault();
        sounds.init();
        this.game.input.touchKeys[keyName] = true;
      };
      const handleRelease = (e) => {
        e.preventDefault();
        this.game.input.touchKeys[keyName] = false;
      };

      el.addEventListener('touchstart', handlePress, { passive: false });
      el.addEventListener('touchend', handleRelease, { passive: false });
      el.addEventListener('touchcancel', handleRelease, { passive: false });
      el.addEventListener('mousedown', handlePress);
      el.addEventListener('mouseup', handleRelease);
      el.addEventListener('mouseleave', handleRelease);
    };

    bindBtn('touch-left', 'left');
    bindBtn('touch-right', 'right');
    bindBtn('touch-jump', 'jump');
    bindBtn('touch-dash', 'dash');
  }

  updateMuteButtonVisual() {
    if (!this.muteBtn) return;
    this.muteBtn.setAttribute('aria-label', sounds.isMuted ? 'Unmute Sound' : 'Mute Sound');
    this.muteBtn.innerHTML = sounds.isMuted
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
  }

  showTitle() {
    document.body.dataset.state = 'title';
    this.titleScreen.classList.remove('hidden');
    this.hudElement.classList.add('hidden');
    this.pauseModal.classList.add('hidden');
    this.gameOverModal.classList.add('hidden');
    this.stageClearModal.classList.add('hidden');
    this.victoryModal.classList.add('hidden');

    const highEl = document.getElementById('title-high-score');
    if (highEl) {
      highEl.textContent = String(this.highScore);
    }
  }

  showPlaying() {
    document.body.dataset.state = 'playing';
    this.titleScreen.classList.add('hidden');
    this.hudElement.classList.remove('hidden');
    this.pauseModal.classList.add('hidden');
    this.gameOverModal.classList.add('hidden');
    this.stageClearModal.classList.add('hidden');
    this.victoryModal.classList.add('hidden');
  }

  showPaused() {
    document.body.dataset.state = 'paused';
    this.pauseModal.classList.remove('hidden');
  }

  hidePaused() {
    document.body.dataset.state = 'playing';
    this.pauseModal.classList.add('hidden');
  }

  showGameOver(stats) {
    document.body.dataset.state = 'gameover';
    this.gameOverModal.classList.remove('hidden');

    document.getElementById('gameover-score').textContent = String(stats.score);
    document.getElementById('gameover-level').textContent = `Level ${stats.levelNum}: ${stats.levelName}`;
  }

  showStageClear(player, level, timeTakenSec) {
    document.body.dataset.state = 'gameover';
    this.stageClearModal.classList.remove('hidden');

    const rating = calculateLevelStars(
      {
        blueGems: player.gemsBlue,
        greenGems: player.gemsGreen,
        redGems: player.gemsRed,
        timeTakenSec,
        timeParSec: level.meta.parTime,
        damageTaken: player.damageTakenCount,
      },
      level.totalPossibleGemsValue
    );

    // Save high score
    if (player.score > this.highScore) {
      this.highScore = player.score;
      localStorage.setItem('kiko_high_score', String(this.highScore));
    }

    document.getElementById('stage-title').textContent = `${level.meta.name} Selesai!`;
    document.getElementById('stage-time').textContent = `${timeTakenSec.toFixed(1)}s (Par: ${level.meta.parTime}s)`;
    document.getElementById('stage-gems').textContent = `${rating.gemPercent}% didapat`;
    document.getElementById('stage-score').textContent = String(player.score);
    document.getElementById('stage-bonus').textContent = `+${rating.timeBonus} waktu, +${rating.noDamageBonus} no-damage`;

    // Render 3 stars with crisp SVG
    const starsContainer = document.getElementById('stage-stars');
    if (starsContainer) {
      starsContainer.innerHTML = '';
      for (let i = 1; i <= 3; i++) {
        const isGolden = i <= rating.stars;
        const star = document.createElement('span');
        star.className = `star-icon ${isGolden ? 'star-gold' : 'star-dim'}`;
        star.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="${isGolden ? '#ffd84d' : '#4a4a66'}" stroke="${isGolden ? '#ff9a3c' : '#2a2a44'}" stroke-width="1.5"><polygon points="12,2 15,8.5 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 9,8.5"/></svg>`;
        starsContainer.appendChild(star);
      }
    }
  }

  showVictory(totalScore, totalTime) {
    document.body.dataset.state = 'gameover';
    this.victoryModal.classList.remove('hidden');

    if (totalScore > this.highScore) {
      this.highScore = totalScore;
      localStorage.setItem('kiko_high_score', String(this.highScore));
    }

    document.getElementById('victory-score').textContent = String(totalScore);
    document.getElementById('victory-time').textContent = `${Math.floor(totalTime / 60)}m ${Math.floor(totalTime % 60)}s`;
    document.getElementById('victory-high').textContent = String(this.highScore);
  }

  updateHUD(player, level, runTimer) {
    // Render Hearts (3 slots) with crisp SVG
    if (this.hudHearts) {
      let heartsHtml = '';
      for (let i = 0; i < player.maxHp; i++) {
        if (i < player.hp) {
          heartsHtml += `<span class="heart-pip heart-full" title="Nyawa"><svg width="18" height="18" viewBox="0 0 24 24" fill="#ff4d6d"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>`;
        } else {
          heartsHtml += `<span class="heart-pip heart-empty" title="Kosong"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5a3d55" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>`;
        }
      }
      this.hudHearts.innerHTML = heartsHtml;
    }

    // Gem count & score
    if (this.hudGems) {
      this.hudGems.textContent = String(player.score);
    }

    // Level indicator
    if (this.hudLevel) {
      this.hudLevel.textContent = `Lv.${level.levelIndex + 1} ${level.meta.name}`;
    }

    // Timer
    if (this.hudTimer) {
      const mins = Math.floor(runTimer / 60);
      const secs = Math.floor(runTimer % 60);
      this.hudTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Dash Cooldown bar
    if (this.hudDashFill) {
      const pct = player.dashCooldownTimer <= 0 ? 100 : Math.max(0, (1 - player.dashCooldownTimer / 1.0) * 100);
      this.hudDashFill.style.width = `${pct}%`;
      this.hudDashFill.style.backgroundColor = pct >= 100 ? '#3ddbd9' : '#ff9a3c';
    }

    // Active powerups & key indicator
    if (this.hudBuffs) {
      let buffHtml = '';
      if (player.hasKey) {
        buffHtml += `<span class="buff-badge buff-key" title="Kunci Kristal">🔑 KUNCI</span>`;
      }
      if (player.lanternTimer > 0) {
        buffHtml += `<span class="buff-badge buff-lantern" title="Lentera Terang">🕯 ${Math.ceil(player.lanternTimer)}s</span>`;
      }
      if (player.starTimer > 0) {
        buffHtml += `<span class="buff-badge buff-star" title="Bintang Kebal">★ ${Math.ceil(player.starTimer)}s</span>`;
      }
      this.hudBuffs.innerHTML = buffHtml;
    }
  }
}
