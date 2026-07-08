import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { cellCenter } from '../level'
import { GAME, BALL, HAZARD, airLaunchSpeed } from '../config'
import { playLaunch } from '../audio'

// Watches the ball each frame: launches it off air tiles, boosts it across pads,
// catches heart pickups, and decides win (goal pocket) / life-loss (lava, fell off).
export function Detector({ data, boardRef, ballRef, status, heartTaken, onWin, onFail, onHeart }) {
  const fired = useRef(false)
  const armed = useRef(false) // ignore garbage positions until ball is on the deck
  const heartFired = useRef(false)
  const airCd = useRef(0)
  const boostCd = useRef(0)

  const { gridN, cell, thickness, cells, hole, level } = data
  const [holeX, holeZ] = cellCenter(hole.r, hole.c, gridN, cell)
  const launchSpeed = airLaunchSpeed(level)

  useFrame((state, delta) => {
    if (fired.current || status !== 'playing') return
    const board = boardRef.current
    const ball = ballRef.current
    if (!board || !ball) return

    const t = ball.translation()
    const q = board.rotation()
    const quat = new THREE.Quaternion(q.x, q.y, q.z, q.w).conjugate()
    const local = new THREE.Vector3(t.x, t.y, t.z).applyQuaternion(quat)

    if (!armed.current) {
      if (local.y > -0.35 && local.y < 3 && t.y > GAME.fallY) armed.current = true
      return
    }

    airCd.current = Math.max(0, airCd.current - delta)
    boostCd.current = Math.max(0, boostCd.current - delta)

    // Which tile is the ball currently over (board-local grid)?
    const col = Math.round(local.x / cell + (gridN - 1) / 2)
    const row = Math.round(local.z / cell + (gridN - 1) / 2)
    const tile = row >= 0 && col >= 0 && row < gridN && col < gridN ? cells[row][col] : null

    if (tile && tile.exists) {
      const nearSurface = local.y < thickness / 2 + BALL.radius + tile.height + 0.55
      if (nearSurface) {
        if (tile.kind === 'lava') {
          fired.current = true
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
          // Only thrust when the ball is actually heading in the arrow direction.
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

    // Fell below the deck: win if inside the goal pocket, otherwise a miss.
    if (local.y > -0.4 && t.y > GAME.fallY) return
    fired.current = true
    const inHole =
      Math.abs(local.x - holeX) < cell * 0.6 && Math.abs(local.z - holeZ) < cell * 0.6
    if (inHole) onWin()
    else onFail('fell')
  })

  return null
}
