import { useEffect, useRef, useState } from 'react'
import { generateLevel } from '../level'
import { GAME } from '../config'
import { initAudio, playClick, playWin, playFail, playLava } from '../audio'
import { usePowerUpInventory } from './usePowerUpInventory'

export function useGame({ roomSeed = null } = {}) {
  const [status, setStatus] = useState('ready')
  const [countdown, setCountdown] = useState(GAME.countdown)
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [lives, setLives] = useState(GAME.startLives)
  const [timeLeft, setTimeLeft] = useState(GAME.levelTime)
  const [data, setData] = useState(() => generateLevel(1, roomSeed))
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
    authoritative: true,
    onFlash: setFlash,
    onHeal: () => setLives((l) => l + 1),
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

  useEffect(() => {
    if (status !== 'playing') return
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [status, level])

  useEffect(() => {
    if (status === 'playing' && timeLeft <= 0) handleFail('time')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, status])

  useEffect(() => {
    if (status !== 'countdown') return
    if (countdown <= 0) {
      setStatus('playing')
      return
    }
    const id = setTimeout(() => setCountdown((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [status, countdown])

  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(''), GAME.flashMs)
    return () => clearTimeout(id)
  }, [flash])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      initAudio()
      setStatus((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const loadLevel = (lvl, { resetHeart = true, lifeRetry = false } = {}) => {
    setData(generateLevel(lvl, roomSeed))
    setTimeLeft(GAME.levelTime)
    if (resetHeart) setHeartTaken(false)
    setLifeRetrySpawn(lifeRetry)
    setRunId((r) => r + 1)
  }

  const beginCountdown = (lvl, options = {}) => {
    loadLevel(lvl, options)
    setCountdown(GAME.countdown)
    setStatus('countdown')
  }

  const start = () => {
    initAudio()
    playClick()
    setScore(0)
    setLevel(1)
    setLives(GAME.startLives)
    setFailReason('')
    powerUps.resetPowerUps()
    beginCountdown(1)
  }

  const handleWin = () => {
    if (status !== 'playing') return
    const lvl = levelRef.current
    const bonus = GAME.scoreBase + timeRef.current * GAME.scoreTimeBonus
    const earnedLife = lvl % GAME.bonusLifeEveryLevels === 0
    setScore((s) => s + bonus)
    if (earnedLife) {
      setLives((l) => l + 1)
      setFlash(`Level ${lvl} cleared!  +${bonus} · ❤ +1 life`)
    } else {
      setFlash(`Level ${lvl} cleared!  +${bonus}`)
    }
    playWin()
    const next = lvl + 1
    setLevel(next)
    beginCountdown(next)
  }

  const handleFail = (reason) => {
    if (status !== 'playing') return
    if (reason === 'lava') playLava()
    playFail()
    const remaining = livesRef.current - 1
    setLives(remaining)
    if (remaining <= 0) {
      setBest((b) => Math.max(b, levelRef.current))
      setFailReason(reason)
      setStatus('over')
    } else {
      const msg = reason === 'lava' ? 'Melted!' : reason === 'time' ? "Time's up!" : 'Missed!'
      setFlash(`${msg}  ${remaining} ${remaining === 1 ? 'life' : 'lives'} left`)
      beginCountdown(levelRef.current, { lifeRetry: true })
    }
  }

  const handleHeart = () => {
    setHeartTaken(true)
    powerUps.handleHeartCollect()
  }

  const resume = () => {
    initAudio()
    playClick()
    setStatus('playing')
  }

  const exitToMenu = () => {
    playClick()
    setStatus('ready')
    setScore(0)
    setLevel(1)
    setLives(GAME.startLives)
    setFailReason('')
    loadLevel(1)
  }

  const getSnapshot = (physics) => ({
    ...physics,
    ...powerUps.getPowerUpSnapshot(),
    level: levelRef.current,
    lives: livesRef.current,
    score: scoreRef.current,
    status: statusRef.current,
    timeLeft: timeRef.current,
    heartTaken: heartTakenRef.current,
    flash: flashRef.current,
    failReason: failReasonRef.current,
    countdown: countdownRef.current,
  })

  return {
    status,
    countdown,
    level,
    score,
    best,
    lives,
    timeLeft,
    data,
    runId,
    heartTaken,
    flash,
    failReason,
    ...powerUps,
    start,
    resume,
    exitToMenu,
    handleWin,
    handleFail,
    handleHeart,
    getSnapshot,
  }
}
