import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, PageHeader, SectionTitle } from '../../components/ui'
import { eliminaProfilo, salvaPiano, salvaProfilo } from '../../db/repositories'
import { db } from '../../db/schema'
import { programma as programmaJson } from '../../domain/data'
import { NOMI_ATTREZZI, NOMI_OBIETTIVI } from '../../domain/generator'
import { creaPiano } from '../../domain/plans'
import { PROFILI } from '../../domain/profili'
import type { ProfiloUtente } from '../../domain/types'
import { uuid } from '../../domain/util'
import { useOggi } from '../../hooks'
import { testoDurata } from './QuestionarioPage'

/** Profili standard (aprono il questionario precompilato) e profili salvati dall'utente. */
export function ProfiliPage() {
  const miei = useLiveQuery(async () => (await db.profili.toArray()).sort((a, b) => b.creato.localeCompare(a.creato))) ?? []
  const oggi = useOggi()
  const nav = useNavigate()

  const usaProgramma = async (nome: string, p: ProfiloUtente | null) => {
    const piano = creaPiano({ nome, origine: 'profilo', obiettivi: p?.obiettivi ?? ['forza', 'resistenza', 'stabilita'], programma: p?.programma ?? programmaJson, inizio: oggi })
    await salvaPiano(piano, true)
    nav('/scheda')
  }

  return (
    <div>
      <PageHeader back="/schede" title="Profili" subtitle="Scegli un profilo per creare la scheda" />
      <SectionTitle>Standard</SectionTitle>
      <div className="space-y-2">
        {PROFILI.map((p) => (
          <Link key={p.id} to={`/questionario?profilo=${p.id}`} className="block">
            <Card className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{p.nome}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.risposte.obiettivi.map((o) => (
                    <Badge key={o} tone="accent">
                      {NOMI_OBIETTIVI[o]}
                    </Badge>
                  ))}
                  <Badge>{p.risposte.giorni.length} giorni</Badge>
                  <Badge>{testoDurata(p.risposte.durataMin)}</Badge>
                  {p.risposte.corsa && <Badge tone="blue">corsa</Badge>}
                </div>
                <div className="mt-1 truncate text-xs text-zinc-500">{[...(p.risposte.corpoLibero !== false ? ['Corpo libero'] : []), ...p.risposte.attrezzi.map((a) => NOMI_ATTREZZI[a])].join(', ')}</div>
              </div>
              <Icon name="chevron" className="size-5 shrink-0 text-zinc-400" />
            </Card>
          </Link>
        ))}
        <Card className="flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold">Piano originale</div>
            <div className="text-xs text-zinc-500">5 giorni · pista, palestra, tennis e mobilità</div>
          </div>
          <Button onClick={() => usaProgramma('Piano originale', null)}>Usa</Button>
        </Card>
      </div>

      <SectionTitle>I miei profili</SectionTitle>
      <div className="space-y-2">
        {miei.map((p) => (
          <ProfiloMio key={p.id} p={p} onUsa={() => usaProgramma(p.nome, p)} />
        ))}
        <NuovoProfilo />
      </div>
    </div>
  )
}

/** "+" in fondo all'elenco: crea un profilo con il questionario, da un'AI o da una scheda esistente. */
function NuovoProfilo() {
  const [aperto, setAperto] = useState(false)
  const [daScheda, setDaScheda] = useState(false)
  const piani = useLiveQuery(async () => (await db.piani.toArray()).sort((a, b) => b.creato.localeCompare(a.creato))) ?? []
  const [salvati, setSalvati] = useState<string[]>([])

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 py-4 font-semibold text-zinc-500 active:bg-zinc-100 dark:border-zinc-700 dark:active:bg-zinc-800"
      >
        <Icon name="plus" className="size-6" /> Nuovo profilo
      </button>
    )
  }

  const voce = 'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold active:bg-zinc-100 dark:active:bg-zinc-800'
  return (
    <Card className="p-2">
      <div className="flex items-center justify-between px-2 pt-1">
        <span className="font-semibold">Nuovo profilo</span>
        <button type="button" onClick={() => setAperto(false)} className="flex size-9 items-center justify-center rounded-lg text-zinc-400" aria-label="Chiudi">
          <Icon name="close" className="size-5" />
        </button>
      </div>
      <Link to="/questionario?per=profilo" className={voce}>
        <Icon name="plus" className="size-5 text-accent" />
        <span className="flex-1">Con il questionario</span>
        <Icon name="chevron" className="size-5 text-zinc-400" />
      </Link>
      <Link to="/scheda-ai?per=profilo" className={voce}>
        <Icon name="spark" className="size-5 text-accent" />
        <span className="flex-1">Da un'AI</span>
        <Icon name="chevron" className="size-5 text-zinc-400" />
      </Link>
      <button type="button" onClick={() => setDaScheda(!daScheda)} className={voce} disabled={piani.length === 0}>
        <Icon name="copy" className="size-5 text-accent" />
        <span className="flex-1">Da una mia scheda{piani.length === 0 && <span className="block text-xs font-normal text-zinc-400">Nessuna scheda</span>}</span>
        <Icon name="chevron" className={`size-5 text-zinc-400 transition-transform ${daScheda ? 'rotate-90' : ''}`} />
      </button>
      {daScheda && (
        <div className="space-y-1 px-2 pb-2">
          {piani.map((p) => {
            const fatto = salvati.includes(p.id)
            return (
              <div key={p.id} className="flex items-center gap-2 rounded-xl bg-zinc-100 py-1.5 pl-3 pr-1.5 dark:bg-zinc-800">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.nome}</span>
                <Button
                  variant={fatto ? 'secondary' : 'primary'}
                  className="h-9 px-3 text-sm"
                  disabled={fatto}
                  onClick={async () => {
                    await salvaProfilo({ id: uuid(), nome: p.nome, obiettivi: p.obiettivi, creato: new Date().toISOString(), programma: p.programma })
                    setSalvati((x) => [...x, p.id])
                  }}
                >
                  {fatto ? <Icon name="check" className="size-4" /> : <Icon name="plus" className="size-4" />}
                  {fatto ? 'Aggiunto' : 'Aggiungi'}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function ProfiloMio({ p, onUsa }: { p: ProfiloUtente; onUsa: () => void }) {
  const [conferma, setConferma] = useState(false)
  return (
    <Card className="flex items-center gap-2 p-3">
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{p.nome}</div>
        <div className="text-xs text-zinc-500">{Object.keys(p.programma.sedute).length} sedute</div>
      </div>
      <Button onClick={onUsa}>Usa</Button>
      {conferma ? (
        <Button variant="danger" onClick={() => eliminaProfilo(p.id)}>
          Elimina
        </Button>
      ) : (
        <button type="button" onClick={() => setConferma(true)} className="flex size-11 items-center justify-center rounded-xl text-zinc-400" aria-label="Elimina profilo">
          <Icon name="trash" className="size-5" />
        </button>
      )}
    </Card>
  )
}
