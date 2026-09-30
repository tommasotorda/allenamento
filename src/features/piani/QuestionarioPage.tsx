import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useNavigationType, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, Chip, PageHeader } from '../../components/ui'
import { salvaPiano } from '../../db/repositories'
import { DESCR_DIREZIONI } from '../../domain/adattamento'
import { lunediDi } from '../../domain/calendar'
import { GIORNI, NOMI_GIORNI } from '../../domain/data'
import { generaProgramma, modelliPer, nomeScheda, NOMI_ATTREZZI, NOMI_FOCUS, NOMI_OBIETTIVI, NOMI_SUDDIVISIONI, RISPOSTE_VUOTE, type Focus, type Risposte, type Sport, type Suddivisione } from '../../domain/generator'
import { creaPiano } from '../../domain/plans'
import { PROFILI } from '../../domain/profili'
import type { Attrezzo, GiornoId, Obiettivo, Zona } from '../../domain/types'
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
const DURATE: Risposte['durataMin'][] = [30, 45, 60, 75, 90, 105, 120]
export const testoDurata = (m: number) => (m < 60 ? `${m}′` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}′` : ''}`)
const PASSI = [
  { id: 'obiettivi', nome: 'Obiettivi' },
  { id: 'livello', nome: 'Livello' },
  { id: 'giorni', nome: 'Giorni' },
  { id: 'suddivisione', nome: 'Suddivisione' },
  { id: 'attrezzatura', nome: 'Attrezzatura' },
  { id: 'sport', nome: 'Altri sport' },
  { id: 'preferenze', nome: 'Preferenze' },
  { id: 'anteprima', nome: 'Anteprima' },
] as const
type PassoId = (typeof PASSI)[number]['id']

const SPORT = ['Tennis', 'Padel', 'Calcio', 'Calcetto', 'Basket', 'Pallavolo', 'Nuoto', 'Ciclismo', 'Arrampicata', 'Arti marziali', 'Sci', 'Golf']
const DURATE_SPORT = [30, 45, 60, 90, 120]
const SUDDIVISIONI: Suddivisione[] = ['auto', 'fullbody', 'sup-inf', 'ppl', 'gruppi']
const DESCR_SUDDIVISIONI: Record<Suddivisione, string> = {
  auto: 'Scelta in base al numero di giorni',
  fullbody: 'Tutto il corpo in ogni seduta, con varianti',
  'sup-inf': 'Parte superiore e gambe a sedute alterne',
  ppl: 'Petto, spalle e tricipiti / schiena e bicipiti / gambe. Da 3 giorni',
  gruppi: 'Un gruppo muscolare per seduta, con esercizi di isolamento. Da 3 giorni',
}

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

/** Stato del questionario salvato nella sessione: tornando indietro da un esercizio si riprende da dove si era. */
interface Stato {
  profilo: string | null
  r: Risposte
  passo: number
  nome: string | null
  seduta: string | null
}
const CHIAVE_STATO = 'questionario.stato'

function leggiStato(profilo: string | null): Stato | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(CHIAVE_STATO) ?? 'null') as Stato | null
    return s && s.profilo === profilo ? s : null
  } catch {
    return null
  }
}

function scriviStato(s: Stato | null) {
  try {
    if (s) sessionStorage.setItem(CHIAVE_STATO, JSON.stringify(s))
    else sessionStorage.removeItem(CHIAVE_STATO)
  } catch {
    /* storage non disponibile: si riparte da zero */
  }
}

const alterna = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

export function QuestionarioPage() {
  const [params] = useSearchParams()
  const profilo = PROFILI.find((p) => p.id === params.get('profilo'))
  // ripristina solo tornando indietro (o ricaricando); un nuovo questionario parte da zero
  const tipoNavigazione = useNavigationType()
  const [salvato] = useState(() => (tipoNavigazione === 'POP' ? leggiStato(profilo?.id ?? null) : null))
  const [r, setR] = useState<Risposte>(salvato?.r ?? profilo?.risposte ?? RISPOSTE_VUOTE)
  const [passo, setPasso] = useState(salvato?.passo ?? (profilo ? PASSI.length - 1 : 0))
  const [nome, setNome] = useState<string | null>(salvato ? salvato.nome : (profilo?.nome ?? null))
  const [seduta, setSeduta] = useState<string | null>(salvato?.seduta ?? null)
  useEffect(() => scriviStato({ profilo: profilo?.id ?? null, r, passo, nome, seduta }), [profilo, r, passo, nome, seduta])
  const oggi = useOggi()
  const nav = useNavigate()
  const set = (patch: Partial<Risposte> | ((r: Risposte) => Partial<Risposte>)) => setR((x) => ({ ...x, ...(typeof patch === 'function' ? patch(x) : patch) }))
  const programma = useMemo(() => (passo === PASSI.length - 1 && r.obiettivi.length && r.giorni.length ? generaProgramma(r) : null), [passo, r])

  const passoId: PassoId = PASSI[Math.min(passo, PASSI.length - 1)].id
  const valido: Record<PassoId, boolean> = {
    obiettivi: r.obiettivi.length > 0,
    livello: true,
    giorni: r.giorni.length >= 1,
    suddivisione: true,
    attrezzatura: r.corpoLibero !== false || r.attrezzi.length > 0,
    sport: (r.sport ?? []).every((x) => x.giorni.length > 0 && x.tipo.trim()),
    preferenze: true,
    anteprima: !!programma,
  }

  const crea = async (attiva: boolean) => {
    if (!programma) return
    const p = creaPiano({ nome: nome?.trim() || nomeScheda(r), origine: profilo ? 'profilo' : 'questionario', obiettivi: r.obiettivi, programma, inizio: lunediDi(oggi) })
    p.risposte = r
    await salvaPiano(p, attiva)
    scriviStato(null)
    nav(attiva ? '/scheda' : '/schede', { replace: true })
  }

  return (
    <div>
      <PageHeader back="/schede" title={profilo ? profilo.nome : 'Nuova scheda'} subtitle={`${passo + 1}/${PASSI.length} · ${PASSI[passo].nome}`} />
      <div className="mb-4 flex gap-1">
        {PASSI.map((p, i) => (
          <button key={p.id} type="button" onClick={() => i < passo && setPasso(i)} className={`h-1.5 flex-1 rounded-full ${i <= passo ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'}`} aria-label={p.nome} />
        ))}
      </div>

      {passoId === 'obiettivi' && (
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

      {passoId === 'livello' && (
        <div className="grid gap-2">
          {LIVELLI.map(([l, n]) => (
            <Scelta key={l} attivo={r.livello === l} onClick={() => set({ livello: l })}>
              {n}
            </Scelta>
          ))}
        </div>
      )}

      {passoId === 'giorni' && (
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
                {testoDurata(d)}
              </Scelta>
            ))}
          </div>
        </div>
      )}

      {passoId === 'suddivisione' && (
        <div className="space-y-2">
          {SUDDIVISIONI.map((sd) => {
            const sedute = modelliPer(r.giorni.length, sd).map((m) => m.nome)
            const attivo = (r.suddivisione ?? 'auto') === sd
            return (
              <Scelta key={sd} attivo={attivo} onClick={() => set({ suddivisione: sd })}>
                <div>{NOMI_SUDDIVISIONI[sd]}</div>
                <div className={`text-xs font-normal ${attivo ? 'opacity-70' : 'text-zinc-500'}`}>{DESCR_SUDDIVISIONI[sd]}</div>
                <div className={`mt-1 text-xs font-normal ${attivo ? 'opacity-90' : 'text-zinc-600 dark:text-zinc-400'}`}>
                  {r.giorni.map((g, k) => `${NOMI_GIORNI[g].slice(0, 3)}: ${sedute[k]}`).join(' · ')}
                </div>
              </Scelta>
            )
          })}
        </div>
      )}

      {passoId === 'attrezzatura' && (
        <div>
          <div className="mb-2 px-1 text-sm text-zinc-500">Una o più scelte</div>
          <div className="grid grid-cols-2 gap-2">
            <Scelta attivo={r.corpoLibero !== false} onClick={() => set({ corpoLibero: r.corpoLibero === false })}>
              Corpo libero
            </Scelta>
            {ATTREZZI.map((a) => (
              <Scelta key={a} attivo={r.attrezzi.includes(a)} onClick={() => set({ attrezzi: alterna(r.attrezzi, a) })}>
                {NOMI_ATTREZZI[a]}
              </Scelta>
            ))}
          </div>
          <AttrezziPerGiorno r={r} set={set} />
        </div>
      )}

      {passoId === 'sport' && <AltriSport r={r} set={set} />}

      {passoId === 'preferenze' && (
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

      {passoId === 'anteprima' && programma && (
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
            <Badge>{testoDurata(r.durataMin)}</Badge>
            <Badge>{NOMI_SUDDIVISIONI[r.suddivisione ?? 'auto']}</Badge>
            {(r.sport ?? []).map((x) => (
              <Badge key={x.tipo} tone="blue">
                {x.tipo}
              </Badge>
            ))}
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
          <AnteprimaProgramma programma={programma} aperta={seduta} onApri={setSeduta} />
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
          <Button variant="primary" big className="flex-[2]" disabled={!valido[passoId]} onClick={() => setPasso(passo + 1)}>
            {passo === PASSI.length - 2 ? 'Genera scheda' : 'Avanti'}
          </Button>
        </div>
      )}
    </div>
  )
}

type Imposta = (patch: Partial<Risposte> | ((r: Risposte) => Partial<Risposte>)) => void

/** Giorni con attrezzi diversi (es. il sabato solo corpo libero). */
function AttrezziPerGiorno({ r, set }: { r: Risposte; set: Imposta }) {
  const [aperto, setAperto] = useState<GiornoId | null>(null)
  const attivo = !!r.attrezziGiorno && Object.keys(r.attrezziGiorno).length > 0
  const perGiorno = r.attrezziGiorno ?? {}
  const generale = { attrezzi: r.attrezzi, corpoLibero: r.corpoLibero !== false }
  const aggiorna = (g: GiornoId, v: { attrezzi: Attrezzo[]; corpoLibero: boolean }) => set({ attrezziGiorno: { ...perGiorno, [g]: v } })
  const descr = (v: { attrezzi: Attrezzo[]; corpoLibero: boolean }) => [...(v.corpoLibero ? ['Corpo libero'] : []), ...v.attrezzi.map((a) => NOMI_ATTREZZI[a])].join(', ') || 'Nessuno'

  return (
    <div className="mt-6">
      <label className="flex items-center justify-between rounded-xl bg-white px-4 py-3 font-semibold ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10">
        Alcuni giorni ho attrezzi diversi
        <input
          type="checkbox"
          className="size-5 accent-orange-500"
          checked={attivo}
          onChange={(e) => set({ attrezziGiorno: e.target.checked ? Object.fromEntries(r.giorni.map((g) => [g, { ...generale, attrezzi: [...generale.attrezzi] }])) : undefined })}
        />
      </label>
      {attivo && (
        <div className="mt-2 space-y-2">
          {r.giorni.map((g) => {
            const v = perGiorno[g] ?? generale
            return (
              <div key={g} className="rounded-xl bg-white ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10">
                <button type="button" onClick={() => setAperto(aperto === g ? null : g)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className="w-20 font-semibold">{NOMI_GIORNI[g]}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-500">{descr(v)}</span>
                  <Icon name="chevron" className={`size-5 shrink-0 text-zinc-400 transition-transform ${aperto === g ? 'rotate-90' : ''}`} />
                </button>
                {aperto === g && (
                  <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                    <Scelta attivo={v.corpoLibero} onClick={() => aggiorna(g, { ...v, corpoLibero: !v.corpoLibero })}>
                      Corpo libero
                    </Scelta>
                    {ATTREZZI.map((a) => (
                      <Scelta key={a} attivo={v.attrezzi.includes(a)} onClick={() => aggiorna(g, { ...v, attrezzi: alterna(v.attrezzi, a) })}>
                        {NOMI_ATTREZZI[a]}
                      </Scelta>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Altri sport con giorni e durata: la scheda li tiene in conto. Passo facoltativo. */
function AltriSport({ r, set }: { r: Risposte; set: Imposta }) {
  const sport = r.sport ?? []
  const [altro, setAltro] = useState('')
  const aggiorna = (i: number, patch: Partial<Sport> | ((s: Sport) => Partial<Sport>)) =>
    set((r) => ({ sport: (r.sport ?? []).map((x, k) => (k === i ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch) } : x)) }))
  const aggiungi = (tipo: string) => {
    if (!tipo.trim() || sport.some((x) => x.tipo.toLowerCase() === tipo.trim().toLowerCase())) return
    set({ sport: [...sport, { tipo: tipo.trim(), giorni: [], durataMin: 60 }] })
  }
  return (
    <div>
      <div className="mb-2 px-1 text-sm text-zinc-500">Facoltativo: puoi saltare questo passo</div>
      <div className="flex flex-wrap gap-2">
        {SPORT.filter((x) => !sport.some((y) => y.tipo === x)).map((x) => (
          <Chip key={x} active={false} onClick={() => aggiungi(x)}>
            + {x}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={altro} onChange={(e) => setAltro(e.target.value)} placeholder="Altro sport" className="h-11 min-w-0 flex-1 rounded-xl bg-white px-3 ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10" />
        <Button
          disabled={!altro.trim()}
          onClick={() => {
            aggiungi(altro)
            setAltro('')
          }}
        >
          Aggiungi
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {sport.map((x, i) => (
          <Card key={x.tipo} className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">{x.tipo}</span>
              <button type="button" onClick={() => set({ sport: sport.filter((_, k) => k !== i) })} className="flex size-9 items-center justify-center rounded-lg text-zinc-400" aria-label={`Togli ${x.tipo}`}>
                <Icon name="close" className="size-5" />
              </button>
            </div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Giorni</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {GIORNI.map((g) => (
                <Chip key={g} active={x.giorni.includes(g)} onClick={() => aggiorna(i, (cur) => ({ giorni: GIORNI.filter((y) => (y === g ? !cur.giorni.includes(g) : cur.giorni.includes(y))) }))}>
                  {NOMI_GIORNI[g].slice(0, 3)}
                </Chip>
              ))}
            </div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Durata</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {DURATE_SPORT.map((d) => (
                <Chip key={d} active={x.durataMin === d} onClick={() => aggiorna(i, { durataMin: d })}>
                  {testoDurata(d)}
                </Chip>
              ))}
            </div>
            {!x.giorni.length && <div className="mt-2 text-xs font-medium text-red-600">Scegli almeno un giorno</div>}
          </Card>
        ))}
      </div>
    </div>
  )
}
