import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, PageHeader, SectionTitle } from '../../components/ui'
import { aggiornaPiano, salvaPiano } from '../../db/repositories'
import { adatta, contestoDa, DESCR_DIREZIONI } from '../../domain/adattamento'
import { lunediDi } from '../../domain/calendar'
import { NOMI_OBIETTIVI } from '../../domain/generator'
import { creaPiano } from '../../domain/plans'
import type { Obiettivo } from '../../domain/types'
import { useCiclo } from '../../hooks'
import { AnteprimaProgramma } from '../piani/AnteprimaProgramma'

const DIREZIONI: Obiettivo[] = ['forza', 'massa', 'potenza', 'resistenza', 'mobilita', 'stabilita']

/** Adatta la scheda attiva: scegli le direzioni, guarda le modifiche, applica come nuova scheda. */
export function AdattaPage() {
  const c = useCiclo()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [dir, setDir] = useState<Obiettivo[]>([])
  const [vista, setVista] = useState<'modifiche' | 'sedute'>('modifiche')
  const risultato = useMemo(() => (c && dir.length ? adatta(c.programma, dir, contestoDa(c.programma, c.piano.risposte)) : null), [c, dir])
  if (!c) return null

  const perSeduta = new Map<string, string[]>()
  for (const m of risultato?.modifiche ?? []) perSeduta.set(m.seduta, [...(perSeduta.get(m.seduta) ?? []), m.testo])

  const applica = async () => {
    if (!risultato) return
    const nome = `${dir.map((d) => NOMI_OBIETTIVI[d]).join(' + ')} · ${c.piano.nome}`.slice(0, 80)
    const nuovo = creaPiano({ nome, origine: 'adattamento', obiettivi: dir, programma: risultato.programma, inizio: lunediDi(c.oggi), derivaDa: c.piano.id })
    nuovo.risposte = c.piano.risposte ? { ...c.piano.risposte, obiettivi: dir } : undefined
    await aggiornaPiano(c.piano.id, { archiviato: true })
    await salvaPiano(nuovo, true)
    nav('/scheda', { replace: true })
  }

  return (
    <div>
      <PageHeader back="/scheda" title="Adatta la scheda" subtitle={c.piano.nome} />
      {params.get('motivo') && <div className="mb-3 rounded-xl bg-accent/10 px-4 py-3 text-sm font-medium">{params.get('motivo')}</div>}

      <div className="px-1 text-sm text-zinc-500">Direzione, fino a 3 combinate</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {DIREZIONI.map((d) => {
          const i = dir.indexOf(d)
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDir(i >= 0 ? dir.filter((x) => x !== d) : dir.length < 3 ? [...dir, d] : dir)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left ${i >= 0 ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-white ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10'}`}
            >
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i >= 0 ? 'bg-accent text-white' : 'bg-zinc-200 dark:bg-zinc-800'}`}>{i >= 0 ? i + 1 : ''}</span>
              <span>
                <span className="block font-semibold">{NOMI_OBIETTIVI[d]}</span>
                <span className={`block text-xs ${i >= 0 ? 'opacity-70' : 'text-zinc-500'}`}>{DESCR_DIREZIONI[d]}</span>
              </span>
            </button>
          )
        })}
      </div>

      {risultato && (
        <>
          <div className="mt-6 flex gap-2">
            <Button variant={vista === 'modifiche' ? 'primary' : 'secondary'} className="flex-1" onClick={() => setVista('modifiche')}>
              Modifiche ({risultato.modifiche.length})
            </Button>
            <Button variant={vista === 'sedute' ? 'primary' : 'secondary'} className="flex-1" onClick={() => setVista('sedute')}>
              Nuove sedute
            </Button>
          </div>
          {vista === 'modifiche' ? (
            <div>
              <SectionTitle>Fasi</SectionTitle>
              <div className="flex flex-wrap gap-1 px-1">
                {risultato.programma.fasi.map((f) => (
                  <Badge key={f.nome + f.settimane[0]} tone={f.scarico ? 'blue' : 'accent'}>
                    {f.settimane.length > 1 ? `${f.settimane[0]}-${f.settimane.at(-1)}` : f.settimane[0]} {f.nome}
                  </Badge>
                ))}
              </div>
              {[...perSeduta.entries()].map(([seduta, testi]) => (
                <div key={seduta}>
                  <SectionTitle>{seduta}</SectionTitle>
                  <Card className="space-y-1.5 text-sm">
                    {testi.map((t, i) => (
                      <div key={i}>{t}</div>
                    ))}
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <AnteprimaProgramma programma={risultato.programma} />
          )}
          <Button variant="primary" big className="mt-6 w-full" onClick={applica}>
            Applica come nuova scheda
          </Button>
          <div className="mt-2 text-center text-xs text-zinc-500">La scheda attuale resta in archivio</div>
        </>
      )}
    </div>
  )
}
