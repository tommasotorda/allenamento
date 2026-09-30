import { useEffect, useRef, useState } from 'react'
import { useNavigate, useNavigationType, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, PageHeader, SectionTitle } from '../../components/ui'
import { consegnaFile } from '../../condividi'
import { salvaPiano, salvaProfilo } from '../../db/repositories'
import { lunediDi } from '../../domain/calendar'
import { NOMI_OBIETTIVI } from '../../domain/generator'
import { creaPiano } from '../../domain/plans'
import { importaSchedaLlm, modelloPerLlm, type RisultatoImport } from '../../domain/schedaLlm'
import type { Programma } from '../../domain/types'
import { uuid } from '../../domain/util'
import { useOggi } from '../../hooks'
import { AnteprimaProgramma } from './AnteprimaProgramma'
import { RiepilogoCarico } from './RiepilogoCarico'

const testoModello = () => JSON.stringify(modelloPerLlm(), null, 2)

async function copia(testo: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(testo)
    return true
  } catch {
    return false
  }
}

/** Stato salvato nella sessione: tornando indietro da un esercizio si ritrova la scheda importata. */
interface Stato {
  testo: string
  importato: boolean
  nome: string
  seduta: string | null
  /** scheda ritoccata con gli slider */
  ritoccata?: Programma | null
}
const CHIAVE_STATO = 'schedaAi.stato'

function leggiStato(): Stato | null {
  try {
    return JSON.parse(sessionStorage.getItem(CHIAVE_STATO) ?? 'null') as Stato | null
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

/** Scheda da un assistente AI: modello da consegnare e importazione della risposta. */
export function SchedaAiPage() {
  const oggi = useOggi()
  const nav = useNavigate()
  // aperto dal "+" dei profili: il risultato diventa un profilo personale
  const [params] = useSearchParams()
  const perProfilo = params.get('per') === 'profilo'
  // ripristina solo tornando indietro (o ricaricando); entrando dalle schede si parte da zero
  const tipoNavigazione = useNavigationType()
  const [salvato] = useState(() => (tipoNavigazione === 'POP' ? leggiStato() : null))
  const [testo, setTesto] = useState(salvato?.testo ?? '')
  const [esito, setEsito] = useState<RisultatoImport | null>(() => (salvato?.importato ? importaSchedaLlm(salvato.testo) : null))
  const [nome, setNome] = useState(salvato?.nome ?? '')
  const [seduta, setSeduta] = useState<string | null>(salvato?.seduta ?? null)
  const [ritoccata, setRitoccata] = useState<Programma | null>(salvato?.ritoccata ?? null)
  useEffect(() => scriviStato({ testo, importato: !!esito, nome, seduta, ritoccata }), [testo, esito, nome, seduta, ritoccata])
  const [copiato, setCopiato] = useState<'modello' | 'errori' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const segnaCopiato = (k: 'modello' | 'errori') => {
    setCopiato(k)
    setTimeout(() => setCopiato(null), 2000)
  }
  const controlla = (t: string) => {
    const r = importaSchedaLlm(t)
    setEsito(r)
    setRitoccata(null)
    if (r.ok) setNome(r.nome)
  }
  const crea = async (attiva: boolean) => {
    if (!esito?.ok) return
    const p = creaPiano({ nome: nome.trim() || esito.nome, origine: 'importata', obiettivi: esito.obiettivi, programma: ritoccata ?? esito.programma, inizio: lunediDi(oggi) })
    await salvaPiano(p, attiva)
    scriviStato(null)
    nav(attiva ? '/scheda' : '/schede', { replace: true })
  }
  const creaProfilo = async (attiva: boolean) => {
    if (!esito?.ok) return
    const n = nome.trim() || esito.nome
    const programma = ritoccata ?? esito.programma
    await salvaProfilo({ id: uuid(), nome: n, obiettivi: esito.obiettivi, creato: new Date().toISOString(), programma })
    if (attiva) await salvaPiano(creaPiano({ nome: n, origine: 'importata', obiettivi: esito.obiettivi, programma, inizio: lunediDi(oggi) }), true)
    scriviStato(null)
    nav(attiva ? '/scheda' : '/profili', { replace: true })
  }

  return (
    <div>
      <PageHeader back={perProfilo ? '/profili' : '/schede'} title={perProfilo ? "Profilo da un'AI" : "Scheda da un'AI"} />

      <SectionTitle>1 · Modello</SectionTitle>
      <Card className="p-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Istruzioni, formato ed elenco degli esercizi disponibili. Dallo al tuo assistente (ChatGPT, Claude…) insieme alle tue richieste.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={() => consegnaFile(new Blob([testoModello()], { type: 'application/json' }), 'modello-scheda.json', 'Modello scheda')}>
            <Icon name="download" className="size-5" /> Scarica
          </Button>
          <Button onClick={async () => (await copia(testoModello())) && segnaCopiato('modello')}>
            <Icon name={copiato === 'modello' ? 'check' : 'copy'} className="size-5" /> {copiato === 'modello' ? 'Copiato' : 'Copia'}
          </Button>
        </div>
      </Card>

      <SectionTitle>2 · Risposta</SectionTitle>
      <textarea
        value={testo}
        onChange={(e) => {
          setTesto(e.target.value)
          setEsito(null)
          setRitoccata(null)
        }}
        placeholder="Incolla qui il JSON generato"
        spellCheck={false}
        className="h-44 w-full rounded-xl bg-white p-3 font-mono text-xs ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10"
      />
      <input
        ref={fileRef}
        type="file"
        accept=".json,.txt,application/json,text/plain"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          const t = await f.text()
          setTesto(t)
          controlla(t)
        }}
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button onClick={() => fileRef.current?.click()}>
          <Icon name="upload" className="size-5" /> Da file
        </Button>
        <Button variant="primary" disabled={!testo.trim()} onClick={() => controlla(testo)}>
          Importa
        </Button>
      </div>

      {esito && !esito.ok && (
        <Card className="mt-4 p-3 ring-2 ring-red-500/60">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-red-600">
              {esito.errori.length === 1 ? '1 problema da correggere' : `${esito.errori.length} problemi da correggere`}
            </span>
            <Button className="h-9 px-3 text-sm" onClick={async () => (await copia(`Correggi questi errori nella scheda JSON:\n${esito.errori.map((e) => `- ${e}`).join('\n')}`)) && segnaCopiato('errori')}>
              {copiato === 'errori' ? 'Copiati' : 'Copia errori'}
            </Button>
          </div>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
            {esito.errori.slice(0, 30).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          {esito.errori.length > 30 && <div className="mt-2 text-sm text-zinc-500">…e altri {esito.errori.length - 30}</div>}
          <p className="mt-3 text-xs text-zinc-500">La scheda non è stata importata. Puoi incollare gli errori all'assistente per farla correggere.</p>
        </Card>
      )}

      {esito?.ok && (
        <div className="mt-4">
          <label className="block">
            <span className="px-1 text-sm font-semibold text-zinc-500">Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 h-12 w-full rounded-xl bg-white px-3 font-semibold ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10" />
          </label>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {esito.obiettivi.map((o) => (
              <Badge key={o} tone="accent">
                {NOMI_OBIETTIVI[o]}
              </Badge>
            ))}
            <Badge>{esito.programma.settimana.length} giorni</Badge>
          </div>
          <RiepilogoCarico programma={ritoccata ?? esito.programma} obiettivo={esito.obiettivi[0]} livello={2} onChange={setRitoccata} onRipristina={ritoccata ? () => setRitoccata(null) : undefined} />
          <AnteprimaProgramma programma={ritoccata ?? esito.programma} aperta={seduta} onApri={setSeduta} />
          <Button variant="primary" big className="mt-6 w-full" onClick={() => (perProfilo ? creaProfilo(false) : crea(true))}>
            {perProfilo ? 'Salva profilo' : 'Attiva questa scheda'}
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => (perProfilo ? creaProfilo(true) : crea(false))}>
            {perProfilo ? 'Salva profilo e attiva la scheda' : 'Salva senza attivare'}
          </Button>
        </div>
      )}
    </div>
  )
}
