import { PATCH } from './config'
import { cellCenter } from './level'

export function isPatchActive(patchUntil) {
  return patchUntil != null && patchUntil > 0 && performance.now() < patchUntil
}

export function patchSecondsLeft(patchUntil) {
  if (!isPatchActive(patchUntil)) return 0
  return Math.ceil((patchUntil - performance.now()) / 1000)
}

/** Solo level data or co-op level data → list of board layouts. */
export function boardsFromLevelData(data) {
  if (data.boards?.length) return data.boards
  return [data]
}

export function collectPatchSpawnCandidates(data) {
  const boards = boardsFromLevelData(data)
  const out = []
  for (let boardIndex = 0; boardIndex < boards.length; boardIndex++) {
    const board = boards[boardIndex]
    const { cells, gridN, start, hole } = board
    for (let r = 0; r < gridN; r++) {
      for (let c = 0; c < gridN; c++) {
        const t = cells[r][c]
        if (!t?.exists) continue
        if (t.kind === 'goal' || t.kind === 'heart') continue
        if (start && r === start.r && c === start.c) continue
        if (hole && r === hole.r && c === hole.c) continue
        out.push({ boardIndex, r, c })
      }
    }
  }
  return out
}

export function pickPatchSpawn(data, rng = Math.random) {
  const candidates = collectPatchSpawnCandidates(data)
  if (!candidates.length) return null
  return candidates[Math.floor(rng() * candidates.length)]
}

export function patchPickupWorldPosition(board, pickup) {
  const [lx, lz] = cellCenter(pickup.r, pickup.c, board.gridN, board.cell)
  const [ox, , oz] = board.position ?? [0, 0, 0]
  return [ox + lx, board.thickness / 2 + PATCH.hoverY, oz + lz]
}

export function boardForPickup(data, pickup) {
  const boards = boardsFromLevelData(data)
  return boards[pickup.boardIndex ?? 0] ?? boards[0]
}

/** Patch pickup appears on every other level (2, 4, 6, …). */
export function levelHasPatchPickup(level) {
  return level > 0 && level % 2 === 0
}

export function randomPatchSpawnDelaySec(rng = Math.random) {
  const { spawnDelayMinSec, spawnDelayMaxSec } = PATCH
  return spawnDelayMinSec + rng() * (spawnDelayMaxSec - spawnDelayMinSec)
}
