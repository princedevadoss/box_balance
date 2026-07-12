import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: false,
}

/**
 * Mesh WebRTC voice for versus (2) and co-op (N). Signaling uses the game WebSocket.
 * Perfect negotiation: higher slot is the polite peer.
 */
export function useVoiceChat({ active, localSlot, peerSlots, sendSignal, voiceHandlerRef }) {
  const [joined, setJoined] = useState(false)
  const [muted, setMuted] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [connectedCount, setConnectedCount] = useState(0)

  const pcsRef = useRef(new Map())
  const makingOfferRef = useRef(new Map())
  const localStreamRef = useRef(null)
  const remoteAudioRef = useRef(new Map())
  const joinedRef = useRef(false)
  const mutedRef = useRef(false)
  const localSlotRef = useRef(localSlot)
  const sendSignalRef = useRef(sendSignal)
  const peerSlotsRef = useRef(peerSlots)

  const peersKey = useMemo(
    () =>
      [...peerSlots]
        .filter((s) => s !== localSlot)
        .sort((a, b) => a - b)
        .join(','),
    [peerSlots, localSlot]
  )

  localSlotRef.current = localSlot
  sendSignalRef.current = sendSignal
  peerSlotsRef.current = peerSlots
  joinedRef.current = joined
  mutedRef.current = muted

  const refreshConnected = useCallback(() => {
    let live = 0
    for (const pc of pcsRef.current.values()) {
      if (pc.connectionState === 'connected' || pc.iceConnectionState === 'connected') live += 1
    }
    setConnectedCount(live)
  }, [])

  const attachRemoteTrack = useCallback((slot, stream) => {
    let el = remoteAudioRef.current.get(slot)
    if (!el) {
      el = new Audio()
      el.autoplay = true
      el.setAttribute('playsinline', 'true')
      remoteAudioRef.current.set(slot, el)
    }
    el.srcObject = stream
    const play = el.play()
    if (play?.catch) play.catch(() => {})
  }, [])

  const closePeer = useCallback(
    (slot) => {
      const pc = pcsRef.current.get(slot)
      if (pc) {
        pc.onicecandidate = null
        pc.ontrack = null
        pc.onconnectionstatechange = null
        pc.onnegotiationneeded = null
        try {
          pc.close()
        } catch {
          // ignore
        }
        pcsRef.current.delete(slot)
      }
      makingOfferRef.current.delete(slot)
      const el = remoteAudioRef.current.get(slot)
      if (el) {
        el.pause()
        el.srcObject = null
        remoteAudioRef.current.delete(slot)
      }
      refreshConnected()
    },
    [refreshConnected]
  )

  const teardownAll = useCallback(() => {
    for (const slot of [...pcsRef.current.keys()]) closePeer(slot)
    const stream = localStreamRef.current
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
      localStreamRef.current = null
    }
    setConnectedCount(0)
    setStatus('idle')
  }, [closePeer])

  const ensurePeer = useCallback(
    async (remoteSlot) => {
      if (!joinedRef.current || remoteSlot === localSlotRef.current) return
      if (pcsRef.current.has(remoteSlot)) return

      const stream = localStreamRef.current
      if (!stream) return

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcsRef.current.set(remoteSlot, pc)

      for (const track of stream.getAudioTracks()) {
        pc.addTrack(track, stream)
      }

      pc.onicecandidate = ({ candidate }) => {
        sendSignalRef.current?.(remoteSlot, {
          type: 'ice',
          candidate: candidate ? candidate.toJSON() : null,
        })
      }

      pc.ontrack = (ev) => {
        const [remoteStream] = ev.streams
        if (remoteStream) attachRemoteTrack(remoteSlot, remoteStream)
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          closePeer(remoteSlot)
        } else {
          refreshConnected()
        }
      }

      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current.set(remoteSlot, true)
          await pc.setLocalDescription()
          sendSignalRef.current?.(remoteSlot, {
            type: 'sdp',
            description: {
              type: pc.localDescription.type,
              sdp: pc.localDescription.sdp,
            },
          })
        } catch (err) {
          console.warn('[voice] negotiationneeded', err)
        } finally {
          makingOfferRef.current.set(remoteSlot, false)
        }
      }
    },
    [attachRemoteTrack, closePeer, refreshConnected]
  )

  const handleSignal = useCallback(
    async (msg) => {
      const fromSlot = Number(msg.fromSlot)
      const signal = msg.signal
      if (!Number.isFinite(fromSlot) || !signal || !joinedRef.current) return

      if (!pcsRef.current.has(fromSlot)) {
        await ensurePeer(fromSlot)
      }
      const pc = pcsRef.current.get(fromSlot)
      if (!pc) return

      const polite = localSlotRef.current > fromSlot

      try {
        if (signal.type === 'sdp' && signal.description) {
          const description = signal.description
          const offerCollision =
            description.type === 'offer' &&
            (makingOfferRef.current.get(fromSlot) || pc.signalingState !== 'stable')

          if (offerCollision) {
            if (!polite) return
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }),
              pc.setRemoteDescription(description),
            ])
          } else {
            await pc.setRemoteDescription(description)
          }

          if (description.type === 'offer') {
            await pc.setLocalDescription()
            sendSignalRef.current?.(fromSlot, {
              type: 'sdp',
              description: {
                type: pc.localDescription.type,
                sdp: pc.localDescription.sdp,
              },
            })
          }
        } else if (signal.type === 'ice') {
          try {
            await pc.addIceCandidate(signal.candidate)
          } catch (err) {
            if (pc.signalingState !== 'closed') console.warn('[voice] ice', err)
          }
        }
      } catch (err) {
        console.warn('[voice] signal', err)
      }
    },
    [ensurePeer]
  )

  useEffect(() => {
    if (voiceHandlerRef) voiceHandlerRef.current = handleSignal
    return () => {
      if (voiceHandlerRef && voiceHandlerRef.current === handleSignal) {
        voiceHandlerRef.current = null
      }
    }
  }, [handleSignal, voiceHandlerRef])

  useEffect(() => {
    if (!joined || !active) return
    const wanted = new Set(
      peersKey
        ? peersKey.split(',').map((s) => Number(s))
        : []
    )
    for (const slot of [...pcsRef.current.keys()]) {
      if (!wanted.has(slot)) closePeer(slot)
    }
    for (const slot of wanted) {
      ensurePeer(slot)
    }
  }, [joined, active, peersKey, closePeer, ensurePeer])

  useEffect(() => {
    if (active) return
    joinedRef.current = false
    setJoined(false)
    setMuted(false)
    mutedRef.current = false
    setError('')
    teardownAll()
  }, [active, teardownAll])

  useEffect(() => () => teardownAll(), [teardownAll])

  useEffect(() => {
    const stream = localStreamRef.current
    if (!stream) return
    for (const track of stream.getAudioTracks()) {
      track.enabled = joined && !muted
    }
  }, [joined, muted])

  const join = useCallback(async () => {
    if (!active || joinedRef.current) return
    setError('')
    setStatus('requesting')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone is not available in this browser.')
      }
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS)
      localStreamRef.current = stream
      for (const track of stream.getAudioTracks()) {
        track.enabled = !mutedRef.current
      }
      joinedRef.current = true
      setJoined(true)
      setStatus('live')
      for (const slot of peerSlotsRef.current) {
        if (slot !== localSlotRef.current) await ensurePeer(slot)
      }
    } catch (err) {
      setStatus('error')
      setError(err?.message || 'Could not access the microphone.')
      joinedRef.current = false
      setJoined(false)
      teardownAll()
    }
  }, [active, ensurePeer, teardownAll])

  const leave = useCallback(() => {
    joinedRef.current = false
    setJoined(false)
    setMuted(false)
    mutedRef.current = false
    setError('')
    teardownAll()
  }, [teardownAll])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      mutedRef.current = next
      const stream = localStreamRef.current
      if (stream) {
        for (const track of stream.getAudioTracks()) track.enabled = !next
      }
      return next
    })
  }, [])

  return {
    joined,
    muted,
    status,
    error,
    connectedCount,
    join,
    leave,
    toggleMute,
  }
}
