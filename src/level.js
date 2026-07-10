// Procedural level generation for "Nizhen catch".
// A level is a connected BLOB of tiles inside a bounding grid (never a full
// square). Tunables live in config.js (LEVELGEN / TILE).
//  - one tile is the GOAL pocket (sink the ball here to win)
//  - some tiles are DANGER gaps (fall through = fail)
//  - others become bumps / boosts / air / lava
// Higher levels => bigger grid, sparser shape, farther hole, more hazards.

import { TILE, LEVELGEN, COOP, BALL, COOP_BOARD_THEMES } from './config'
import { clampGridN } from './viewport'

const CELL = TILE.size
const THICKNESS = TILE.thickness

// Deterministic RNG so each level looks the same every time it's played.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// World-space center of tile (row, col) inside a gridN bounding box.
export function cellCenter(row, col, gridN, cell = CELL) {
  const x = (col - (gridN - 1) / 2) * cell
  const z = (row - (gridN - 1) / 2) * cell
  return [x, z]
}

const key = (r, c) => `${r},${c}`
const NEIGH = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

// Is there a walkable path (over existing tiles) from a to b? 4-connected BFS.
// `blocked` is an optional Set of tile kinds to treat as impassable.
function pathExists(cells, gridN, a, b, blocked) {
  const seen = new Set([key(a.r, a.c)])
  const q = [a]
  while (q.length) {
    const cur = q.shift()
    if (cur.r === b.r && cur.c === b.c) return true
    for (const [dr, dc] of NEIGH) {
      const r = cur.r + dr
      const c = cur.c + dc
      if (r < 0 || c < 0 || r >= gridN || c >= gridN) continue
      const k = key(r, c)
      if (seen.has(k)) continue
      if (!cells[r][c].exists) continue
      if (blocked && blocked.has(cells[r][c].kind)) continue
      seen.add(k)
      q.push({ r, c })
    }
  }
  return false
}

export function generateLevel(level, roomSeed = null, options = {}) {
  const baseSeed =
    roomSeed != null
      ? (Math.imul(roomSeed, 2654435761) ^ Math.imul(level, 0x9e3779b9)) >>> 0
      : (Math.imul(level, 2654435761) ^ 0x9e3779b9) >>> 0
  const rng = mulberry32(baseSeed)

  const { grid, fill, gaps, bumps, boosts, air, lava, movers: moverCfg } = LEVELGEN
  const levelGridN = Math.min(grid.base + Math.floor((level - 1) / grid.divisor), grid.max)
  const gridN = clampGridN(levelGridN, options.gridCap)

  // Empty bounding grid.
  const cells = []
  for (let r = 0; r < gridN; r++) {
    const row = []
    for (let c = 0; c < gridN; c++) {
      row.push({ r, c, exists: false, height: 0, kind: 'ground' })
    }
    cells.push(row)
  }

  // Grow a connected organic blob from the centre. Lower fill = more irregular.
  const fillRatio = Math.max(fill.min, fill.base - level * fill.perLevel)
  const target = Math.max(fill.minTiles, Math.round(gridN * gridN * fillRatio))
  const seedCell = { r: Math.floor(gridN / 2), c: Math.floor(gridN / 2) }
  const occupied = new Set([key(seedCell.r, seedCell.c)])
  cells[seedCell.r][seedCell.c].exists = true
  const frontier = []
  const pushNeighbors = (r, c) => {
    for (const [dr, dc] of NEIGH) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= gridN || nc >= gridN) continue
      if (!occupied.has(key(nr, nc))) frontier.push({ r: nr, c: nc })
    }
  }
  pushNeighbors(seedCell.r, seedCell.c)
  while (occupied.size < target && frontier.length) {
    const idx = Math.floor(rng() * frontier.length)
    const pick = frontier[idx]
    frontier.splice(idx, 1)
    if (occupied.has(key(pick.r, pick.c))) continue
    occupied.add(key(pick.r, pick.c))
    cells[pick.r][pick.c].exists = true
    pushNeighbors(pick.r, pick.c)
  }

  const existing = []
  for (let r = 0; r < gridN; r++)
    for (let c = 0; c < gridN; c++) if (cells[r][c].exists) existing.push(cells[r][c])

  // Start = an extreme corner-ish tile (min r+c). Hole = tile farthest from it.
  let start = existing[0]
  for (const t of existing) if (t.r + t.c < start.r + start.c) start = t
  let hole = existing[0]
  let bestD = -1
  for (const t of existing) {
    const d = Math.abs(t.r - start.r) + Math.abs(t.c - start.c)
    if (d > bestD) {
      bestD = d
      hole = t
    }
  }
  // The goal is a REAL tile with a pocket hole in its middle (rendered by the
  // Board), so it stays part of the walkable surface for path checks.
  hole.exists = true
  hole.kind = 'goal'

  // Protect start, hole and their neighbours from being carved/bumped.
  const protectedSet = new Set([key(start.r, start.c), key(hole.r, hole.c)])
  for (const cell of [start, hole]) {
    for (const [dr, dc] of NEIGH) {
      const r = cell.r + dr
      const c = cell.c + dc
      if (r >= 0 && c >= 0 && r < gridN && c < gridN) protectedSet.add(key(r, c))
    }
  }

  const pickFreeCell = () => {
    for (let tries = 0; tries < 50; tries++) {
      const t = existing[Math.floor(rng() * existing.length)]
      if (protectedSet.has(key(t.r, t.c))) continue
      if (t.exists && t.kind === 'ground') return t
    }
    return null
  }

  const solidCount = existing.filter((t) => t.exists).length

  // Danger gaps: carve interior tiles, but only if start->hole stays solvable.
  const gapCount = Math.min(Math.floor((level - 1) * gaps.perLevel), Math.floor(solidCount * gaps.cap))
  for (let i = 0; i < gapCount; i++) {
    const cell = pickFreeCell()
    if (!cell) break
    cell.exists = false
    if (pathExists(cells, gridN, start, hole)) {
      cell.kind = 'gap'
      protectedSet.add(key(cell.r, cell.c))
    } else {
      cell.exists = true // undo: would have blocked the only route
    }
  }

  // Raised obstacle tiles.
  if (level >= bumps.startLevel) {
    const bumpCount = Math.min(level - (bumps.startLevel - 1), Math.floor(solidCount * bumps.cap))
    for (let i = 0; i < bumpCount; i++) {
      const cell = pickFreeCell()
      if (!cell) break
      cell.height = bumps.minHeight + rng() * bumps.randHeight
      cell.kind = 'bump'
      protectedSet.add(key(cell.r, cell.c))
    }
  }

  // Boost pads: roll across one in its arrow direction for a burst of thrust.
  if (level >= boosts.startLevel) {
    const boostCount = Math.min(1 + Math.floor(level / 3), Math.floor(solidCount * boosts.cap))
    for (let i = 0; i < boostCount; i++) {
      const cell = pickFreeCell()
      if (!cell) break
      const [dr, dc] = NEIGH[Math.floor(rng() * NEIGH.length)]
      cell.kind = 'boost'
      cell.dx = dc // arrow along +/-x  (columns)
      cell.dz = dr // arrow along +/-z  (rows)
      protectedSet.add(key(cell.r, cell.c))
    }
  }

  // Air tiles: launch the ball upward (strength scales in the Detector).
  if (level >= air.startLevel) {
    const airCount = Math.min(1 + Math.floor((level - air.startLevel) / 2), Math.floor(solidCount * air.cap))
    for (let i = 0; i < airCount; i++) {
      const cell = pickFreeCell()
      if (!cell) break
      cell.kind = 'air'
      protectedSet.add(key(cell.r, cell.c))
    }
  }

  // Lava (volcano) tiles: touching them costs a life. Placed only if a
  // lava-free route from start to hole still exists, so it stays fair.
  // Never on the ball spawn tile.
  if (level >= lava.startLevel) {
    const lavaCount = Math.min(1 + Math.floor((level - lava.startLevel) / 2), Math.floor(solidCount * lava.cap))
    const lavaBlock = new Set(['lava'])
    for (let i = 0; i < lavaCount; ) {
      const cell = pickFreeCell()
      if (!cell) break
      if (cell.r === start.r && cell.c === start.c) continue
      cell.kind = 'lava'
      if (pathExists(cells, gridN, start, hole, lavaBlock)) {
        protectedSet.add(key(cell.r, cell.c))
        i++
      } else {
        cell.kind = 'ground' // would force the player through lava; revert
      }
    }
  }

  // Level heart pickups removed — health comes from the power-up system.
  const heart = null

  // Moving blue obstacle boxes: slide back and forth across a row (left<->right)
  // or column (top<->bottom). Count + speed grow per level.
  // Never on the ball spawn row (x-axis movers) or column (z-axis movers).
  const movers = []
  if (level >= moverCfg.startLevel) {
    const moverCount = Math.min(1 + Math.floor((level - moverCfg.startLevel) / 2), moverCfg.max)
    const baseSpeed = moverCfg.speedBase + level * moverCfg.speedPerLevel
    for (let i = 0; i < moverCount; i++) {
      const axis = rng() < 0.5 ? 'x' : 'z' // x = left/right, z = top/bottom
      const forbiddenIdx = axis === 'x' ? start.r : start.c
      const candidates = []
      for (let idx = 0; idx < gridN; idx++) {
        if (idx !== forbiddenIdx) candidates.push(idx)
      }
      if (candidates.length === 0) continue
      const lineIdx = candidates[Math.floor(rng() * candidates.length)]
      const line = (lineIdx - (gridN - 1) / 2) * CELL
      movers.push({
        axis,
        line,
        speed: baseSpeed * (0.8 + rng() * moverCfg.speedJitter),
        phase: rng() * 2,
      })
    }
  }

  return { level, gridN, cell: CELL, thickness: THICKNESS, cells, start, hole, heart, movers }
}

function deepCloneCells(cells) {
  return cells.map((row) => row.map((t) => ({ ...t })))
}

function stripGoal(board) {
  const cells = deepCloneCells(board.cells)
  for (let r = 0; r < board.gridN; r++) {
    for (let c = 0; c < board.gridN; c++) {
      if (cells[r][c].kind === 'goal') cells[r][c].kind = 'ground'
    }
  }
  return { ...board, cells }
}

// Seam gaps at board joins scale with co-op level (see COOP.seam in config).
export function coopSeamGapCount(level) {
  const { fullBridgeMaxLevel, oneGapMaxLevel, gapRampStartLevel, gapRampEvery, maxSeamGaps } =
    COOP.seam
  if (level <= fullBridgeMaxLevel) return 0
  if (level <= oneGapMaxLevel) return 1
  const extra = 2 + Math.floor((level - gapRampStartLevel) / gapRampEvery)
  return Math.min(extra, maxSeamGaps)
}

function pickSeamGapRows(gridN, count, rng, protectedRows = new Set()) {
  if (count <= 0) return []
  let candidates = []
  for (let r = 0; r < gridN; r++) {
    if (!protectedRows.has(r)) candidates.push(r)
  }
  if (candidates.length < count) {
    candidates = []
    for (let r = 0; r < gridN; r++) candidates.push(r)
  }
  const rows = []
  for (let i = 0; i < count && candidates.length; i++) {
    const idx = Math.floor(rng() * candidates.length)
    rows.push(candidates.splice(idx, 1)[0])
  }
  rows.sort((a, b) => a - b)
  return rows
}

function seamProtectedRows(board, edge, gridN) {
  const col = edge === 'right' ? gridN - 1 : 0
  const rows = new Set()
  if (board.start?.c === col) rows.add(board.start.r)
  if (board.hole?.c === col) rows.add(board.hole.r)
  return rows
}

/** Walkable seam tiles except aligned gap rows (same rows on both meeting edges). */
function applySeamEdge(cells, gridN, edge, gapRows) {
  const col = edge === 'right' ? gridN - 1 : 0
  const gapSet = new Set(gapRows)
  for (let r = 0; r < gridN; r++) {
    if (gapSet.has(r)) {
      cells[r][col].exists = false
      cells[r][col].kind = 'gap'
      cells[r][col].height = 0
    } else {
      cells[r][col].exists = true
      if (cells[r][col].kind === 'gap') cells[r][col].kind = 'ground'
    }
  }
}

function cloneBoardData(template, position, boardIndex, theme, playerCount, seamEdges = {}) {
  const cells = deepCloneCells(template.cells)
  if (seamEdges.left != null) applySeamEdge(cells, template.gridN, 'left', seamEdges.left)
  if (seamEdges.right != null) applySeamEdge(cells, template.gridN, 'right', seamEdges.right)
  return {
    level: template.level,
    gridN: template.gridN,
    cell: template.cell,
    thickness: template.thickness,
    cells,
    start: { ...template.start },
    hole: { ...template.hole },
    heart: template.heart ? { ...template.heart } : null,
    movers: template.movers ? template.movers.map((m) => ({ ...m })) : [],
    position,
    boardIndex,
    theme,
  }
}

// Co-op: N different boards joined edge-to-edge (2–COOP.maxPlayers players).
// Odd levels: spawn on board 0, goal on board N-1.
// Even levels: spawn on board N-1, goal on board 0.
export function generateCoopLevel(level, roomSeed = null, playerCount = 2, options = {}) {
  const n = Math.max(2, Math.min(COOP.maxPlayers, playerCount))
  const rawBoards = []
  for (let i = 0; i < n; i++) {
    const seed =
      roomSeed != null ? (Math.imul(roomSeed ^ (i + 1), 0xa5a5a5a5) >>> 0) : null
    rawBoards.push(generateLevel(level, seed, options))
  }

  const seamGapCount = coopSeamGapCount(level)
  const seamSeed =
    roomSeed != null
      ? (Math.imul(roomSeed ^ level, 0xc2b2ae35) >>> 0)
      : (Math.imul(level, 0x9e3779b9) >>> 0)
  const seamRng = mulberry32(seamSeed)
  const seamEdgesByBoard = rawBoards.map(() => ({ left: null, right: null }))

  for (let i = 0; i < n - 1; i++) {
    const gridN = rawBoards[i].gridN
    const protectedRows = new Set([
      ...seamProtectedRows(rawBoards[i], 'right', gridN),
      ...seamProtectedRows(rawBoards[i + 1], 'left', gridN),
    ])
    const gapRows = pickSeamGapRows(gridN, seamGapCount, seamRng, protectedRows)
    seamEdgesByBoard[i].right = gapRows
    seamEdgesByBoard[i + 1].left = gapRows
  }

  const extents = rawBoards.map((b) => b.gridN * b.cell)
  const gap = COOP.boardGap
  let totalWidth = extents.reduce((sum, e) => sum + e, 0) + gap * (n - 1)

  let cursor = -totalWidth / 2
  const boards = []
  for (let i = 0; i < n; i++) {
    const centerX = cursor + extents[i] / 2
    cursor += extents[i] + (i < n - 1 ? gap : 0)
    boards.push(
      cloneBoardData(
        rawBoards[i],
        [centerX, 0, 0],
        i,
        COOP_BOARD_THEMES[i % COOP_BOARD_THEMES.length],
        n,
        {
          left: seamEdgesByBoard[i].left ?? undefined,
          right: seamEdgesByBoard[i].right ?? undefined,
        }
      )
    )
  }

  const oddLevel = level % 2 === 1
  const spawnIdx = oddLevel ? 0 : n - 1
  const goalIdx = oddLevel ? n - 1 : 0

  for (let i = 0; i < n; i++) {
    if (i !== goalIdx) boards[i] = stripGoal(boards[i])
  }

  return {
    level,
    playerCount: n,
    gridN: Math.max(...rawBoards.map((b) => b.gridN)),
    cell: rawBoards[0].cell,
    thickness: rawBoards[0].thickness,
    totalExtent: totalWidth,
    boards,
    ball: { spawnBoard: boards[spawnIdx], goalBoard: boards[goalIdx] },
  }
}

export function boardSpawnPosition(board) {
  const [sx, sz] = cellCenter(board.start.r, board.start.c, board.gridN, board.cell)
  const [ox, , oz] = board.position
  return [ox + sx, board.thickness / 2 + BALL.spawnHeight, oz + sz]
}

export function boardHoleLocal(board) {
  return cellCenter(board.hole.r, board.hole.c, board.gridN, board.cell)
}
