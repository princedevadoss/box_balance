import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { POWERUP } from '../config'
import { boardForPickup, localToBoardWorld, pickupLocalPosition } from '../powerUps'

const _ballPos = new THREE.Vector3()
const _pickupPos = new THREE.Vector3()

export function PowerUpCollector({
  data,
  ballRef,
  boardRef,
  boardRefs,
  worldPickup,
  status,
  runId,
  onCollect,
}) {
  const fired = useRef(false)

  useEffect(() => {
    fired.current = false
  }, [worldPickup, runId])

  useFrame(() => {
    if (fired.current || status !== 'playing' || !worldPickup || !onCollect) return
    const ball = ballRef.current
    if (!ball) return

    const boardData = boardForPickup(data, worldPickup)
    const boardIndex = worldPickup.boardIndex ?? 0
    const boardBody = boardRefs?.current?.[boardIndex]?.current ?? boardRef?.current
    const [lx, ly, lz] = pickupLocalPosition(boardData, worldPickup)
    const worldPos = localToBoardWorld(boardBody, lx, ly, lz)
    if (!worldPos) return

    const t = ball.translation()
    _ballPos.set(t.x, t.y, t.z)
    _pickupPos.set(worldPos[0], worldPos[1], worldPos[2])
    if (_ballPos.distanceTo(_pickupPos) < POWERUP.pickupRadius) {
      fired.current = true
      onCollect()
    }
  })

  return null
}
