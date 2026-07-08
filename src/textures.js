import { useMemo } from 'react'
import * as THREE from 'three'
import { COLORS, BALL_TEXT_COLOR, ballColorForLevel } from './config'

export function createNizhenTexture(level = 1) {
  const fill = ballColorForLevel(level)
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.fillStyle = BALL_TEXT_COLOR
  ctx.font = 'bold 130px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('NIZHEN', c.width / 2, c.height / 2)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

export function useNizhenTexture(level = 1) {
  return useMemo(() => createNizhenTexture(level), [level])
}

// Double-chevron ">>" texture for boost pads.
export function useArrowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 128
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, 256, 128)
    ctx.strokeStyle = COLORS.arrow
    ctx.lineWidth = 22
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const cy = 64
    const h = 36
    const chevron = (cx) => {
      ctx.beginPath()
      ctx.moveTo(cx - 30, cy - h)
      ctx.lineTo(cx + 12, cy)
      ctx.lineTo(cx - 30, cy + h)
      ctx.stroke()
    }
    chevron(100)
    chevron(160)
    const tex = new THREE.CanvasTexture(c)
    tex.anisotropy = 8
    return tex
  }, [])
}

// Y-rotation that aims a +X-pointing arrow toward a tile's boost direction.
export function boostAngle(dx, dz) {
  if (dx === 1) return 0
  if (dx === -1) return Math.PI
  if (dz === 1) return -Math.PI / 2
  return Math.PI / 2
}
