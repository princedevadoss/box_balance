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
}

export function wsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = import.meta.env.VITE_WS_HOST || window.location.host
  return `${proto}//${host}/ws`
}
