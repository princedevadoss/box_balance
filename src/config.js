// ─────────────────────────────────────────────────────────────────────────
// Central configuration for "Nizhen catch".
// Every gameplay / physics / visual tunable lives here so behaviour can be
// adjusted in one place.
// ─────────────────────────────────────────────────────────────────────────

export const GAME = {
  startLives: 5,
  levelTime: 60, // seconds allowed per level
  countdown: 3, // get-ready seconds before the ball drops
  fallY: -12, // ball below this y is considered lost (safety net)
  scoreBase: 100, // points awarded per level cleared
  scoreTimeBonus: 5, // extra points per second left on the clock
  bonusLifeEveryLevels: 3, // gain +1 life after each N cleared levels
  flashMs: 1500, // how long banner messages linger
}

export const BOARD = {
  maxTilt: 0.32, // radians at full mouse deflection
  tiltEase: 0.15, // slerp factor toward the target tilt each frame
}

export const BALL = {
  radius: 0.55,
  spawnHeight: 4, // how high above the deck the ball hovers before dropping
  jumpHeight: 2.8, // peak height on mouse click
  jumpCooldown: 0.35, // seconds between jumps
  friction: 0.8,
  restitution: 0.2,
  linearDamping: 0.25,
  angularDamping: 0.2,
  metalness: 0, // matte finish
  roughness: 0.96,
}

export const ballJumpVelocity = () => Math.sqrt(2 * 9.81 * BALL.jumpHeight)

// Light but visibly tinted ball colors per level — NIZHEN text is always black.
export const BALL_LEVEL_PALETTE = [
  { top: '#e9d5ff', bottom: '#c4b5fd' },
  { top: '#bbf7d0', bottom: '#86efac' },
  { top: '#fed7aa', bottom: '#fdba74' },
  { top: '#bae6fd', bottom: '#7dd3fc' },
  { top: '#fef08a', bottom: '#facc15' },
  { top: '#fbcfe8', bottom: '#f472b6' },
  { top: '#a5f3fc', bottom: '#22d3ee' },
  { top: '#ddd6fe', bottom: '#a78bfa' },
]

export const BALL_TEXT_COLOR = '#000000'

export const ballPaletteForLevel = (level) =>
  BALL_LEVEL_PALETTE[((level - 1) % BALL_LEVEL_PALETTE.length + BALL_LEVEL_PALETTE.length) % BALL_LEVEL_PALETTE.length]

export const ballColorForLevel = (level) => ballPaletteForLevel(level).bottom

export const TILE = {
  size: 1.6, // world width of one tile (a.k.a. CELL)
  thickness: 0.4,
  visible: 0.96, // rendered fraction of a tile (leaves grid-line gaps)
  collider: 0.49, // collider half-extent as a fraction of tile size
  friction: 0.9,
  restitution: 0.1,
}

export const POCKET = {
  opening: 0.78, // pocket hole width as a fraction of tile size
  rim: 0.14, // green rim thickness
  pitDepth: 1.3,
}

export const COOP = {
  boardGap: 0, // boards touch edge-to-edge at the seam
}

export const CAMERA = {
  position: [0, 18, 16],
  fov: 45,
  ease: 0.06,
}

export const PHYSICS = {
  gravity: [0, -9.81, 0],
}

// Runtime hazard behaviour (level-independent bits).
export const HAZARD = {
  air: { cooldown: 0.5, baseSpeed: 6, perLevel: 0.5, maxSpeed: 16 },
  boost: { cooldown: 0.5, speed: 3, keep: 0.3, minAlong: 0.4 },
  heart: { gain: 1 },
  mover: { size: 1, height: 0.8, friction: 0.3, restitution: 0.5 },
}

// Procedural level generation parameters.
export const LEVELGEN = {
  grid: { base: 6, divisor: 1.5, max: 13 },
  fill: { base: 0.72, perLevel: 0.03, min: 0.34, minTiles: 7 },
  gaps: { perLevel: 1.8, cap: 0.18 },
  bumps: { startLevel: 3, cap: 0.12, minHeight: 0.3, randHeight: 0.35 },
  boosts: { startLevel: 2, cap: 0.12 },
  air: { startLevel: 3, cap: 0.15 },
  lava: { startLevel: 3, cap: 0.14 },
  heart: { everyLevels: 8 },
  movers: { startLevel: 3, max: 6, speedBase: 0.16, speedPerLevel: 0.02, speedJitter: 0.5 },
}

// Intensity ramps shared by the generator and the runtime.
export const airLaunchSpeed = (level) =>
  Math.min(
    HAZARD.air.baseSpeed + Math.max(0, level - LEVELGEN.air.startLevel) * HAZARD.air.perLevel,
    HAZARD.air.maxSpeed
  )

export const effectIntensity = (level, startLevel) =>
  Math.min(1 + Math.max(0, level - startLevel) * 0.18, 3)

export const COLORS = {
  background: '#efe8ff',
  tileA: '#7c3aed',
  tileB: '#6d28d9',
  bump: '#f59e0b',
  airTile: '#0e7490',
  airEmissive: '#22d3ee',
  airPuff: '#67e8f9',
  airGlow: '#a5f3fc',
  lavaTile: '#7f1d1d',
  lavaEmissive: '#f97316',
  lavaGlow: '#fb923c',
  lavaBubble: '#fdba74',
  boostTile: '#0f766e',
  boostEmissive: '#14b8a6',
  arrow: '#fde047',
  mover: '#3b82f6',
  moverEmissive: '#1d4ed8',
  pocketFrame: '#6d28d9',
  pocketPit: '#0a0a14',
  pocketFloor: '#050509',
  goalRim: '#22c55e',
  ballTop: '#38bdf8',
  ballBottom: '#0ea5e9',
  ballText: '#082f49',
  ball2: '#fb923c',
  ball2Emissive: '#ea580c',
  heart: '#ef4444',
  danger: '#ef4444',
  hudDanger: '#f87171',
  coopBoardA: { tileA: '#7c3aed', tileB: '#6d28d9', frame: '#6d28d9' },
  coopBoardB: { tileA: '#0e7490', tileB: '#155e75', frame: '#14b8a6' },
  coopBoardC: { tileA: '#b45309', tileB: '#92400e', frame: '#f59e0b' },
  coopBoardD: { tileA: '#be185d', tileB: '#9d174d', frame: '#ec4899' },
}

export const COOP_BOARD_THEMES = ['a', 'b', 'c', 'd']
