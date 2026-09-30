/**
 * Registro della seduta in corso: ogni blocco annuncia cio' che resta da registrare
 * (serie non confermate, pista, tennis) con i valori precompilati, per il riepilogo di fine seduta.
 */
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react'

export interface Pendente {
  titolo: string
  dettaglio: string
  salva: () => Promise<void>
}

interface Registro {
  annuncia: (chiave: string, p: Pendente | null) => void
  elenco: () => [string, Pendente][]
}

const Ctx = createContext<Registro>({ annuncia: () => {}, elenco: () => [] })

export function RegistroProvider({ children }: { children: ReactNode }) {
  const mappa = useRef(new Map<string, Pendente>())
  const annuncia = useCallback((chiave: string, p: Pendente | null) => {
    if (p) mappa.current.set(chiave, p)
    else mappa.current.delete(chiave)
  }, [])
  const elenco = useCallback(() => [...mappa.current.entries()], [])
  return <Ctx.Provider value={{ annuncia, elenco }}>{children}</Ctx.Provider>
}

/** Annuncia (o ritira) il pendente di un blocco; si aggiorna a ogni rendering. */
export function usePendente(chiave: string, p: Pendente | null) {
  const { annuncia } = useContext(Ctx)
  useEffect(() => {
    annuncia(chiave, p)
  })
  useEffect(() => () => annuncia(chiave, null), [annuncia, chiave])
}

export const useRegistro = () => useContext(Ctx)
