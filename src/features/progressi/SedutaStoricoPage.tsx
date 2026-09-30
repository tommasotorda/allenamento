import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Stepper } from '../../components/Stepper'
import { Button, Card, formatData, PageHeader, SectionTitle } from '../../components/ui'
import { aggiornaSeduta, eliminaSeduta, eliminaSerie, salvaSerie } from '../../db/repositories'
import { db } from '../../db/schema'
import { esercizio, programma } from '../../domain/data'
import { nomeSedutaLog } from '../../domain/session'
import type { SedutaLog } from '../../domain/types'
import { useImpostazioni } from '../../hooks'
import { durataMin } from '../oggi/Riepilogo'
import { riassunto, SetRow } from '../oggi/SetRow'

/** Seduta passata: sola lettura, con modalita' modifica ed eliminazione. */
export function SedutaStoricoPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const imp = useImpostazioni()
  const seduta = useLiveQuery(() => db.sedute.get(id), [id])
  const serie = useLiveQuery(() => db.serie.where('sedutaId').equals(id).toArray(), [id]) ?? []
  const [modifica, setModifica] = useState(false)
  const [conferma, setConferma] = useState(false)
  if (!seduta || !imp) return null

  const perEsercizio = new Map<string, typeof serie>()
  for (const s of [...serie].sort((a, b) => a.numero - b.numero)) perEsercizio.set(s.esercizioId, [...(perEsercizio.get(s.esercizioId) ?? []), s])
  const d = durataMin(seduta.inizio, seduta.fine)
  const setPista = (k: keyof SedutaLog['pista']) => (v: number | null) => aggiornaSeduta(seduta.id, { pista: { ...seduta.pista, [k]: v } })
  const haPista = !!programma.sedute[seduta.templateId]?.pista || Object.values(seduta.pista).some((v) => v !== null)

  return (
    <div>
      <PageHeader
        back="/progressi?tab=storico"
        title={nomeSedutaLog(seduta, programma)}
        subtitle={`${formatData(seduta.data, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · sett. ${seduta.settimanaCiclo}${d !== null ? ` · ${d} min` : ''}`}
        right={
          <Button variant={modifica ? 'primary' : 'secondary'} onClick={() => setModifica((m) => !m)}>
            {modifica ? 'Fine' : 'Modifica'}
          </Button>
        }
      />

      {haPista && (
        <>
          <SectionTitle>Pista</SectionTitle>
          {modifica ? (
            <Card className="grid grid-cols-2 gap-y-3">
              <Stepper label="durata" unit="min" value={seduta.pista.durataMin} onChange={setPista('durataMin')} step={1} start={30} />
              <Stepper label="distanza" unit="m" value={seduta.pista.distanzaM} onChange={setPista('distanzaM')} step={100} start={3000} max={50000} />
              <Stepper label="FC media" unit="bpm" value={seduta.pista.fcMedia} onChange={setPista('fcMedia')} step={1} start={140} max={220} />
              <Stepper label="ripetute" value={seduta.pista.ripetuteFatte} onChange={setPista('ripetuteFatte')} step={1} start={4} max={50} />
            </Card>
          ) : (
            <Card className="text-sm tabular-nums">
              {[
                seduta.pista.durataMin !== null && `${seduta.pista.durataMin} min`,
                seduta.pista.distanzaM !== null && `${seduta.pista.distanzaM} m`,
                seduta.pista.fcMedia !== null && `FC ${seduta.pista.fcMedia} bpm`,
                seduta.pista.ripetuteFatte !== null && `${seduta.pista.ripetuteFatte} ripetute`,
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            </Card>
          )}
        </>
      )}

      {(seduta.tennisMin !== null || (seduta.templateId === 'mer' && (seduta.pianoId ?? 'originale') === 'originale')) && (
        <>
          <SectionTitle>Tennis</SectionTitle>
          <Card className="flex justify-center">
            {modifica ? <Stepper label="minuti" value={seduta.tennisMin} onChange={(v) => aggiornaSeduta(seduta.id, { tennisMin: v })} step={5} start={60} /> : <span>{seduta.tennisMin ?? '—'} min</span>}
          </Card>
        </>
      )}

      <SectionTitle>Serie</SectionTitle>
      {perEsercizio.size === 0 && <div className="px-1 text-sm text-zinc-400">Nessuna serie</div>}
      <div className="space-y-3">
        {[...perEsercizio.entries()].map(([eid, ss]) => {
          const es = esercizio(eid)
          return (
            <Card key={eid} className="p-3">
              <div className="mb-2 font-semibold">{es.nome}</div>
              <div className="space-y-2">
                {ss.map((s) =>
                  modifica ? (
                    <SetRow
                      key={s.id}
                      etichetta={`${s.numero}${s.lato ? ` ${s.lato}` : ''}`}
                      tipo={es.tipoRegistrazione}
                      iniziale={s}
                      salvata={s}
                      incrementoKg={imp.incrementoCaricoKg}
                      conRpe={es.categoria !== 'mobilita'}
                      onConferma={(b) => salvaSerie({ ...s, ...b })}
                      onElimina={() => eliminaSerie(s.id)}
                    />
                  ) : (
                    <div key={s.id} className="flex gap-3 text-sm tabular-nums">
                      <span className="w-10 text-zinc-500">
                        {s.numero}
                        {s.lato ? ` ${s.lato}` : ''}
                      </span>
                      <span>{riassunto(es.tipoRegistrazione, s)}</span>
                    </div>
                  ),
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {modifica && (
        <div className="mt-8 text-center">
          {conferma ? (
            <div className="flex justify-center gap-2">
              <Button
                variant="danger"
                onClick={async () => {
                  await eliminaSeduta(seduta.id)
                  nav('/progressi?tab=storico', { replace: true })
                }}
              >
                Elimina seduta
              </Button>
              <Button onClick={() => setConferma(false)}>No</Button>
            </div>
          ) : (
            <Button variant="ghost" className="text-red-600" onClick={() => setConferma(true)}>
              Elimina seduta
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
