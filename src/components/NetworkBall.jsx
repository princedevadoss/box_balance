import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BALL, COLORS } from '../config'
import { useNizhenTexture } from '../textures'
import { setRollSpeed, stopRoll } from '../audio'

const _targetQuat = new THREE.Quaternion()
const _spinAxis = new THREE.Vector3()
const _spinDelta = new THREE.Quaternion()
const _pos = new THREE.Vector3()
const MAX_EXTRAPOLATE_S = 0.12

function extrapolateSeconds(receivedAt) {
  if (receivedAt == null) return 0
  return Math.min(Math.max(0, (performance.now() - receivedAt) / 1000), MAX_EXTRAPOLATE_S)
}

// Visual-only ball driven from network state (no Rapier body).
export function NetworkBall({
  stateRef,
  status,
  spawn,
  level = 1,
  runId = 0,
  tint = 'primary',
  radiusScale = 1,
  flyActive = false,
  flyOverrideRef = null,
}) {
  const meshRef = useRef(null)
  const texture = useNizhenTexture(level)
  const frozen = status === 'countdown'
  const radius = BALL.radius * radiusScale
  const [sx, sy, sz] = spawn ?? [0, 0, 4]
  const lastRunId = useRef(runId)
  const lastNetworkRunId = useRef(null)

  useEffect(() => {
    lastNetworkRunId.current = null
    const mesh = meshRef.current
    if (mesh) mesh.position.set(sx, sy, sz)
  }, [spawn, level, status, runId, sx, sy, sz])

  useEffect(() => {
    if (lastRunId.current === runId) return
    lastRunId.current = runId
    if (stateRef) stateRef.current = null
    const mesh = meshRef.current
    if (mesh) mesh.position.set(sx, sy, sz)
  }, [runId, stateRef, sx, sy, sz])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const networkBall = stateRef?.current
    const flyAim = flyActive && flyOverrideRef?.current

    if (flyAim) {
      mesh.position.set(flyAim[0], flyAim[1], flyAim[2])
      if (frozen || status !== 'playing') {
        stopRoll()
        return
      }
      setRollSpeed(0)
      return
    }

    if (!networkBall?.pos) {
      mesh.position.set(sx, sy, sz)
      stopRoll()
      return
    }

    const networkRunId = networkBall.runId ?? runId
    if (lastNetworkRunId.current != null && networkRunId !== lastNetworkRunId.current) {
      lastNetworkRunId.current = networkRunId
    } else if (lastNetworkRunId.current == null) {
      lastNetworkRunId.current = networkRunId
    }

    const [px, py, pz] = networkBall.pos
    const vel = networkBall.vel
    const extrapolate = status === 'playing' && !frozen
    const elapsed = extrapolate ? extrapolateSeconds(networkBall.receivedAt) : 0

    const tx = vel && extrapolate ? px + vel[0] * elapsed : px
    const ty = vel && extrapolate ? py + vel[1] * elapsed : py
    const tz = vel && extrapolate ? pz + vel[2] * elapsed : pz

    _pos.set(tx, ty, tz)
    mesh.position.copy(_pos)

    if (networkBall.rot) {
      _targetQuat.set(
        networkBall.rot[0],
        networkBall.rot[1],
        networkBall.rot[2],
        networkBall.rot[3]
      )
      const ang = networkBall.angVel
      if (ang && extrapolate) {
        const speed = Math.hypot(ang[0], ang[1], ang[2])
        if (speed > 0.001) {
          _spinAxis.set(ang[0], ang[1], ang[2]).normalize()
          _spinDelta.setFromAxisAngle(_spinAxis, speed * elapsed)
          _targetQuat.multiply(_spinDelta)
        }
      }
      mesh.quaternion.copy(_targetQuat)
    }

    if (frozen || status !== 'playing') {
      stopRoll()
      return
    }

    setRollSpeed(vel ? Math.hypot(vel[0], vel[1], vel[2]) : 0)
  })

  const color = tint === 'secondary' ? COLORS.ball2 : undefined
  const emissive = tint === 'secondary' ? COLORS.ball2Emissive : undefined

  return (
    <mesh
      ref={meshRef}
      position={[sx, sy, sz]}
      castShadow
      key={`network-ball-${level}-${radiusScale}`}
      scale={[radiusScale, radiusScale, radiusScale]}
    >
      <sphereGeometry args={[BALL.radius, 32, 32]} />
      <meshStandardMaterial
        key={`network-ball-mat-${level}`}
        map={tint === 'primary' ? texture : undefined}
        color={tint === 'secondary' ? color : '#ffffff'}
        emissive={emissive}
        emissiveIntensity={tint === 'secondary' ? 0.15 : 0}
        metalness={BALL.metalness}
        roughness={BALL.roughness}
        envMapIntensity={0.25}
      />
    </mesh>
  )
}
