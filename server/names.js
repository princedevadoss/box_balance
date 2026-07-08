export function sanitizeName(name) {
  const trimmed = String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 16)
  return trimmed || 'Player'
}
