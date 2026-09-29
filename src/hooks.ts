import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { leggiImpostazioni } from './db/repositories'
import { db } from './db/schema'
import { faseDellaSettimana, isoLocale, settimanaCiclo } from './domain/calendar'
import { programma } from './domain/data'
import type { Fase, Impostazioni } from './domain/types'

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
}

export function useCiclo(): Ciclo | undefined {
  const imp = useImpostazioni()
  const oggi = useOggi()
  if (!imp) return undefined
  const settimana = settimanaCiclo(oggi, imp.cicloInizio)
  return { oggi, settimana, fase: faseDellaSettimana(programma, settimana), impostazioni: imp }
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
