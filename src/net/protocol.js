export const MSG = {
  CREATE: 'CREATE',
  JOIN: 'JOIN',
  START: 'START',
  CREATED: 'CREATED',
  JOINED: 'JOINED',
  LOBBY_UPDATE: 'LOBBY_UPDATE',
  MATCHED: 'MATCHED',
  ERROR: 'ERROR',
  STATE: 'STATE',
  PEER_STATE: 'PEER_STATE',
  PEER_BOARD: 'PEER_BOARD',
  EVENT: 'EVENT',
  PEER_EVENT: 'PEER_EVENT',
  PLAYER_LEFT: 'PLAYER_LEFT',
  VOICE_SIGNAL: 'VOICE_SIGNAL',
}

export function wsUrl() {
  if (typeof window === 'undefined') return 'ws://localhost:3001/ws'

  const params = new URLSearchParams(window.location.search)
  const override =
    window.__NIZHEN_WS_HOST__ ||
    params.get('wsHost') ||
    import.meta.env.VITE_WS_HOST ||
    ''

  if (override) {
    const host = String(override).replace(/^https?:\/\//i, '').replace(/\/$/, '')
    const secure =
      window.location.protocol === 'https:' || String(override).startsWith('wss')
    return `${secure ? 'wss:' : 'ws:'}//${host}/ws`
  }

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws`
}
