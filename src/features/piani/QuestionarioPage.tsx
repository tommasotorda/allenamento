import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, PageHeader } from '../../components/ui'
import { salvaPiano } from '../../db/repositories'
import { DESCR_DIREZIONI } from '../../domain/adattamento'
import { lunediDi } from '../../domain/calendar'
import { GIORNI, NOMI_GIORNI } from '../../domain/data'
import { generaProgramma, nomeScheda, NOMI_ATTREZZI, NOMI_FOCUS, NOMI_OBIETTIVI, RISPOSTE_VUOTE, type Focus, type Risposte } from '../../domain/generator'
import { creaPiano } from '../../domain/plans'
import { PROFILI } from '../../domain/profili'
import type { Attrezzo, Obiettivo, Zona } from '../../domain/types'
import { useOggi } from '../../hooks'
import { AnteprimaProgramma } from './AnteprimaProgramma'

const OBIETTIVI: Obiettivo[] = ['forza', 'massa', 'potenza', 'resistenza', 'mobilita', 'stabilita']
const ATTREZZI: Attrezzo[] = ['manubri', 'kettlebell', 'bilanciere', 'panca', 'sbarra', 'elastico', 'cavo', 'trap-bar', 'palla-medica', 'box', 'trx', 'slitta', 'landmine', 'battle-rope', 'slider', 'panca-iperestensioni']
const ZONE: [Zona, string][] = [
  ['ginocchia', 'Ginocchia'],
  ['schiena', 'Schiena'],
  ['spalle', 'Spalle'],
  ['polsi', 'Polsi'],
]
const LIVELLI: [1 | 2 | 3, string][] = [
  [1, 'Principiante'],
  [2, 'Intermedio'],
  [3, 'Avanzato'],
]
const DURATE: Risposte['durataMin'][] = [30, 45, 60, 75]
const PASSI = ['Obiettivi', 'Livello', 'Giorni', 'Attrezzatura', 'Preferenze', 'Anteprima'] as const

function Scelta({ attivo, onClick, children, ordine }: { attivo: boolean; onClick: () => void; children: React.ReactNode; ordine?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-12 w-full items-center gap-2 rounded-xl px-4 py-2.5 text-left font-semibold ${attivo ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-white ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10'}`}
    >
      {ordine !== undefined && <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs text-white">{ordine}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {attivo && ordine === undefined && <Icon name="check" className="size-5 shrink-0" />}
    </button>
  )
}

const alterna = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

export function QuestionarioPage() {
  const [params] = useSearchParams()
  const profilo = PROFILI.find((p) => p.id === params.get('profilo'))
  const [r, setR] = useState<Risposte>(profilo?.risposte ?? RISPOSTE_VUOTE)
  const [passo, setPasso] = useState(profilo ? PASSI.length - 1 : 0)
  const [nome, setNome] = useState<string | null>(profilo?.nome ?? null)
  const oggi = useOggi()
  const nav = useNavigate()
  const set = (patch: Partial<Risposte>) => setR((x) => ({ ...x, ...patch }))
  const programma = useMemo(() => (passo === PASSI.length - 1 && r.obiettivi.length && r.giorni.length ? generaProgramma(r) : null), [passo, r])

  const valido = [r.obiettivi.length > 0, true, r.giorni.length >= 1, true, true, !!programma][passo]

  const crea = async (attiva: boolean) => {
    if (!programma) return
    const p = creaPiano({ nome: nome?.trim() || nomeScheda(r), origine: profilo ? 'profilo' : 'questionario', obiettivi: r.obiettivi, programma, inizio: lunediDi(oggi) })
    p.risposte = r
    await salvaPiano(p, attiva)
    nav(attiva ? '/scheda' : '/schede', { replace: true })
  }

  return (
    <div>
      <PageHeader back="/schede" title={profilo ? profilo.nome : 'Nuova scheda'} subtitle={`${passo + 1}/${PASSI.length} · ${PASSI[passo]}`} />
      <div className="mb-4 flex gap-1">
        {PASSI.map((p, i) => (
          <button key={p} type="button" onClick={() => i < passo && setPasso(i)} className={`h-1.5 flex-1 rounded-full ${i <= passo ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'}`} aria-label={p} />
        ))}
      </div>

      {passo === 0 && (
        <div className="space-y-2">
          <div className="px-1 text-sm text-zinc-500">Fino a 3, in ordine di priorità</div>
          {OBIETTIVI.map((o) => {
            const i = r.obiettivi.indexOf(o)
            return (
              <Scelta key={o} attivo={i >= 0} ordine={i >= 0 ? i + 1 : undefined} onClick={() => set({ obiettivi: i >= 0 ? r.obiettivi.filter((x) => x !== o) : r.obiettivi.length < 3 ? [...r.obiettivi, o] : r.obiettivi })}>
                <div>{NOMI_OBIETTIVI[o]}</div>
                <div className={`text-xs font-normal ${i >= 0 ? 'opacity-70' : 'text-zinc-500'}`}>{DESCR_DIREZIONI[o]}</div>
              </Scelta>
            )
          })}
        </div>
      )}

      {passo === 1 && (
        <div className="grid gap-2">
          {LIVELLI.map(([l, n]) => (
            <Scelta key={l} attivo={r.livello === l} onClick={() => set({ livello: l })}>
              {n}
            </Scelta>
          ))}
        </div>
      )}

      {passo === 2 && (
        <div>
          <div className="mb-2 px-1 text-sm font-semibold text-zinc-500">Giorni di allenamento</div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {GIORNI.map((g) => (
              <Scelta key={g} attivo={r.giorni.includes(g)} onClick={() => set({ giorni: GIORNI.filter((x) => (x === g ? !r.giorni.includes(g) : r.giorni.includes(x))) })}>
                {NOMI_GIORNI[g].slice(0, 3)}
              </Scelta>
            ))}
          </div>
          <div className="mb-2 mt-6 px-1 text-sm font-semibold text-zinc-500">Durata di una seduta</div>
          <div className="grid grid-cols-4 gap-2">
            {DURATE.map((d) => (
              <Scelta key={d} attivo={r.durataMin === d} onClick={() => set({ durataMin: d })}>
                {d}′
              </Scelta>
            ))}
          </div>
        </div>
      )}

      {passo === 3 && (
        <div>
          <div className="mb-2 px-1 text-sm text-zinc-500">Nessuna selezione = corpo libero</div>
          <div className="grid grid-cols-2 gap-2">
            {ATTREZZI.map((a) => (
              <Scelta key={a} attivo={r.attrezzi.includes(a)} onClick={() => set({ attrezzi: alterna(r.attrezzi, a) })}>
                {NOMI_ATTREZZI[a]}
              </Scelta>
            ))}
          </div>
        </div>
      )}

      {passo === 4 && (
        <div>
          <div className="mb-2 px-1 text-sm font-semibold text-zinc-500">Corsa</div>
          <div className="grid grid-cols-2 gap-2">
            <Scelta attivo={r.corsa} onClick={() => set({ corsa: true })}>
              Sì
            </Scelta>
            <Scelta attivo={!r.corsa} onClick={() => set({ corsa: false })}>
              No
            </Scelta>
          </div>
          <div className="mb-2 mt-6 px-1 text-sm font-semibold text-zinc-500">Zone su cui concentrarti</div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(NOMI_FOCUS) as Focus[]).map((f) => (
              <Scelta key={f} attivo={r.focus.includes(f)} onClick={() => set({ focus: alterna(r.focus, f) })}>
                {NOMI_FOCUS[f]}
              </Scelta>
            ))}
          </div>
          <div className="mb-2 mt-6 px-1 text-sm font-semibold text-zinc-500">Zone da non sollecitare</div>
          <div className="grid grid-cols-2 gap-2">
            {ZONE.map(([z, n]) => (
              <Scelta key={z} attivo={r.evitare.includes(z)} onClick={() => set({ evitare: alterna(r.evitare, z) })}>
                {n}
              </Scelta>
            ))}
          </div>
        </div>
      )}

      {passo === 5 && programma && (
        <div>
          <label className="block">
            <span className="px-1 text-sm font-semibold text-zinc-500">Nome</span>
            <input value={nome ?? nomeScheda(r)} onChange={(e) => setNome(e.target.value)} className="mt-1 h-12 w-full rounded-xl bg-white px-3 font-semibold ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10" />
          </label>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.obiettivi.map((o) => (
              <Badge key={o} tone="accent">
                {NOMI_OBIETTIVI[o]}
              </Badge>
            ))}
            <Badge>{r.giorni.length} giorni</Badge>
            <Badge>{r.durataMin} min</Badge>
            <Badge>{LIVELLI.find(([l]) => l === r.livello)![1]}</Badge>
          </div>
          {profilo && (
            <Card className="mt-3 flex items-center justify-between p-3">
              <span className="text-sm text-zinc-500">Risposte del profilo</span>
              <Button className="h-9 px-3 text-sm" onClick={() => setPasso(0)}>
                Modifica
              </Button>
            </Card>
          )}
          <AnteprimaProgramma programma={programma} />
          <Button variant="primary" big className="mt-6 w-full" onClick={() => crea(true)}>
            Attiva questa scheda
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => crea(false)}>
            Salva senza attivare
          </Button>
        </div>
      )}

      {passo < PASSI.length - 1 && (
        <div className="mt-6 flex gap-2">
          {passo > 0 && (
            <Button big className="flex-1" onClick={() => setPasso(passo - 1)}>
              Indietro
            </Button>
          )}
          <Button variant="primary" big className="flex-[2]" disabled={!valido} onClick={() => setPasso(passo + 1)}>
            {passo === PASSI.length - 2 ? 'Genera scheda' : 'Avanti'}
          </Button>
        </div>
      )}
    </div>
  )
}
