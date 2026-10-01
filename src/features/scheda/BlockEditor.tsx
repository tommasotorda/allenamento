import { Fragment, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Stepper } from '../../components/Stepper'
import { Badge, Button, Card, ExerciseThumb, SectionTitle } from '../../components/ui'
import { aggiornaProgramma } from '../../db/repositories'
import { esercizio } from '../../domain/data'
import {
  bloccoModificato,
  conVoci,
  impostaSuperserie,
  normalizzaSuperserie,
  prescrizioneDefault,
  ripristinaBlocco,
  sostituisci,
  vociBlocco,
  type Blocco,
} from '../../domain/editing'
import { testoPrescrizione } from '../../domain/progression'
import { etichetteSuperserie } from '../../domain/session'
import { isCircuito, type Circuito, type Esercizio, type Prescrizione, type VocePalestra } from '../../domain/types'
import type { Ciclo } from '../../hooks'
import { ExercisePicker } from './ExercisePicker'
import { PrescrizioneForm } from './PrescrizioneForm'
import { Segnaposto, stessaPosizione, useTrascina } from './Trascina'

type Scelta = { modo: 'aggiungi' } | { modo: 'sostituisci'; indice: number; sub?: number } | { modo: 'aggiungi-circuito'; indice: number }

/** Editor di un blocco della scheda: trascina, aggiungi, togli, sostituisci, superserie, quantita'. */
export function BlockEditor({ titolo, blocco, c }: { titolo: string; blocco: Blocco; c: Ciclo }) {
  const voci = vociBlocco(c.programma, blocco)
  const [aperta, setAperta] = useState<number | null>(null)
  const [scelta, setScelta] = useState<Scelta | null>(null)
  const [conferma, setConferma] = useState(false)
  // superserie in costruzione: la card da cui si parte e quelle scelte
  const [selezione, setSelezione] = useState<{ origine: number; scelti: number[] } | null>(null)
  const t = useTrascina()
  const modificato = bloccoModificato(c.piano, blocco)

  const salva = async (nuove: VocePalestra[]) => {
    await aggiornaProgramma(c.piano.id, conVoci(c.programma, blocco, nuove))
  }
  const aggiorna = (i: number, v: VocePalestra) => salva(voci.map((x, k) => (k === i ? v : x)))
  const rimuovi = (i: number) => {
    setAperta(null)
    return salva(normalizzaSuperserie(voci.filter((_, k) => k !== i)))
  }
  const ripristina = async () => {
    setConferma(false)
    setAperta(null)
    await aggiornaProgramma(c.piano.id, ripristinaBlocco(c.piano, blocco))
  }

  const ss = etichetteSuperserie(voci)
  const conSuperserie = blocco.tipo === 'palestra'
  const idsPresenti = voci.flatMap((v) => (isCircuito(v) ? v.esercizi : [v.esercizioId]))
  const trascinata = (i: number) => !!t?.attiva && stessaPosizione(t.attiva.da, blocco, i)

  const iniziaSuperserie = (i: number) => {
    const v = voci[i]
    if (isCircuito(v)) return
    setAperta(null)
    const membri = v.superserie ? voci.flatMap((x, k) => (k !== i && !isCircuito(x) && x.superserie === v.superserie ? [k] : [])) : []
    setSelezione({ origine: i, scelti: membri })
  }
  const applicaSuperserie = async () => {
    if (!selezione) return
    await salva(impostaSuperserie(voci, selezione.origine, selezione.scelti))
    setSelezione(null)
  }

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

  const origine = selezione ? voci[selezione.origine] : undefined
  const origineInGruppo = !!origine && !isCircuito(origine) && !!origine.superserie

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
      <div data-blocco={JSON.stringify(blocco)} data-n={voci.length} className="space-y-2">
        {voci.map((v, i) => (
          <Fragment key={isCircuito(v) ? `c${i}` : `${v.esercizioId}-${i}`}>
            {stessaPosizione(t?.bersaglio ?? null, blocco, i) && <Segnaposto />}
            <div data-indice={i} className={trascinata(i) ? 'opacity-40' : ''}>
              {isCircuito(v) ? (
                <CircuitoEditor
                  v={v}
                  onTrascina={t ? (e) => t.inizia(e, { da: { blocco, indice: i }, nome: 'Circuito' }) : undefined}
                  onChange={(n) => aggiorna(i, n)}
                  onSostituisci={(sub) => setScelta({ modo: 'sostituisci', indice: i, sub })}
                  onAggiungi={() => setScelta({ modo: 'aggiungi-circuito', indice: i })}
                  onRimuovi={() => rimuovi(i)}
                />
              ) : (
                <VoceEditor
                  p={v}
                  c={c}
                  aperta={aperta === i && !selezione}
                  onApri={() => setAperta(aperta === i ? null : i)}
                  onChange={(n) => aggiorna(i, n)}
                  onSostituisci={() => setScelta({ modo: 'sostituisci', indice: i })}
                  onRimuovi={() => rimuovi(i)}
                  ss={ss.get(i)?.etichetta}
                  onTrascina={t && !selezione ? (e) => t.inizia(e, { da: { blocco, indice: i }, nome: esercizio(v.esercizioId).nome, id: v.esercizioId }) : undefined}
                  onSuperserie={conSuperserie && !selezione ? () => iniziaSuperserie(i) : undefined}
                  selezione={!selezione ? undefined : selezione.origine === i ? 'origine' : selezione.scelti.includes(i) ? 'scelta' : 'libera'}
                  onSeleziona={() =>
                    setSelezione((s) => s && s.origine !== i ? { ...s, scelti: s.scelti.includes(i) ? s.scelti.filter((k) => k !== i) : [...s.scelti, i] } : s)
                  }
                />
              )}
            </div>
          </Fragment>
        ))}
        {stessaPosizione(t?.bersaglio ?? null, blocco, voci.length) && <Segnaposto />}
        <Button className="w-full" onClick={() => setScelta({ modo: 'aggiungi' })}>
          <Icon name="plus" className="size-5" /> Aggiungi esercizio
        </Button>
      </div>

      {selezione && origine && !isCircuito(origine) && (
        <div className="fixed inset-x-0 z-40 px-4 md:left-56" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
          <div className="mx-auto max-w-2xl rounded-2xl bg-sky-600 p-3 text-white shadow-xl">
            <div className="text-sm font-semibold">Superserie con {esercizio(origine.esercizioId).nome}</div>
            <div className="text-xs opacity-80">Tocca gli esercizi da collegare</div>
            <div className="mt-2 flex gap-2">
              <Button className="flex-1 bg-sky-700 text-white active:bg-sky-800 dark:bg-sky-700 dark:text-white" onClick={() => setSelezione(null)}>
                Annulla
              </Button>
              <Button className="flex-[2] bg-white text-sky-700 active:bg-sky-50 dark:bg-white dark:text-sky-700" onClick={applicaSuperserie} disabled={!selezione.scelti.length && !origineInGruppo}>
                <Icon name="link" className="size-5" />
                {selezione.scelti.length ? `Collega ${selezione.scelti.length + 1} esercizi` : origineInGruppo ? 'Sciogli superserie' : 'Collega'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {scelta && (
        <ExercisePicker
          titolo={scelta.modo === 'sostituisci' ? `Sostituisci ${esercizio(idDaSostituire(voci, scelta)).nome}` : 'Aggiungi esercizio'}
          sostituisci={scelta.modo === 'sostituisci' ? idDaSostituire(voci, scelta) : undefined}
          esclusi={idsPresenti}
          onScegli={scegli}
          onChiudi={() => setScelta(null)}
          seduta={scelta.modo === 'aggiungi' ? { voci, fase: c.fase, superserie: conSuperserie, salva } : undefined}
        />
      )}
    </div>
  )
}

function idDaSostituire(voci: VocePalestra[], s: Scelta & { modo: 'sostituisci' }): string {
  const v = voci[s.indice]
  return isCircuito(v) ? v.esercizi[s.sub ?? 0] : v.esercizioId
}

function IconBtn({ icon, label, onClick, danger }: { icon: 'swap' | 'trash' | 'plus'; label: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      title={label}
      className={`flex size-10 items-center justify-center rounded-xl bg-zinc-100 disabled:opacity-30 dark:bg-zinc-800 ${danger ? 'text-red-600' : ''}`}
    >
      <Icon name={icon} className="size-5" />
    </button>
  )
}

/** Maniglia per trascinare la card: tenendola premuta la si sposta dove si vuole. */
function Maniglia({ onTrascina }: { onTrascina: (e: React.PointerEvent) => void }) {
  return (
    <button type="button" onPointerDown={onTrascina} className="flex h-12 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-zinc-400 active:cursor-grabbing active:bg-zinc-100 dark:active:bg-zinc-800" aria-label="Trascina per spostare">
      <Icon name="grip" className="size-5" />
    </button>
  )
}

function VoceEditor({
  p,
  c,
  aperta,
  onApri,
  onChange,
  onSostituisci,
  onRimuovi,
  ss,
  onTrascina,
  onSuperserie,
  selezione,
  onSeleziona,
}: {
  p: Prescrizione
  c: Ciclo
  ss?: string
  aperta: boolean
  onApri: () => void
  onChange: (p: Prescrizione) => void
  onSostituisci: () => void
  onRimuovi: () => void
  onTrascina?: (e: React.PointerEvent) => void
  /** tasto azzurro: avvia la scelta degli esercizi da collegare in superserie */
  onSuperserie?: () => void
  /** durante la scelta della superserie */
  selezione?: 'origine' | 'scelta' | 'libera'
  onSeleziona: () => void
}) {
  const es = esercizio(p.esercizioId)
  const anello = selezione === 'origine' ? 'ring-2! ring-sky-500!' : selezione === 'scelta' ? 'ring-2! ring-sky-400!' : ''

  return (
    <Card className={`p-2 ${anello}`}>
      <div className="flex items-center gap-1">
        {onTrascina && <Maniglia onTrascina={onTrascina} />}
        <button type="button" onClick={selezione ? onSeleziona : onApri} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <ExerciseThumb id={es.id} className="size-12" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {ss && !onSuperserie && <Badge tone="blue">{ss}</Badge>}
              <span className="truncate font-semibold">{es.nome}</span>
            </div>
            <div className="text-sm text-zinc-500">{testoPrescrizione(p, c.fase, es)}</div>
          </div>
          {selezione ? (
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${selezione === 'libera' ? 'ring-2 ring-zinc-300 dark:ring-zinc-600' : 'bg-sky-500 text-white'}`}>
              {selezione !== 'libera' && <Icon name={selezione === 'origine' ? 'link' : 'check'} className="size-4" />}
            </span>
          ) : (
            <Icon name="chevron" className={`size-5 shrink-0 text-zinc-400 transition-transform ${aperta ? 'rotate-90' : ''}`} />
          )}
        </button>
        {onSuperserie && (
          <button
            type="button"
            onClick={onSuperserie}
            className={`flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl px-2.5 text-sm font-bold ${ss ? 'bg-sky-500 text-white' : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'}`}
            aria-label={ss ? `Superserie ${ss}: modifica` : 'Collega in superserie'}
            title="Superserie"
          >
            <Icon name="link" className="size-4" />
            {ss}
          </button>
        )}
      </div>
      {aperta && (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <PrescrizioneForm p={p} onChange={onChange} />
          <div className="mt-3 flex gap-2">
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

function CircuitoEditor({
  v,
  onTrascina,
  onChange,
  onSostituisci,
  onAggiungi,
  onRimuovi,
}: {
  v: Circuito
  onTrascina?: (e: React.PointerEvent) => void
  onChange: (c: Circuito) => void
  onSostituisci: (sub: number) => void
  onAggiungi: () => void
  onRimuovi: () => void
}) {
  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center gap-1">
        {onTrascina && <Maniglia onTrascina={onTrascina} />}
        <span className="flex-1 font-semibold">Circuito</span>
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
