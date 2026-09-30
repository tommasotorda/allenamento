import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { assicuraPianoAttivo, leggiImpostazioni } from './db/repositories'
import { db } from './db/schema'
import { faseDellaSettimana, isoLocale, settimanaCiclo } from './domain/calendar'
import { scaduto } from './domain/plans'
import type { Fase, Impostazioni, Piano, Programma } from './domain/types'

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
  piano: Piano
  /** programma del piano attivo, con le modifiche dell'utente */
  programma: Programma
  /** il piano ha superato la durata prevista */
  scaduto: boolean
}

export function usePianoAttivo(): Piano | undefined {
  const imp = useImpostazioni()
  useEffect(() => {
    void assicuraPianoAttivo()
  }, [imp?.pianoAttivo])
  return useLiveQuery(() => (imp?.pianoAttivo ? db.piani.get(imp.pianoAttivo) : undefined), [imp?.pianoAttivo])
}

export function useCiclo(): Ciclo | undefined {
  const imp = useImpostazioni()
  const oggi = useOggi()
  const piano = usePianoAttivo()
  if (!imp || !piano) return undefined
  const settimana = settimanaCiclo(oggi, piano.inizio)
  return { oggi, settimana, fase: faseDellaSettimana(piano.programma, settimana), impostazioni: imp, piano, programma: piano.programma, scaduto: scaduto(piano, oggi) }
}

/** true quando il database e' pronto e non c'e' ancora nessuna scheda (primo avvio). */
export function useSenzaSchede(): boolean {
  return useLiveQuery(() => db.piani.count()) === 0
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
