import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GearLink } from '../../components/GearLink'
import { Badge, Button, Chip, formatData, PageHeader } from '../../components/ui'
import { iniziaSeduta, sedutaAperta } from '../../db/repositories'
import { db } from '../../db/schema'
import { giornoSettimana, prossimaSeduta, SETTIMANE_CICLO } from '../../domain/calendar'
import { GIORNI, NOMI_GIORNI } from '../../domain/data'
import { strutturaSeduta } from '../../domain/session'
import type { GiornoId } from '../../domain/types'
import { useCiclo, type Ciclo } from '../../hooks'
import { SessionPreview } from '../scheda/SessionPreview'
import { Riepilogo } from './Riepilogo'
import { SessioneAttiva } from './SessioneAttiva'

export function Intestazione({ c }: { c: Ciclo }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span>
        Settimana {c.settimana} di {SETTIMANE_CICLO}
      </span>
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
  const oggiGiorno = giornoSettimana(c.oggi)
  const prossima = prossimaSeduta(c.oggi)
  const scelto = (params.get('seduta') as GiornoId | null) ?? oggiGiorno ?? prossima.giorno
  const s = strutturaSeduta(c.programma, scelto, c.settimana, c.fase, c.impostazioni.sbloccati)
  const fatteOggi = useLiveQuery(() => db.sedute.where('data').equals(c.oggi).filter((x) => x.fine !== null).toArray(), [c.oggi]) ?? []

  return (
    <div>
      <PageHeader title={formatData(c.oggi, { weekday: 'long', day: 'numeric', month: 'long' })} subtitle={<Intestazione c={c} />} right={<GearLink />} />

      {!oggiGiorno && (
        <div className="mb-3 rounded-xl bg-zinc-200/70 px-4 py-3 text-sm dark:bg-zinc-800/70">
          Prossima seduta: <b>{NOMI_GIORNI[prossima.giorno]}</b> {formatData(prossima.data, { day: 'numeric', month: 'short' })}
        </div>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {GIORNI.map((g) => (
          <Chip key={g} active={g === scelto} onClick={() => setParams(g === (oggiGiorno ?? prossima.giorno) ? {} : { seduta: g }, { replace: true })}>
            {NOMI_GIORNI[g].slice(0, 3)}
          </Chip>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div>
          <div className="text-xl font-bold">{s.nome}</div>
          {fatteOggi.some((x) => x.templateId === scelto) && <Badge tone="green">fatta oggi</Badge>}
        </div>
      </div>

      <Button variant="primary" big className="mt-4 w-full" onClick={() => iniziaSeduta(scelto, c.settimana, c.oggi)}>
        Inizia seduta
      </Button>

      <SessionPreview s={s} fase={c.fase} />
    </div>
  )
}
