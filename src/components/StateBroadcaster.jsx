import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { MSG } from '../net/protocol.js'

const EPS = 0.002
const BOARD_INTERVAL = 1 / 30
const BALL_INTERVAL = 1 / 60

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
  if (next.peerBoards || prev.peerBoards) {
    const a = next.peerBoards ?? {}
    const b = prev.peerBoards ?? {}
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) {
      if (changed(a[k], b[k])) return true
    }
  }
  if (!includeBall) return false
  return (
    changed(next.ball, prev.ball) ||
    changed(next.ballVel, prev.ballVel) ||
    changed(next.ballAngVel, prev.ballAngVel) ||
    changed(next.ballRot, prev.ballRot)
  )
}

function buildPhysics(board, ball, includeBall) {
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
  return physics
}

// Snapshot of local board + ball for multiplayer relay.
export function StateBroadcaster({
  boardRef,
  ballRef,
  getSnapshot,
  onSend,
  active,
  includeBall = true,
  forceSendOnMeta = false,
}) {
  const acc = useRef(0)
  const lastPhysics = useRef(null)
  const metaStamp = useRef('')

  useFrame((_, delta) => {
    if (!active || !onSend) return

    const board = boardRef.current
    const ball = ballRef.current
    if (!board || (includeBall && !ball)) return

    const physics = buildPhysics(board, ball, includeBall)
    const snapshot = getSnapshot(physics)
    const metaKey = `${snapshot.runId}|${snapshot.status}|${snapshot.level}|${snapshot.lives}|${snapshot.score}|${snapshot.timeLeft}|${snapshot.heartTaken}|${snapshot.countdown}|${snapshot.failReason}|${snapshot.flash}|${snapshot.selectedType}|${JSON.stringify(snapshot.inventory)}|${JSON.stringify(snapshot.effectsUntil)}|${JSON.stringify(snapshot.worldPickup)}`
    const metaChanged = metaKey !== metaStamp.current

    if (metaChanged && forceSendOnMeta && includeBall) {
      lastPhysics.current = lastPhysics.current
        ? {
            ...lastPhysics.current,
            ball: null,
            ballVel: null,
            ballAngVel: null,
            ballRot: null,
          }
        : null
      metaStamp.current = metaKey
      lastPhysics.current = snapshot
      onSend(snapshot)
      acc.current = 0
      return
    }

    if (includeBall) {
      acc.current += delta
      const motionChanged = physicsChanged(snapshot, lastPhysics.current, includeBall)
      if (!metaChanged && !motionChanged && acc.current < BALL_INTERVAL) return
      acc.current = 0
      metaStamp.current = metaKey
      lastPhysics.current = snapshot
      onSend(snapshot)
      return
    }

    acc.current += delta
    if (acc.current < BOARD_INTERVAL) return
    acc.current = 0

    const motionChanged = physicsChanged(snapshot, lastPhysics.current, includeBall)
    if (!metaChanged && !motionChanged) return

    metaStamp.current = metaKey
    lastPhysics.current = snapshot
    onSend(snapshot)
  })

  return null
}

export { MSG }
