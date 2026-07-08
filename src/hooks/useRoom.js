import { useCallback, useEffect, useRef, useState } from 'react'
import { connectSocket } from '../net/socket.js'
import { MSG } from '../net/protocol.js'
import { sanitizeName } from '../net/names.js'

function peerNameFromPlayers(players, slot) {
  const peer = players?.find((p) => p.slot !== slot)
  return peer?.name ?? ''
}

// Manages WebSocket lobby: create/join room, match, relay peer state.
export function useRoom() {
  const [phase, setPhase] = useState('idle')
  const [code, setCode] = useState('')
  const [seed, setSeed] = useState(0)
  const [role, setRole] = useState(null)
  const [slot, setSlot] = useState(0)
  const [mode, setMode] = useState('versus')
  const [players, setPlayers] = useState([])
  const [playerName, setPlayerName] = useState('')
  const [peerName, setPeerName] = useState('')
  const [peerState, setPeerState] = useState(null)
  const [error, setError] = useState('')
  const socketRef = useRef(null)
  const playerNameRef = useRef('')
  const slotRef = useRef(0)
  const peerBoardsRef = useRef({})
  const peerEventRef = useRef(null)
  const peerStateRef = useRef(null)

  const cleanup = useCallback(() => {
    socketRef.current?.close()
    socketRef.current = null
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const applyLobby = useCallback((msg) => {
    setCode(msg.code)
    setSeed(msg.seed)
    setRole(msg.role)
    if (msg.slot != null) {
      slotRef.current = msg.slot
      setSlot(msg.slot)
    }
    if (msg.mode) setMode(msg.mode)
    if (msg.playerName) {
      playerNameRef.current = msg.playerName
      setPlayerName(msg.playerName)
    }
    if (msg.players) {
      setPlayers(msg.players)
      if (msg.mode === 'versus') setPeerName(peerNameFromPlayers(msg.players, msg.slot ?? 0))
    }
  }, [])

  const handleMessage = useCallback(
    (msg) => {
      if (msg.type === MSG.CREATED || msg.type === MSG.JOINED) {
        applyLobby(msg)
        setPhase('waiting')
        setError('')
        return
      }
      if (msg.type === MSG.LOBBY_UPDATE) {
        applyLobby(msg)
        setPhase('waiting')
        setError('')
        return
      }
      if (msg.type === MSG.MATCHED) {
        applyLobby(msg)
        setPhase('matched')
        return
      }
      if (msg.type === MSG.PEER_STATE) {
        peerStateRef.current = { state: msg.state, receivedAt: performance.now() }
        setPeerState(msg.state)
        if (msg.state?.name) setPeerName(msg.state.name)
        return
      }
      if (msg.type === MSG.PEER_BOARD) {
        peerBoardsRef.current[msg.slot] = msg.board
        return
      }
      if (msg.type === MSG.PEER_EVENT) {
        peerEventRef.current = { slot: msg.slot, event: msg.event, ts: Date.now() }
        return
      }
      if (msg.type === MSG.PLAYER_LEFT) {
        setPhase('left')
        setPeerState(null)
        peerStateRef.current = null
        return
      }
      if (msg.type === MSG.ERROR) {
        setError(msg.message || 'Something went wrong.')
        setPhase('error')
      }
    },
    [applyLobby]
  )

  const openSocket = useCallback(() => {
    cleanup()
    setPhase('connecting')
    setError('')
    setPeerState(null)
    peerStateRef.current = null
    peerBoardsRef.current = {}
    peerEventRef.current = null

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

  const sendStart = useCallback(() => {
    socketRef.current?.send({ type: MSG.START })
  }, [])

  const sendState = useCallback((state) => {
    socketRef.current?.send({
      type: MSG.STATE,
      state: { ...state, name: playerNameRef.current },
    })
  }, [])

  const sendEvent = useCallback((event) => {
    socketRef.current?.send({
      type: MSG.EVENT,
      slot: slotRef.current,
      event,
    })
  }, [])

  const disconnect = useCallback(() => {
    cleanup()
    setPhase('idle')
    setCode('')
    setSeed(0)
    setRole(null)
    setSlot(0)
    slotRef.current = 0
    setMode('versus')
    setPlayers([])
    setPlayerName('')
    setPeerName('')
    playerNameRef.current = ''
    setPeerState(null)
    peerStateRef.current = null
    peerBoardsRef.current = {}
    peerEventRef.current = null
    setError('')
  }, [cleanup])

  const resetError = useCallback(() => {
    setPhase('idle')
    setError('')
  }, [])

  const isHost = role === 'host'

  return {
    phase,
    code,
    seed,
    role,
    slot,
    mode,
    players,
    playerName,
    peerName,
    peerState,
    peerStateRef,
    peerBoardsRef,
    peerEventRef,
    error,
    isHost,
    createRoom,
    joinRoom,
    sendStart,
    sendState,
    sendEvent,
    disconnect,
    resetError,
  }
}
