import { WAVER, TILE } from './config'
import { cellCenter } from './level'
import { boardsFromLevelData, POWERUP_SPAWN_TILES } from './powerUps'

export function worldToCell(board, worldX, worldZ) {
  const [ox, , oz] = board.position ?? [0, 0, 0]
  const lx = worldX - ox
  const lz = worldZ - oz
  const { gridN, cell } = board
  const col = Math.round(lx / cell + (gridN - 1) / 2)
  const row = Math.round(lz / cell + (gridN - 1) / 2)
  return { r: row, c: col }
}

/** Tiles the walking character can stand on (includes boost pads from level 2+). */
function isWaverTile(board, r, c) {
  const { cells, gridN, start, hole } = board
  if (r < 0 || c < 0 || r >= gridN || c >= gridN) return false
  const t = cells[r]?.[c]
  if (!t?.exists) return false
  if (!POWERUP_SPAWN_TILES.has(t.kind) && t.kind !== 'boost') return false
  if (start && r === start.r && c === start.c) return false
  if (hole && r === hole.r && c === hole.c) return false
  return true
}

/** Resolve rigid-body ref for a board index (array slot may differ from boardIndex). */
export function resolveBoardBody(boardRefs, data, boardIndex) {
  if (!boardRefs?.current) return null
  const boards = boardsFromLevelData(data)
  const slot = boards.findIndex((b, i) => (b.boardIndex ?? i) === boardIndex)
  const idx = slot >= 0 ? slot : boardIndex
  return boardRefs.current[idx]?.current ?? null
}

function spawnOffsetsForGrid(gridN) {
  const minOff = Math.min(WAVER.spawnOffsetMin, Math.max(1, Math.floor(gridN / 2) - 1))
  const maxOff = Math.min(WAVER.spawnOffsetMax, gridN - 1)
  return { minOff, maxOff: Math.max(minOff, maxOff) }
}

/** Chebyshev distance from the ball in [min, max] tiles. */
function collectOffsetBand(board, boardIndex, ballR, ballC, minOff, maxOff) {
  const out = []
  const { gridN } = board
  for (let r = 0; r < gridN; r++) {
    for (let c = 0; c < gridN; c++) {
      const dr = Math.abs(r - ballR)
      const dc = Math.abs(c - ballC)
      const cheb = Math.max(dr, dc)
      if (cheb < minOff || cheb > maxOff) continue
      if (r === ballR && c === ballC) continue
      if (isWaverTile(board, r, c)) out.push({ boardIndex, r, c })
    }
  }
  return out
}

function collectAnySafe(board, boardIndex, ballR, ballC) {
  const out = []
  const { gridN } = board
  for (let r = 0; r < gridN; r++) {
    for (let c = 0; c < gridN; c++) {
      if (r === ballR && c === ballC) continue
      if (isWaverTile(board, r, c)) out.push({ boardIndex, r, c })
    }
  }
  return out
}

const CARDINALS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function shuffleDirs(rng) {
  const dirs = [...CARDINALS]
  for (let i = dirs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[dirs[i], dirs[j]] = [dirs[j], dirs[i]]
  }
  return dirs
}

/** Walk as far as possible along each cardinal, prefer the longest valid path. */
function findWalkEnd(board, fromR, fromC, maxSteps, rng) {
  const stepsCap = Math.max(1, Math.min(maxSteps, board.gridN - 1))
  const dirs = shuffleDirs(rng)
  const options = []

  for (const [dr, dc] of dirs) {
    let r = fromR
    let c = fromC
    let dist = 0
    while (dist < stepsCap) {
      const nr = r + dr
      const nc = c + dc
      if (!isWaverTile(board, nr, nc)) break
      r = nr
      c = nc
      dist++
    }
    if (dist >= 1) options.push({ r, c, dr, dc, dist })
  }

  if (!options.length) return null

  options.sort((a, b) => b.dist - a.dist)
  const bestDist = options[0].dist
  const top = options.filter((o) => o.dist === bestDist)
  return top[Math.floor(rng() * top.length)]
}

export function walkKey(waver) {
  if (!waver) return ''
  return [
    waver.boardIndex ?? 0,
    waver.fromR ?? waver.r,
    waver.fromC ?? waver.c,
    waver.toR ?? waver.r,
    waver.toC ?? waver.c,
    waver.startedAt ?? '',
  ].join(':')
}

export function waverWalkTiming(waver, timingRef) {
  if (!waver) {
    timingRef.current = null
    return { start: 0, end: 0 }
  }
  const key = walkKey(waver)
  if (timingRef.current?.key !== key) {
    const start = waver.startedAt ?? performance.now()
    const end = waver.expiresAt ?? start + WAVER.durationSec * 1000
    timingRef.current = { key, start, end }
  }
  return timingRef.current
}

/**
 * Pick spawn away from the ball, plus a walk destination across the board.
 */
export function pickWaverSpawn(data, ballX, ballZ, rng = Math.random) {
  const boards = boardsFromLevelData(data)
  if (!boards.length) return null

  let best = boards[0]
  let bestD = Infinity
  for (const board of boards) {
    const [ox, , oz] = board.position ?? [0, 0, 0]
    const d = (ballX - ox) ** 2 + (ballZ - oz) ** 2
    if (d < bestD) {
      bestD = d
      best = board
    }
  }

  const boardIndex = best.boardIndex ?? boards.indexOf(best)
  const { r: ballR, c: ballC } = worldToCell(best, ballX, ballZ)
  const { minOff, maxOff } = spawnOffsetsForGrid(best.gridN)

  let starts = collectOffsetBand(best, boardIndex, ballR, ballC, minOff, maxOff)
  if (!starts.length) starts = collectAnySafe(best, boardIndex, ballR, ballC)
  if (!starts.length) return null

  const shuffled = [...starts]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  for (const start of shuffled) {
    const end = findWalkEnd(best, start.r, start.c, WAVER.walkTiles, rng)
    if (!end) continue
    if (end.r === start.r && end.c === start.c) continue
    return {
      boardIndex,
      r: start.r,
      c: start.c,
      fromR: start.r,
      fromC: start.c,
      toR: end.r,
      toC: end.c,
    }
  }

  return null
}

export function waverLocalPosition(board, spawn, progress = 0) {
  const { cells, gridN, cell, thickness } = board
  const fromR = spawn.fromR ?? spawn.r
  const fromC = spawn.fromC ?? spawn.c
  const toR = spawn.toR ?? spawn.r
  const toC = spawn.toC ?? spawn.c
  const t = Math.max(0, Math.min(1, progress))

  const r = fromR + (toR - fromR) * t
  const c = fromC + (toC - fromC) * t
  const rr = Math.round(r)
  const cc = Math.round(c)
  const tile = cells[rr]?.[cc]
  const h = tile?.height ?? 0

  const x = (c - (gridN - 1) / 2) * cell
  const z = (r - (gridN - 1) / 2) * cell
  const y = thickness / 2 + h + WAVER.hoverY
  return [x, y, z]
}

export function waverCharacterCell(board, waver, progress = 0) {
  const fromR = waver.fromR ?? waver.r
  const fromC = waver.fromC ?? waver.c
  const toR = waver.toR ?? waver.r
  const toC = waver.toC ?? waver.c
  const t = Math.max(0, Math.min(1, progress))
  return {
    r: fromR + (toR - fromR) * t,
    c: fromC + (toC - fromC) * t,
  }
}

/** Yaw so +Z faces the walk direction (FBX often faces +Z). */
export function waverFacingYaw(spawn) {
  const dr = (spawn.toR ?? spawn.r) - (spawn.fromR ?? spawn.r)
  const dc = (spawn.toC ?? spawn.c) - (spawn.fromC ?? spawn.c)
  if (Math.abs(dr) < 1e-6 && Math.abs(dc) < 1e-6) return 0
  return Math.atan2(dc, dr)
}

export function waverProgress(waver, now = performance.now(), timingRef = null) {
  if (timingRef) {
    const timing = waverWalkTiming(waver, timingRef)
    if (!timing?.key) return 0
    const span = Math.max(1, timing.end - timing.start)
    return Math.max(0, Math.min(1, (now - timing.start) / span))
  }
  if (!waver?.startedAt || !waver?.expiresAt) return 0
  const span = Math.max(1, waver.expiresAt - waver.startedAt)
  return Math.max(0, Math.min(1, (now - waver.startedAt) / span))
}

export function waverTouchesBall(board, waver, ballX, ballZ, progress) {
  const { r: ballR, c: ballC } = worldToCell(board, ballX, ballZ)
  const { r, c } = waverCharacterCell(board, waver, progress)
  const charR = Math.round(r)
  const charC = Math.round(c)
  const manhattan = Math.abs(ballR - charR) + Math.abs(ballC - charC)
  if (manhattan <= 1) return true

  const { gridN, cell } = board
  const [ox, , oz] = board.position ?? [0, 0, 0]
  const charX = ox + (c - (gridN - 1) / 2) * cell
  const charZ = oz + (r - (gridN - 1) / 2) * cell
  const dx = ballX - charX
  const dz = ballZ - charZ
  return Math.hypot(dx, dz) < WAVER.pickupRadius
}

export function planWaverSpawnDelay(rng = Math.random) {
  const span = Math.max(0, WAVER.spawnDelayMaxSec - WAVER.spawnDelayMinSec)
  return WAVER.spawnDelayMinSec + rng() * span
}

export const WAVER_CELL = TILE.size
