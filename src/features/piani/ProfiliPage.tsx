import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, PageHeader, SectionTitle } from '../../components/ui'
import { eliminaProfilo, salvaPiano } from '../../db/repositories'
import { db } from '../../db/schema'
import { programma as programmaJson } from '../../domain/data'
import { NOMI_ATTREZZI, NOMI_OBIETTIVI } from '../../domain/generator'
import { creaPiano } from '../../domain/plans'
import { PROFILI } from '../../domain/profili'
import type { ProfiloUtente } from '../../domain/types'
import { useOggi } from '../../hooks'

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
      <PageHeader back="/schede" title="Profili" />
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
                  <Badge>{p.risposte.durataMin} min</Badge>
                  {p.risposte.corsa && <Badge tone="blue">corsa</Badge>}
                </div>
                <div className="mt-1 truncate text-xs text-zinc-500">{p.risposte.attrezzi.length ? p.risposte.attrezzi.map((a) => NOMI_ATTREZZI[a]).join(', ') : 'Corpo libero'}</div>
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

      <SectionTitle>Salvati da te</SectionTitle>
      {miei.length === 0 && <div className="px-1 text-sm text-zinc-400">Nessun profilo</div>}
      <div className="space-y-2">
        {miei.map((p) => (
          <ProfiloMio key={p.id} p={p} onUsa={() => usaProgramma(p.nome, p)} />
        ))}
      </div>
    </div>
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
