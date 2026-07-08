export const MSG = {
  CREATE: 'CREATE',
  JOIN: 'JOIN',
  CREATED: 'CREATED',
  JOINED: 'JOINED',
  MATCHED: 'MATCHED',
  ERROR: 'ERROR',
  STATE: 'STATE',
  PEER_STATE: 'PEER_STATE',
  EVENT: 'EVENT',
  PEER_EVENT: 'PEER_EVENT',
  PLAYER_LEFT: 'PLAYER_LEFT',
}

export function wsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = import.meta.env.VITE_WS_HOST || window.location.host
  return `${proto}//${host}/ws`
}
