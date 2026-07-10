import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useBeforePhysicsStep } from '@react-three/rapier'
import * as THREE from 'three'
import { boardHoleLocal } from '../level'
import { GAME, BALL, HAZARD, airLaunchSpeed } from '../config'
import { playLaunch } from '../audio'

const _conj = new THREE.Quaternion()
const _local = new THREE.Vector3()

function ballBoardLocal(ballRef, boardRef, out) {
  const ball = ballRef.current
  const board = boardRef.current
  if (!ball || !board) return null
  const t = ball.translation()
  const bt = board.translation()
  const q = board.rotation()
  _conj.set(q.x, q.y, q.z, q.w).conjugate()
  return out.set(t.x - bt.x, t.y - bt.y, t.z - bt.z).applyQuaternion(_conj)
}

export function CoopDetector({
  data,
  boardRefs,
  ballRef,
  status,
  heartTaken,
  patchActive = false,
  ghostActive = false,
  goalOpen = true,
  onWin,
  onFail,
  onHeart,
  runId,
}) {
  const armed = useRef(false)
  const heartFired = useRef(false)
  const airCd = useRef(0)
  const boostCd = useRef(0)
  const ended = useRef(false)
  const deltaRef = useRef(0)
  const launchSpeed = airLaunchSpeed(data.level)
  const boards = data.boards ?? []

  useEffect(() => {
    ended.current = false
    armed.current = false
    heartFired.current = false
  }, [runId])

  const boardRefFor = (board) => boardRefs.current[board.boardIndex]

  const pickActiveBoard = (worldX) => {
    let best = boards[0]
    let bestD = Infinity
    for (const b of boards) {
      const d = Math.abs(worldX - b.position[0])
      if (d < bestD) {
        bestD = d
        best = b
      }
    }
    return best
  }

  useFrame((_, delta) => {
    deltaRef.current = delta
  })

  useBeforePhysicsStep(() => {
    if (status !== 'playing' || ended.current) return
    const delta = deltaRef.current

    const ball = ballRef.current
    if (!ball) return

    const spawnBoard = data.ball.spawnBoard
    const goalBoard = data.ball.goalBoard
    const spawnRef = boardRefFor(spawnBoard)
    const t = ball.translation()

    if (!armed.current) {
      const spawnLocal = ballBoardLocal(ballRef, spawnRef, _local)
      if (spawnLocal && spawnLocal.y > -0.35 && spawnLocal.y <= BALL.spawnHeight + 1 && t.y > GAME.fallY) {
        armed.current = true
      }
      return
    }

    airCd.current = Math.max(0, airCd.current - delta)
    boostCd.current = Math.max(0, boostCd.current - delta)

    const activeBoard = pickActiveBoard(t.x)
    const activeRef = boardRefFor(activeBoard)
    const local = ballBoardLocal(ballRef, activeRef, _local)
    if (!local) return

    const { gridN, cell, thickness, cells } = activeBoard
    const col = Math.round(local.x / cell + (gridN - 1) / 2)
    const row = Math.round(local.z / cell + (gridN - 1) / 2)
    const tile = row >= 0 && col >= 0 && row < gridN && col < gridN ? cells[row][col] : null

    if (tile && tile.exists) {
      const nearSurface = local.y < thickness / 2 + BALL.radius + tile.height + 0.55
      if (nearSurface) {
        if (tile.kind === 'lava' && !patchActive && !ghostActive) {
          ended.current = true
          onFail('lava')
          return
        }
        if (tile.kind === 'heart' && !heartTaken && !heartFired.current) {
          heartFired.current = true
          onHeart()
        }
        if (tile.kind === 'air' && !ghostActive && airCd.current <= 0) {
          const lv = ball.linvel()
          ball.setLinvel({ x: lv.x, y: launchSpeed, z: lv.z }, true)
          airCd.current = HAZARD.air.cooldown
          playLaunch()
        }
        if (tile.kind === 'boost' && boostCd.current <= 0) {
          const lv = ball.linvel()
          const along = lv.x * tile.dx + lv.z * tile.dz
          if (along > HAZARD.boost.minAlong) {
            const b = HAZARD.boost
            ball.setLinvel(
              { x: tile.dx * b.speed + lv.x * b.keep, y: lv.y, z: tile.dz * b.speed + lv.z * b.keep },
              true
            )
            boostCd.current = b.cooldown
            playLaunch()
          }
        }
      }
    }

    if (t.y <= GAME.fallY) {
      if (!ghostActive) {
        ended.current = true
        onFail('fell')
      }
      return
    }

    if (activeBoard.boardIndex !== goalBoard.boardIndex) {
      if (local.y <= -0.4 && !ghostActive) {
        ended.current = true
        onFail('fell')
      }
      return
    }

    if (local.y > -0.4) return

    const [holeX, holeZ] = boardHoleLocal(goalBoard)
    const inHole =
      goalOpen &&
      Math.abs(local.x - holeX) < goalBoard.cell * 0.6 &&
      Math.abs(local.z - holeZ) < goalBoard.cell * 0.6

    ended.current = true
    if (inHole) onWin()
    else onFail('fell')
  })

  return null
}
