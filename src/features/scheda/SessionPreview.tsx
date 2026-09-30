import { Badge, Card, ExerciseThumb, SectionTitle } from '../../components/ui'
import { esercizio } from '../../domain/data'
import { testoPrescrizione } from '../../domain/progression'
import { etichetteSuperserie, nomeAttivita, type StrutturaSeduta } from '../../domain/session'
import { isCircuito, type Fase, type Prescrizione, type Programma } from '../../domain/types'
import { LinkEsercizio, listaDaSeduta, type StatoLista } from '../esercizi/lista'

type Lista = Omit<StatoLista, 'pos'>

function Riga({ p, fase, lista, pos, ss }: { p: Prescrizione; fase: Fase; lista: Lista; pos: number; ss?: string }) {
  const es = esercizio(p.esercizioId)
  return (
    <LinkEsercizio lista={lista} pos={pos} className="flex items-center gap-3 py-2">
      <ExerciseThumb id={es.id} className="size-14" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {ss && <Badge tone="blue">{ss}</Badge>}
          <span className="truncate font-semibold">{es.nome}</span>
        </div>
        <div className="text-sm text-zinc-500">{testoPrescrizione(p, fase, es)}</div>
        {(p.alternativa || p.superserieCon) && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {p.alternativa && <Badge>alt: {esercizio(p.alternativa).nome}</Badge>}
            {p.superserieCon && <Badge tone="blue">superserie: {esercizio(p.superserieCon).nome}</Badge>}
          </div>
        )}
      </div>
    </LinkEsercizio>
  )
}

/** Elenco in sola lettura di una seduta, con prescrizioni della fase. */
export function SessionPreview({ s, fase, programma, pianoId }: { s: StrutturaSeduta; fase: Fase; programma?: Programma; pianoId?: string }) {
  // lista per scorrere tra gli esercizi dalla loro pagina; modificabile se si conosce il piano
  const lista: Lista = { titolo: s.nome, voci: listaDaSeduta(pianoId ? programma : undefined, s), pianoId }
  let k = 0
  const pos = () => k++
  const ss = etichetteSuperserie(s.palestra)
  return (
    <div>
      {s.riscaldamento.length > 0 && (
        <>
          <SectionTitle>Riscaldamento</SectionTitle>
          <Card className="divide-y divide-zinc-100 py-1 dark:divide-zinc-800">
            {s.riscaldamento.map((p) => (
              <Riga key={p.esercizioId} p={p} fase={fase} lista={lista} pos={pos()} />
            ))}
          </Card>
        </>
      )}
      {s.core && (
        <>
          <SectionTitle>Core · variante {s.core.variante}</SectionTitle>
          <Card className="divide-y divide-zinc-100 py-1 dark:divide-zinc-800">
            {s.core.voci.map((p) => (
              <Riga key={p.esercizioId} p={p} fase={fase} lista={lista} pos={pos()} />
            ))}
          </Card>
        </>
      )}
      {s.pista && (
        <>
          <SectionTitle>Pista</SectionTitle>
          <Card>
            <LinkEsercizio lista={lista} pos={pos()} className="flex items-center gap-3">
              <ExerciseThumb id={s.pista.esercizioId} className="size-14" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{s.pista.scarico ? 'Corsa in Zona 2' : esercizio(s.pista.esercizioId).nome}</div>
                {s.pista.ripetute !== null && <Badge tone="accent">{s.pista.ripetute} ripetute</Badge>}
              </div>
            </LinkEsercizio>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{s.pista.testo}</p>
          </Card>
        </>
      )}
      {s.attivita && (
        <>
          <SectionTitle>{nomeAttivita(s.attivita.tipo)}</SectionTitle>
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
                    <LinkEsercizio key={id} lista={lista} pos={pos()} className="flex items-center gap-3 py-1">
                      <ExerciseThumb id={id} className="size-12" />
                      <span className="font-medium">{esercizio(id).nome}</span>
                    </LinkEsercizio>
                  ))}
                </div>
              ) : (
                <Riga key={v.esercizioId} p={v} fase={fase} lista={lista} pos={pos()} ss={ss.get(i)?.etichetta} />
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
              <Riga key={p.esercizioId} p={p} fase={fase} lista={lista} pos={pos()} />
            ))}
          </Card>
        </>
      )}
    </div>
  )
}
