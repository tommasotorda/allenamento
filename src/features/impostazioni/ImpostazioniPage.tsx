import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Button, Card, ExerciseThumb, formatData, PageHeader, SectionTitle } from '../../components/ui'
import { esporta, importa, nomeFileBackup } from '../../db/backup'
import { aggiornaImpostazioni, aggiornaPiano, azzeraTuttaMemoria, eliminaFoto } from '../../db/repositories'
import { db } from '../../db/schema'
import { lunediDi } from '../../domain/calendar'
import { esercizi, esercizio, NOMI_GIORNI, programma } from '../../domain/data'
import type { FotoEsercizio } from '../../domain/types'
import { useImpostazioni, useOggi, usePianoAttivo } from '../../hooks'
import { consegnaFile } from '../../condividi'

const sbloccabili = esercizi.filter((e) => e.sbloccabile)

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? 'bg-green-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
      <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} />
    </button>
  )
}

function FotoMini({ f }: { f: FotoEsercizio }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const u = URL.createObjectURL(f.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [f.blob])
  return url ? <img src={url} alt="" className="size-14 rounded-lg object-cover" /> : <div className="size-14 rounded-lg bg-zinc-200" />
}

export function ImpostazioniPage() {
  const imp = useImpostazioni()
  const piano = usePianoAttivo()
  const oggi = useOggi()
  const foto = useLiveQuery(() => db.fotoEsercizi.toArray()) ?? []
  const fileInput = useRef<HTMLInputElement>(null)
  const [daImportare, setDaImportare] = useState<unknown>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [nuovoCiclo, setNuovoCiclo] = useState(false)
  const [reset, setReset] = useState<'no' | 'conferma' | 'fatto'>('no')
  const ricordati = useLiveQuery(() => db.memoria.filter((m) => !m.azzerata).count()) ?? 0
  if (!imp || !piano) return null

  const esportaFile = async () => {
    const dati = await esporta(db)
    await consegnaFile(new Blob([JSON.stringify(dati)], { type: 'application/json' }), nomeFileBackup(), 'Backup Allenamento')
  }

  return (
    <div>
      <PageHeader back="/" title="Impostazioni" />

      <SectionTitle>Ciclo · {piano.nome}</SectionTitle>
      <Card className="space-y-3">
        <label className="flex items-center justify-between gap-3">
          <span className="font-medium">Inizio ciclo</span>
          <input
            type="date"
            value={piano.inizio}
            onChange={(e) => e.target.value && aggiornaPiano(piano.id, { inizio: lunediDi(e.target.value) })}
            className="h-11 rounded-lg bg-zinc-100 px-2 dark:bg-zinc-800"
          />
        </label>
        <div className="text-sm text-zinc-500">{formatData(piano.inizio, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        {nuovoCiclo ? (
          <div className="flex gap-2">
            <Button
              variant="primary"
              className="flex-1"
              onClick={async () => {
                await aggiornaPiano(piano.id, { inizio: lunediDi(oggi) })
                setNuovoCiclo(false)
              }}
            >
              Inizia da {formatData(lunediDi(oggi), { day: 'numeric', month: 'short' })}
            </Button>
            <Button onClick={() => setNuovoCiclo(false)}>Annulla</Button>
          </div>
        ) : (
          <Button className="w-full" onClick={() => setNuovoCiclo(true)}>
            Nuovo ciclo
          </Button>
        )}
      </Card>

      <SectionTitle>Esercizi sbloccabili</SectionTitle>
      <Card className="divide-y divide-zinc-100 py-1 dark:divide-zinc-800">
        {sbloccabili.map((e) => {
          const on = imp.sbloccati.includes(e.id)
          const prog = findSbloccabile(e.id)
          return (
            <div key={e.id} className="flex items-center gap-3 py-2">
              <Link to={`/esercizi/${e.id}`}>
                <ExerciseThumb id={e.id} className="size-12" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{e.nome}</div>
                {prog && <div className="text-xs text-zinc-500">{prog}</div>}
              </div>
              <Toggle label={e.nome} on={on} onChange={(v) => aggiornaImpostazioni({ sbloccati: v ? [...imp.sbloccati, e.id] : imp.sbloccati.filter((x) => x !== e.id) })} />
            </div>
          )
        })}
      </Card>

      <SectionTitle>Carichi</SectionTitle>
      <Card>
        <div className="mb-2 font-medium">Incremento e arrotondamento</div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 1.25, 2.5, 5].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => aggiornaImpostazioni({ incrementoCaricoKg: v })}
              className={`h-11 rounded-xl font-semibold ${imp.incrementoCaricoKg === v ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800'}`}
            >
              {String(v).replace('.', ',')} kg
            </button>
          ))}
        </div>
      </Card>

      <SectionTitle>Autocompilazione</SectionTitle>
      <Card className="space-y-2">
        <div className="text-sm text-zinc-500">
          Esercizi con valori ricordati: {ricordati}
        </div>
        {reset === 'conferma' ? (
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                await azzeraTuttaMemoria()
                setReset('fatto')
              }}
            >
              Azzera tutto
            </Button>
            <Button onClick={() => setReset('no')}>Annulla</Button>
          </div>
        ) : (
          <Button className="w-full" onClick={() => setReset('conferma')} disabled={reset === 'fatto'}>
            <Icon name="reset" className="size-5" /> {reset === 'fatto' ? 'Si riparte dai valori della scheda' : 'Azzera i valori precompilati'}
          </Button>
        )}
      </Card>

      <SectionTitle>Backup</SectionTitle>
      <Card className="space-y-2">
        <Button className="w-full" onClick={esportaFile}>
          <Icon name="download" className="size-5" /> Esporta dati
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            try {
              setDaImportare(JSON.parse(await f.text()))
              setMsg(null)
            } catch {
              setMsg('File non valido')
            }
          }}
        />
        {daImportare ? (
          <div className="rounded-xl bg-red-600/10 p-3">
            <div className="mb-2 text-sm font-medium">I dati attuali verranno sostituiti.</div>
            <div className="flex gap-2">
              <Button
                variant="danger"
                className="flex-1"
                onClick={async () => {
                  try {
                    await importa(db, daImportare)
                    setMsg('Importazione completata')
                  } catch (err) {
                    setMsg((err as Error).message)
                  }
                  setDaImportare(null)
                }}
              >
                Sostituisci
              </Button>
              <Button onClick={() => setDaImportare(null)}>Annulla</Button>
            </div>
          </div>
        ) : (
          <Button className="w-full" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" className="size-5" /> Importa dati
          </Button>
        )}
        {msg && <div className="text-center text-sm font-medium">{msg}</div>}
      </Card>

      <SectionTitle>Foto</SectionTitle>
      <Card>
        {foto.length === 0 ? (
          <div className="text-sm text-zinc-400">Nessuna foto</div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {foto.map((f) => (
              <div key={f.id} className="flex items-center gap-3 py-2">
                <FotoMini f={f} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{esercizio(f.esercizioId).nome}</div>
                  <div className="text-xs text-zinc-500">{formatData(f.creata.slice(0, 10))}</div>
                </div>
                <button type="button" onClick={() => eliminaFoto(f.id!)} className="flex size-10 items-center justify-center rounded-lg text-zinc-400 active:bg-zinc-200 dark:active:bg-zinc-800" aria-label="Elimina foto">
                  <Icon name="trash" className="size-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

/** Dove si inserisce l'esercizio sbloccabile nel programma. */
function findSbloccabile(id: string): string | null {
  for (const [g, s] of Object.entries(programma.sedute)) {
    const sb = s.sbloccabili?.find((x) => x.esercizioId === id)
    if (sb) return `${NOMI_GIORNI[g as keyof typeof NOMI_GIORNI]}${sb.sostituisce ? ` · al posto di ${esercizio(sb.sostituisce).nome}` : ''}`
  }
  return null
}
