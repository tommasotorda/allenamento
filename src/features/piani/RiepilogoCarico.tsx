import { useId, useMemo, useState } from 'react'
import { Card } from '../../components/ui'
import { MUSCOLI, type MuscoloId } from '../../domain/muscles'
import { caricoMuscoli, ELENCO_GRUPPI, FATTORE_GRUPPO, GRUPPI, impostaVolumeGruppo, limitiVolumeGruppo, volumeSettimanaleGruppi, volumeTarget, type Gruppo } from '../../domain/programmazione'
import type { Obiettivo, Programma } from '../../domain/types'
import { mappaSvg } from '../../figures/muscleMap'

const numero = (v: number) => String(Math.round(v * 2) / 2).replace('.', ',')

/**
 * Riepilogo del carico settimanale di una scheda: serie per gruppo muscolare rispetto all'intervallo
 * indicato (con gli slider, se la scheda si puo' modificare) e mappa del carico sui muscoli.
 */
export function RiepilogoCarico({
  programma,
  obiettivo,
  livello,
  onChange,
  onRipristina,
}: {
  programma: Programma
  obiettivo: Obiettivo
  livello: 1 | 2 | 3
  /** presente se la scheda si puo' modificare dagli slider */
  onChange?: (p: Programma) => void
  /** presente se ci sono modifiche da annullare */
  onRipristina?: () => void
}) {
  const [vista, setVista] = useState<'serie' | 'mappa'>('serie')
  return (
    <Card className="mt-4 p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 rounded-lg bg-zinc-100 p-0.5 text-sm font-semibold dark:bg-zinc-800">
          {(
            [
              ['serie', 'Serie settimanali'],
              ['mappa', 'Carico sui muscoli'],
            ] as const
          ).map(([k, n]) => (
            <button key={k} type="button" onClick={() => setVista(k)} className={`h-8 flex-1 rounded-md ${vista === k ? 'bg-white shadow-sm dark:bg-zinc-600' : 'text-zinc-500'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
      {vista === 'serie' ? <SerieGruppi programma={programma} obiettivo={obiettivo} livello={livello} onChange={onChange} onRipristina={onRipristina} /> : <MappaCarico programma={programma} />}
    </Card>
  )
}

function SerieGruppi({ programma, obiettivo, livello, onChange, onRipristina }: { programma: Programma; obiettivo: Obiettivo; livello: 1 | 2 | 3; onChange?: (p: Programma) => void; onRipristina?: () => void }) {
  const volume = volumeSettimanaleGruppi(programma)
  const target = volumeTarget(obiettivo, livello)
  const gruppi = ELENCO_GRUPPI.filter((g) => g !== 'core' && volume[g] > 0)
  if (!gruppi.length) return <p className="mt-3 text-sm text-zinc-500">Nessun esercizio di forza in questa scheda.</p>
  // scala comune a tutte le righe, cosi' gli intervalli si confrontano a colpo d'occhio
  const scala = Math.max(Math.ceil(target[1] * 1.8), ...gruppi.map((g) => Math.ceil(volume[g]) + 2))
  return (
    <div>
      <div className="mt-3 flex items-baseline justify-between gap-2 text-xs text-zinc-500">
        <span>{onChange ? 'Trascina per cambiare le serie; la traccia mostra fin dove si arriva con gli esercizi presenti' : 'Serie a settimana per gruppo'}</span>
        {onRipristina ? (
          <button type="button" onClick={onRipristina} className="font-semibold text-accent">
            Ripristina
          </button>
        ) : (
          <span>in grigio l'intervallo indicato</span>
        )}
      </div>
      <div className="mt-2 space-y-1">
        {gruppi.map((g) => (
          <RigaGruppo key={g} g={g} programma={programma} valore={volume[g]} target={target} scala={scala} onChange={onChange} />
        ))}
      </div>
    </div>
  )
}

function RigaGruppo({ g, programma, valore, target, scala, onChange }: { g: Gruppo; programma: Programma; valore: number; target: [number, number]; scala: number; onChange?: (p: Programma) => void }) {
  // braccia e polpacci: intervallo ridotto, lavorano gia' nei multiarticolari
  const [min, max] = target.map((x) => Math.round(x * FATTORE_GRUPPO[g]))
  const pct = (x: number) => `${(Math.min(x, scala) / scala) * 100}%`
  const fuori = valore < min ? 'sotto' : valore > max ? 'sopra' : null
  // la traccia copre solo le serie raggiungibili cambiando le serie degli esercizi presenti
  const [lo, hi] = onChange ? limitiVolumeGruppo(programma, g) : [0, scala]
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-24 shrink-0 text-zinc-600 dark:text-zinc-400">{GRUPPI[g].nome}</span>
      <div className="relative h-7 flex-1">
        <div className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-zinc-100 dark:bg-zinc-800" style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }} />
        <div className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-zinc-300/70 dark:bg-zinc-600/60" style={{ left: pct(min), width: `calc(${pct(max)} - ${pct(min)})` }} />
        <div className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent" style={{ width: pct(valore) }} />
        {onChange && (
          <input
            type="range"
            min={0}
            max={scala}
            step={0.5}
            value={valore}
            aria-label={`Serie settimanali ${GRUPPI[g].nome}`}
            className="slider-volume absolute inset-0"
            onChange={(e) => {
              const v = Math.min(hi, Math.max(lo, Number(e.target.value)))
              if (Math.abs(v - valore) >= 0.25) onChange(impostaVolumeGruppo(programma, g, v))
            }}
          />
        )}
      </div>
      <span className={`w-9 shrink-0 text-right font-semibold tabular-nums ${fuori ? 'text-amber-600 dark:text-amber-400' : ''}`} title={fuori ? `${fuori} l'intervallo ${min}-${max}` : undefined}>
        {numero(valore)}
      </span>
    </div>
  )
}

/** Mappa del carico: ogni muscolo colorato in proporzione alle serie che riceve, con la quota sul totale. */
function MappaCarico({ programma }: { programma: Programma }) {
  const prefisso = 'carico' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const { svg, classifica } = useMemo(() => {
    const c = caricoMuscoli(programma)
    const voci = (Object.entries(c) as [MuscoloId, number][]).filter(([, v]) => v > 0)
    const totale = voci.reduce((t, [, v]) => t + v, 0)
    const massimo = Math.max(0, ...voci.map(([, v]) => v))
    const intensita = Object.fromEntries(voci.map(([m, v]) => [m, v / massimo]))
    return {
      svg: mappaSvg({}, { prefisso, intensita, titolo: 'Carico settimanale sui muscoli' }),
      classifica: voci.sort((a, b) => b[1] - a[1]).map(([m, v]) => ({ m, quota: totale ? v / totale : 0, rel: v / massimo })),
    }
  }, [programma, prefisso])
  const [tutti, setTutti] = useState(false)
  if (!classifica.length) return <p className="mt-3 text-sm text-zinc-500">Nessun esercizio di forza in questa scheda.</p>
  return (
    <div>
      <div className="mx-auto mt-3 h-64 max-w-xs" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="mx-auto mt-2 flex max-w-xs items-center gap-2 text-xs text-zinc-500">
        meno
        <div className="h-2 flex-1 rounded-full" style={{ background: 'linear-gradient(to right, color-mix(in srgb, #ff3b30 12%, #3a3a3c), #ff3b30)' }} />
        più
      </div>
      <div className="mt-3 text-xs text-zinc-500">Quota sul totale delle serie della settimana</div>
      <div className="mt-1.5 space-y-1">
        {(tutti ? classifica : classifica.slice(0, 8)).map(({ m, quota, rel }) => (
          <div key={m} className="flex items-center gap-2 text-sm">
            <span className="w-36 shrink-0 truncate text-zinc-600 dark:text-zinc-400">{MUSCOLI[m].nome}</span>
            <div className="h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="h-2 rounded-full" style={{ width: `${rel * 100}%`, background: `color-mix(in srgb, #ff3b30 ${Math.round(12 + 88 * rel)}%, #3a3a3c)` }} />
            </div>
            <span className="w-10 shrink-0 text-right font-semibold tabular-nums">{Math.round(quota * 100)}%</span>
          </div>
        ))}
      </div>
      {classifica.length > 8 && (
        <button type="button" onClick={() => setTutti(!tutti)} className="mt-2 text-xs font-semibold text-accent">
          {tutti ? 'Mostra meno' : `Tutti i muscoli (${classifica.length})`}
        </button>
      )}
    </div>
  )
}
