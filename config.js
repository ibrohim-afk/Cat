/**
 * Central configuration object for Kiko & Gua Kristal.
 * All physics constants, timings, and palette values in one place for easy tuning.
 */

export const CONFIG = {
  // Screen & Tile metrics
  TILE_SIZE: 16,
  VIEW_WIDTH: 384,
  VIEW_HEIGHT: 216,

  // Physics & Movement
  GRAVITY: 740,
  MOVE_SPEED: 110,
  ACCEL: 750,
  FRICTION: 680,
  AIR_ACCEL: 520,
  AIR_FRICTION: 240,

  // Jumps & Dash
  JUMP_FORCE: -260,
  DOUBLE_JUMP_FORCE: -235,
  SPRING_MULTIPLIER: 1.8,
  DASH_SPEED: 290,
  DASH_DURATION: 0.17,
  DASH_COOLDOWN: 1.0,

  // Timing Windows
  COYOTE_TIME: 0.10,
  JUMP_BUFFER_TIME: 0.10,
  INVINCIBILITY_DURATION: 1.5,
  LANTERN_DURATION: 15.0,
  STAR_DURATION: 8.0,

  // Combat & Health
  MAX_HEARTS: 3,
  ACID_DAMAGE_INTERVAL: 1.0,

  // Camera
  CAMERA_LERP: 0.08,
  SHAKE_DECAY: 6.0,

  // Palette
  COLORS: {
    bgDark: '#1b1033',
    bgNight: '#2a2a5a',
    bgMid: '#3a3a7a',
    tosca: '#3ddbd9',
    toscaLight: '#7ff0ee',
    toscaDark: '#1d7f7d',
    orange: '#ff9a3c',
    orangeDark: '#e07a1f',
    cream: '#ffe8c2',
    moss: '#5fbf5f',
    mossDark: '#3f8f3f',
    mossLight: '#8fe08f',
    dirt: '#6b4a3a',
    dirtDark: '#4f3428',
    crystalPurple: '#9b5de5',
    crystalPurpleDark: '#6a35b5',
    stoneGrey: '#8a8a99',
    stoneDark: '#5a5a6a',
    gold: '#ffd84d',
    acid: '#9be15d',
    acidLight: '#c8ff8a',
  },
};
