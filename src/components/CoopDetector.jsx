import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { boardHoleLocal } from '../level'
import { GAME, BALL, HAZARD, airLaunchSpeed } from '../config'
import { playLaunch } from '../audio'

const _conj = new THREE.Quaternion()
const _offset = new THREE.Vector3()
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

// One shared ball — spawn on board 1, score in the hole on board 2.
export function CoopDetector({
  data,
  board1Ref,
  board2Ref,
  ballRef,
  status,
  heartTaken,
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
  const launchSpeed = airLaunchSpeed(data.level)

  useEffect(() => {
    ended.current = false
    armed.current = false
    heartFired.current = false
  }, [runId])

  const boardRefFor = (board) => (board.boardIndex === 1 ? board1Ref : board2Ref)

  const pickActiveBoard = (worldX) => {
    const d1 = Math.abs(worldX - data.board1.position[0])
    const d2 = Math.abs(worldX - data.board2.position[0])
    return d1 <= d2 ? data.board1 : data.board2
  }

  useFrame((_, delta) => {
    if (status !== 'playing' || ended.current) return

    const ball = ballRef.current
    if (!ball) return

    const spawnBoard = data.ball.spawnBoard
    const goalBoard = data.ball.goalBoard
    const spawnRef = boardRefFor(spawnBoard)
    const goalRef = boardRefFor(goalBoard)
    const t = ball.translation()

    if (!armed.current) {
      const spawnLocal = ballBoardLocal(ballRef, spawnRef, _local)
      if (spawnLocal && spawnLocal.y > -0.35 && spawnLocal.y < 3 && t.y > GAME.fallY) {
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
        if (tile.kind === 'lava') {
          ended.current = true
          onFail('lava')
          return
        }
        if (tile.kind === 'heart' && !heartTaken && !heartFired.current) {
          heartFired.current = true
          onHeart()
        }
        if (tile.kind === 'air' && airCd.current <= 0) {
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

    const goalLocal = ballBoardLocal(ballRef, goalRef, _offset)
    if (!goalLocal) return
    if (goalLocal.y > -0.4 && t.y > GAME.fallY) return

    const [holeX, holeZ] = boardHoleLocal(goalBoard)
    const inHole =
      Math.abs(goalLocal.x - holeX) < goalBoard.cell * 0.6 &&
      Math.abs(goalLocal.z - holeZ) < goalBoard.cell * 0.6

    if (inHole) {
      ended.current = true
      onWin()
      return
    }

    ended.current = true
    onFail('fell')
  })

  return null
}
