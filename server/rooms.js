import { generateCode, normalizeCode } from './codes.js'
import { sanitizeName } from './names.js'

const ROOM_TTL_MS = 30 * 60 * 1000
const MAX_COOP_PLAYERS = 4
const MAX_VERSUS_PLAYERS = 2

export class RoomManager {
  constructor() {
    /** @type {Map<string, object>} */
    this.rooms = new Map()
    /** @type {Map<object, { code: string, slot: number }>} */
    this.clients = new Map()
  }

  maxPlayers(mode) {
    return mode === 'coop' ? MAX_COOP_PLAYERS : MAX_VERSUS_PLAYERS
  }

  playerList(room) {
    return room.players.map((p) => ({ name: p.name, slot: p.slot, isHost: p.slot === 0 }))
  }

  lobbyPayload(ws) {
    const info = this.clients.get(ws)
    if (!info) return null
    const room = this.rooms.get(info.code)
    if (!room) return null
    const self = room.players.find((p) => p.ws === ws)
    return {
      code: room.code,
      seed: room.seed,
      mode: room.mode,
      slot: info.slot,
      role: info.slot === 0 ? 'host' : 'guest',
      playerName: self?.name ?? 'Player',
      players: this.playerList(room),
    }
  }

  matchPayload(ws) {
    const lobby = this.lobbyPayload(ws)
    if (!lobby) return null
    return lobby
  }

  createRoom(ws, rawName, rawMode) {
    const code = generateCode(this.rooms)
    const seed = (Math.random() * 0xffffffff) >>> 0
    const hostName = sanitizeName(rawName)
    const mode = rawMode === 'coop' ? 'coop' : 'versus'
    const room = {
      code,
      seed,
      mode,
      started: false,
      players: [{ ws, name: hostName, slot: 0 }],
      createdAt: Date.now(),
    }
    this.rooms.set(code, room)
    this.clients.set(ws, { code, slot: 0 })
    return { code, seed, role: 'host', slot: 0, playerName: hostName, mode, players: this.playerList(room) }
  }

  joinRoom(ws, rawCode, rawName, rawMode) {
    const code = normalizeCode(rawCode)
    if (code.length !== 6) return { error: 'Enter a 6-character room code.' }

    const room = this.rooms.get(code)
    if (!room) return { error: 'Room not found. Check the code and try again.' }
    if (room.started) return { error: 'This game has already started.' }
    if (room.players.some((p) => p.ws === ws)) return { error: 'You are already in this room.' }

    const mode = rawMode === 'coop' ? 'coop' : 'versus'
    if (room.mode !== mode) {
      const label = room.mode === 'coop' ? 'Co-op' : 'Versus'
      return { error: `This room is a ${label} game. Choose the same mode to join.` }
    }

    const max = this.maxPlayers(room.mode)
    if (room.players.length >= max) {
      return { error: room.mode === 'coop' ? 'This co-op room is full (4 players max).' : 'This room is already full.' }
    }

    const slot = room.players.length
    const name = sanitizeName(rawName)
    room.players.push({ ws, name, slot })
    this.clients.set(ws, { code, slot })

    return {
      code,
      seed: room.seed,
      role: slot === 0 ? 'host' : 'guest',
      slot,
      playerName: name,
      mode: room.mode,
      players: this.playerList(room),
    }
  }

  startRoom(ws) {
    const room = this.getRoom(ws)
    if (!room || room.mode !== 'coop') return { error: 'Invalid room.' }
    if (room.players[0]?.ws !== ws) return { error: 'Only the host can start the game.' }
    if (room.players.length < 2) return { error: 'Need at least 2 players to start.' }
    if (room.started) return { error: 'Game already started.' }
    room.started = true
    return { ok: true, room }
  }

  getRoom(ws) {
    const info = this.clients.get(ws)
    if (!info) return null
    return this.rooms.get(info.code) ?? null
  }

  getPeer(ws) {
    const room = this.getRoom(ws)
    const info = this.clients.get(ws)
    if (!room || !info || room.mode !== 'versus') return null
    const other = room.players.find((p) => p.slot !== info.slot)
    return other?.ws ?? null
  }

  getHost(ws) {
    const room = this.getRoom(ws)
    if (!room) return null
    return room.players[0]?.ws ?? null
  }

  broadcastLobby(room) {
    return room.players.map((p) => ({ ws: p.ws, payload: this.lobbyPayload(p.ws) }))
  }

  broadcastMatch(room) {
    return room.players.map((p) => ({ ws: p.ws, payload: this.matchPayload(p.ws) }))
  }

  removeClient(ws) {
    const info = this.clients.get(ws)
    if (!info) {
      this.clients.delete(ws)
      return null
    }

    const room = this.rooms.get(info.code)
    this.clients.delete(ws)

    if (!room) return { code: info.code, room: null, remaining: [] }

    room.players = room.players.filter((p) => p.ws !== ws)
    for (const p of room.players) {
      p.slot = room.players.indexOf(p)
      this.clients.set(p.ws, { code: info.code, slot: p.slot })
    }

    if (room.players.length === 0) {
      this.rooms.delete(info.code)
      return { code: info.code, room: null, remaining: [] }
    }

    return { code: info.code, room, remaining: room.players.map((p) => p.ws) }
  }

  pruneExpired() {
    const now = Date.now()
    for (const [code, room] of this.rooms) {
      if (now - room.createdAt > ROOM_TTL_MS) {
        for (const p of room.players) this.clients.delete(p.ws)
        this.rooms.delete(code)
      }
    }
  }
}
