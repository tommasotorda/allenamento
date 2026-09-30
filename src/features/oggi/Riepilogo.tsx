import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Card, numIt, PageHeader } from '../../components/ui'
import { db } from '../../db/schema'
import { programma } from '../../domain/data'
import { nomeSedutaLog } from '../../domain/session'
import { volumeSerie } from '../../domain/stats'

export function durataMin(inizio: string, fine: string | null) {
  if (!fine) return null
  return Math.round((new Date(fine).getTime() - new Date(inizio).getTime()) / 60000)
}

export function Riepilogo({ sedutaId, onChiudi }: { sedutaId: string; onChiudi: () => void }) {
  const seduta = useLiveQuery(() => db.sedute.get(sedutaId), [sedutaId])
  const serie = useLiveQuery(() => db.serie.where('sedutaId').equals(sedutaId).toArray(), [sedutaId]) ?? []
  if (!seduta) return null

  const voci: [string, string][] = [
    ['Durata', `${durataMin(seduta.inizio, seduta.fine) ?? '–'} min`],
    ['Volume', `${numIt(volumeSerie(serie), 0)} kg`],
    ['Serie', String(serie.length)],
    ['Esercizi', String(new Set(serie.map((s) => s.esercizioId)).size)],
  ]
  if (seduta.pista.durataMin !== null) voci.push(['Pista', `${seduta.pista.durataMin} min`])
  if (seduta.pista.distanzaM !== null) voci.push(['Distanza', `${numIt(seduta.pista.distanzaM, 0)} m`])
  if (seduta.pista.fcMedia !== null) voci.push(['FC media', `${seduta.pista.fcMedia} bpm`])
  if (seduta.tennisMin !== null) voci.push(['Attività', `${seduta.tennisMin} min`])

  return (
    <div>
      <PageHeader title="Riepilogo" subtitle={nomeSedutaLog(seduta, programma)} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {voci.map(([k, v]) => (
          <Card key={k}>
            <div className="text-xs font-semibold uppercase text-zinc-500">{k}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{v}</div>
          </Card>
        ))}
      </div>
      <Button big variant="primary" className="mt-6 w-full" onClick={onChiudi}>
        Chiudi
      </Button>
    </div>
  )
}
