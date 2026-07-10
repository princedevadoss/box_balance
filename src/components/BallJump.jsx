import { useCallback, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useBeforePhysicsStep } from '@react-three/rapier'
import { BALL, ballJumpVelocity } from '../config'
import { playLaunch } from '../audio'

export function BallJump({
  ballRef,
  status,
  isHost = true,
  onJumpRequest,
  peerEventRef,
  canvasJump = true,
  jumpTriggerRef,
}) {
  const { gl } = useThree()
  const jumpCd = useRef(0)
  const jumpPending = useRef(false)
  const lastEventKey = useRef('')
  const lastTriggerTick = useRef(0)

  const queueJump = useCallback(() => {
    if (status !== 'playing' || jumpCd.current > 0) return
    if (isHost) {
      jumpPending.current = true
    } else {
      jumpCd.current = BALL.jumpCooldown
      onJumpRequest?.()
    }
  }, [status, isHost, onJumpRequest])

  const applyJump = useCallback(() => {
    const b = ballRef.current
    if (!b || jumpCd.current > 0) return false
    jumpCd.current = BALL.jumpCooldown
    const lv = b.linvel()
    b.setLinvel({ x: lv.x, y: ballJumpVelocity(), z: lv.z }, true)
    playLaunch()
    return true
  }, [ballRef])

  useFrame((_, delta) => {
    jumpCd.current = Math.max(0, jumpCd.current - delta)
  })

  useBeforePhysicsStep(() => {
    if (jumpTriggerRef?.current > lastTriggerTick.current) {
      lastTriggerTick.current = jumpTriggerRef.current
      queueJump()
    }

    if (jumpPending.current) {
      jumpPending.current = false
      applyJump()
    }

    if (!isHost || !peerEventRef?.current) return
    const evt = peerEventRef.current
    if (evt.event?.type !== 'jump') return
    const key = `${evt.slot ?? 0}:${evt.ts ?? 0}`
    if (key === lastEventKey.current) return
    lastEventKey.current = key
    applyJump()
  })

  useEffect(() => {
    if (!canvasJump) return
    const onPointerDown = () => queueJump()
    gl.domElement.addEventListener('pointerdown', onPointerDown)
    return () => gl.domElement.removeEventListener('pointerdown', onPointerDown)
  }, [canvasJump, queueJump, gl])

  return null
}
