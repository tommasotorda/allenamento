import { useEffect, useMemo, useRef } from 'react'
import { faseAnimazione, figuraSvg } from '../figures/engine'
import { FIGURE } from '../figures/poses'

const riduciMovimento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Illustrazione SVG dell'esercizio. Con `animate` alterna in loop posizione iniziale e finale,
 * solo mentre e' visibile sullo schermo.
 */
export function ExerciseFigure({ id, animate = false, className = '' }: { id: string; animate?: boolean; className?: string }) {
  const def = FIGURE[id]
  const ref = useRef<HTMLDivElement>(null)
  const statico = useMemo(() => (def ? figuraSvg(def, def.thumb ?? 1, 'role="img" aria-hidden="true"') : ''), [def])

  useEffect(() => {
    const el = ref.current
    if (!el || !def || !animate || riduciMovimento()) return
    let raf = 0
    let visibile = false
    let t0 = performance.now()
    const frame = (now: number) => {
      el.innerHTML = figuraSvg(def, faseAnimazione(def, now - t0), 'role="img" aria-hidden="true"')
      raf = requestAnimationFrame(frame)
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !visibile) {
        visibile = true
        t0 = performance.now()
        raf = requestAnimationFrame(frame)
      } else if (!e.isIntersecting && visibile) {
        visibile = false
        cancelAnimationFrame(raf)
      }
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [def, animate])

  if (!def) {
    return <div className={`flex items-center justify-center rounded-xl bg-zinc-200 text-zinc-400 dark:bg-zinc-800 ${className}`} />
  }
  return <div ref={ref} className={`figura text-zinc-900 dark:text-zinc-100 ${className}`} dangerouslySetInnerHTML={{ __html: statico }} />
}
