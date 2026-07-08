import { useCallback, useEffect, useRef, useState } from 'react'
import { connectSocket } from '../net/socket.js'
import { MSG } from '../net/protocol.js'
import { sanitizeName } from '../net/names.js'

// Manages WebSocket lobby: create/join room, match, relay peer state.
export function useRoom() {
  const [phase, setPhase] = useState('idle')
  const [code, setCode] = useState('')
  const [seed, setSeed] = useState(0)
  const [role, setRole] = useState(null)
  const [mode, setMode] = useState('versus')
  const [playerName, setPlayerName] = useState('')
  const [peerName, setPeerName] = useState('')
  const [peerState, setPeerState] = useState(null)
  const [error, setError] = useState('')
  const socketRef = useRef(null)
  const playerNameRef = useRef('')

  const cleanup = useCallback(() => {
    socketRef.current?.close()
    socketRef.current = null
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const applyNames = useCallback((player, peer) => {
    if (player) {
      playerNameRef.current = player
      setPlayerName(player)
    }
    if (peer) setPeerName(peer)
  }, [])

  const handleMessage = useCallback(
    (msg) => {
      if (msg.type === MSG.CREATED || msg.type === MSG.JOINED) {
        setCode(msg.code)
        setSeed(msg.seed)
        setRole(msg.role)
        if (msg.mode) setMode(msg.mode)
        applyNames(msg.playerName, msg.peerName)
        setPhase('waiting')
        setError('')
        return
      }
      if (msg.type === MSG.MATCHED) {
        setCode(msg.code)
        setSeed(msg.seed)
        setRole(msg.role)
        if (msg.mode) setMode(msg.mode)
        applyNames(msg.playerName, msg.peerName)
        setPhase('matched')
        return
      }
      if (msg.type === MSG.PEER_STATE) {
        setPeerState(msg.state)
        if (msg.state?.name) setPeerName(msg.state.name)
        return
      }
      if (msg.type === MSG.PLAYER_LEFT) {
        setPhase('left')
        setPeerState(null)
        return
      }
      if (msg.type === MSG.ERROR) {
        setError(msg.message || 'Something went wrong.')
        setPhase('error')
      }
    },
    [applyNames]
  )

  const openSocket = useCallback(() => {
    cleanup()
    setPhase('connecting')
    setError('')
    setPeerState(null)

    const socket = connectSocket({
      onOpen: () => {},
      onClose: () => {
        setPhase((p) => (p === 'matched' || p === 'waiting' ? 'left' : p))
      },
      onError: () => setError('Could not connect to the game server.'),
      onMessage: handleMessage,
    })
    socketRef.current = socket
    return socket
  }, [cleanup, handleMessage])

  const createRoom = useCallback(
    (name, gameMode = 'versus') => {
      const clean = sanitizeName(name)
      const m = gameMode === 'coop' ? 'coop' : 'versus'
      playerNameRef.current = clean
      setPlayerName(clean)
      setMode(m)
      const socket = openSocket()
      const tryCreate = () => {
        if (socket.ready) socket.send({ type: MSG.CREATE, name: clean, mode: m })
        else setTimeout(tryCreate, 50)
      }
      tryCreate()
    },
    [openSocket]
  )

  const joinRoom = useCallback(
    (rawCode, name, gameMode = 'versus') => {
      const clean = sanitizeName(name)
      const m = gameMode === 'coop' ? 'coop' : 'versus'
      playerNameRef.current = clean
      setPlayerName(clean)
      setMode(m)
      const socket = openSocket()
      const tryJoin = () => {
        if (socket.ready) socket.send({ type: MSG.JOIN, code: rawCode, name: clean, mode: m })
        else setTimeout(tryJoin, 50)
      }
      tryJoin()
    },
    [openSocket]
  )

  const sendState = useCallback((state) => {
    socketRef.current?.send({
      type: MSG.STATE,
      state: { ...state, name: playerNameRef.current },
    })
  }, [])

  const disconnect = useCallback(() => {
    cleanup()
    setPhase('idle')
    setCode('')
    setSeed(0)
    setRole(null)
    setMode('versus')
    setPlayerName('')
    setPeerName('')
    playerNameRef.current = ''
    setPeerState(null)
    setError('')
  }, [cleanup])

  const resetError = useCallback(() => {
    setPhase('idle')
    setError('')
  }, [])

  return {
    phase,
    code,
    seed,
    role,
    mode,
    playerName,
    peerName,
    peerState,
    error,
    createRoom,
    joinRoom,
    sendState,
    disconnect,
    resetError,
  }
}
