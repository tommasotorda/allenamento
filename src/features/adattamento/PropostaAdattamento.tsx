import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { aggiornaPiano } from '../../db/repositories'
import { db } from '../../db/schema'
import { proposteAdattamento } from '../../domain/adattamento'
import type { Ciclo } from '../../hooks'

/** Proposta di adattamento: scadenza della scheda, test di meta' ciclo, sedute completate, progressi. */
export function PropostaAdattamento({ c }: { c: Ciclo }) {
  const dati = useLiveQuery(async () => {
    const sedute = await db.sedute.where('data').aboveOrEqual(c.piano.inizio).toArray()
    const ids = new Set(sedute.map((s) => s.id))
    const serie = (await db.serie.where('data').aboveOrEqual(c.piano.inizio).toArray()).filter((s) => ids.has(s.sedutaId))
    const test = await db.risultatiTest.where('data').aboveOrEqual(c.piano.inizio).toArray()
    return { sedute, serie, test }
  }, [c.piano.id, c.piano.inizio])
  if (!dati) return null
  const [p] = proposteAdattamento(c.piano, c.oggi, dati.sedute, dati.serie, dati.test)
  if (!p) return null

  return (
    <div className="mb-3 rounded-2xl bg-accent/10 p-3 ring-1 ring-accent/30">
      <div className="text-xs font-semibold uppercase tracking-wide text-accent-strong dark:text-accent">Adattamento della scheda</div>
      <div className="mt-0.5 font-semibold">{p.testo}</div>
      <div className="mt-2 flex gap-2">
        <Link to={`/adatta?motivo=${encodeURIComponent(p.testo)}`} className="flex h-10 flex-1 items-center justify-center rounded-xl bg-accent font-semibold text-white">
          Adatta
        </Link>
        <button type="button" onClick={() => aggiornaPiano(c.piano.id, { proposteChiuse: [...(c.piano.proposteChiuse ?? []), p.chiave] })} className="h-10 rounded-xl bg-white/70 px-4 font-semibold dark:bg-zinc-900/70">
          Più tardi
        </button>
      </div>
    </div>
  )
}
