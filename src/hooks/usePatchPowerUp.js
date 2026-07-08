import { useCallback, useEffect, useRef, useState } from 'react'
import { PATCH } from '../config'
import { playPatch } from '../audio'
import {
  isPatchActive,
  levelHasPatchPickup,
  pickPatchSpawn,
  randomPatchSpawnDelaySec,
} from '../patchPowerUp'

export function usePatchPowerUp({
  data,
  status,
  runId,
  level,
  authoritative = true,
  onFlash,
}) {
  const [patchUntil, setPatchUntil] = useState(0)
  const [patchPickup, setPatchPickup] = useState(null)
  const [patchTick, setPatchTick] = useState(0)

  const spawnTimerRef = useRef(null)
  const patchUntilRef = useRef(0)
  const patchPickupRef = useRef(null)
  const statusRef = useRef(status)
  statusRef.current = status
  patchUntilRef.current = patchUntil
  patchPickupRef.current = patchPickup

  const clearSpawnTimer = useCallback(() => {
    if (spawnTimerRef.current) {
      clearTimeout(spawnTimerRef.current)
      spawnTimerRef.current = null
    }
  }, [])

  const resetPatch = useCallback(() => {
    clearSpawnTimer()
    setPatchUntil(0)
    setPatchPickup(null)
  }, [clearSpawnTimer])

  useEffect(() => {
    resetPatch()
  }, [runId, resetPatch])

  useEffect(() => {
    if (!isPatchActive(patchUntil)) return
    const id = setInterval(() => {
      if (!isPatchActive(patchUntilRef.current)) {
        setPatchTick((t) => t + 1)
        return
      }
      setPatchTick((t) => t + 1)
    }, 500)
    return () => clearInterval(id)
  }, [patchUntil])

  useEffect(() => {
    clearSpawnTimer()
    if (!authoritative) return
    if (status !== 'playing') return
    if (!levelHasPatchPickup(level)) return

    const delayMs = randomPatchSpawnDelaySec() * 1000
    spawnTimerRef.current = setTimeout(() => {
      spawnTimerRef.current = null
      if (statusRef.current !== 'playing') return
      if (patchPickupRef.current) return
      const spawn = pickPatchSpawn(data)
      if (spawn) setPatchPickup(spawn)
    }, delayMs)

    return clearSpawnTimer
  }, [authoritative, status, level, runId, data, clearSpawnTimer])

  const handlePatchCollect = useCallback(() => {
    if (!authoritative || !patchPickupRef.current) return
    const until = performance.now() + PATCH.durationSec * 1000
    setPatchUntil(until)
    setPatchPickup(null)
    playPatch()
    onFlash?.(`🩹 Patch active — gaps & lava sealed for ${PATCH.durationSec}s`)
  }, [authoritative, onFlash])

  const applyPatchSync = useCallback((peer) => {
    if (peer.patchUntil != null) setPatchUntil(peer.patchUntil)
    if (peer.patchPickup !== undefined) setPatchPickup(peer.patchPickup)
  }, [])

  const getPatchSnapshot = useCallback(
    () => ({
      patchUntil: patchUntilRef.current,
      patchPickup: patchPickupRef.current,
    }),
    []
  )

  const patchActive = isPatchActive(patchUntil)

  return {
    patchActive,
    patchUntil,
    patchPickup,
    patchTick,
    handlePatchCollect,
    applyPatchSync,
    getPatchSnapshot,
    resetPatch,
  }
}
