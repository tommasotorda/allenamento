import { Link } from 'react-router-dom'
import { Badge, Card, ExerciseThumb, SectionTitle } from '../../components/ui'
import { esercizio } from '../../domain/data'
import { testoPrescrizione } from '../../domain/progression'
import type { StrutturaSeduta } from '../../domain/session'
import { isCircuito, type Fase, type Prescrizione } from '../../domain/types'

function Riga({ p, fase }: { p: Prescrizione; fase: Fase }) {
  const es = esercizio(p.esercizioId)
  return (
    <Link to={`/esercizi/${es.id}`} className="flex items-center gap-3 py-2">
      <ExerciseThumb id={es.id} className="size-14" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{es.nome}</div>
        <div className="text-sm text-zinc-500">{testoPrescrizione(p, fase, es)}</div>
        {(p.alternativa || p.superserieCon) && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {p.alternativa && <Badge>alt: {esercizio(p.alternativa).nome}</Badge>}
            {p.superserieCon && <Badge tone="blue">superserie: {esercizio(p.superserieCon).nome}</Badge>}
          </div>
        )}
      </div>
    </Link>
  )
}

/** Elenco in sola lettura di una seduta, con prescrizioni della fase. */
export function SessionPreview({ s, fase }: { s: StrutturaSeduta; fase: Fase }) {
  return (
    <div>
      {s.core && (
        <>
          <SectionTitle>Core · variante {s.core.variante}</SectionTitle>
          <Card className="divide-y divide-zinc-100 py-1 dark:divide-zinc-800">
            {s.core.voci.map((p) => (
              <Riga key={p.esercizioId} p={p} fase={fase} />
            ))}
          </Card>
        </>
      )}
      {s.pista && (
        <>
          <SectionTitle>Pista</SectionTitle>
          <Card>
            <Link to={`/esercizi/${s.pista.esercizioId}`} className="flex items-center gap-3">
              <ExerciseThumb id={s.pista.esercizioId} className="size-14" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{s.pista.scarico ? 'Corsa in Zona 2' : esercizio(s.pista.esercizioId).nome}</div>
                {s.pista.ripetute !== null && <Badge tone="accent">{s.pista.ripetute} ripetute</Badge>}
              </div>
            </Link>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{s.pista.testo}</p>
          </Card>
        </>
      )}
      {s.attivita && (
        <>
          <SectionTitle>Tennis</SectionTitle>
          <Card className="font-semibold">{s.attivita.durataMin} min</Card>
        </>
      )}
      {s.palestra.length > 0 && (
        <>
          <SectionTitle>Palestra</SectionTitle>
          <Card className="divide-y divide-zinc-100 py-1 dark:divide-zinc-800">
            {s.palestra.map((v, i) =>
              isCircuito(v) ? (
                <div key={i} className="py-2">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    Circuito
                    <Badge>
                      {v.giri} giri · {v.lavoroSec} s / {v.pausaSec} s
                    </Badge>
                  </div>
                  {v.esercizi.map((id) => (
                    <Link key={id} to={`/esercizi/${id}`} className="flex items-center gap-3 py-1">
                      <ExerciseThumb id={id} className="size-12" />
                      <span className="font-medium">{esercizio(id).nome}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <Riga key={v.esercizioId} p={v} fase={fase} />
              ),
            )}
          </Card>
        </>
      )}
      {s.mobilita.length > 0 && (
        <>
          <SectionTitle>Mobilità</SectionTitle>
          <Card className="divide-y divide-zinc-100 py-1 dark:divide-zinc-800">
            {s.mobilita.map((p) => (
              <Riga key={p.esercizioId} p={p} fase={fase} />
            ))}
          </Card>
        </>
      )}
    </div>
  )
}
