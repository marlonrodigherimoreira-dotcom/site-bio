import { useEffect, useRef } from 'react'

/**
 * Liga um <path> de SVG ao progresso de scroll da página,
 * "desenhando" a linha conforme o usuário rola — o elemento
 * de assinatura visual do site.
 */
export function useGrowthLine() {
  const pathRef = useRef(null)

  useEffect(() => {
    const path = pathRef.current
    if (!path) return

    const len = path.getTotalLength()
    path.style.strokeDasharray = len

    let ticking = false

    function updateLine() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0
      path.style.strokeDashoffset = len * (1 - progress)
      ticking = false
    }

    updateLine()

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(updateLine)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updateLine)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateLine)
    }
  }, [])

  return pathRef
}
