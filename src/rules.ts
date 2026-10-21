/**
 * Pure game logic, physics rules, scoring, and star rating calculation for Kiko & Gua Kristal.
 * Decoupled from canvas and DOM for fast deterministic unit testing.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ScoreParams {
  blueGems: number; // 1 pt each
  greenGems: number; // 5 pt each
  redGems: number; // 10 pt each
  timeTakenSec: number;
  timeParSec: number;
  damageTaken: number;
}

export interface StarRating {
  stars: number; // 1, 2, or 3
  gemPercent: number;
  timeBonus: number;
  noDamageBonus: number;
  totalScore: number;
}

/**
 * Calculates final score and star rating (1 to 3 stars).
 * 1 Star: Complete the level.
 * 2 Stars: Collect at least 70% of gems or beat par time.
 * 3 Stars: Collect >= 85% of gems AND beat par time (or 0 damage taken).
 */
export function calculateLevelStars(
  params: ScoreParams,
  totalPossibleGemsValue: number
): StarRating {
  const gemScore = params.blueGems * 1 + params.greenGems * 5 + params.redGems * 10;
  const timeBonus = Math.max(0, Math.floor((params.timeParSec - params.timeTakenSec) * 5));
  const noDamageBonus = params.damageTaken === 0 ? 50 : 0;
  const totalScore = gemScore + timeBonus + noDamageBonus;

  const gemPercent = totalPossibleGemsValue > 0 ? Math.min(100, Math.round((gemScore / totalPossibleGemsValue) * 100)) : 100;
  const beatTime = params.timeTakenSec <= params.timeParSec;
  const noDamage = params.damageTaken === 0;

  let stars = 1;
  if (gemPercent >= 85 && (beatTime || noDamage)) {
    stars = 3;
  } else if (gemPercent >= 70 || beatTime) {
    stars = 2;
  }

  return {
    stars,
    gemPercent,
    timeBonus,
    noDamageBonus,
    totalScore,
  };
}

/**
 * Axis-Aligned Bounding Box (AABB) intersection check.
 */
export function checkAABB(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
 * Evaluates whether Cakar Dash can harm/destroy a specific enemy type.
 * - bat: killed in 1 dash
 * - golem: takes 2 dashes
 * - slime: killed in 1 dash or stomp
 * - spider: killed in 1 dash
 */
export function canDashDefeat(
  enemyType: 'slime' | 'bat' | 'golem' | 'spider',
  currentEnemyHp: number,
  isDashing: boolean
): { canDamage: boolean; newHp: number; killed: boolean } {
  if (!isDashing) {
    return { canDamage: false, newHp: currentEnemyHp, killed: false };
  }

  const damage = 1;
  const newHp = Math.max(0, currentEnemyHp - damage);
  return {
    canDamage: true,
    newHp,
    killed: newHp <= 0,
  };
}

/**
 * Jump Buffering and Coyote Time state evaluator.
 */
export interface JumpPhysicsState {
  isGrounded: boolean;
  coyoteTimer: number; // seconds remaining
  bufferTimer: number; // seconds remaining
  canDoubleJump: boolean;
  vy: number;
}

export function updateJumpState(
  state: JumpPhysicsState,
  dt: number,
  groundedNow: boolean,
  jumpPressedEdge: boolean,
  jumpSpeed: number = -280
): { state: JumpPhysicsState; didJump: boolean; isDoubleJump: boolean } {
  const next = { ...state };
  next.isGrounded = groundedNow;

  if (groundedNow) {
    next.coyoteTimer = 0.1; // 100ms coyote time
    next.canDoubleJump = true;
  } else {
    next.coyoteTimer = Math.max(0, next.coyoteTimer - dt);
  }

  if (jumpPressedEdge) {
    next.bufferTimer = 0.1; // 100ms buffer
  } else {
    next.bufferTimer = Math.max(0, next.bufferTimer - dt);
  }

  let didJump = false;
  let isDoubleJump = false;

  // Normal / Coyote jump
  if (next.bufferTimer > 0 && next.coyoteTimer > 0) {
    next.vy = jumpSpeed;
    next.coyoteTimer = 0;
    next.bufferTimer = 0;
    didJump = true;
    isDoubleJump = false;
  }
  // Mid-air Double jump
  else if (next.bufferTimer > 0 && !groundedNow && next.canDoubleJump) {
    next.vy = jumpSpeed * 0.9;
    next.canDoubleJump = false;
    next.bufferTimer = 0;
    didJump = true;
    isDoubleJump = true;
  }

  return { state: next, didJump, isDoubleJump };
}

/**
 * Spring bounce physics (moss spring launch: 1.8x standard jump).
 */
export function calculateSpringBounce(baseJumpSpeed: number): number {
  return baseJumpSpeed * 1.8;
}
