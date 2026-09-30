import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, formatData, PageHeader, SectionTitle } from '../../components/ui'
import { aggiornaPiano, attivaPiano, eliminaPiano, salvaPiano, salvaProfilo } from '../../db/repositories'
import { db } from '../../db/schema'
import { NOMI_OBIETTIVI } from '../../domain/generator'
import { creaPiano, scadenza, scaduto, settimanaAssoluta } from '../../domain/plans'
import type { Piano } from '../../domain/types'
import { uuid } from '../../domain/util'
import { useImpostazioni, useOggi, usePianoAttivo } from '../../hooks'
import { AnteprimaProgramma } from './AnteprimaProgramma'
import { EsportaPdfButton } from '../pdf/EsportaPdfButton'

const ORIGINI: Record<Piano['origine'], string> = {
  originale: 'Piano iniziale',
  profilo: 'Da profilo',
  questionario: 'Da questionario',
  adattamento: 'Adattamento',
  copia: 'Copia',
  libera: 'Scheda libera',
}

/** Le mie schede: attiva, archivio, duplica, salva come profilo, elimina. */
export function SchedePage() {
  const piani = useLiveQuery(() => db.piani.toArray()) ?? []
  const imp = useImpostazioni()
  // al primo avvio crea il piano iniziale anche se si arriva direttamente qui
  usePianoAttivo()
  const oggi = useOggi()
  // stato di apertura nell'indirizzo: tornando da un esercizio si ritrova tutto com'era
  const [params, setParams] = useSearchParams()
  const aperto = params.get('scheda')
  const aggiorna = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) (v === null ? n.delete(k) : n.set(k, v))
    setParams(n, { replace: true })
  }
  const ordinati = [...piani].sort((a, b) => Number(b.id === imp?.pianoAttivo) - Number(a.id === imp?.pianoAttivo) || b.creato.localeCompare(a.creato))

  return (
    <div>
      <PageHeader back="/scheda" title="Le mie schede" />
      <div className="grid grid-cols-3 gap-2">
        <Link to="/questionario" className="flex h-24 flex-col justify-center rounded-2xl bg-accent px-3 font-semibold leading-tight text-white">
          <Icon name="plus" className="mb-1 size-6" />
          Questionario
        </Link>
        <Link to="/profili" className="flex h-24 flex-col justify-center rounded-2xl bg-zinc-900 px-3 font-semibold leading-tight text-white dark:bg-white dark:text-zinc-900">
          <Icon name="book" className="mb-1 size-6" />
          Da un profilo
        </Link>
        <Link to="/scheda-libera" className="flex h-24 flex-col justify-center rounded-2xl bg-white px-3 font-semibold leading-tight ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10">
          <Icon name="swap" className="mb-1 size-6 text-accent" />
          Scheda libera
        </Link>
      </div>

      <SectionTitle>Schede</SectionTitle>
      <div className="space-y-2">
        {ordinati.map((p) => (
          <SchedaCard key={p.id} p={p} attiva={p.id === imp?.pianoAttivo} aperta={aperto === p.id} onApri={() => aggiorna({ scheda: aperto === p.id ? null : p.id, sedute: null, seduta: null })} oggi={oggi} vista={params} aggiorna={aggiorna} />
        ))}
      </div>
    </div>
  )
}

function SchedaCard({
  p,
  attiva,
  aperta,
  onApri,
  oggi,
  vista,
  aggiorna,
}: {
  p: Piano
  attiva: boolean
  aperta: boolean
  onApri: () => void
  oggi: string
  vista: URLSearchParams
  aggiorna: (patch: Record<string, string | null>) => void
}) {
  const nav = useNavigate()
  const [nome, setNome] = useState(p.nome)
  const [conferma, setConferma] = useState(false)
  const [salvato, setSalvato] = useState(false)
  const esercizi = vista.get('sedute') === '1'
  const concluso = scaduto(p, oggi)

  return (
    <Card className={`p-3 ${attiva ? 'ring-2 ring-accent' : ''}`}>
      <button type="button" onClick={onApri} className="flex w-full items-start gap-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{p.nome}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {attiva && <Badge tone="green">attiva</Badge>}
            {p.archiviato && <Badge>archiviata</Badge>}
            <Badge>{ORIGINI[p.origine]}</Badge>
            {p.obiettivi.map((o) => (
              <Badge key={o} tone="accent">
                {NOMI_OBIETTIVI[o]}
              </Badge>
            ))}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {formatData(p.inizio, { day: 'numeric', month: 'short', year: 'numeric' })} → {formatData(scadenza(p), { day: 'numeric', month: 'short', year: 'numeric' })}
            {attiva && !concluso && ` · settimana ${Math.min(settimanaAssoluta(p, oggi), p.settimane)} di ${p.settimane}`}
            {concluso && ' · conclusa'}
          </div>
        </div>
        <Icon name="chevron" className={`mt-1 size-5 shrink-0 text-zinc-400 transition-transform ${aperta ? 'rotate-90' : ''}`} />
      </button>
      {aperta && (
        <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <Button className="w-full" onClick={() => aggiorna({ sedute: esercizi ? null : '1', seduta: null })}>
            <Icon name="book" className="size-5" /> {esercizi ? 'Nascondi sedute' : 'Sedute ed esercizi'}
          </Button>
          {esercizi && <AnteprimaProgramma programma={p.programma} settimana={attiva ? Math.min(settimanaAssoluta(p, oggi), p.settimane) : 1} aperta={vista.get('seduta')} onApri={(id) => aggiorna({ seduta: id })} pianoId={p.id} />}
          <div className="flex gap-2">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl bg-zinc-100 px-3 dark:bg-zinc-800" aria-label="Nome della scheda" />
            <Button disabled={!nome.trim() || nome === p.nome} onClick={() => aggiornaPiano(p.id, { nome: nome.trim() })}>
              Rinomina
            </Button>
          </div>
          <EsportaPdfButton piano={p} settimana={attiva ? Math.min(settimanaAssoluta(p, oggi), p.settimane) : 1} sbloccati={[]} className="w-full" />
          <div className="grid grid-cols-2 gap-2">
            {!attiva && (
              <Button variant="primary" onClick={() => attivaPiano(p.id).then(() => nav('/scheda'))}>
                Attiva
              </Button>
            )}
            {attiva && (
              <Button variant="primary" onClick={() => nav('/adatta')}>
                Adatta
              </Button>
            )}
            <Button
              onClick={async () => {
                const c = creaPiano({ nome: `${p.nome} (copia)`, origine: 'copia', obiettivi: p.obiettivi, programma: p.programma, inizio: oggi, derivaDa: p.id })
                c.risposte = p.risposte
                await salvaPiano(c, false)
              }}
            >
              Duplica
            </Button>
            <Button
              disabled={salvato}
              onClick={async () => {
                await salvaProfilo({ id: uuid(), nome: p.nome, obiettivi: p.obiettivi, creato: new Date().toISOString(), programma: p.programma })
                setSalvato(true)
              }}
            >
              {salvato ? 'Salvato' : 'Salva come profilo'}
            </Button>
            {!attiva &&
              (conferma ? (
                <Button variant="danger" onClick={() => eliminaPiano(p.id)}>
                  Conferma
                </Button>
              ) : (
                <Button className="text-red-600" onClick={() => setConferma(true)}>
                  Elimina
                </Button>
              ))}
          </div>
        </div>
      )}
    </Card>
  )
}
