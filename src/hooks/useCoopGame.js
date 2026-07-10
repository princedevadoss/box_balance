import { useCallback, useEffect, useRef, useState } from 'react'
import { generateCoopLevel } from '../level'
import { GAME } from '../config'
import { initAudio, playClick, playWin, playFail, playLava } from '../audio'
import { usePowerUpInventory } from './usePowerUpInventory'
import { useWaverBonus } from './useWaverBonus'

export function useCoopGame({
  roomSeed = null,
  playerCount = 2,
  authoritative = true,
  onPowerUpRequest,
  gridCap = null,
  keyboardShortcuts = true,
} = {}) {
  const [status, setStatus] = useState('ready')
  const [countdown, setCountdown] = useState(GAME.countdown)
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(GAME.startLives)
  const [timeLeft, setTimeLeft] = useState(GAME.levelTime)
  const gridCapRef = useRef(gridCap)
  gridCapRef.current = gridCap

  const [data, setData] = useState(() =>
    generateCoopLevel(1, roomSeed, playerCount, { gridCap })
  )
  const [runId, setRunId] = useState(0)
  const [heartTaken, setHeartTaken] = useState(false)
  const [lifeRetrySpawn, setLifeRetrySpawn] = useState(false)
  const [flash, setFlash] = useState('')
  const [failReason, setFailReason] = useState('')

  const powerUps = usePowerUpInventory({
    data,
    status,
    runId,
    lifeRetrySpawn,
    authoritative,
    onPowerUpRequest,
    keyboardShortcuts,
    onFlash: setFlash,
    onHeal: () => setLives((l) => l + 1),
  })

  const ballPosCtxRef = useRef(null)
  const registerPowerUpCtx = powerUps.registerActivateCtx
  const registerActivateCtx = useCallback(
    (ctx) => {
      ballPosCtxRef.current = ctx
      registerPowerUpCtx(ctx)
    },
    [registerPowerUpCtx]
  )

  const getBallPosition = useCallback(() => {
    const ball = ballPosCtxRef.current?.ballRef?.current
    if (!ball) return null
    const t = ball.translation()
    return { x: t.x, z: t.z }
  }, [])

  const waverBonus = useWaverBonus({
    data,
    status,
    level,
    runId,
    lifeRetry: lifeRetrySpawn,
    authoritative,
    onFlash: setFlash,
    onScore: (pts) => setScore((s) => s + pts),
    getBallPosition,
  })

  const timeRef = useRef(timeLeft)
  timeRef.current = timeLeft
  const levelRef = useRef(level)
  levelRef.current = level
  const livesRef = useRef(lives)
  livesRef.current = lives
  const statusRef = useRef(status)
  statusRef.current = status
  const scoreRef = useRef(score)
  scoreRef.current = score
  const heartTakenRef = useRef(heartTaken)
  heartTakenRef.current = heartTaken
  const flashRef = useRef(flash)
  flashRef.current = flash
  const failReasonRef = useRef(failReason)
  failReasonRef.current = failReason
  const countdownRef = useRef(countdown)
  countdownRef.current = countdown
  const runIdRef = useRef(runId)
  runIdRef.current = runId

  useEffect(() => {
    if (!authoritative) return
    if (status !== 'playing') return
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [status, level, authoritative])

  useEffect(() => {
    if (!authoritative) return
    if (status === 'playing' && timeLeft <= 0) handleFail('time')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, status, authoritative])

  useEffect(() => {
    if (!authoritative) return
    if (status !== 'countdown') return
    if (countdown <= 0) {
      setStatus('playing')
      return
    }
    const id = setTimeout(() => setCountdown((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [status, countdown, authoritative])

  useEffect(() => {
    if (!authoritative) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      initAudio()
      setStatus((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [authoritative])

  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(''), GAME.flashMs)
    return () => clearTimeout(id)
  }, [flash])

  useEffect(() => {
    if (status !== 'ready') return
    setData(generateCoopLevel(1, roomSeed, playerCount, { gridCap: gridCapRef.current }))
  }, [playerCount, roomSeed, status])

  const loadLevel = useCallback((lvl, { resetHeart = true, lifeRetry = false } = {}) => {
    setData(generateCoopLevel(lvl, roomSeed, playerCount, { gridCap: gridCapRef.current }))
    setTimeLeft(GAME.levelTime)
    if (resetHeart) setHeartTaken(false)
    setLifeRetrySpawn(lifeRetry)
    setRunId((r) => r + 1)
  }, [roomSeed, playerCount])

  const beginCountdown = useCallback((lvl, options = {}) => {
    loadLevel(lvl, options)
    setCountdown(GAME.countdown)
    setStatus('countdown')
  }, [loadLevel])

  const getPowerUpSnapshot = powerUps.getPowerUpSnapshot
  const getWaverSnapshot = waverBonus.getWaverSnapshot
  const applyPowerUpSync = powerUps.applyPowerUpSync
  const applyWaverSync = waverBonus.applyWaverSync
  const resetPowerUps = powerUps.resetPowerUps
  const resetWaverSession = waverBonus.resetSession
  const handleHeartCollect = powerUps.handleHeartCollect

  const start = useCallback(() => {
    initAudio()
    playClick()
    setScore(0)
    setLevel(1)
    setLives(GAME.startLives)
    setFailReason('')
    resetPowerUps()
    resetWaverSession()
    beginCountdown(1)
  }, [beginCountdown, resetPowerUps, resetWaverSession])

  const handleWin = useCallback(() => {
    if (statusRef.current !== 'playing') return
    const lvl = levelRef.current
    const bonus = GAME.scoreBase + timeRef.current * GAME.scoreTimeBonus
    const earnedLife = lvl % GAME.bonusLifeEveryLevels === 0
    setScore((s) => s + bonus)
    if (earnedLife) {
      setLives((l) => l + 1)
      setFlash(`Team cleared level ${lvl}!  +${bonus} · ❤ +1 life`)
    } else {
      setFlash(`Team cleared level ${lvl}!  +${bonus}`)
    }
    playWin()
    const next = lvl + 1
    setLevel(next)
    beginCountdown(next)
  }, [beginCountdown])

  const handleFail = useCallback((reason) => {
    if (statusRef.current !== 'playing') return
    if (reason === 'lava') playLava()
    playFail()
    const remaining = livesRef.current - 1
    setLives(remaining)
    if (remaining <= 0) {
      setFailReason(reason)
      setStatus('over')
    } else {
      const msg = reason === 'lava' ? 'Melted!' : reason === 'time' ? "Time's up!" : 'Missed!'
      setFlash(`${msg}  ${remaining} ${remaining === 1 ? 'life' : 'lives'} left`)
      beginCountdown(levelRef.current, { lifeRetry: true })
    }
  }, [beginCountdown])

  const handleHeart = useCallback(() => {
    setHeartTaken(true)
    handleHeartCollect()
  }, [handleHeartCollect])

  const resume = useCallback(() => {
    initAudio()
    playClick()
    setStatus('playing')
  }, [])

  const exitToMenu = useCallback(() => {
    playClick()
    setStatus('ready')
    setScore(0)
    setLevel(1)
    setLives(GAME.startLives)
    setFailReason('')
    resetPowerUps()
    resetWaverSession()
    loadLevel(1)
  }, [loadLevel, resetPowerUps, resetWaverSession])

  const getSnapshot = useCallback((physics) => ({
    ...physics,
    ...getPowerUpSnapshot(),
    ...getWaverSnapshot(),
    runId: runIdRef.current,
    level: levelRef.current,
    lives: livesRef.current,
    score: scoreRef.current,
    status: statusRef.current,
    timeLeft: timeRef.current,
    heartTaken: heartTakenRef.current,
    flash: flashRef.current,
    failReason: failReasonRef.current,
    countdown: countdownRef.current,
  }), [getPowerUpSnapshot, getWaverSnapshot])

  const syncFromHost = useCallback(
    (peer) => {
      if (!peer) return

      if (peer.runId != null && peer.runId !== runIdRef.current) {
        runIdRef.current = peer.runId
        setRunId(peer.runId)
        setData(
          generateCoopLevel(peer.level ?? levelRef.current, roomSeed, playerCount, {
            gridCap: gridCapRef.current,
          })
        )
        if (peer.heartTaken != null) setHeartTaken(peer.heartTaken)
        if (peer.timeLeft != null) setTimeLeft(peer.timeLeft)
      }

      applyPowerUpSync(peer)
      applyWaverSync(peer)

      if (peer.level != null) setLevel(peer.level)
      if (peer.status != null) setStatus(peer.status)
      if (peer.countdown != null) setCountdown(peer.countdown)
      if (peer.lives != null) setLives(peer.lives)
      if (peer.score != null) setScore(peer.score)
      if (peer.timeLeft != null) setTimeLeft(peer.timeLeft)
      if (peer.heartTaken != null) setHeartTaken(peer.heartTaken)
      if (peer.failReason != null) setFailReason(peer.failReason)
      if (peer.flash) setFlash(peer.flash)
    },
    [roomSeed, playerCount, applyPowerUpSync, applyWaverSync]
  )

  return {
    status,
    countdown,
    level,
    score,
    lives,
    timeLeft,
    data,
    runId,
    heartTaken,
    flash,
    failReason,
    ...powerUps,
    registerActivateCtx,
    waver: waverBonus.waver,
    goalOpen: waverBonus.goalOpen,
    handleWaverCollect: waverBonus.handleWaverCollect,
    start,
    resume,
    exitToMenu,
    handleWin,
    handleFail,
    handleHeart,
    getSnapshot,
    syncFromHost,
  }
}
