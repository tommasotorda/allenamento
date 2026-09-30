import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Stepper } from '../../components/Stepper'
import { Badge, Button, Card, ExerciseThumb, SectionTitle } from '../../components/ui'
import { aggiornaProgramma } from '../../db/repositories'
import { esercizio } from '../../domain/data'
import {
  bloccoModificato,
  conVoci,
  leggiIntervallo,
  prescrizioneDefault,
  ripristinaBlocco,
  scriviIntervallo,
  sostituisci,
  vociBlocco,
  type Blocco,
} from '../../domain/editing'
import { testoPrescrizione } from '../../domain/progression'
import { isCircuito, type Circuito, type Esercizio, type Prescrizione, type VocePalestra } from '../../domain/types'
import type { Ciclo } from '../../hooks'
import { ExercisePicker } from './ExercisePicker'

type Scelta = { modo: 'aggiungi' } | { modo: 'sostituisci'; indice: number; sub?: number } | { modo: 'aggiungi-circuito'; indice: number }

/** Editor di un blocco della scheda: riordina, aggiungi, togli, sostituisci, cambia le quantita'. */
export function BlockEditor({ titolo, blocco, c }: { titolo: string; blocco: Blocco; c: Ciclo }) {
  const voci = vociBlocco(c.programma, blocco)
  const [aperta, setAperta] = useState<number | null>(null)
  const [scelta, setScelta] = useState<Scelta | null>(null)
  const [conferma, setConferma] = useState(false)
  const modificato = bloccoModificato(c.piano, blocco)

  const salva = async (nuove: VocePalestra[]) => {
    await aggiornaProgramma(c.piano.id, conVoci(c.programma, blocco, nuove))
  }
  const aggiorna = (i: number, v: VocePalestra) => salva(voci.map((x, k) => (k === i ? v : x)))
  const sposta = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= voci.length) return
    const n = [...voci]
    ;[n[i], n[j]] = [n[j], n[i]]
    setAperta(aperta === i ? j : aperta)
    return salva(n)
  }
  const rimuovi = (i: number) => {
    setAperta(null)
    return salva(voci.filter((_, k) => k !== i))
  }
  const ripristina = async () => {
    setConferma(false)
    setAperta(null)
    await aggiornaProgramma(c.piano.id, ripristinaBlocco(c.piano, blocco))
  }

  const idsPresenti = voci.flatMap((v) => (isCircuito(v) ? v.esercizi : [v.esercizioId]))

  const scegli = (es: Esercizio) => {
    if (!scelta) return
    setScelta(null)
    if (scelta.modo === 'aggiungi') {
      setAperta(voci.length)
      return salva([...voci, prescrizioneDefault(es)])
    }
    if (scelta.modo === 'aggiungi-circuito') {
      const cc = voci[scelta.indice] as Circuito
      return aggiorna(scelta.indice, { ...cc, esercizi: [...cc.esercizi, es.id] })
    }
    const v = voci[scelta.indice]
    if (isCircuito(v)) return aggiorna(scelta.indice, { ...v, esercizi: v.esercizi.map((id, k) => (k === scelta.sub ? es.id : id)) })
    return aggiorna(scelta.indice, sostituisci(v, es))
  }

  return (
    <div>
      <SectionTitle
        right={
          modificato &&
          (conferma ? (
            <span className="flex gap-1">
              <Button variant="danger" className="h-8 px-3 text-xs" onClick={ripristina}>
                Ripristina
              </Button>
              <Button className="h-8 px-3 text-xs" onClick={() => setConferma(false)}>
                No
              </Button>
            </span>
          ) : (
            <button type="button" onClick={() => setConferma(true)} className="text-xs font-semibold text-accent">
              Ripristina originale
            </button>
          ))
        }
      >
        {titolo} {modificato && <Badge tone="accent">modificato</Badge>}
      </SectionTitle>
      <div className="space-y-2">
        {voci.map((v, i) =>
          isCircuito(v) ? (
            <CircuitoEditor
              key={`c${i}`}
              v={v}
              onChange={(n) => aggiorna(i, n)}
              onSostituisci={(sub) => setScelta({ modo: 'sostituisci', indice: i, sub })}
              onAggiungi={() => setScelta({ modo: 'aggiungi-circuito', indice: i })}
              onRimuovi={() => rimuovi(i)}
            />
          ) : (
            <VoceEditor
              key={`${v.esercizioId}-${i}`}
              p={v}
              c={c}
              aperta={aperta === i}
              onApri={() => setAperta(aperta === i ? null : i)}
              onChange={(n) => aggiorna(i, n)}
              onSu={i > 0 ? () => sposta(i, -1) : undefined}
              onGiu={i < voci.length - 1 ? () => sposta(i, 1) : undefined}
              onSostituisci={() => setScelta({ modo: 'sostituisci', indice: i })}
              onRimuovi={() => rimuovi(i)}
            />
          ),
        )}
      </div>
      <Button className="mt-2 w-full" onClick={() => setScelta({ modo: 'aggiungi' })}>
        <Icon name="plus" className="size-5" /> Aggiungi esercizio
      </Button>

      {scelta && (
        <ExercisePicker
          titolo={scelta.modo === 'sostituisci' ? `Sostituisci ${esercizio(idDaSostituire(voci, scelta)).nome}` : 'Aggiungi esercizio'}
          sostituisci={scelta.modo === 'sostituisci' ? idDaSostituire(voci, scelta) : undefined}
          esclusi={idsPresenti}
          onScegli={scegli}
          onChiudi={() => setScelta(null)}
        />
      )}
    </div>
  )
}

function idDaSostituire(voci: VocePalestra[], s: Scelta & { modo: 'sostituisci' }): string {
  const v = voci[s.indice]
  return isCircuito(v) ? v.esercizi[s.sub ?? 0] : v.esercizioId
}

function IconBtn({ icon, label, onClick, danger }: { icon: 'back' | 'chevron' | 'swap' | 'trash' | 'plus'; label: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      title={label}
      className={`flex size-10 items-center justify-center rounded-xl bg-zinc-100 disabled:opacity-30 dark:bg-zinc-800 ${danger ? 'text-red-600' : ''}`}
    >
      <Icon name={icon} className={`size-5 ${icon === 'back' ? 'rotate-90' : icon === 'chevron' ? 'rotate-90' : ''}`} />
    </button>
  )
}

function VoceEditor({
  p,
  c,
  aperta,
  onApri,
  onChange,
  onSu,
  onGiu,
  onSostituisci,
  onRimuovi,
}: {
  p: Prescrizione
  c: Ciclo
  aperta: boolean
  onApri: () => void
  onChange: (p: Prescrizione) => void
  onSu?: () => void
  onGiu?: () => void
  onSostituisci: () => void
  onRimuovi: () => void
}) {
  const es = esercizio(p.esercizioId)

  return (
    <Card className="p-2">
      <button type="button" onClick={onApri} className="flex w-full items-center gap-3 text-left">
        <ExerciseThumb id={es.id} className="size-12" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{es.nome}</div>
          <div className="text-sm text-zinc-500">{testoPrescrizione(p, c.fase, es)}</div>
        </div>
        <Icon name="chevron" className={`size-5 shrink-0 text-zinc-400 transition-transform ${aperta ? 'rotate-90' : ''}`} />
      </button>
      {aperta && (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <PrescrizioneForm p={p} onChange={onChange} />
          <div className="mt-3 flex gap-2">
            <IconBtn icon="back" label="Sposta su" onClick={onSu} />
            <IconBtn icon="chevron" label="Sposta giù" onClick={onGiu} />
            <Button className="h-10 flex-1" onClick={onSostituisci}>
              <Icon name="swap" className="size-5" /> Sostituisci
            </Button>
            <IconBtn icon="trash" label="Rimuovi" onClick={onRimuovi} danger />
          </div>
        </div>
      )}
    </Card>
  )
}

/** Serie, ripetizioni, durata, distanza, recupero e opzioni di una prescrizione. */
export function PrescrizioneForm({ p, onChange }: { p: Prescrizione; onChange: (p: Prescrizione) => void }) {
  const es = esercizio(p.esercizioId)
  const reps = leggiIntervallo(p.ripetizioni)
  const durata = leggiIntervallo(p.durataSec)
  const set = (patch: Partial<Prescrizione>) => onChange({ ...p, ...patch })
  return (
    <div>
      <div className="grid grid-cols-2 justify-items-center gap-y-3">
        <Stepper label="serie" value={p.serie ?? 1} onChange={(v) => set({ serie: v ?? 1 })} step={1} min={1} max={12} />
        <Stepper label="recupero" unit="sec" value={p.recuperoSec ?? null} onChange={(v) => set({ recuperoSec: v ?? undefined })} step={15} max={600} start={60} />
        {p.ripetizioni !== undefined &&
          (reps ? (
            <>
              <Stepper label="rip da" value={reps.min} onChange={(v) => set({ ripetizioni: scriviIntervallo(v ?? 1, Math.max(v ?? 1, reps.max), reps.resto) })} step={1} min={1} max={100} />
              <Stepper label="rip a" value={reps.max} onChange={(v) => set({ ripetizioni: scriviIntervallo(Math.min(reps.min, v ?? reps.min), v ?? reps.min, reps.resto) })} step={1} min={1} max={100} />
            </>
          ) : (
            <div className="col-span-2 flex items-center gap-2 text-sm">
              <span className="text-zinc-500">Ripetizioni: {p.ripetizioni}</span>
              <Button className="h-9 px-3 text-sm" onClick={() => set({ ripetizioni: '10' })}>
                Usa numero
              </Button>
            </div>
          ))}
        {p.durataSec !== undefined && durata && (
          <Stepper
            label="durata"
            unit="sec"
            value={durata.min}
            onChange={(v) => set({ durataSec: durata.resto ? `${v ?? 5}${durata.resto}` : (v ?? 5) })}
            step={5}
            min={5}
            max={3600}
          />
        )}
        {p.distanzaM !== undefined && <Stepper label="distanza" unit="m" value={p.distanzaM} onChange={(v) => set({ distanzaM: v ?? 5 })} step={5} min={5} max={1000} />}
      </div>
      {reps && p.ripetizioni !== undefined && (
        <label className="mt-3 flex items-center justify-between rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium dark:bg-zinc-800">
          Per lato
          <input
            type="checkbox"
            className="size-5 accent-orange-500"
            checked={reps.resto.includes('per lato')}
            onChange={(e) => set({ ripetizioni: scriviIntervallo(reps.min, reps.max, e.target.checked ? ' per lato' + reps.resto : reps.resto.replace(' per lato', '')) })}
          />
        </label>
      )}
      {es.tipoRegistrazione === 'carico_ripetizioni' && (
        <label className="mt-2 flex items-center justify-between rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium dark:bg-zinc-800">
          RPE e ripetizioni della fase
          <input type="checkbox" className="size-5 accent-orange-500" checked={p.rpe === 'fase'} onChange={(e) => set({ rpe: e.target.checked ? 'fase' : undefined })} />
        </label>
      )}
    </div>
  )
}

function CircuitoEditor({
  v,
  onChange,
  onSostituisci,
  onAggiungi,
  onRimuovi,
}: {
  v: Circuito
  onChange: (c: Circuito) => void
  onSostituisci: (sub: number) => void
  onAggiungi: () => void
  onRimuovi: () => void
}) {
  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Circuito</span>
        <IconBtn icon="trash" label="Rimuovi circuito" onClick={onRimuovi} danger />
      </div>
      <div className="grid grid-cols-2 justify-items-center gap-y-3 sm:grid-cols-3">
        <Stepper label="giri" value={v.giri} onChange={(n) => onChange({ ...v, giri: n ?? 1 })} step={1} min={1} max={10} />
        <Stepper label="lavoro" unit="sec" value={v.lavoroSec} onChange={(n) => onChange({ ...v, lavoroSec: n ?? 10 })} step={5} min={5} max={300} />
        <Stepper label="pausa" unit="sec" value={v.pausaSec} onChange={(n) => onChange({ ...v, pausaSec: n ?? 0 })} step={5} min={0} max={300} />
      </div>
      <div className="mt-3 space-y-1">
        {v.esercizi.map((id, k) => (
          <div key={`${id}-${k}`} className="flex items-center gap-2">
            <ExerciseThumb id={id} className="size-11" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{esercizio(id).nome}</span>
            <IconBtn icon="swap" label="Sostituisci" onClick={() => onSostituisci(k)} />
            <IconBtn icon="trash" label="Rimuovi" onClick={v.esercizi.length > 1 ? () => onChange({ ...v, esercizi: v.esercizi.filter((_, j) => j !== k) }) : undefined} danger />
          </div>
        ))}
      </div>
      <Button className="mt-2 h-10 w-full text-sm" onClick={onAggiungi}>
        <Icon name="plus" className="size-4" /> Aggiungi al circuito
      </Button>
    </Card>
  )
}
