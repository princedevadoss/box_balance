import { useCallback, useEffect, useRef, useState } from 'react'
import { POWERUP } from '../config'
import { initAudio, playHeart, playPatch, playClick } from '../audio'
import { deferAfterPhysics } from '../physicsDefer'
import {
  EMPTY_INVENTORY,
  POWERUP_ORDER,
  effectSecondsLeft,
  firstOwnedType,
  goalBoardForPortal,
  isEffectActive,
  nextOwnedType,
  pickWorldPickup,
  planLevelSpawnTimes,
  portalTeleportPosition,
  resolveBallBoardIndex,
} from '../powerUps'

function emptyEffects() {
  return { patch: 0, ghost: 0, fly: 0, shrink: 0 }
}

export function usePowerUpInventory({
  data,
  status,
  runId,
  lifeRetrySpawn = false,
  authoritative = true,
  onPowerUpRequest,
  keyboardShortcuts = true,
  onFlash,
  onHeal,
}) {
  const [inventory, setInventory] = useState(EMPTY_INVENTORY)
  const [selectedType, setSelectedType] = useState(POWERUP_ORDER[0])
  const [worldPickup, setWorldPickup] = useState(null)
  const [effectsUntil, setEffectsUntil] = useState(emptyEffects)
  const [tick, setTick] = useState(0)

  const inventoryRef = useRef(inventory)
  const selectedRef = useRef(selectedType)
  const worldPickupRef = useRef(worldPickup)
  const effectsRef = useRef(effectsUntil)
  const statusRef = useRef(status)
  const spawnTimersRef = useRef([])
  const activateCtxRef = useRef(null)
  const dataRef = useRef(data)
  const physicsQueueRef = useRef([])
  const lifeRetrySpawnRef = useRef(lifeRetrySpawn)

  inventoryRef.current = inventory
  selectedRef.current = selectedType
  worldPickupRef.current = worldPickup
  effectsRef.current = effectsUntil
  statusRef.current = status
  dataRef.current = data
  lifeRetrySpawnRef.current = lifeRetrySpawn

  const clearSpawnTimers = useCallback(() => {
    for (const id of spawnTimersRef.current) clearTimeout(id)
    spawnTimersRef.current = []
  }, [])

  /** Full reset — new game / exit to menu only. */
  const resetPowerUps = useCallback(() => {
    clearSpawnTimers()
    setInventory(EMPTY_INVENTORY())
    setSelectedType(POWERUP_ORDER[0])
    setWorldPickup(null)
    setEffectsUntil(emptyEffects())
  }, [clearSpawnTimers])

  /** Level restart or advance: keep inventory, clear board pickup & timed effects. */
  const onLevelRestart = useCallback(() => {
    clearSpawnTimers()
    setWorldPickup(null)
    setEffectsUntil(emptyEffects())
  }, [clearSpawnTimers])

  useEffect(() => {
    onLevelRestart()
  }, [runId, onLevelRestart])

  useEffect(() => {
    const active = Object.values(effectsRef.current).some((u) => isEffectActive(u))
    if (!active) return
    const id = setInterval(() => setTick((n) => n + 1), 400)
    return () => clearInterval(id)
  }, [effectsUntil, tick])

  const trySpawnPickup = useCallback(() => {
    if (statusRef.current !== 'playing') return
    if (worldPickupRef.current) {
      const id = setTimeout(trySpawnPickup, POWERUP.spawnRetrySec * 1000)
      spawnTimersRef.current.push(id)
      return
    }
    const boardIndex = resolveBallBoardIndex(dataRef.current, activateCtxRef.current)
    const spawn = pickWorldPickup(dataRef.current, Math.random, boardIndex)
    if (spawn) setWorldPickup(spawn)
  }, [])

  const scheduleLevelSpawns = useCallback(() => {
    clearSpawnTimers()
    if (!authoritative) return

    if (lifeRetrySpawnRef.current && POWERUP.lifeRetryStartSpawn) {
      const id = setTimeout(trySpawnPickup, 0)
      spawnTimersRef.current.push(id)
    }

    const times = planLevelSpawnTimes()
    for (const t of times) {
      const id = setTimeout(trySpawnPickup, t * 1000)
      spawnTimersRef.current.push(id)
    }
  }, [authoritative, clearSpawnTimers, trySpawnPickup])

  useEffect(() => {
    if (!authoritative) return
    if (status !== 'playing') {
      clearSpawnTimers()
      return
    }
    scheduleLevelSpawns()
    return clearSpawnTimers
  }, [authoritative, status, runId, lifeRetrySpawn, scheduleLevelSpawns, clearSpawnTimers])

  const addToInventory = useCallback(
    (type, count = 1) => {
      if (!POWERUP_ORDER.includes(type)) return
      setInventory((inv) => {
        const next = { ...inv, [type]: inv[type] + count }
        if (inv[selectedRef.current] === 0 && next[type] > 0) setSelectedType(type)
        return next
      })
      const meta = POWERUP.types[type]
      onFlash?.(`${meta.icon} ${meta.label} stored!`)
    },
    [onFlash]
  )

  const handleWorldCollect = useCallback(() => {
    if (!authoritative || !worldPickupRef.current) return
    const { type } = worldPickupRef.current
    setWorldPickup(null)
    addToInventory(type)
    initAudio()
    playClick()
  }, [authoritative, addToInventory])

  const handleHeartCollect = useCallback(() => {
    addToInventory('health')
    initAudio()
    playHeart()
  }, [addToInventory])

  const registerActivateCtx = useCallback((ctx) => {
    activateCtxRef.current = ctx
  }, [])

  const teleportBall = useCallback((ctx) => {
    const ball = ctx?.ballRef?.current
    if (!ball) return false
    let boardData
    let boardBody
    let boardPosition = [0, 0, 0]
    if (ctx.boardRef?.current) {
      boardData = ctx.data
      boardBody = ctx.boardRef.current
    } else if (ctx.boardRefs && ctx.data) {
      const { board, boardIndex } = goalBoardForPortal(ctx.data)
      boardData = board
      boardBody = ctx.boardRefs.current[boardIndex]?.current
      boardPosition = board.position ?? [0, 0, 0]
    } else {
      return false
    }
    const pos = portalTeleportPosition(boardBody, boardData, boardPosition)
    if (!pos) return false
    ball.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true)
    ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
    ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
    return true
  }, [])

  const commitActivation = useCallback(
    (type, now, portalOk = true) => {
      if (type === 'portal' && !portalOk) return false
      const meta = POWERUP.types[type]

      if (type === 'health') {
        onHeal?.()
        playHeart()
        onFlash?.('❤ +1 Life!')
      } else if (type === 'patch') {
        setEffectsUntil((e) => ({ ...e, patch: now + meta.durationSec * 1000 }))
        playPatch()
        onFlash?.(`🩹 Patch active — ${meta.durationSec}s`)
      } else if (type === 'ghost') {
        setEffectsUntil((e) => ({ ...e, ghost: now + meta.durationSec * 1000 }))
        onFlash?.(`👻 Ghost mode — ${meta.durationSec}s`)
      } else if (type === 'portal') {
        onFlash?.('🌀 Teleported near the hole!')
      } else if (type === 'fly') {
        setEffectsUntil((e) => ({ ...e, fly: now + meta.durationSec * 1000 }))
        onFlash?.(`🪶 Fly ball — ${meta.durationSec}s`)
      } else if (type === 'shrink') {
        setEffectsUntil((e) => ({ ...e, shrink: now + meta.durationSec * 1000 }))
        onFlash?.(`🔵 Ball shrunk — ${meta.durationSec}s`)
      } else {
        return false
      }

      setInventory((prev) => {
        const next = { ...prev, [type]: prev[type] - 1 }
        if (next[type] <= 0) setSelectedType(firstOwnedType(next))
        return next
      })
      initAudio()
      return true
    },
    [onFlash, onHeal]
  )

  const processPowerUpPhysics = useCallback(() => {
    const queue = physicsQueueRef.current
    if (!queue.length) return
    physicsQueueRef.current = []

    const ctx = activateCtxRef.current
    let portalOk = true
    const commits = []

    for (const action of queue) {
      if (action.kind === 'portal') {
        portalOk = teleportBall(ctx)
      } else if (action.kind === 'commit') {
        commits.push(action)
      }
    }

    deferAfterPhysics(() => {
      for (const action of commits) {
        if (action.type === 'portal' && !portalOk) continue
        commitActivation(action.type, action.now, portalOk)
      }
    })
  }, [teleportBall, commitActivation])

  const activateSelected = useCallback(() => {
    if (!authoritative || statusRef.current !== 'playing') return false
    const type = selectedRef.current
    const inv = inventoryRef.current
    if (inv[type] <= 0) return false
    if (isEffectActive(effectsRef.current.fly)) return false
    if (!POWERUP.types[type]) return false

    const now = performance.now()
    if (type === 'portal') {
      physicsQueueRef.current.push({ kind: 'portal' })
    }
    physicsQueueRef.current.push({ kind: 'commit', type, now })
    return true
  }, [authoritative])

  const cycleSelected = useCallback(() => {
    setSelectedType((cur) => nextOwnedType(cur, inventoryRef.current))
  }, [])

  useEffect(() => {
    if (!keyboardShortcuts) return
    const onKey = (e) => {
      if (e.repeat) return
      if (statusRef.current !== 'playing') return
      if (e.code === 'Space') {
        e.preventDefault()
        if (authoritative) activateSelected()
        else onPowerUpRequest?.({ type: 'powerup_activate' })
      } else if (e.code === 'Tab') {
        e.preventDefault()
        if (authoritative) cycleSelected()
        else onPowerUpRequest?.({ type: 'powerup_cycle' })
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [authoritative, activateSelected, cycleSelected, onPowerUpRequest, keyboardShortcuts])

  const applyPowerUpSync = useCallback((peer) => {
    if (peer.inventory) setInventory(peer.inventory)
    if (peer.selectedType) setSelectedType(peer.selectedType)
    if (peer.worldPickup !== undefined) setWorldPickup(peer.worldPickup)
    if (peer.effectsUntil) setEffectsUntil(peer.effectsUntil)
  }, [])

  const getPowerUpSnapshot = useCallback(
    () => ({
      inventory: inventoryRef.current,
      selectedType: selectedRef.current,
      worldPickup: worldPickupRef.current,
      effectsUntil: effectsRef.current,
    }),
    []
  )

  const patchActive = isEffectActive(effectsUntil.patch)
  const ghostActive = isEffectActive(effectsUntil.ghost)
  const flyActive = isEffectActive(effectsUntil.fly)
  const shrinkActive = isEffectActive(effectsUntil.shrink)
  const shrinkScale = shrinkActive ? POWERUP.types.shrink.scale : 1

  return {
    inventory,
    selectedType,
    worldPickup,
    patchActive,
    ghostActive,
    flyActive,
    shrinkActive,
    shrinkScale,
    patchSecondsLeft: effectSecondsLeft(effectsUntil.patch),
    ghostSecondsLeft: effectSecondsLeft(effectsUntil.ghost),
    flySecondsLeft: effectSecondsLeft(effectsUntil.fly),
    shrinkSecondsLeft: effectSecondsLeft(effectsUntil.shrink),
    handleWorldCollect,
    handleHeartCollect,
    registerActivateCtx,
    applyPowerUpSync,
    getPowerUpSnapshot,
    resetPowerUps,
    cycleSelected,
    activateSelected,
    processPowerUpPhysics,
  }
}
