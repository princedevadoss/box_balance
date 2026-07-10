export function peerMetaKey(state) {
  if (!state) return ''
  return [
    state.runId,
    state.status,
    state.level,
    state.lives,
    state.score,
    state.timeLeft,
    state.heartTaken,
    state.countdown,
    state.failReason,
    state.flash,
    state.selectedType,
    JSON.stringify(state.inventory),
    JSON.stringify(state.effectsUntil),
    JSON.stringify(state.worldPickup),
    JSON.stringify(state.waver),
    state.goalOpen ? '1' : '0',
  ].join('|')
}
