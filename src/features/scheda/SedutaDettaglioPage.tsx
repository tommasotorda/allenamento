import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, PageHeader } from '../../components/ui'
import { aggiornaProgramma, iniziaSeduta, sedutaAperta } from '../../db/repositories'
import { NOMI_GIORNI } from '../../domain/data'
import { elencoSedute, strutturaSeduta } from '../../domain/session'
import type { Seduta } from '../../domain/types'
import { useCiclo, type Ciclo } from '../../hooks'
import { BlockEditor } from './BlockEditor'
import { SessionPreview } from './SessionPreview'

export function SedutaDettaglioPage() {
  const { giorno } = useParams()
  const [params, setParams] = useSearchParams()
  const modifica = params.get('modifica') === '1'
  const c = useCiclo()
  const nav = useNavigate()
  if (!c || !giorno || !c.programma.sedute[giorno]) return null
  const g = giorno
  const s = strutturaSeduta(c.programma, g, c.settimana, c.fase, c.impostazioni.sbloccati)
  const sed = c.programma.sedute[g]
  const giorni = c.programma.settimana.filter((x) => x.sedutaId === g).map((x) => NOMI_GIORNI[x.giorno])

  return (
    <div>
      <PageHeader
        back="/scheda"
        title={s.nome}
        subtitle={[giorni.join(', '), c.fase.nome].filter(Boolean).join(' · ')}
        right={
          <Button variant={modifica ? 'primary' : 'secondary'} onClick={() => setParams(modifica ? {} : { modifica: '1' }, { replace: true })}>
            {modifica ? 'Fine' : 'Modifica'}
          </Button>
        }
      />

      {modifica ? (
        <>
          <ImpostaSeduta c={c} sedutaId={g} />
          {sed.core && (
            <>
              <BlockEditor titolo="Core · variante A" blocco={{ tipo: 'core', variante: 'A' }} c={c} />
              <BlockEditor titolo="Core · variante B" blocco={{ tipo: 'core', variante: 'B' }} c={c} />
            </>
          )}
          {s.pista && (
            <Card className="mt-6 text-sm text-zinc-500">
              <b className="text-zinc-900 dark:text-zinc-100">Pista:</b> {s.pista.testo}
            </Card>
          )}
          <BlockEditor titolo="Palestra" blocco={{ tipo: 'palestra', sedutaId: g }} c={c} />
          <BlockEditor titolo="Mobilità e defaticamento" blocco={{ tipo: 'mobilita', sedutaId: g }} c={c} />
        </>
      ) : (
        <>
          <Button
            variant="primary"
            big
            className="mt-2 w-full"
            onClick={async () => {
              if (!(await sedutaAperta(c.oggi))) await iniziaSeduta(c.piano, g, c.settimana, c.oggi)
              nav('/')
            }}
          >
            Avvia questa seduta
          </Button>
          <SessionPreview s={s} fase={c.fase} programma={c.programma} pianoId={c.piano.id} />
        </>
      )}
    </div>
  )
}

/** Modifica: passaggio rapido tra le sedute, nome della seduta, blocco core. */
function ImpostaSeduta({ c, sedutaId }: { c: Ciclo; sedutaId: string }) {
  const sed = c.programma.sedute[sedutaId]
  const [nome, setNome] = useState(sed.nome)
  useEffect(() => setNome(sed.nome), [sed.nome, sedutaId])
  const aggiorna = (patch: Partial<Seduta>) => aggiornaProgramma(c.piano.id, { ...c.programma, sedute: { ...c.programma.sedute, [sedutaId]: { ...sed, ...patch } } })
  const sedute = elencoSedute(c.programma)
  return (
    <div>
      {sedute.length > 1 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {sedute.map((x) => (
            <Link key={x.sedutaId} to={`/scheda/${x.sedutaId}?modifica=1`} replace className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold leading-9 ${x.sedutaId === sedutaId ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}>
              {x.giorni.length ? x.giorni.map((g) => NOMI_GIORNI[g].slice(0, 3)).join('·') : x.nome}
            </Link>
          ))}
        </div>
      )}
      <Card className="space-y-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Nome della seduta</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={() => nome.trim() && nome.trim() !== sed.nome && aggiorna({ nome: nome.trim() })}
            className="mt-1 h-11 w-full rounded-xl bg-zinc-100 px-3 font-semibold dark:bg-zinc-800"
          />
        </label>
        <label className="flex items-center justify-between text-sm font-medium">
          Blocco core a inizio seduta
          <input type="checkbox" className="size-5 accent-orange-500" checked={!!sed.core} onChange={(e) => aggiorna({ core: e.target.checked })} />
        </label>
      </Card>
    </div>
  )
}
