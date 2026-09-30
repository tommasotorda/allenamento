import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GearLink } from '../../components/GearLink'
import { Icon } from '../../components/Icon'
import { Badge, Card, formatData, PageHeader, Tabs } from '../../components/ui'
import { aggiornaProgramma } from '../../db/repositories'
import { db } from '../../db/schema'
import { aggiungiGiorni, faseDellaSettimana, lunediDi, SETTIMANE_CICLO } from '../../domain/calendar'
import { GIORNI, NOMI_GIORNI } from '../../domain/data'
import { scadenza } from '../../domain/plans'
import { useCiclo, useSenzaSchede } from '../../hooks'
import { InvitoScheda } from '../piani/NuovaScheda'
import { PropostaAdattamento } from '../adattamento/PropostaAdattamento'
import { EsportaPdfButton } from '../pdf/EsportaPdfButton'
import { Intestazione } from '../oggi/OggiPage'
import { RiepilogoCarico } from '../piani/RiepilogoCarico'

export function SchedaPage() {
  const c = useCiclo()
  const [vista, setVista] = useState<'settimana' | 'ciclo' | 'carico'>('settimana')
  const lun = c ? lunediDi(c.oggi) : ''
  const fatte =
    useLiveQuery(() => (lun ? db.sedute.where('data').between(lun, aggiungiGiorni(lun, 6), true, true).filter((s) => s.fine !== null).toArray() : []), [lun]) ?? []
  const senzaSchede = useSenzaSchede()
  if (senzaSchede) return <InvitoScheda titolo="Scheda" />
  if (!c) return null
  const mie = fatte.filter((s) => (s.pianoId ?? 'originale') === c.piano.id)

  return (
    <div>
      <PageHeader title={c.piano.nome} subtitle={<Intestazione c={c} />} right={<GearLink />} />
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Link to="/adatta" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-white">
          <Icon name="swap" className="size-5" /> Adatta
        </Link>
        <Link to="/schede" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-200 font-semibold dark:bg-zinc-800">
          <Icon name="book" className="size-5" /> Le mie schede
        </Link>
      </div>
      <EsportaPdfButton piano={c.piano} settimana={c.settimana} sbloccati={c.impostazioni.sbloccati} className="mb-3 w-full" />
      <PropostaAdattamento c={c} />
      <Tabs
        value={vista}
        onChange={setVista}
        options={[
          { id: 'settimana', label: 'Settimana' },
          { id: 'ciclo', label: 'Ciclo' },
          { id: 'carico', label: 'Carico' },
        ]}
      />

      {vista === 'carico' && (
        <RiepilogoCarico programma={c.programma} obiettivo={c.piano.obiettivi[0] ?? 'forza'} livello={c.piano.risposte?.livello ?? 2} onChange={(p) => aggiornaProgramma(c.piano.id, p)} />
      )}

      {vista === 'settimana' ? (
        <div className="mt-4 space-y-2">
          {GIORNI.map((g, i) => {
            const data = aggiungiGiorni(lun, i)
            const oggi = data === c.oggi
            const sedutaId = c.programma.settimana.find((x) => x.giorno === g)?.sedutaId
            if (!sedutaId) {
              return (
                <div key={g} className={`flex items-center gap-3 rounded-2xl px-4 py-2 text-sm text-zinc-400 ${oggi ? 'ring-2 ring-accent' : ''}`}>
                  <span className="w-12 font-semibold">{NOMI_GIORNI[g].slice(0, 3)}</span> Riposo
                </div>
              )
            }
            const fatta = mie.some((s) => s.templateId === sedutaId && s.data === data)
            return (
              <Link key={g} to={`/scheda/${sedutaId}`} className="block">
                <Card className={`flex items-center gap-3 ${oggi ? 'ring-2 ring-accent' : ''}`}>
                  <div className={`flex size-12 shrink-0 flex-col items-center justify-center rounded-xl text-sm font-bold ${fatta ? 'bg-green-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                    {fatta ? <Icon name="check" className="size-6" /> : NOMI_GIORNI[g].slice(0, 3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{c.programma.sedute[sedutaId].nome}</div>
                    <div className="text-sm text-zinc-500">
                      {NOMI_GIORNI[g]} · {fatta ? 'fatta' : 'da fare'}
                    </div>
                  </div>
                  <Icon name="chevron" className="size-5 text-zinc-400" />
                </Card>
              </Link>
            )
          })}
        </div>
      ) : vista === 'ciclo' ? (
        <>
          <div className="mt-3 px-1 text-sm text-zinc-500">
            {formatData(c.piano.inizio, { day: 'numeric', month: 'long' })} → {formatData(scadenza(c.piano), { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: SETTIMANE_CICLO }, (_, i) => i + 1).map((w) => {
              const f = faseDellaSettimana(c.programma, w)
              const corrente = w === c.settimana
              return (
                <div key={w} className={`rounded-xl p-3 ${f.scarico ? 'bg-sky-600/15' : 'bg-white dark:bg-zinc-900'} ${corrente ? 'ring-2 ring-accent' : 'ring-1 ring-zinc-900/5 dark:ring-white/10'}`}>
                  <div className="text-2xl font-bold tabular-nums">{w}</div>
                  <div className="text-sm font-medium">{f.nome}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {f.test && <Badge tone="accent">test</Badge>}
                    {f.ripetizioniForza && <Badge>{f.ripetizioniForza} rip</Badge>}
                    <Badge>RPE {f.rpeForza}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}
