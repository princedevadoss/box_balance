import { wsUrl } from './protocol.js'

export function connectSocket(handlers) {
  const ws = new WebSocket(wsUrl())
  let closed = false

  ws.onopen = () => handlers.onOpen?.()
  ws.onclose = () => {
    closed = true
    handlers.onClose?.()
  }
  ws.onerror = () => handlers.onError?.()
  ws.onmessage = (event) => {
    try {
      handlers.onMessage?.(JSON.parse(event.data))
    } catch {
      handlers.onError?.()
    }
  }

  return {
    send(payload) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
    },
    close() {
      if (!closed) ws.close()
    },
    get ready() {
      return ws.readyState === WebSocket.OPEN
    },
  }
}
