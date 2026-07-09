import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, BallCollider } from '@react-three/rapier'
import { BALL, COLORS } from '../config'
import { useNizhenTexture } from '../textures'
import { setRollSpeed, stopRoll } from '../audio'

export function Ball({
  bodyRef,
  status,
  spawn,
  level = 1,
  runId = 0,
  tint = 'primary',
  flyActive = false,
  radiusScale = 1,
}) {
  const texture = useNizhenTexture(level)
  const frozen = status === 'countdown'
  const radius = BALL.radius * radiusScale
  const [x, y, z] = spawn
  const lastRunId = useRef(runId)
  const resetSpawnRef = useRef(false)

  useEffect(() => {
    if (lastRunId.current === runId) return
    lastRunId.current = runId
    resetSpawnRef.current = true
  }, [runId])

  useFrame(() => {
    const b = bodyRef.current
    if (!b) return

    if (resetSpawnRef.current) {
      resetSpawnRef.current = false
      b.setTranslation({ x, y, z }, true)
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }

    b.setGravityScale(frozen || flyActive ? 0 : 1, true)

    if (frozen) {
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
      stopRoll()
      return
    }
    if (status === 'playing') {
      const v = b.linvel()
      setRollSpeed(Math.hypot(v.x, v.y, v.z))
    } else {
      stopRoll()
    }
  })

  const color = tint === 'secondary' ? COLORS.ball2 : undefined
  const emissive = tint === 'secondary' ? COLORS.ball2Emissive : undefined

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders={false}
      position={[x, y, z]}
      gravityScale={frozen ? 0 : 1}
      friction={BALL.friction}
      restitution={BALL.restitution}
      linearDamping={BALL.linearDamping}
      angularDamping={BALL.angularDamping}
      canSleep={false}
    >
      <BallCollider args={[radius]} friction={BALL.friction} restitution={BALL.restitution} />
      <mesh castShadow key={`ball-mesh-${level}-${radiusScale}`} scale={[radiusScale, radiusScale, radiusScale]}>
        <sphereGeometry args={[BALL.radius, 48, 48]} />
        <meshStandardMaterial
          key={`ball-mat-${level}`}
          map={tint === 'primary' ? texture : undefined}
          color={tint === 'secondary' ? color : '#ffffff'}
          emissive={emissive}
          emissiveIntensity={tint === 'secondary' ? 0.15 : 0}
          metalness={BALL.metalness}
          roughness={BALL.roughness}
          envMapIntensity={0.25}
        />
      </mesh>
    </RigidBody>
  )
}
