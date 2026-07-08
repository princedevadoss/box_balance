import { generateCode, normalizeCode } from './codes.js'
import { sanitizeName } from './names.js'

const ROOM_TTL_MS = 30 * 60 * 1000

export class RoomManager {
  constructor() {
    /** @type {Map<string, object>} */
    this.rooms = new Map()
    /** @type {Map<object, { code: string, role: 'host' | 'guest' }>} */
    this.clients = new Map()
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
      host: ws,
      guest: null,
      hostName,
      guestName: null,
      createdAt: Date.now(),
    }
    this.rooms.set(code, room)
    this.clients.set(ws, { code, role: 'host' })
    return { code, seed, role: 'host', playerName: hostName, mode }
  }

  joinRoom(ws, rawCode, rawName, rawMode) {
    const code = normalizeCode(rawCode)
    if (code.length !== 6) return { error: 'Enter a 6-character room code.' }

    const room = this.rooms.get(code)
    if (!room) return { error: 'Room not found. Check the code and try again.' }
    if (room.guest) return { error: 'This room is already full.' }
    if (room.host === ws) return { error: 'You are already in this room.' }

    const mode = rawMode === 'coop' ? 'coop' : 'versus'
    if (room.mode !== mode) {
      const label = room.mode === 'coop' ? 'Co-op' : 'Versus'
      return { error: `This room is a ${label} game. Choose the same mode to join.` }
    }

    room.guest = ws
    room.guestName = sanitizeName(rawName)
    this.clients.set(ws, { code, role: 'guest' })
    return {
      code,
      seed: room.seed,
      role: 'guest',
      playerName: room.guestName,
      peerName: room.hostName,
      mode: room.mode,
    }
  }

  matchPayload(ws) {
    const info = this.clients.get(ws)
    if (!info) return null
    const room = this.rooms.get(info.code)
    if (!room) return null
    const peerName = info.role === 'host' ? room.guestName : room.hostName
    const playerName = info.role === 'host' ? room.hostName : room.guestName
    return {
      code: room.code,
      seed: room.seed,
      role: info.role,
      playerName,
      peerName,
      mode: room.mode,
    }
  }

  getPeer(ws) {
    const info = this.clients.get(ws)
    if (!info) return null
    const room = this.rooms.get(info.code)
    if (!room) return null
    return info.role === 'host' ? room.guest : room.host
  }

  getRoom(ws) {
    const info = this.clients.get(ws)
    if (!info) return null
    return this.rooms.get(info.code) ?? null
  }

  removeClient(ws) {
    const info = this.clients.get(ws)
    if (!info) {
      this.clients.delete(ws)
      return null
    }

    const room = this.rooms.get(info.code)
    const peer = this.getPeer(ws)
    this.clients.delete(ws)

    if (!room) return { peer, code: info.code }

    if (room.host === ws) {
      if (room.guest) {
        this.clients.delete(room.guest)
        room.host = room.guest
        room.guest = null
        this.clients.set(room.host, { code: info.code, role: 'host' })
      } else {
        this.rooms.delete(info.code)
      }
    } else if (room.guest === ws) {
      room.guest = null
    }

    return { peer, code: info.code }
  }

  pruneExpired() {
    const now = Date.now()
    for (const [code, room] of this.rooms) {
      if (now - room.createdAt > ROOM_TTL_MS) {
        if (room.host) this.clients.delete(room.host)
        if (room.guest) this.clients.delete(room.guest)
        this.rooms.delete(code)
      }
    }
  }
}
