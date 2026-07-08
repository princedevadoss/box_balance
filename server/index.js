import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { RoomManager } from './rooms.js'

const PORT = Number(process.env.PORT) || 3001
const rooms = new RoomManager()

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload))
}

function broadcastMatch(room) {
  const hostPayload = rooms.matchPayload(room.host)
  const guestPayload = rooms.matchPayload(room.guest)
  if (hostPayload) send(room.host, { type: 'MATCHED', ...hostPayload })
  if (guestPayload) send(room.guest, { type: 'MATCHED', ...guestPayload })
}

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('box-balance multiplayer server')
})

const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(String(raw))
    } catch {
      send(ws, { type: 'ERROR', message: 'Invalid message.' })
      return
    }

    if (msg.type === 'CREATE') {
      const created = rooms.createRoom(ws, msg.name, msg.mode)
      send(ws, { type: 'CREATED', ...created })
      return
    }

    if (msg.type === 'JOIN') {
      const result = rooms.joinRoom(ws, msg.code, msg.name, msg.mode)
      if (result.error) {
        send(ws, { type: 'ERROR', message: result.error })
        return
      }
      send(ws, { type: 'JOINED', ...result })
      const room = rooms.getRoom(ws)
      if (room?.guest) broadcastMatch(room)
      return
    }

    if (msg.type === 'STATE') {
      const peer = rooms.getPeer(ws)
      if (peer) send(peer, { type: 'PEER_STATE', state: msg.state })
      return
    }

    if (msg.type === 'EVENT') {
      const peer = rooms.getPeer(ws)
      if (peer) send(peer, { type: 'PEER_EVENT', event: msg.event })
    }
  })

  ws.on('close', () => {
    const result = rooms.removeClient(ws)
    if (result?.peer) {
      send(result.peer, { type: 'PLAYER_LEFT', code: result.code })
    }
  })
})

setInterval(() => rooms.pruneExpired(), 60_000)

httpServer.listen(PORT, () => {
  console.log(`box-balance server listening on :${PORT}`)
})
