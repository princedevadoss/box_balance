import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WAVER } from '../config'
import { boardForPickup, localToBoardWorld } from '../powerUps'
import { resolveBoardBody, waverLocalPosition, waverProgress } from '../waver'

const _ballPos = new THREE.Vector3()
const _charPos = new THREE.Vector3()

export function WaverCollector({
  data,
  ballRef,
  boardRef,
  boardRefs,
  waver,
  status,
  onCollect,
}) {
  const fired = useRef(false)
  const waverRef = useRef(waver)
  const timingRef = useRef(null)
  waverRef.current = waver

  useEffect(() => {
    fired.current = false
    timingRef.current = null
  }, [waver])

  useFrame(() => {
    const w = waverRef.current
    if (fired.current || status !== 'playing' || !w || !onCollect) return
    const ball = ballRef.current
    if (!ball) return

    const boardData = boardForPickup(data, w)
    const boardIndex = w.boardIndex ?? 0
    const boardBody =
      resolveBoardBody(boardRefs, data, boardIndex) ?? boardRef?.current ?? null
    if (!boardBody || !boardData) return

    const progress = waverProgress(w, performance.now(), timingRef)
    const [lx, ly, lz] = waverLocalPosition(boardData, w, progress)
    // Contact against character torso (not feet / not inflated grid radius).
    const worldPos = localToBoardWorld(boardBody, lx, ly + WAVER.modelHeight * 0.35, lz)
    if (!worldPos) return

    const t = ball.translation()
    _ballPos.set(t.x, t.y, t.z)
    _charPos.set(worldPos[0], worldPos[1], worldPos[2])

    const dx = _ballPos.x - _charPos.x
    const dz = _ballPos.z - _charPos.z
    const horiz = Math.hypot(dx, dz)
    if (horiz >= WAVER.pickupRadius) return

    // Ball must roughly reach character body height (ignore roll under board).
    const dy = Math.abs(_ballPos.y - _charPos.y)
    if (dy > WAVER.modelHeight * 0.7) return

    fired.current = true
    onCollect()
  })

  return null
}
