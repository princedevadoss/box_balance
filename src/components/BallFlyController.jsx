import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/** While fly is active, ball follows fly aim world position (from pointer or network). */
export function BallFlyController({ ballRef, flyActive, status, targetWorldRef }) {
  const released = useRef(false)
  const wasFlying = useRef(false)

  useEffect(() => {
    released.current = false
  }, [flyActive])

  useFrame(() => {
    const ball = ballRef.current
    if (!ball) return

    if (!flyActive || status !== 'playing' || released.current) {
      if (wasFlying.current) {
        wasFlying.current = false
        ball.setGravityScale(1, true)
      }
      return
    }

    const target = targetWorldRef?.current
    if (!target) return

    wasFlying.current = true
    ball.setTranslation({ x: target[0], y: target[1], z: target[2] }, true)
    ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
    ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
    ball.setGravityScale(0, true)
  })

  return null
}
