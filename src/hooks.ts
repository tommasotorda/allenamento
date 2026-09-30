import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { leggiImpostazioni } from './db/repositories'
import { db } from './db/schema'
import { faseDellaSettimana, isoLocale, settimanaCiclo } from './domain/calendar'
import { programma } from './domain/data'
import { programmaEffettivo, type SchedaUtente } from './domain/editing'
import type { Fase, Impostazioni, Programma } from './domain/types'

export function useImpostazioni(): Impostazioni | undefined {
  useEffect(() => {
    void leggiImpostazioni()
  }, [])
  return useLiveQuery(() => db.impostazioni.get('singleton'))
}

/** Data di oggi che si aggiorna a mezzanotte (l'app puo' restare aperta a lungo). */
export function useOggi(): string {
  const [oggi, setOggi] = useState(isoLocale())
  useEffect(() => {
    const id = setInterval(() => setOggi(isoLocale()), 60_000)
    const vis = () => setOggi(isoLocale())
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])
  return oggi
}

export interface Ciclo {
  oggi: string
  settimana: number
  fase: Fase
  impostazioni: Impostazioni
  /** programma con le modifiche dell'utente */
  programma: Programma
  schedaUtente: SchedaUtente | undefined
}

/** Scheda personalizzata: undefined finche' carica, null se non esiste. */
export function useSchedaUtente(): SchedaUtente | null | undefined {
  return useLiveQuery(async () => (await db.schede.get('singleton')) ?? null)
}

export function useCiclo(): Ciclo | undefined {
  const imp = useImpostazioni()
  const oggi = useOggi()
  const scheda = useSchedaUtente()
  if (!imp || scheda === undefined) return undefined
  const settimana = settimanaCiclo(oggi, imp.cicloInizio)
  const u = scheda ?? undefined
  return { oggi, settimana, fase: faseDellaSettimana(programma, settimana), impostazioni: imp, programma: programmaEffettivo(programma, u), schedaUtente: u }
}

/** URL dell'ultima foto dell'utente per un esercizio, se presente. */
export function useFotoUrl(esercizioId: string): string | null {
  const foto = useLiveQuery(() => db.fotoEsercizi.where('esercizioId').equals(esercizioId).last(), [esercizioId])
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!foto) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(foto.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [foto])
  return url
}
