// Parallel-race match end rules:
// 1. Player eliminated with FEWER points than opponent → match ends, opponent wins.
// 2. Player eliminated with MORE points → opponent keeps playing until they surpass
//    that score, then opponent wins.
// 3. If the survivor is eliminated before surpassing the score → eliminated player wins.

export function resolveMatch(local, peer) {
  if (!peer) return null

  const localOut = local.status === 'over'
  const peerOut = peer.status === 'over'
  if (!localOut && !peerOut) return null

  const localScore = local.score ?? 0
  const peerScore = peer.score ?? 0

  if (localOut && !peerOut) {
    if (localScore < peerScore) return { winner: 'peer', reason: 'eliminated_behind' }
    if (peerScore > localScore) return { winner: 'peer', reason: 'caught_up' }
    return null
  }

  if (peerOut && !localOut) {
    if (peerScore < localScore) return { winner: 'local', reason: 'eliminated_behind' }
    if (localScore > peerScore) return { winner: 'local', reason: 'caught_up' }
    return null
  }

  // Both eliminated — survivor chase never finished in time.
  if (localScore > peerScore) return { winner: 'local', reason: 'score' }
  if (peerScore > localScore) return { winner: 'peer', reason: 'score' }
  if (local.level > peer.level) return { winner: 'local', reason: 'level' }
  if (peer.level > local.level) return { winner: 'peer', reason: 'level' }
  return { winner: 'draw', reason: 'tie' }
}

export function chaseTarget(local, peer) {
  if (!peer) return null
  const localOut = local.status === 'over'
  const peerOut = peer.status === 'over'

  if (localOut && !peerOut && local.score > peer.score) {
    return { role: 'leading', target: local.score, label: 'You' }
  }
  if (peerOut && !localOut && peer.score > local.score) {
    return { role: 'chasing', target: peer.score, label: 'Opponent' }
  }
  return null
}
