// Per-player camera framing for co-op: own board full; neighbors half or full by slot.

function boardExtent(board) {
  return board.gridN * board.cell
}

export function coopCameraLayout(slot, boards) {
  const n = boards.length
  const myBoard = boards[slot]
  const myX = myBoard.position[0]
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
  const y = viewWidth * 0.55 + 5
  const z = viewWidth * 0.38 + 4

  return { position: [centerX, y, z], lookAt: [centerX, 0, 0] }
}
