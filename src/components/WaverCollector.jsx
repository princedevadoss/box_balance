import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WAVER } from '../config'
import { boardForPickup, localToBoardWorld } from '../powerUps'
import {
  resolveBoardBody,
  waverLocalPosition,
  waverProgress,
  waverTouchesBall,
} from '../waver'

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
    const progress = waverProgress(w, performance.now(), timingRef)
    const t = ball.translation()
    const ballX = t.x
    const ballZ = t.z

    if (waverTouchesBall(boardData, w, ballX, ballZ, progress)) {
      fired.current = true
      onCollect()
      return
    }

    if (!boardBody) return

    const [lx, ly, lz] = waverLocalPosition(boardData, w, progress)
    const worldPos = localToBoardWorld(boardBody, lx, ly + WAVER.modelHeight * 0.35, lz)
    if (!worldPos) return

    _ballPos.set(t.x, t.y, t.z)
    _charPos.set(worldPos[0], worldPos[1], worldPos[2])
    const dx = _ballPos.x - _charPos.x
    const dz = _ballPos.z - _charPos.z
    const dy = _ballPos.y - _charPos.y
    if (Math.hypot(dx, dz, dy * 0.35) < WAVER.pickupRadius) {
      fired.current = true
      onCollect()
    }
  })

  return null
}
