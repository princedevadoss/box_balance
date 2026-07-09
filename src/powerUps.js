import * as THREE from 'three'
import { POWERUP, BALL } from './config'
import { cellCenter } from './level'

export const POWERUP_ORDER = ['health', 'patch', 'ghost', 'portal', 'fly', 'shrink']

/** Tiles where board power-ups may spawn (safe walkable ground only). */
export const POWERUP_SPAWN_TILES = new Set(['ground', 'bump'])

export const EMPTY_INVENTORY = () =>
  Object.fromEntries(POWERUP_ORDER.map((t) => [t, 0]))

export function isEffectActive(until) {
  return until != null && until > 0 && performance.now() < until
}

export function effectSecondsLeft(until) {
  if (!isEffectActive(until)) return 0
  return Math.ceil((until - performance.now()) / 1000)
}

export function boardsFromLevelData(data) {
  if (data.boards?.length) return data.boards
  return [data]
}

export function collectSpawnCandidates(data, onlyBoardIndex = null) {
  const boards = boardsFromLevelData(data)
  const out = []
  for (let bi = 0; bi < boards.length; bi++) {
    const board = boards[bi]
    const boardIndex = board.boardIndex ?? bi
    if (onlyBoardIndex != null && boardIndex !== onlyBoardIndex) continue
    const { cells, gridN, start, hole } = board
    for (let r = 0; r < gridN; r++) {
      for (let c = 0; c < gridN; c++) {
        const t = cells[r][c]
        if (!t?.exists) continue
        if (!POWERUP_SPAWN_TILES.has(t.kind)) continue
        if (start && r === start.r && c === start.c) continue
        if (hole && r === hole.r && c === hole.c) continue
        out.push({ boardIndex, r, c })
      }
    }
  }
  return out
}

export function pickActiveBoardIndex(data, ballX) {
  const boards = boardsFromLevelData(data)
  if (boards.length <= 1) return boards[0]?.boardIndex ?? 0
  let best = boards[0]
  let bestD = Infinity
  for (const board of boards) {
    const d = Math.abs(ballX - (board.position?.[0] ?? 0))
    if (d < bestD) {
      bestD = d
      best = board
    }
  }
  return best.boardIndex ?? 0
}

export function resolveBallBoardIndex(data, ctx) {
  const ball = ctx?.ballRef?.current
  if (!ball) return pickActiveBoardIndex(data, data.boards?.[0]?.position?.[0] ?? 0)
  return pickActiveBoardIndex(data, ball.translation().x)
}

export function pickWorldPickup(data, rng = Math.random, onlyBoardIndex = null) {
  const boardIndex =
    onlyBoardIndex ?? (data.boards?.length > 1 ? resolveBallBoardIndex(data, null) : 0)
  const candidates = collectSpawnCandidates(data, boardIndex)
  if (!candidates.length) return null
  const type = POWERUP_ORDER[Math.floor(rng() * POWERUP_ORDER.length)]
  const spot = candidates[Math.floor(rng() * candidates.length)]
  return { type, ...spot }
}

/** Spawn times (seconds) — one random pick per window, sorted earliest first. */
export function planLevelSpawnTimes(windows = POWERUP.spawnWindows, rng = Math.random) {
  const times = windows.map(({ minSec, maxSec }) => {
    const span = Math.max(0, maxSec - minSec)
    return minSec + rng() * span
  })
  times.sort((a, b) => a - b)
  return times
}

export function pickupLocalPosition(board, pickup) {
  const { cells, gridN, cell, thickness } = board
  const tile = cells[pickup.r]?.[pickup.c]
  const h = tile?.height ?? 0
  const [x, z] = cellCenter(pickup.r, pickup.c, gridN, cell)
  const y = thickness / 2 + h + POWERUP.hoverY
  return [x, y, z]
}

/** @deprecated Use pickupLocalPosition + localToBoardWorld for world coords */
export function pickupWorldPosition(board, pickup) {
  const [lx, ly, lz] = pickupLocalPosition(board, pickup)
  const [ox, , oz] = board.position ?? [0, 0, 0]
  return [ox + lx, ly, oz + lz]
}

export function boardForPickup(data, pickup) {
  const boards = boardsFromLevelData(data)
  const idx = pickup.boardIndex ?? 0
  return boards.find((b, i) => (b.boardIndex ?? i) === idx) ?? boards[0]
}

const NORMAL_TILES = new Set(['ground', 'bump', 'boost'])

export function findPortalTarget(board) {
  const { hole, cells, gridN, cell, thickness } = board
  if (!hole) return null
  const candidates = []
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      if (dr === 0 && dc === 0) continue
      const dist = Math.abs(dr) + Math.abs(dc)
      if (dist < 1 || dist > 2) continue
      const r = hole.r + dr
      const c = hole.c + dc
      if (r < 0 || c < 0 || r >= gridN || c >= gridN) continue
      const t = cells[r][c]
      if (!t?.exists) continue
      if (!NORMAL_TILES.has(t.kind)) continue
      candidates.push({ r, c, dist })
    }
  }
  if (!candidates.length) return null
  candidates.sort((a, b) => a.dist - b.dist)
  const pick = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))]
  const [lx, lz] = cellCenter(pick.r, pick.c, gridN, cell)
  const y = thickness / 2 + BALL.radius + 0.2
  return { localX: lx, localY: y, localZ: lz }
}

const _local = new THREE.Vector3()
const _world = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _conj = new THREE.Quaternion()

export function localToBoardWorld(boardBody, localX, localY, localZ) {
  if (!boardBody) return null
  const t = boardBody.translation()
  const q = boardBody.rotation()
  _quat.set(q.x, q.y, q.z, q.w)
  _local.set(localX, localY, localZ).applyQuaternion(_quat)
  const [ox, oy, oz] = boardBody.translation
    ? [t.x, t.y, t.z]
    : [boardBody.parent?.position?.x ?? 0, 0, boardBody.parent?.position?.z ?? 0]
  return [ox + _local.x, oy + _local.y, oz + _local.z]
}

export function portalTeleportPosition(boardBody, boardData, boardPosition = [0, 0, 0]) {
  const target = findPortalTarget(boardData)
  if (!target) return null
  if (boardBody) {
    const t = boardBody.translation()
    const q = boardBody.rotation()
    _quat.set(q.x, q.y, q.z, q.w)
    _local.set(target.localX, target.localY, target.localZ).applyQuaternion(_quat)
    return [t.x + _local.x, t.y + _local.y, t.z + _local.z]
  }
  const [ox, , oz] = boardPosition
  return [ox + target.localX, target.localY, oz + target.localZ]
}

export function goalBoardForPortal(data) {
  const boards = boardsFromLevelData(data)
  if (data.ball?.goalBoard) {
    const idx = data.ball.goalBoard.boardIndex ?? boards.length - 1
    return { board: data.ball.goalBoard, boardIndex: idx }
  }
  return { board: boards[boards.length - 1], boardIndex: boards.length - 1 }
}

export function nextSelectedType(current) {
  const start = POWERUP_ORDER.indexOf(current)
  return POWERUP_ORDER[(start + 1) % POWERUP_ORDER.length]
}

/** Tab cycles only through power-ups currently in inventory. */
export function nextOwnedType(current, inventory) {
  const owned = POWERUP_ORDER.filter((t) => (inventory[t] ?? 0) > 0)
  if (!owned.length) return POWERUP_ORDER[0]
  const idx = owned.indexOf(current)
  if (idx === -1) return owned[0]
  return owned[(idx + 1) % owned.length]
}

export function firstOwnedType(inventory) {
  return POWERUP_ORDER.find((t) => inventory[t] > 0) ?? POWERUP_ORDER[0]
}
