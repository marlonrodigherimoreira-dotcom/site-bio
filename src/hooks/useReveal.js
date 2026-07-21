import { useEffect, useRef, useState } from 'react'

/**
 * Observa o elemento e marca como "visível" quando entra na tela,
 * reproduzindo o efeito de fade + slide-up do site original.
 * Passe `initiallyVisible` para elementos que devem aparecer
 * já revelados no load (ex: hero), sem esperar o scroll.
 */
export function useReveal(initiallyVisible = false) {
  const ref = useRef(null)
  const [inView, setInView] = useState(initiallyVisible)

  useEffect(() => {
    if (initiallyVisible) return
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true)
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )

    io.observe(el)
    return () => io.disconnect()
  }, [initiallyVisible])

  return [ref, inView]
}
