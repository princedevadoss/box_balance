import { useEffect, useRef, useState } from 'react'
import { generateLevel } from '../level'
import { GAME } from '../config'
import { initAudio, playClick, playWin, playFail, playHeart, playLava } from '../audio'
import { usePatchPowerUp } from './usePatchPowerUp'
import { isPatchActive, patchSecondsLeft } from '../patchPowerUp'

// Owns all game state and transitions. Returns everything the UI + Scene need.
export function useGame({ roomSeed = null } = {}) {
  const [status, setStatus] = useState('ready') // ready | countdown | playing | paused | over
  const [countdown, setCountdown] = useState(GAME.countdown)
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [lives, setLives] = useState(GAME.startLives)
  const [timeLeft, setTimeLeft] = useState(GAME.levelTime)
  const [data, setData] = useState(() => generateLevel(1, roomSeed))
  const [runId, setRunId] = useState(0)
  const [heartTaken, setHeartTaken] = useState(false)
  const [flash, setFlash] = useState('')
  const [failReason, setFailReason] = useState('')

  const patch = usePatchPowerUp({
    data,
    status,
    runId,
    level,
    authoritative: true,
    onFlash: setFlash,
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

  // Level clock, restarted for every level.
  useEffect(() => {
    if (status !== 'playing') return
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [status, level])

  // Out of time counts as a miss.
  useEffect(() => {
    if (status === 'playing' && timeLeft <= 0) handleFail('time')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, status])

  // Get-ready countdown; when it hits zero the ball drops and play begins.
  useEffect(() => {
    if (status !== 'countdown') return
    if (countdown <= 0) {
      setStatus('playing')
      return
    }
    const id = setTimeout(() => setCountdown((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [status, countdown])

  // Auto-dismiss the banner.
  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(''), GAME.flashMs)
    return () => clearTimeout(id)
  }, [flash])

  // ESC toggles pause while playing.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      initAudio()
      setStatus((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const loadLevel = (lvl, resetHeart = true) => {
    setData(generateLevel(lvl, roomSeed))
    setTimeLeft(GAME.levelTime)
    if (resetHeart) setHeartTaken(false)
    setRunId((r) => r + 1)
  }

  // Load a level and give the player COUNTDOWN seconds to level the board
  // before the ball drops in.
  const beginCountdown = (lvl) => {
    loadLevel(lvl)
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
    patch.resetPatch()
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
      beginCountdown(levelRef.current) // retry the same level after a get-ready
    }
  }

  const handleHeart = () => {
    setLives((l) => l + 1)
    setHeartTaken(true)
    setFlash('❤ +1 Life!')
    playHeart()
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
    ...patch.getPatchSnapshot(),
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
    // state
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
    patchActive: patch.patchActive,
    patchPickup: patch.patchPickup,
    patchSecondsLeft: patchSecondsLeft(patch.patchUntil),
    flash,
    failReason,
    // actions
    start,
    resume,
    exitToMenu,
    handleWin,
    handleFail,
    handleHeart,
    handlePatchCollect: patch.handlePatchCollect,
    getSnapshot,
  }
}
