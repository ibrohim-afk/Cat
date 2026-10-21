import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLevelStars,
  checkAABB,
  canDashDefeat,
  updateJumpState,
  calculateSpringBounce,
} from './rules.ts';

test('AABB collision detection handles intersecting and disjoint rectangles', () => {
  const boxA = { x: 10, y: 10, w: 16, h: 16 };
  const boxB = { x: 20, y: 15, w: 16, h: 16 };
  const boxC = { x: 50, y: 50, w: 16, h: 16 };

  assert.equal(checkAABB(boxA, boxB), true, 'boxA and boxB should overlap');
  assert.equal(checkAABB(boxA, boxC), false, 'boxA and boxC should not overlap');
});

test('calculateLevelStars calculates correct score and star rating', () => {
  // Perfect run: lots of gems, beat par time, 0 damage taken
  const run1 = calculateLevelStars(
    {
      blueGems: 10, // 10 pts
      greenGems: 4, // 20 pts
      redGems: 2,   // 20 pts -> total gem score = 50 pts
      timeTakenSec: 25,
      timeParSec: 40,
      damageTaken: 0,
    },
    50 // total possible gems
  );

  assert.equal(run1.gemPercent, 100);
  assert.equal(run1.noDamageBonus, 50);
  assert.equal(run1.timeBonus, 75); // (40 - 25) * 5
  assert.equal(run1.stars, 3);
  assert.equal(run1.totalScore, 50 + 75 + 50);

  // Slow run with some damage
  const run2 = calculateLevelStars(
    {
      blueGems: 5,
      greenGems: 0,
      redGems: 0,
      timeTakenSec: 60,
      timeParSec: 40,
      damageTaken: 2,
    },
    50
  );
  assert.equal(run2.stars, 1);
  assert.equal(run2.noDamageBonus, 0);
  assert.equal(run2.timeBonus, 0);
});

test('canDashDefeat verifies enemy damage and destruction rules', () => {
  // Bat with 1 HP attacked with dash
  const batHit = canDashDefeat('bat', 1, true);
  assert.equal(batHit.canDamage, true);
  assert.equal(batHit.killed, true);

  // Golem with 2 HP attacked with first dash -> damaged but not killed
  const golemHit1 = canDashDefeat('golem', 2, true);
  assert.equal(golemHit1.canDamage, true);
  assert.equal(golemHit1.newHp, 1);
  assert.equal(golemHit1.killed, false);

  // Second dash -> golem destroyed
  const golemHit2 = canDashDefeat('golem', 1, true);
  assert.equal(golemHit2.killed, true);

  // No dash active -> no damage
  const noDash = canDashDefeat('golem', 2, false);
  assert.equal(noDash.canDamage, false);
});

test('Jump physics coyote time and jump buffering logic', () => {
  let state = {
    isGrounded: true,
    coyoteTimer: 0.1,
    bufferTimer: 0,
    canDoubleJump: true,
    vy: 0,
  };

  // 1. Regular ground jump
  const step1 = updateJumpState(state, 0.016, true, true, -280);
  assert.equal(step1.didJump, true);
  assert.equal(step1.isDoubleJump, false);
  assert.equal(step1.state.vy, -280);

  // 2. Fall off ledge without jumping (coyote window remains for 50ms)
  let midairState = {
    isGrounded: false,
    coyoteTimer: 0.05,
    bufferTimer: 0,
    canDoubleJump: true,
    vy: 10,
  };
  const step2 = updateJumpState(midairState, 0.016, false, true, -280);
  assert.equal(step2.didJump, true, 'Should allow jump during coyote time');
  assert.equal(step2.isDoubleJump, false);

  // 3. Double jump mid-air after coyote expires
  let airborneState = {
    isGrounded: false,
    coyoteTimer: 0,
    bufferTimer: 0,
    canDoubleJump: true,
    vy: 50,
  };
  const step3 = updateJumpState(airborneState, 0.016, false, true, -280);
  assert.equal(step3.didJump, true);
  assert.equal(step3.isDoubleJump, true);
  assert.equal(step3.state.canDoubleJump, false);

  // 4. Third jump should fail
  const step4 = updateJumpState(step3.state, 0.016, false, true, -280);
  assert.equal(step4.didJump, false);
});

test('Spring launch gives 1.8x jump height speed', () => {
  const bounce = calculateSpringBounce(-280);
  assert.equal(bounce, -280 * 1.8);
});
