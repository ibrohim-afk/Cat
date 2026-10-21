/**
 * Player module for Kiko & Gua Kristal.
 * Kiko the orange cat:
 * - 16x16 pixel sprite, orange fur, cream snout/belly, triangular ears, curved tail, blue scarf, big green eyes
 * - Animations: idle (2-frame tail wag), run (4-frame cycle), jump, fall, dash, hurt (blink), die (spin)
 * - Variable jump, double jump, Cakar Dash with 1s cooldown
 * - Health management, powerups (lantern, star), dust & sparkle particles
 */

import { CONFIG } from './config.js';
import { sounds } from './audio.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.checkpointX = x;
    this.checkpointY = y;

    this.w = 14;
    this.h = 14;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1: right, -1: left

    // Health & Score
    this.maxHp = CONFIG.MAX_HEARTS;
    this.hp = this.maxHp;
    this.score = 0;
    this.gemsBlue = 0;
    this.gemsGreen = 0;
    this.gemsRed = 0;
    this.damageTakenCount = 0;
    this.hasKey = false;
    this.levelCompleted = false;

    // Movement & Timers
    this.isGrounded = false;
    this.wasGrounded = false;
    this.canDoubleJump = true;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;

    // Dash
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.dashDir = 1;

    // States & Powerups
    this.invincibleTimer = 0;
    this.lanternTimer = 0;
    this.starTimer = 0;
    this.isDead = false;
    this.deathTimer = 0;

    // Animations
    this.animTimer = 0;
    this.runFrame = 0;
    this.tailTimer = 0;
    this.squashScaleX = 1.0;
    this.squashScaleY = 1.0;
  }

  reset(x = this.checkpointX, y = this.checkpointY) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.isDead = false;
    this.deathTimer = 0;
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.invincibleTimer = 0.5; // brief safety window
    this.levelCompleted = false;
    this.canDoubleJump = true;
    this.squashScaleX = 1.0;
    this.squashScaleY = 1.0;
  }

  update(dt, input, tilemap, addParticlesCallback) {
    this.animTimer += dt;
    this.tailTimer += dt;

    // Handle Death Animation
    if (this.isDead) {
      this.deathTimer += dt;
      this.vy += CONFIG.GRAVITY * 0.7 * dt;
      this.y += this.vy * dt;
      return;
    }

    // Cooldown timers
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.lanternTimer > 0) this.lanternTimer -= dt;
    if (this.starTimer > 0) {
      this.starTimer -= dt;
      // Star invincibility sparkles
      if (Math.random() < 0.4 && addParticlesCallback) {
        addParticlesCallback(this.x + 8 + (Math.random() - 0.5) * 12, this.y + 8, 'rainbowSparkles', 1);
      }
    }

    // Smooth squash and stretch recovery
    this.squashScaleX += (1.0 - this.squashScaleX) * 10 * dt;
    this.squashScaleY += (1.0 - this.squashScaleY) * 10 * dt;

    // Dash Execution
    if (this.isDashing) {
      this.dashTimer -= dt;
      this.vx = this.dashDir * CONFIG.DASH_SPEED;
      this.vy = 0; // ignore gravity during dash

      // Emit crystal particles
      if (addParticlesCallback && Math.random() < 0.7) {
        addParticlesCallback(
          this.x + (this.dashDir > 0 ? 2 : 14),
          this.y + 7 + (Math.random() - 0.5) * 6,
          'sparkleTosca',
          2
        );
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.vx *= 0.4;
      }
    } else {
      // Normal Horizontal Acceleration & Friction
      const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

      if (moveDir !== 0) {
        this.facing = moveDir;
        const accel = this.isGrounded ? CONFIG.ACCEL : CONFIG.AIR_ACCEL;
        this.vx += moveDir * accel * dt;
        if (Math.abs(this.vx) > CONFIG.MOVE_SPEED) {
          this.vx = moveDir * CONFIG.MOVE_SPEED;
        }

        // Run animation tick
        this.runFrame = Math.floor(this.animTimer * 12) % 4;

        // Dust particle while running on ground
        if (this.isGrounded && Math.random() < 0.15 && addParticlesCallback) {
          addParticlesCallback(this.x + 7, this.y + 14, 'dust', 1);
        }
      } else {
        const friction = this.isGrounded ? CONFIG.FRICTION : CONFIG.AIR_FRICTION;
        if (this.vx > 0) {
          this.vx = Math.max(0, this.vx - friction * dt);
        } else if (this.vx < 0) {
          this.vx = Math.min(0, this.vx + friction * dt);
        }
        this.runFrame = 0;
      }

      // Gravity
      this.vy += CONFIG.GRAVITY * dt;
      if (this.vy > 400) this.vy = 400; // Terminal velocity

      // Coyote time & Jump buffering
      if (this.isGrounded) {
        this.coyoteTimer = CONFIG.COYOTE_TIME;
        this.canDoubleJump = true;
      } else {
        this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
      }

      if (input.jumpPressed) {
        this.jumpBufferTimer = CONFIG.JUMP_BUFFER_TIME;
      } else {
        this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
      }

      // Jump Trigger
      if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
        this.vy = CONFIG.JUMP_FORCE;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.squashScaleX = 0.8;
        this.squashScaleY = 1.25;
        sounds.playJump();
        if (addParticlesCallback) addParticlesCallback(this.x + 7, this.y + 14, 'dust', 4);
      } else if (this.jumpBufferTimer > 0 && !this.isGrounded && this.canDoubleJump) {
        // Double Jump
        this.vy = CONFIG.DOUBLE_JUMP_FORCE;
        this.canDoubleJump = false;
        this.jumpBufferTimer = 0;
        this.squashScaleX = 0.85;
        this.squashScaleY = 1.2;
        sounds.playDoubleJump();
        if (addParticlesCallback) addParticlesCallback(this.x + 7, this.y + 12, 'sparkleTosca', 6);
      }

      // Variable jump height: release jump button cuts ascent
      if (!input.jumpHeld && this.vy < -70) {
        this.vy *= 0.45;
      }

      // Cakar Dash Trigger
      if (input.dashPressed && this.dashCooldownTimer <= 0) {
        this.isDashing = true;
        this.dashTimer = CONFIG.DASH_DURATION;
        this.dashCooldownTimer = CONFIG.DASH_COOLDOWN;
        this.dashDir = moveDir !== 0 ? moveDir : this.facing;
        sounds.playDash();
        if (addParticlesCallback) {
          addParticlesCallback(this.x + 7, this.y + 7, 'sparkleTosca', 8);
        }
      }
    }

    // Two-pass AABB Physics Integration (X then Y separated to prevent tunneling)
    this.moveX(this.vx * dt, tilemap);
    this.moveY(this.vy * dt, tilemap, addParticlesCallback);

    // Landing detection
    if (!this.wasGrounded && this.isGrounded) {
      this.squashScaleX = 1.25;
      this.squashScaleY = 0.75;
      if (addParticlesCallback) {
        addParticlesCallback(this.x + 7, this.y + 14, 'dust', 4);
      }
    }
    this.wasGrounded = this.isGrounded;

    // Check hazard collisions (Spikes, Acid)
    tilemap.checkHazards(this, dt, addParticlesCallback);

    // Fall out of level bottom
    if (this.y > tilemap.heightPx + 32) {
      this.takeDamage(CONFIG.MAX_HEARTS, 'pit');
    }
  }

  moveX(dx, tilemap) {
    this.x += dx;
    const tileBox = tilemap.getCollisionBox(this.x, this.y, this.w, this.h);

    if (tileBox) {
      if (dx > 0) {
        this.x = tileBox.x - this.w;
        this.vx = 0;
      } else if (dx < 0) {
        this.x = tileBox.x + tileBox.w;
        this.vx = 0;
      }
    }
  }

  moveY(dy, tilemap, addParticlesCallback) {
    this.y += dy;
    this.isGrounded = false;

    // Check collision against solids and platforms
    const col = tilemap.getVerticalCollision(this.x, this.y, this.w, this.h, dy);

    if (col) {
      if (dy > 0) {
        // Landing on floor
        this.y = col.top - this.h;
        this.vy = 0;
        this.isGrounded = true;

        // Check if landed on a spring or crumble block
        if (col.tileType === 5) {
          // Spring!
          this.vy = CONFIG.JUMP_FORCE * CONFIG.SPRING_MULTIPLIER;
          this.canDoubleJump = true;
          this.squashScaleX = 0.75;
          this.squashScaleY = 1.35;
          sounds.playSpring();
          if (addParticlesCallback) {
            addParticlesCallback(this.x + 7, this.y + 14, 'mossPuff', 8);
          }
        } else if (col.tileType === 3) {
          // Crumble block stepped on!
          tilemap.triggerCrumble(col.tileX, col.tileY);
        }
      } else if (dy < 0) {
        // Hitting ceiling / chest from below
        this.y = col.bottom;
        this.vy = 0;

        if (col.tileType === 4) {
          // Treasure Chest bumped from below!
          tilemap.triggerChestBump(col.tileX, col.tileY, this);
        }
      }
    }
  }

  takeDamage(amount = 1, source = 'enemy') {
    if (this.invincibleTimer > 0 || this.starTimer > 0 || this.isDead) {
      return;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.damageTakenCount++;
    this.invincibleTimer = CONFIG.INVINCIBILITY_DURATION;
    sounds.playHurt();

    // Knockback
    this.vy = -160;
    this.vx = -this.facing * 140;

    if (this.hp <= 0) {
      this.isDead = true;
      this.vy = -240;
      sounds.playGameOver();
    }
  }

  draw(ctx) {
    const px = Math.round(this.x);
    const py = Math.round(this.y);

    // Blinking during invulnerability
    if (this.invincibleTimer > 0 && Math.floor(this.animTimer * 20) % 2 === 0) {
      return;
    }

    ctx.save();
    // Center origin for squash and stretch and rotation
    ctx.translate(px + 7, py + 7);

    // Dying rotation
    if (this.isDead) {
      ctx.rotate(this.deathTimer * 8);
    } else {
      ctx.scale(this.squashScaleX, this.squashScaleY);
    }

    // Flip facing direction
    if (this.facing === -1) {
      ctx.scale(-1, 1);
    }

    // Determine color variation (Rainbow during star power)
    let bodyColor = '#ff9a3c';
    let scarfColor = '#3d8bff';
    if (this.starTimer > 0) {
      const hue = Math.floor((this.animTimer * 400) % 360);
      bodyColor = `hsl(${hue}, 90%, 60%)`;
      scarfColor = `hsl(${(hue + 120) % 360}, 90%, 65%)`;
    }

    // Tail wagging animation
    const tailWag = Math.sin(this.tailTimer * 6) > 0 ? 0 : 1;
    // Walk frame offset
    const walkBob = (this.isGrounded && Math.abs(this.vx) > 10 && this.runFrame % 2 === 1) ? 1 : 0;

    // --- DRAW KIKO (16x16 Pixel Art as matched in SVG) ---
    // Offset relative to center (-7, -7)
    const ox = -7;
    const oy = -7 - walkBob;

    // Tail (curved up behind body)
    ctx.fillStyle = bodyColor;
    ctx.fillRect(ox + 12, oy + 8 - tailWag, 2, 5);
    ctx.fillRect(ox + 13, oy + 6 - tailWag, 2, 3);

    // Main Body
    ctx.fillRect(ox + 3, oy + 7, 9, 6);

    // Cream Belly
    ctx.fillStyle = '#ffe8c2';
    ctx.fillRect(ox + 5, oy + 10, 5, 3);

    // Head
    ctx.fillStyle = bodyColor;
    ctx.fillRect(ox + 2, oy + 2, 9, 6);

    // Ears (triangular tips)
    ctx.fillRect(ox + 2, oy + 0, 2, 2);
    ctx.fillRect(ox + 9, oy + 0, 2, 2);
    // Inner ear pink
    ctx.fillStyle = '#ffb3b3';
    ctx.fillRect(ox + 3, oy + 1, 1, 1);
    ctx.fillRect(ox + 9, oy + 1, 1, 1);

    // Big expressive green eyes
    ctx.fillStyle = '#5fbf5f';
    ctx.fillRect(ox + 4, oy + 4, 2, 2);
    ctx.fillRect(ox + 8, oy + 4, 2, 2);
    // Pupils
    ctx.fillStyle = '#1b1033';
    ctx.fillRect(ox + 5, oy + 4, 1, 2);
    ctx.fillRect(ox + 9, oy + 4, 1, 2);

    // Cute pink nose
    ctx.fillStyle = '#ff7a8a';
    ctx.fillRect(ox + 6, oy + 6, 2, 1);

    // Blue Scarf around neck
    ctx.fillStyle = scarfColor;
    ctx.fillRect(ox + 2, oy + 8, 9, 1);
    // Scarf knot fluttering
    const scarfFlutter = Math.sin(this.animTimer * 10) > 0 ? 0 : 1;
    ctx.fillRect(ox + 9, oy + 9 + scarfFlutter, 2, 2);

    // Paws / Feet
    ctx.fillStyle = '#e07a1f';
    if (this.isGrounded && Math.abs(this.vx) > 10) {
      // Running paws cycle
      if (this.runFrame === 0 || this.runFrame === 2) {
        ctx.fillRect(ox + 3, oy + 13, 3, 2);
        ctx.fillRect(ox + 8, oy + 13, 3, 2);
      } else if (this.runFrame === 1) {
        ctx.fillRect(ox + 2, oy + 13, 3, 2);
        ctx.fillRect(ox + 9, oy + 12, 3, 2);
      } else {
        ctx.fillRect(ox + 4, oy + 12, 3, 2);
        ctx.fillRect(ox + 7, oy + 13, 3, 2);
      }
    } else if (!this.isGrounded) {
      // In air
      if (this.vy < 0) {
        // Jumping up
        ctx.fillRect(ox + 3, oy + 12, 3, 2);
        ctx.fillRect(ox + 8, oy + 12, 3, 2);
      } else {
        // Falling
        ctx.fillRect(ox + 3, oy + 13, 3, 2);
        ctx.fillRect(ox + 8, oy + 13, 3, 2);
      }
    } else {
      // Idle standing paws
      ctx.fillRect(ox + 3, oy + 13, 3, 2);
      ctx.fillRect(ox + 8, oy + 13, 3, 2);
    }

    // Cakar Dash Claw Slash Visual
    if (this.isDashing) {
      ctx.fillStyle = '#3ddbd9';
      ctx.fillRect(ox + 12, oy + 4, 4, 1);
      ctx.fillRect(ox + 13, oy + 7, 4, 1);
      ctx.fillRect(ox + 11, oy + 10, 4, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox + 14, oy + 5, 2, 1);
      ctx.fillRect(ox + 15, oy + 8, 2, 1);
    }

    ctx.restore();
  }
}
