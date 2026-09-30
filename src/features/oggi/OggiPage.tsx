import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GearLink } from '../../components/GearLink'
import { Badge, Button, Chip, formatData, PageHeader } from '../../components/ui'
import { iniziaSeduta, sedutaAperta } from '../../db/repositories'
import { db } from '../../db/schema'
import { prossimaSeduta, sedutaDelGiorno, SETTIMANE_CICLO } from '../../domain/calendar'
import { NOMI_GIORNI } from '../../domain/data'
import { elencoSedute, strutturaSeduta } from '../../domain/session'
import { useCiclo, type Ciclo } from '../../hooks'
import { SessionPreview } from '../scheda/SessionPreview'
import { Riepilogo } from './Riepilogo'
import { SessioneAttiva } from './SessioneAttiva'
import { PropostaAdattamento } from '../adattamento/PropostaAdattamento'

export function Intestazione({ c }: { c: Ciclo }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span>{c.scaduto ? 'Scheda conclusa' : `Settimana ${c.settimana} di ${SETTIMANE_CICLO}`}</span>
      <span className="max-w-40 truncate text-zinc-400">{c.piano.nome}</span>
      <Badge tone="accent">{c.fase.nome}</Badge>
      {c.fase.scarico && <Badge tone="blue">scarico</Badge>}
    </div>
  )
}

export function OggiPage() {
  const c = useCiclo()
  const aperta = useLiveQuery(() => (c ? sedutaAperta(c.oggi) : undefined), [c?.oggi], 'loading' as const)
  const [finita, setFinita] = useState<string | null>(null)

  if (!c || aperta === 'loading') return null
  if (finita) return <Riepilogo sedutaId={finita} onChiudi={() => setFinita(null)} />
  if (aperta) return <SessioneAttiva seduta={aperta} ciclo={c} onFine={setFinita} />
  return <Anteprima c={c} />
}

function Anteprima({ c }: { c: Ciclo }) {
  const [params, setParams] = useSearchParams()
  const diOggi = sedutaDelGiorno(c.programma, c.oggi)
  const prossima = prossimaSeduta(c.programma, c.oggi)
  const sedute = elencoSedute(c.programma)
  const predefinita = diOggi ?? prossima?.sedutaId ?? sedute[0]?.sedutaId
  const richiesta = params.get('seduta')
  const scelto = richiesta && c.programma.sedute[richiesta] ? richiesta : predefinita
  const fatteOggi = useLiveQuery(() => db.sedute.where('data').equals(c.oggi).filter((x) => x.fine !== null).toArray(), [c.oggi]) ?? []
  if (!scelto) return null
  const s = strutturaSeduta(c.programma, scelto, c.settimana, c.fase, c.impostazioni.sbloccati)

  return (
    <div>
      <PageHeader title={formatData(c.oggi, { weekday: 'long', day: 'numeric', month: 'long' })} subtitle={<Intestazione c={c} />} right={<GearLink />} />

      <PropostaAdattamento c={c} />

      {!diOggi && prossima && (
        <div className="mb-3 rounded-xl bg-zinc-200/70 px-4 py-3 text-sm dark:bg-zinc-800/70">
          Prossima seduta: <b>{NOMI_GIORNI[prossima.giorno]}</b> {formatData(prossima.data, { day: 'numeric', month: 'short' })}
        </div>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {sedute.map((x) => (
          <Chip key={x.sedutaId} active={x.sedutaId === scelto} onClick={() => setParams(x.sedutaId === predefinita ? {} : { seduta: x.sedutaId }, { replace: true })}>
            {x.giorni.length ? x.giorni.map((g) => NOMI_GIORNI[g].slice(0, 3)).join('·') : x.nome}
          </Chip>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div>
          <div className="text-xl font-bold">{s.nome}</div>
          {fatteOggi.some((x) => x.templateId === scelto && (x.pianoId ?? 'originale') === c.piano.id) && <Badge tone="green">fatta oggi</Badge>}
        </div>
      </div>

      <Button variant="primary" big className="mt-4 w-full" onClick={() => iniziaSeduta(c.piano, scelto, c.settimana, c.oggi)}>
        Inizia seduta
      </Button>

      <SessionPreview s={s} fase={c.fase} programma={c.programma} pianoId={c.piano.id} />
    </div>
  )
}
