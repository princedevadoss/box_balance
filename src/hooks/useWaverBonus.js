import { useCallback, useEffect, useRef, useState } from 'react'
import { WAVER } from '../config'
import { playWin } from '../audio'
import { planWaverSpawnDelay, pickWaverSpawn, walkKey } from '../waver'

/**
 * Walking character bonus — once per level attempt unless already caught.
 * If caught on a level and the player loses a life, retrying that level
 * skips the character and opens the goal immediately.
 */
export function useWaverBonus({
  data,
  status,
  level = 1,
  runId = 0,
  lifeRetry = false,
  authoritative = true,
  onFlash,
  onScore,
  getBallPosition,
}) {
  const [waver, setWaver] = useState(null)
  const [goalOpen, setGoalOpen] = useState(false)
  const spawnedRef = useRef(false)
  const delaySecRef = useRef(planWaverSpawnDelay())
  const playingAccumRef = useRef(0)
  const lastTickRef = useRef(null)
  const claimedLevelsRef = useRef(new Set())
  const dataRef = useRef(data)
  dataRef.current = data
  const levelRef = useRef(level)
  levelRef.current = level
  const waverRef = useRef(waver)
  waverRef.current = waver
  const goalOpenRef = useRef(goalOpen)
  goalOpenRef.current = goalOpen

  const openGoal = useCallback(() => {
    if (goalOpenRef.current) return
    goalOpenRef.current = true
    setGoalOpen(true)
  }, [])

  const resetWaverRun = useCallback(() => {
    spawnedRef.current = false
    delaySecRef.current = planWaverSpawnDelay()
    playingAccumRef.current = 0
    lastTickRef.current = null
    setWaver(null)
    goalOpenRef.current = false
    setGoalOpen(false)
  }, [])

  const skipWaverForLevel = useCallback(() => {
    spawnedRef.current = true
    setWaver(null)
    goalOpenRef.current = true
    setGoalOpen(true)
  }, [])

  const resetSession = useCallback(() => {
    claimedLevelsRef.current.clear()
    resetWaverRun()
  }, [resetWaverRun])

  // New run (level start / life retry): skip character if already caught this level.
  useEffect(() => {
    if (lifeRetry && claimedLevelsRef.current.has(level)) {
      skipWaverForLevel()
      return
    }
    resetWaverRun()
  }, [runId, level, lifeRetry, resetWaverRun, skipWaverForLevel])

  useEffect(() => {
    if (!authoritative) return
    if (status !== 'playing') {
      lastTickRef.current = null
      return
    }
    if (spawnedRef.current) return

    lastTickRef.current = performance.now()
    const id = setInterval(() => {
      if (spawnedRef.current) return
      const now = performance.now()
      const last = lastTickRef.current ?? now
      lastTickRef.current = now
      playingAccumRef.current += (now - last) / 1000

      if (playingAccumRef.current < delaySecRef.current) return

      const ball = getBallPosition?.()
      if (!ball) return

      const spot = pickWaverSpawn(dataRef.current, ball.x, ball.z)
      spawnedRef.current = true
      if (!spot) {
        openGoal()
        return
      }

      const waverData = {
        ...spot,
        startedAt: now,
        expiresAt: now + WAVER.durationSec * 1000,
      }
      waverRef.current = waverData
      setWaver(waverData)
    }, 200)

    return () => clearInterval(id)
  }, [status, authoritative, getBallPosition, openGoal, runId])

  useEffect(() => {
    if (!authoritative || !waver) return
    const left = Math.max(0, waver.expiresAt - performance.now())
    const id = setTimeout(() => {
      setWaver(null)
      openGoal()
    }, left + 16)
    return () => clearTimeout(id)
  }, [waver, authoritative, openGoal])

  const handleWaverCollect = useCallback(() => {
    if (!authoritative) return
    if (!waverRef.current) return
    claimedLevelsRef.current.add(levelRef.current)
    setWaver(null)
    openGoal()
    onScore?.(WAVER.scoreBonus)
    onFlash?.(`Waver caught!  +${WAVER.scoreBonus}`)
    playWin()
  }, [authoritative, onFlash, onScore, openGoal])

  const applyWaverSync = useCallback((peer) => {
    if (authoritative) return
    if (!peer) return
    if ('waver' in peer) {
      const incoming = peer.waver ?? null
      if (!incoming) {
        waverRef.current = null
        setWaver(null)
      } else if (!incoming.startedAt || !incoming.expiresAt) {
        const now = performance.now()
        const patched = {
          ...incoming,
          startedAt: now,
          expiresAt: now + WAVER.durationSec * 1000,
        }
        waverRef.current = patched
        setWaver(patched)
      } else if (walkKey(incoming) !== walkKey(waverRef.current)) {
        waverRef.current = incoming
        setWaver(incoming)
      }
    }
    if (peer.goalOpen != null) {
      goalOpenRef.current = !!peer.goalOpen
      setGoalOpen(!!peer.goalOpen)
    }
  }, [authoritative])

  const getWaverSnapshot = useCallback(
    () => ({
      waver: waverRef.current,
      goalOpen: goalOpenRef.current,
    }),
    []
  )

  return {
    waver,
    goalOpen,
    resetSession,
    handleWaverCollect,
    applyWaverSync,
    getWaverSnapshot,
  }
}
