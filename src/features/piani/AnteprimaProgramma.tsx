import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Card } from '../../components/ui'
import { NOMI_GIORNI } from '../../domain/data'
import { elencoSedute, strutturaSeduta } from '../../domain/session'
import { isCircuito, type Programma } from '../../domain/types'
import { SessionPreview } from '../scheda/SessionPreview'

/** Sedute di un programma non ancora attivo, espandibili una alla volta. */
export function AnteprimaProgramma({
  programma,
  settimana = 1,
  aperta: apertaEsterna,
  onApri,
  pianoId,
}: {
  programma: Programma
  settimana?: number
  /** piano salvato: gli esercizi si possono modificare dalla loro pagina */
  pianoId?: string
  /** stato controllato dall'esterno (es. nell'indirizzo, per ritrovarlo tornando indietro) */
  aperta?: string | null
  onApri?: (id: string | null) => void
}) {
  const [apertaInterna, setApertaInterna] = useState<string | null>(null)
  const aperta = onApri ? (apertaEsterna ?? null) : apertaInterna
  const setAperta = onApri ?? setApertaInterna
  const fase = programma.fasi.find((f) => f.settimane.includes(settimana)) ?? programma.fasi[0]
  return (
    <div className="mt-4 space-y-2">
      {elencoSedute(programma).map((x) => {
        const s = programma.sedute[x.sedutaId]
        // tutti gli esercizi della seduta, come nel numero scelto nel questionario
        const n = (s.riscaldamento?.length ?? 0) + (s.core ? programma.blocco_core.varianteA.length : 0) + (s.palestra ?? []).reduce((t, v) => t + (isCircuito(v) ? v.esercizi.length : 1), 0) + (s.mobilita?.length ?? 0)
        return (
          <Card key={x.sedutaId} className="p-3">
            <button type="button" onClick={() => setAperta(aperta === x.sedutaId ? null : x.sedutaId)} className="flex w-full items-center gap-3 text-left">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{s.nome}</div>
                <div className="text-sm text-zinc-500">
                  {x.giorni.map((g) => NOMI_GIORNI[g]).join(', ')} · {n} esercizi{s.pista ? ' · pista' : ''}{s.attivita ? ` · ${s.attivita.tipo} ${s.attivita.durataMin} min` : ''}
                </div>
              </div>
              <Icon name="chevron" className={`size-5 text-zinc-400 transition-transform ${aperta === x.sedutaId ? 'rotate-90' : ''}`} />
            </button>
            {aperta === x.sedutaId && <SessionPreview s={strutturaSeduta(programma, x.sedutaId, settimana, fase, [])} fase={fase} programma={programma} pianoId={pianoId} />}
          </Card>
        )
      })}
    </div>
  )
}
