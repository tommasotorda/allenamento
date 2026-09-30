import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Button, PageHeader, SectionTitle } from '../../components/ui'
import { eliminaSeduta, terminaSeduta } from '../../db/repositories'
import { db } from '../../db/schema'
import { faseDellaSettimana } from '../../domain/calendar'
import { programma } from '../../domain/data'
import { strutturaSeduta } from '../../domain/session'
import { isCircuito, type SedutaLog } from '../../domain/types'
import type { Ciclo } from '../../hooks'
import { CircuitLog } from './CircuitLog'
import { ExerciseLog } from './ExerciseLog'
import { PistaLog, TennisLog } from './PistaLog'
import { listaDaSeduta, type Lista } from '../esercizi/lista'

export function SessioneAttiva({ seduta, ciclo, onFine }: { seduta: SedutaLog; ciclo: Ciclo; onFine: (id: string) => void }) {
  const fase = faseDellaSettimana(programma, seduta.settimanaCiclo)
  const s = strutturaSeduta(ciclo.programma, seduta.templateId, seduta.settimanaCiclo, fase, ciclo.impostazioni.sbloccati)
  const serie = useLiveQuery(() => db.serie.where('sedutaId').equals(seduta.id).toArray(), [seduta.id]) ?? []
  const [annulla, setAnnulla] = useState(false)
  const inc = ciclo.impostazioni.incrementoCaricoKg

  // lista per scorrere tra gli esercizi della seduta dalla loro pagina (modificabili se il piano e' quello attivo)
  const suoPiano = (seduta.pianoId ?? 'originale') === ciclo.piano.id
  const lista: Lista = { titolo: s.nome, voci: listaDaSeduta(suoPiano ? ciclo.programma : undefined, s), pianoId: suoPiano ? ciclo.piano.id : undefined }
  let k = 0
  const pos = () => k++
  const comune = { sedutaId: seduta.id, data: seduta.data, fase, incrementoKg: inc, serie, lista }

  return (
    <div>
      <PageHeader title={s.nome} subtitle={`Settimana ${seduta.settimanaCiclo} · ${fase.nome}${fase.scarico ? ' · scarico' : ''}`} />

      {s.core && (
        <>
          <SectionTitle>Core · {s.core.variante}</SectionTitle>
          <div className="space-y-3">
            {s.core.voci.map((p) => (
              <ExerciseLog key={p.esercizioId} p={p} {...comune} pos={pos()} />
            ))}
          </div>
        </>
      )}

      {s.pista && (
        <>
          <SectionTitle>Pista</SectionTitle>
          <PistaLog seduta={seduta} pista={s.pista} lista={lista} pos={pos()} />
        </>
      )}

      {s.attivita && (
        <>
          <SectionTitle>Tennis</SectionTitle>
          <TennisLog seduta={seduta} durataMin={s.attivita.durataMin} />
        </>
      )}

      {s.palestra.length > 0 && (
        <>
          <SectionTitle>Palestra</SectionTitle>
          <div className="space-y-3">
            {s.palestra.map((v, i) =>
              isCircuito(v) ? (
                <CircuitLog key={`c${i}`} sedutaId={seduta.id} data={seduta.data} c={v} serie={serie} lista={lista} pos={v.esercizi.map(() => pos())} />
              ) : (
                <ExerciseLog key={v.esercizioId} p={v} {...comune} pos={pos()} />
              ),
            )}
          </div>
        </>
      )}

      {s.mobilita.length > 0 && (
        <>
          <SectionTitle>Mobilità</SectionTitle>
          <div className="space-y-3">
            {s.mobilita.map((p) => (
              <ExerciseLog key={p.esercizioId} p={p} {...comune} pos={pos()} />
            ))}
          </div>
        </>
      )}

      <Button
        variant="primary"
        big
        className="mt-8 w-full"
        onClick={async () => {
          await terminaSeduta(seduta.id)
          onFine(seduta.id)
        }}
      >
        Termina seduta
      </Button>

      <div className="mt-4 text-center">
        {annulla ? (
          <div className="flex justify-center gap-2">
            <Button variant="danger" onClick={() => eliminaSeduta(seduta.id)}>
              Elimina seduta
            </Button>
            <Button onClick={() => setAnnulla(false)}>No</Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setAnnulla(true)}>
            Annulla seduta
          </Button>
        )}
      </div>
    </div>
  )
}
