import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { MSG } from '../net/protocol.js'

const EPS = 0.002

function changed(a, b) {
  if (!a || !b) return a !== b
  if (a.length !== b.length) return true
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > EPS) return true
  }
  return false
}

function physicsChanged(next, prev, includeBall) {
  if (!prev) return true
  if (changed(next.board, prev.board)) return true
  if (!includeBall) return false
  return (
    changed(next.ball, prev.ball) ||
    changed(next.ballVel, prev.ballVel) ||
    changed(next.ballAngVel, prev.ballAngVel) ||
    changed(next.ballRot, prev.ballRot)
  )
}

// Throttled snapshot of local board + ball for multiplayer relay.
export function StateBroadcaster({ boardRef, ballRef, getSnapshot, onSend, active, includeBall = true }) {
  const acc = useRef(0)
  const lastPhysics = useRef(null)
  const metaStamp = useRef('')

  useFrame((_, delta) => {
    if (!active || !onSend) return
    acc.current += delta
    if (acc.current < 0.033) return
    acc.current = 0

    const board = boardRef.current
    const ball = ballRef.current
    if (!board || (includeBall && !ball)) return

    const rot = board.rotation()
    const physics = {
      board: [rot.x, rot.y, rot.z, rot.w],
    }
    if (includeBall && ball) {
      const pos = ball.translation()
      const lv = ball.linvel()
      const av = ball.angvel()
      const br = ball.rotation()
      physics.ball = [pos.x, pos.y, pos.z]
      physics.ballVel = [lv.x, lv.y, lv.z]
      physics.ballAngVel = [av.x, av.y, av.z]
      physics.ballRot = [br.x, br.y, br.z, br.w]
    }

    const snapshot = getSnapshot(physics)
    const metaKey = `${snapshot.runId}|${snapshot.status}|${snapshot.level}|${snapshot.lives}|${snapshot.score}|${snapshot.timeLeft}|${snapshot.heartTaken}|${snapshot.countdown}|${snapshot.failReason}|${snapshot.flash}`
    const metaChanged = metaKey !== metaStamp.current
    const motionChanged = physicsChanged(physics, lastPhysics.current, includeBall)

    if (!metaChanged && !motionChanged) return

    metaStamp.current = metaKey
    lastPhysics.current = physics
    onSend(snapshot)
  })

  return null
}

export { MSG }
