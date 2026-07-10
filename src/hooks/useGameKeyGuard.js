import { useEffect } from 'react'

/**
 * Keep Tab / Space inside the game while a match is active so the browser
 * doesn't move focus / scroll the page. Does not stopPropagation so in-game
 * power-up handlers still receive the keys.
 */
export function useGameKeyGuard(active) {
  useEffect(() => {
    if (!active) return

    const arrest = (e) => {
      if (e.code !== 'Tab' && e.code !== 'Space') return
      e.preventDefault()
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        const el = document.activeElement
        const tag = el.tagName
        if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          el.blur()
        }
      }
    }

    // Capture so we beat browser focus changes before they happen.
    window.addEventListener('keydown', arrest, true)
    window.addEventListener('keyup', arrest, true)
    return () => {
      window.removeEventListener('keydown', arrest, true)
      window.removeEventListener('keyup', arrest, true)
    }
  }, [active])
}
