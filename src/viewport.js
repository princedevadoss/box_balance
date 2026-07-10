import { LEVELGEN, TILE } from './config'

export const MOBILE_BREAKPOINT = 768

export function readViewport() {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1280
  const height = typeof window !== 'undefined' ? window.innerHeight : 720
  const portrait = height > width
  const isMobile = width < MOBILE_BREAKPOINT || (portrait && width < 900)
  const gridCap = gridCapForViewport(width, height, portrait)
  return { width, height, portrait, isMobile, gridCap, aspect: width / height }
}

/** Max grid dimension that fits comfortably on this screen (portrait-aware). */
export function gridCapForViewport(width, height, portrait) {
  const hudReserve = portrait ? 0.42 : 0.28
  const gameW = width
  const gameH = height * (1 - hudReserve)
  const minDim = Math.min(gameW, gameH)

  const targetCellPx = portrait ? 52 : 58
  const cap = Math.floor(minDim / targetCellPx)
  const minGrid = LEVELGEN.grid.base
  const maxGrid = LEVELGEN.grid.max
  return Math.max(minGrid, Math.min(maxGrid, cap))
}

/** Clamp level-based gridN to viewport cap. */
export function clampGridN(levelGridN, gridCap) {
  if (gridCap == null) return levelGridN
  return Math.min(levelGridN, gridCap)
}

/** Camera distance so board extent fits in view (portrait uses extra margin). */
export function cameraFitForExtent(extent, aspect, portrait, marginScale = 1) {
  const margin = (portrait ? 1.48 : 1.28) * marginScale
  const board = extent * margin
  const vFovRad = (45 * Math.PI) / 180
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect)
  const distW = board / (2 * Math.tan(hFovRad / 2))
  const distH = (board * 0.88) / (2 * Math.tan(vFovRad / 2))
  const dist = Math.max(distW, distH)
  const y = dist * (portrait ? 0.58 : 0.52) + (portrait ? 2.2 : 3.2)
  const z = dist * (portrait ? 0.5 : 0.46) + (portrait ? 1.8 : 2.6)
  return { y, z, dist }
}

/** Co-op camera with mobile/portrait tuning. */
export function coopCameraLayout(slot, boards, viewport = null) {
  const n = boards.length
  const myBoard = boards[slot]
  const myX = myBoard.position[0]
  const boardExtent = (b) => b.gridN * b.cell
  const myHalf = boardExtent(myBoard) / 2

  const isFirst = slot === 0
  const isLast = slot === n - 1
  const isMiddle = !isFirst && !isLast

  let viewMinX
  let viewMaxX

  if (isMiddle) {
    const leftHalf = boardExtent(boards[slot - 1]) / 2
    const rightHalf = boardExtent(boards[slot + 1]) / 2
    viewMinX = myX - myHalf - leftHalf
    viewMaxX = myX + myHalf + rightHalf
  } else if (isFirst) {
    viewMinX = myX - myHalf
    const right = boards[slot + 1]
    viewMaxX = right.position[0] + boardExtent(right) / 2
  } else {
    const left = boards[slot - 1]
    viewMinX = left.position[0] - boardExtent(left) / 2
    viewMaxX = myX + myHalf
  }

  const centerX = (viewMinX + viewMaxX) / 2
  const viewWidth = viewMaxX - viewMinX
  const portrait = viewport?.portrait ?? false
  const mobile = viewport?.isMobile ?? false
  const yScale = portrait ? 0.62 : mobile ? 0.55 : 0.55
  const zScale = portrait ? 0.42 : mobile ? 0.38 : 0.38
  const yBoost = portrait ? 4 : 5
  const zBoost = portrait ? 3 : 4

  return {
    position: [centerX, viewWidth * yScale + yBoost, viewWidth * zScale + zBoost],
    lookAt: [centerX, 0, 0],
    viewWidth,
  }
}

export const CELL = TILE.size
