const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateCode(existing) {
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)]
    }
    if (!existing.has(code)) return code
  }
  throw new Error('Could not generate unique room code')
}

export function normalizeCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}
