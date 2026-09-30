import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GearLink } from '../../components/GearLink'
import { Icon } from '../../components/Icon'
import { Stepper } from '../../components/Stepper'
import { Badge, Button, Card, formatData, numIt, PageHeader, SectionTitle, Tabs } from '../../components/ui'
import { eliminaMisura, eliminaRisultatoTest, salvaMisura, salvaRisultatoTest } from '../../db/repositories'
import { db } from '../../db/schema'
import { settimanaCiclo } from '../../domain/calendar'
import { esercizi, programma, tests } from '../../domain/data'
import { nomeSedutaLog } from '../../domain/session'
import { mediaMobilePeso, miglioriSeriePerSeduta, volumeSerie, volumeSettimanale } from '../../domain/stats'
import type { Misura } from '../../domain/types'
import { useCiclo, useOggi } from '../../hooks'
import { durataMin } from '../oggi/Riepilogo'
import { Barre, C1, C2, ChartCard, LineaTempo } from './charts'
import { PdfButton } from '../pdf/EsportaPdfButton'

type Tab = 'misure' | 'forza' | 'test' | 'storico'

export function ProgressiPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab | null) ?? 'misure'
  return (
    <div>
      <PageHeader title="Progressi" right={<GearLink />} />
      <PdfButton
        className="mb-3 w-full"
        etichetta="Esporta PDF dei progressi"
        crea={async (onProgresso) => {
          const { esportaProgressi } = await import('../pdf/esportaProgressi')
          const blob = await esportaProgressi({ onProgresso })
          return { blob, nome: `progressi-${new Date().toISOString().slice(0, 10)}.pdf`, titolo: 'Progressi' }
        }}
      />
      <Tabs
        value={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
        options={[
          { id: 'misure', label: 'Misure' },
          { id: 'forza', label: 'Forza' },
          { id: 'test', label: 'Test' },
          { id: 'storico', label: 'Storico' },
        ]}
      />
      {tab === 'misure' && <Misure />}
      {tab === 'forza' && <Forza />}
      {tab === 'test' && <TestTab />}
      {tab === 'storico' && <Storico />}
    </div>
  )
}

// ---------------- Misure ----------------

function Misure() {
  const oggi = useOggi()
  const misure = useLiveQuery(() => db.misure.orderBy('data').toArray()) ?? []
  const [data, setData] = useState(oggi)
  const ultima = misure.at(-1)
  const vuota: Omit<Misura, 'data'> = { pesoKg: null, vitaCm: null, fcRiposoBpm: null, doloreGinocchio: null }
  const [m, setM] = useState(vuota)
  const set = (k: keyof typeof vuota) => (v: number | null) => setM((x) => ({ ...x, [k]: v }))
  const pieno = Object.values(m).some((v) => v !== null)

  const peso = mediaMobilePeso(misure)
  const serieSemplice = (k: keyof typeof vuota) => misure.filter((x) => x[k] !== null).map((x) => ({ data: x.data, v: x[k] }))

  return (
    <div>
      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold">Nuova misura</span>
          <input type="date" value={data} max={oggi} onChange={(e) => setData(e.target.value || oggi)} className="h-10 rounded-lg bg-zinc-100 px-2 text-sm dark:bg-zinc-800" />
        </div>
        <div className="grid grid-cols-2 gap-y-4">
          <Stepper label="peso" unit="kg" value={m.pesoKg} onChange={set('pesoKg')} step={0.1} decimals={1} start={ultima?.pesoKg ?? 80} max={300} />
          <Stepper label="vita" unit="cm" value={m.vitaCm} onChange={set('vitaCm')} step={0.5} decimals={1} start={ultima?.vitaCm ?? 100} max={250} />
          <Stepper label="FC riposo" unit="bpm" value={m.fcRiposoBpm} onChange={set('fcRiposoBpm')} step={1} start={ultima?.fcRiposoBpm ?? 50} max={150} />
          <Stepper label="dolore ginocchio" unit="0-10" value={m.doloreGinocchio} onChange={set('doloreGinocchio')} step={1} max={10} start={0} />
        </div>
        <Button
          variant="primary"
          className="mt-4 w-full"
          disabled={!pieno}
          onClick={async () => {
            await salvaMisura({ data, ...m })
            setM(vuota)
          }}
        >
          Salva
        </Button>
      </Card>

      <ChartCard titolo="Peso (kg)" vuoto={peso.length === 0}>
        <LineaTempo
          dati={peso}
          unita="kg"
          serie={[
            { key: 'peso', nome: 'giornaliero', colore: C2, tipo: 'punti' },
            { key: 'media', nome: 'media 7 giorni', colore: C1, tipo: 'linea' },
          ]}
        />
      </ChartCard>
      {(
        [
          ['vitaCm', 'Circonferenza vita (cm)', 'cm'],
          ['fcRiposoBpm', 'FC a riposo (bpm)', 'bpm'],
          ['doloreGinocchio', 'Dolore ginocchio (0-10)', ''],
        ] as const
      ).map(([k, t, u]) => {
        const d = serieSemplice(k)
        return (
          <ChartCard key={k} titolo={t} vuoto={d.length === 0}>
            <LineaTempo dati={d} unita={u} serie={[{ key: 'v', nome: t, colore: C1, tipo: 'linea' }]} />
          </ChartCard>
        )
      })}

      {misure.length > 0 && (
        <>
          <SectionTitle>Registrate</SectionTitle>
          <Card className="divide-y divide-zinc-100 py-1 dark:divide-zinc-800">
            {[...misure].reverse().slice(0, 60).map((x) => (
              <div key={x.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="w-24 shrink-0 font-medium">{formatData(x.data)}</span>
                <span className="flex-1 tabular-nums text-zinc-600 dark:text-zinc-400">
                  {[
                    x.pesoKg !== null && `${numIt(x.pesoKg)} kg`,
                    x.vitaCm !== null && `${numIt(x.vitaCm)} cm`,
                    x.fcRiposoBpm !== null && `${x.fcRiposoBpm} bpm`,
                    x.doloreGinocchio !== null && `dolore ${x.doloreGinocchio}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                <EliminaInline onElimina={() => eliminaMisura(x.id!)} />
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  )
}

function EliminaInline({ onElimina }: { onElimina: () => void }) {
  const [conf, setConf] = useState(false)
  return conf ? (
    <button type="button" onClick={onElimina} onBlur={() => setConf(false)} className="h-9 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white">
      Elimina
    </button>
  ) : (
    <button type="button" onClick={() => setConf(true)} className="flex size-9 items-center justify-center rounded-lg text-zinc-400 active:bg-zinc-200 dark:active:bg-zinc-800" aria-label="Elimina">
      <Icon name="trash" className="size-4" />
    </button>
  )
}

// ---------------- Forza ----------------

const conCarico = esercizi.filter((e) => e.tipoRegistrazione === 'carico_ripetizioni')

function Forza() {
  const [id, setId] = useState(() => conCarico[0]?.id ?? '')
  const serieEs = useLiveQuery(() => db.serie.where('esercizioId').equals(id).toArray(), [id]) ?? []
  const tutte = useLiveQuery(() => db.serie.toArray()) ?? []
  const migliori = miglioriSeriePerSeduta(serieEs).map((m) => ({ ...m, e1rm: m.e1rm === null ? null : Math.round(m.e1rm * 10) / 10 }))
  const volume = volumeSettimanale(tutte)

  return (
    <div>
      <select value={id} onChange={(e) => setId(e.target.value)} className="mt-4 h-12 w-full rounded-xl bg-white px-3 font-semibold shadow-sm ring-1 ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/10">
        {conCarico.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nome}
          </option>
        ))}
      </select>
      <ChartCard titolo="Miglior serie e 1RM stimato (kg)" vuoto={migliori.length === 0}>
        <LineaTempo
          dati={migliori}
          unita="kg"
          serie={[
            { key: 'caricoKg', nome: 'miglior serie', colore: C2, tipo: 'linea' },
            { key: 'e1rm', nome: '1RM stimato', colore: C1, tipo: 'linea' },
          ]}
        />
      </ChartCard>
      {migliori.length > 0 && (
        <Card className="mt-3 divide-y divide-zinc-100 py-1 text-sm dark:divide-zinc-800">
          {[...migliori].reverse().slice(0, 10).map((m) => (
            <div key={m.sedutaId} className="flex justify-between py-1.5 tabular-nums">
              <span>{formatData(m.data)}</span>
              <span>
                {numIt(m.caricoKg)} kg × {m.ripetizioni}
                {m.e1rm !== null && <span className="text-zinc-500"> · 1RM {numIt(m.e1rm)}</span>}
              </span>
            </div>
          ))}
        </Card>
      )}
      <ChartCard titolo="Volume settimanale (kg × rip)" vuoto={volume.length === 0}>
        <Barre dati={volume} xKey="settimana" yKey="volume" nome="volume" unita="kg" />
      </ChartCard>
    </div>
  )
}

// ---------------- Test ----------------

function TestTab() {
  const c = useCiclo()
  const oggi = useOggi()
  const risultati = useLiveQuery(() => db.risultatiTest.orderBy('data').toArray()) ?? []
  const [testId, setTestId] = useState(tests[0].id)
  const [valore, setValore] = useState<number | null>(null)
  const [data, setData] = useState(oggi)
  const def = tests.find((t) => t.id === testId)!
  const decimali = def.unita === 's' ? 2 : def.unita === 'm' && def.id !== 'cooper' ? 2 : 0
  const passo = def.unita === 's' ? 0.01 : def.id === 'cooper' ? 10 : def.unita === 'm' ? 0.05 : def.unita === 'kg' ? 2.5 : 1

  return (
    <div>
      <Card className="mt-4">
        <div className="mb-3 font-semibold">Nuovo risultato</div>
        <select value={testId} onChange={(e) => { setTestId(e.target.value); setValore(null) }} className="h-11 w-full rounded-lg bg-zinc-100 px-2 font-medium dark:bg-zinc-800">
          {tests.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Stepper label={def.unita} value={valore} onChange={setValore} step={passo} decimals={decimali} start={risultati.filter((r) => r.testId === testId).at(-1)?.valore ?? 0} max={99999} />
          <input type="date" value={data} max={oggi} onChange={(e) => setData(e.target.value || oggi)} className="h-11 rounded-lg bg-zinc-100 px-2 text-sm dark:bg-zinc-800" />
        </div>
        <Button
          variant="primary"
          className="mt-3 w-full"
          disabled={valore === null}
          onClick={async () => {
            await salvaRisultatoTest({ testId, data, valore: valore! })
            setValore(null)
          }}
        >
          Salva
        </Button>
      </Card>

      {tests.map((t) => {
        const rs = risultati.filter((r) => r.testId === t.id)
        return (
          <div key={t.id}>
            <SectionTitle>{t.nome}</SectionTitle>
            <Card className="divide-y divide-zinc-100 py-1 dark:divide-zinc-800">
              {rs.length === 0 && <div className="py-2 text-sm text-zinc-400">Nessun risultato</div>}
              {rs.map((r, i) => {
                const prec = rs[i - 1]
                const diff = prec ? r.valore - prec.valore : null
                const meglio = diff === null || diff === 0 ? null : (diff > 0) === (t.meglio === 'alto')
                const sett = c ? settimanaCiclo(r.data, c.piano.inizio) : null
                return (
                  <div key={r.id} className="flex items-center gap-2 py-2 text-sm">
                    <span className="w-24 shrink-0">{formatData(r.data)}</span>
                    {sett !== null && <Badge>sett. {sett}</Badge>}
                    <span className="flex-1 text-right font-semibold tabular-nums">
                      {numIt(r.valore, 2)} {t.unita}
                    </span>
                    <span className={`w-16 text-right tabular-nums ${meglio === null ? 'text-zinc-400' : meglio ? 'text-green-600' : 'text-red-600'}`}>
                      {diff === null ? '' : `${diff > 0 ? '+' : ''}${numIt(diff, 2)}`}
                    </span>
                    <EliminaInline onElimina={() => eliminaRisultatoTest(r.id!)} />
                  </div>
                )
              })}
            </Card>
          </div>
        )
      })}
    </div>
  )
}

// ---------------- Storico ----------------

function Storico() {
  const sedute = useLiveQuery(() => db.sedute.orderBy('data').reverse().toArray()) ?? []
  const serie = useLiveQuery(() => db.serie.toArray()) ?? []
  if (sedute.length === 0) return <div className="mt-10 text-center text-sm text-zinc-400">Nessuna seduta</div>
  return (
    <div className="mt-4 space-y-2">
      {sedute.map((s) => {
        const ss = serie.filter((x) => x.sedutaId === s.id)
        const d = durataMin(s.inizio, s.fine)
        return (
          <Link key={s.id} to={`/progressi/seduta/${s.id}`} className="block">
            <Card className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{nomeSedutaLog(s, programma)}</div>
                <div className="text-sm text-zinc-500">
                  {formatData(s.data)} · sett. {s.settimanaCiclo}
                  {d !== null ? ` · ${d} min` : ''} · {ss.length} serie · {numIt(volumeSerie(ss), 0)} kg
                </div>
              </div>
              {s.fine === null && <Badge tone="accent">aperta</Badge>}
              <Icon name="chevron" className="size-5 text-zinc-400" />
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
