/**
 * Trascinamento delle voci della seduta: si prende una card dalla maniglia e la si lascia
 * in un punto qualsiasi, anche in un altro blocco (riscaldamento, palestra, mobilita', core).
 * I blocchi espongono `data-blocco` (JSON del blocco) e `data-n` (numero di voci), le card `data-indice`.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ExerciseThumb } from '../../components/ui'
import { chiaveBlocco, type Blocco } from '../../domain/editing'

export interface Posizione {
  blocco: Blocco
  /** card trascinata: il suo indice; bersaglio: la posizione di inserimento */
  indice: number
}

interface Trascinata {
  da: Posizione
  nome: string
  /** esercizio da mostrare nella miniatura (assente per i circuiti) */
  id?: string
}

interface Ctx {
  attiva: Trascinata | null
  bersaglio: Posizione | null
  inizia: (e: React.PointerEvent, t: Trascinata) => void
}

const Contesto = createContext<Ctx | null>(null)
export const useTrascina = () => useContext(Contesto)
export const stessaPosizione = (a: Posizione | null, b: Blocco, i: number) => !!a && a.indice === i && chiaveBlocco(a.blocco) === chiaveBlocco(b)

/** Posizione di inserimento sotto il punto (x, y): prima o dopo la card, o in fondo al blocco. */
function posizioneSotto(x: number, y: number): Posizione | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null
  const contenitore = el?.closest<HTMLElement>('[data-blocco]')
  if (!contenitore) return null
  const blocco = JSON.parse(contenitore.dataset.blocco!) as Blocco
  const card = el!.closest<HTMLElement>('[data-indice]')
  if (card && contenitore.contains(card)) {
    const r = card.getBoundingClientRect()
    const i = Number(card.dataset.indice)
    return { blocco, indice: y < r.top + r.height / 2 ? i : i + 1 }
  }
  // fuori dalle card (spazio vuoto, tasto aggiungi): in fondo al blocco
  return { blocco, indice: Number(contenitore.dataset.n ?? 0) }
}

export function TrascinaProvider({ onSposta, children }: { onSposta: (da: Posizione, a: Posizione) => void; children: ReactNode }) {
  const [attiva, setAttiva] = useState<Trascinata | null>(null)
  const [bersaglio, setBersaglio] = useState<Posizione | null>(null)
  const [punto, setPunto] = useState<{ x: number; y: number } | null>(null)
  const ultimo = useRef<{ x: number; y: number } | null>(null)
  const onSpostaRef = useRef(onSposta)
  useEffect(() => {
    onSpostaRef.current = onSposta
  })

  useEffect(() => {
    if (!attiva) return
    let bers: Posizione | null = null
    const aggiorna = (x: number, y: number) => {
      ultimo.current = { x, y }
      setPunto({ x, y })
      bers = posizioneSotto(x, y)
      setBersaglio(bers)
    }
    const muovi = (e: PointerEvent) => {
      e.preventDefault()
      aggiorna(e.clientX, e.clientY)
    }
    const fine = (e: PointerEvent) => {
      if (e.type === 'pointerup' && bers) onSpostaRef.current(attiva.da, bers)
      setAttiva(null)
      setBersaglio(null)
      setPunto(null)
    }
    // vicino ai bordi la pagina scorre da sola
    let raf = 0
    const scorri = () => {
      const p = ultimo.current
      if (p) {
        const passo = p.y < 90 ? -10 : p.y > window.innerHeight - 130 ? 10 : 0
        if (passo) {
          window.scrollBy(0, passo)
          aggiorna(p.x, p.y)
        }
      }
      raf = requestAnimationFrame(scorri)
    }
    raf = requestAnimationFrame(scorri)
    const prima = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', muovi, { passive: false })
    window.addEventListener('pointerup', fine)
    window.addEventListener('pointercancel', fine)
    return () => {
      cancelAnimationFrame(raf)
      document.body.style.userSelect = prima
      window.removeEventListener('pointermove', muovi)
      window.removeEventListener('pointerup', fine)
      window.removeEventListener('pointercancel', fine)
    }
  }, [attiva])

  const inizia = (e: React.PointerEvent, t: Trascinata) => {
    if (e.button !== 0) return
    e.preventDefault()
    ultimo.current = { x: e.clientX, y: e.clientY }
    setPunto({ x: e.clientX, y: e.clientY })
    setAttiva(t)
  }

  return (
    <Contesto.Provider value={{ attiva, bersaglio, inizia }}>
      {children}
      {attiva &&
        punto &&
        createPortal(
          <div className="pointer-events-none fixed z-50 flex w-64 items-center gap-3 rounded-2xl bg-white p-2 shadow-xl ring-2 ring-accent dark:bg-zinc-900" style={{ left: Math.max(8, Math.min(punto.x - 40, window.innerWidth - 264)), top: punto.y - 28 }}>
            {attiva.id && <ExerciseThumb id={attiva.id} className="size-10" />}
            <span className="truncate font-semibold">{attiva.nome}</span>
          </div>,
          document.body,
        )}
    </Contesto.Provider>
  )
}

/** Linea che indica dove finira' la card trascinata. */
export function Segnaposto() {
  return <div className="h-1.5 rounded-full bg-accent" aria-hidden="true" />
}
