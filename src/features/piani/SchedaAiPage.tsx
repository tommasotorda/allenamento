import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, PageHeader, SectionTitle } from '../../components/ui'
import { consegnaFile } from '../../condividi'
import { salvaPiano } from '../../db/repositories'
import { lunediDi } from '../../domain/calendar'
import { NOMI_OBIETTIVI } from '../../domain/generator'
import { creaPiano } from '../../domain/plans'
import { importaSchedaLlm, modelloPerLlm, type RisultatoImport } from '../../domain/schedaLlm'
import { useOggi } from '../../hooks'
import { AnteprimaProgramma } from './AnteprimaProgramma'

const testoModello = () => JSON.stringify(modelloPerLlm(), null, 2)

async function copia(testo: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(testo)
    return true
  } catch {
    return false
  }
}

/** Scheda da un assistente AI: modello da consegnare e importazione della risposta. */
export function SchedaAiPage() {
  const oggi = useOggi()
  const nav = useNavigate()
  const [testo, setTesto] = useState('')
  const [esito, setEsito] = useState<RisultatoImport | null>(null)
  const [nome, setNome] = useState('')
  const [copiato, setCopiato] = useState<'modello' | 'errori' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const segnaCopiato = (k: 'modello' | 'errori') => {
    setCopiato(k)
    setTimeout(() => setCopiato(null), 2000)
  }
  const controlla = (t: string) => {
    const r = importaSchedaLlm(t)
    setEsito(r)
    if (r.ok) setNome(r.nome)
  }
  const crea = async (attiva: boolean) => {
    if (!esito?.ok) return
    const p = creaPiano({ nome: nome.trim() || esito.nome, origine: 'importata', obiettivi: esito.obiettivi, programma: esito.programma, inizio: lunediDi(oggi) })
    await salvaPiano(p, attiva)
    nav(attiva ? '/scheda' : '/schede', { replace: true })
  }

  return (
    <div>
      <PageHeader back="/schede" title="Scheda da un'AI" />

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
          <AnteprimaProgramma programma={esito.programma} />
          <Button variant="primary" big className="mt-6 w-full" onClick={() => crea(true)}>
            Attiva questa scheda
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => crea(false)}>
            Salva senza attivare
          </Button>
        </div>
      )}
    </div>
  )
}
