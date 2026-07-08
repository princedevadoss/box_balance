import { createServer } from 'http'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer } from 'ws'
import { RoomManager } from './rooms.js'

const PORT = Number(process.env.PORT) || 3001
const rooms = new RoomManager()

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST_DIR = join(__dirname, '..', 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.hdr': 'application/octet-stream',
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload))
}

async function serveStatic(req, res) {
  const urlPath = (req.url || '/').split('?')[0]

  if (urlPath === '/ws') {
    res.writeHead(426, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Use WebSocket to connect to /ws')
    return
  }

  if (!existsSync(DIST_DIR)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Game UI not built yet. Run: npm run build')
    return
  }

  const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '')
  let filePath = join(DIST_DIR, relative)

  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }

  if (!existsSync(filePath)) {
    filePath = join(DIST_DIR, 'index.html')
  }

  try {
    const body = await readFile(filePath)
    const type = MIME[extname(filePath)] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': type })
    res.end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  }
}

const httpServer = createServer((req, res) => {
  serveStatic(req, res).catch(() => {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Server error')
  })
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
      if (!room) return
      if (room.mode === 'versus' && room.players.length === 2) {
        for (const { ws: target, payload } of rooms.broadcastMatch(room)) {
          send(target, { type: 'MATCHED', ...payload })
        }
      } else if (room.mode === 'coop') {
        for (const { ws: target, payload } of rooms.broadcastLobby(room)) {
          send(target, { type: 'LOBBY_UPDATE', ...payload })
        }
      }
      return
    }

    if (msg.type === 'START') {
      const result = rooms.startRoom(ws)
      if (result.error) {
        send(ws, { type: 'ERROR', message: result.error })
        return
      }
      for (const { ws: target, payload } of rooms.broadcastMatch(result.room)) {
        send(target, { type: 'MATCHED', ...payload })
      }
      return
    }

    if (msg.type === 'STATE') {
      const room = rooms.getRoom(ws)
      if (!room?.started) return
      const info = rooms.clients.get(ws)
      if (!info) return

      if (room.mode === 'coop') {
        if (info.slot === 0) {
          for (const p of room.players) {
            if (p.ws !== ws) send(p.ws, { type: 'PEER_STATE', state: msg.state })
          }
        } else {
          const host = rooms.getHost(ws)
          if (host) {
            send(host, {
              type: 'PEER_BOARD',
              slot: info.slot,
              board: msg.state?.board,
            })
          }
        }
        return
      }

      const peer = rooms.getPeer(ws)
      if (peer) send(peer, { type: 'PEER_STATE', state: msg.state })
      return
    }

    if (msg.type === 'EVENT') {
      const room = rooms.getRoom(ws)
      if (room?.mode === 'coop') {
        const host = rooms.getHost(ws)
        if (host && host !== ws) send(host, { type: 'PEER_EVENT', slot: msg.slot, event: msg.event })
        return
      }
      const peer = rooms.getPeer(ws)
      if (peer) send(peer, { type: 'PEER_EVENT', event: msg.event })
    }
  })

  ws.on('close', () => {
    const result = rooms.removeClient(ws)
    if (!result?.room) return

    if (result.room.mode === 'coop' && !result.room.started) {
      for (const { ws: target, payload } of rooms.broadcastLobby(result.room)) {
        send(target, { type: 'LOBBY_UPDATE', ...payload })
      }
      return
    }

    for (const peerWs of result.remaining) {
      send(peerWs, { type: 'PLAYER_LEFT', code: result.code })
    }
  })
})

setInterval(() => rooms.pruneExpired(), 60_000)

httpServer.listen(PORT, () => {
  const ui = existsSync(DIST_DIR) ? 'UI + WebSocket' : 'WebSocket only (run npm run build for UI)'
  console.log(`box-balance server listening on :${PORT} (${ui})`)
})
