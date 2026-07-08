import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PATCH } from '../config'
import { boardForPickup, patchPickupWorldPosition } from '../patchPowerUp'

const _ballPos = new THREE.Vector3()
const _pickupPos = new THREE.Vector3()

export function PatchCollector({ data, ballRef, patchPickup, status, runId, onCollect }) {
  const fired = useRef(false)

  useEffect(() => {
    fired.current = false
  }, [patchPickup, runId])

  useFrame(() => {
    if (fired.current || status !== 'playing' || !patchPickup || !onCollect) return
    const ball = ballRef.current
    if (!ball) return

    const board = boardForPickup(data, patchPickup)
    const [wx, wy, wz] = patchPickupWorldPosition(board, patchPickup)
    const t = ball.translation()
    _ballPos.set(t.x, t.y, t.z)
    _pickupPos.set(wx, wy, wz)
    if (_ballPos.distanceTo(_pickupPos) < PATCH.pickupRadius) {
      fired.current = true
      onCollect()
    }
  })

  return null
}
