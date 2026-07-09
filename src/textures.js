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

function makeCanvasTexture(drawFn, w = 256, h = 256) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  drawFn(ctx, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

export function createAirVentTexture() {
  return makeCanvasTexture((ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w / 2)
    g.addColorStop(0, '#ecfeff')
    g.addColorStop(0.35, '#67e8f9')
    g.addColorStop(0.7, '#22d3ee')
    g.addColorStop(1, '#0e7490')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 3
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(w / 2, h / 2)
      ctx.lineTo(w / 2 + Math.cos(a) * w * 0.42, h / 2 + Math.sin(a) * h * 0.42)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, w * 0.12, 0, Math.PI * 2)
    ctx.fill()
  })
}

export function createLavaSurfaceTexture() {
  return makeCanvasTexture((ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#7f1d1d')
    g.addColorStop(0.4, '#ea580c')
    g.addColorStop(0.7, '#fbbf24')
    g.addColorStop(1, '#991b1b')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const r = 4 + Math.random() * 18
      const b = ctx.createRadialGradient(x, y, 0, x, y, r)
      b.addColorStop(0, 'rgba(253,186,116,0.9)')
      b.addColorStop(0.5, 'rgba(249,115,22,0.5)')
      b.addColorStop(1, 'rgba(127,29,29,0)')
      ctx.fillStyle = b
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(69,10,10,0.35)'
    ctx.lineWidth = 2
    for (let i = 0; i < 6; i++) {
      ctx.beginPath()
      ctx.moveTo(Math.random() * w, Math.random() * h)
      for (let j = 0; j < 4; j++) {
        ctx.lineTo(Math.random() * w, Math.random() * h)
      }
      ctx.stroke()
    }
  }, 512, 512)
}

export function useAirVentTexture() {
  return useMemo(() => createAirVentTexture(), [])
}

export function useLavaSurfaceTexture() {
  return useMemo(() => createLavaSurfaceTexture(), [])
}
