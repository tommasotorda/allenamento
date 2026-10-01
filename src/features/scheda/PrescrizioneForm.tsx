import { Button } from '../../components/ui'
import { conMisura, modoRegistrazione, puoAlternareMisura } from '../../domain/progression'
import { Stepper } from '../../components/Stepper'
import { esercizio } from '../../domain/data'
import { leggiIntervallo, scriviIntervallo } from '../../domain/editing'
import type { Prescrizione } from '../../domain/types'

/** Serie, ripetizioni, durata, distanza, recupero e opzioni di una prescrizione. */
export function PrescrizioneForm({ p, onChange }: { p: Prescrizione; onChange: (p: Prescrizione) => void }) {
  const es = esercizio(p.esercizioId)
  const reps = leggiIntervallo(p.ripetizioni)
  const durata = leggiIntervallo(p.durataSec)
  const set = (patch: Partial<Prescrizione>) => onChange({ ...p, ...patch })
  const misura = modoRegistrazione(es, p) === 'tempo' ? 'tempo' : 'ripetizioni'
  return (
    <div>
      {puoAlternareMisura(es) && (
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-zinc-200 p-1 dark:bg-zinc-800" role="radiogroup" aria-label="Misura">
          {(['ripetizioni', 'tempo'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={misura === m}
              onClick={() => misura !== m && onChange(conMisura(p, m))}
              className={`h-9 rounded-lg text-sm font-semibold ${misura === m ? 'bg-white shadow-sm dark:bg-zinc-950' : 'text-zinc-600 dark:text-zinc-400'}`}
            >
              {m === 'ripetizioni' ? 'Ripetizioni' : 'A tempo'}
            </button>
          ))}
        </div>
      )}
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
      {es.tipoRegistrazione === 'carico_ripetizioni' && misura === 'ripetizioni' && (
        <label className="mt-2 flex items-center justify-between rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium dark:bg-zinc-800">
          RPE e ripetizioni della fase
          <input type="checkbox" className="size-5 accent-orange-500" checked={p.rpe === 'fase'} onChange={(e) => set({ rpe: e.target.checked ? 'fase' : undefined })} />
        </label>
      )}
    </div>
  )
}
