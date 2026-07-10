import { useEffect, useState } from 'react'
import { readViewport } from '../viewport'

export function useViewport() {
  const [viewport, setViewport] = useState(() => readViewport())

  useEffect(() => {
    const update = () => setViewport(readViewport())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return viewport
}
