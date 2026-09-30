import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, ExerciseThumb } from '../../components/ui'
import { eliminaSerie, salvaSerie, uuid } from '../../db/repositories'
import { esercizio } from '../../domain/data'
import type { Circuito, Serie } from '../../domain/types'
import { LinkEsercizio, type Lista } from '../esercizi/lista'
import { usePendente } from './registro'

interface Props {
  sedutaId: string
  data: string
  c: Circuito
  serie: Serie[]
  lista?: Lista
  /** posizione nella lista di ciascun esercizio del circuito */
  pos?: number[]
}

function bip(freq: number) {
  try {
    const ac = new AudioContext()
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.frequency.value = freq
    g.gain.setValueAtTime(0.25, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25)
    o.connect(g).connect(ac.destination)
    o.start()
    o.stop(ac.currentTime + 0.26)
    setTimeout(() => ac.close(), 400)
  } catch {
    /* audio non disponibile */
  }
}

/** Circuito a tempo: registrazione per giro e timer lavoro/pausa. */
export function CircuitLog({ sedutaId, data, c, serie, lista, pos }: Props) {
  const giriFatti = (g: number) => c.esercizi.every((id) => serie.some((s) => s.esercizioId === id && s.numero === g))

  const segnaGiro = async (g: number) => {
    if (giriFatti(g)) {
      for (const s of serie.filter((s) => s.numero === g && c.esercizi.includes(s.esercizioId))) await eliminaSerie(s.id)
      return
    }
    for (const id of c.esercizi) {
      if (serie.some((s) => s.esercizioId === id && s.numero === g)) continue
      await salvaSerie({ id: uuid(), sedutaId, esercizioId: id, data, numero: g, lato: null, durataSec: c.lavoroSec, ripetizioni: null, caricoKg: null, distanzaM: null, rpe: null })
    }
  }

  const giriMancanti = Array.from({ length: c.giri }, (_, i) => i + 1).filter((g) => !giriFatti(g))
  usePendente(
    `circuito:${c.esercizi.join(',')}`,
    giriMancanti.length
      ? {
          titolo: 'Circuito',
          dettaglio: `${giriMancanti.length} ${giriMancanti.length === 1 ? 'giro' : 'giri'} · ${c.esercizi.map((id) => esercizio(id).nome).join(', ')}`,
          salva: async () => {
            for (const g of giriMancanti) await segnaGiro(g)
          },
        }
      : null,
  )

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">Circuito</div>
        <Badge>
          {c.giri} giri · {c.lavoroSec} s / {c.pausaSec} s
        </Badge>
      </div>
      <div className="space-y-2">
        {c.esercizi.map((id, k) => (
          <LinkEsercizio key={id} id={id} lista={lista} pos={pos?.[k]} className="flex items-center gap-3">
            <ExerciseThumb id={id} className="size-12" />
            <span className="font-medium">{esercizio(id).nome}</span>
          </LinkEsercizio>
        ))}
      </div>
      <IntervalTimer c={c} />
      <div className="mt-3 grid grid-cols-4 gap-2">
        {Array.from({ length: c.giri }, (_, i) => i + 1).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => segnaGiro(g)}
            className={`flex h-12 items-center justify-center gap-1 rounded-xl font-semibold ${giriFatti(g) ? 'bg-green-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}
          >
            {giriFatti(g) && <Icon name="check" className="size-4" />}
            {g}
          </button>
        ))}
      </div>
    </Card>
  )
}

function IntervalTimer({ c }: { c: Circuito }) {
  // fasi: lavoro ed. pausa per ogni esercizio di ogni giro
  const fasi = Array.from({ length: c.giri }, (_, g) =>
    c.esercizi.flatMap((id, i) => {
      const lav = { tipo: 'lavoro' as const, id, giro: g + 1, sec: c.lavoroSec }
      const ultimo = g === c.giri - 1 && i === c.esercizi.length - 1
      return ultimo ? [lav] : [lav, { tipo: 'pausa' as const, id: c.esercizi[(i + 1) % c.esercizi.length], giro: g + 1, sec: c.pausaSec }]
    }),
  ).flat()
  const totale = fasi.reduce((s, f) => s + f.sec, 0)

  const [inizio, setInizio] = useState<number | null>(null)
  const [ora, setOra] = useState(0)
  const ultimaFase = useRef(-1)

  useEffect(() => {
    if (inizio === null) return
    const id = setInterval(() => setOra(Date.now()), 200)
    return () => clearInterval(id)
  }, [inizio])

  const trascorsi = inizio === null ? 0 : (ora - inizio) / 1000
  let acc = 0
  let idx = fasi.length
  for (let i = 0; i < fasi.length; i++) {
    if (trascorsi < acc + fasi[i].sec) {
      idx = i
      break
    }
    acc += fasi[i].sec
  }

  // segnale sonoro a ogni cambio di fase
  useEffect(() => {
    if (inizio === null) {
      ultimaFase.current = -1
      return
    }
    if (idx !== ultimaFase.current) {
      bip(idx < fasi.length && fasi[idx].tipo === 'lavoro' ? 1320 : 660)
      ultimaFase.current = idx
    }
  }, [idx, inizio, fasi])

  if (inizio === null) {
    return (
      <Button className="mt-3 w-full" onClick={() => { const t = Date.now(); setOra(t); setInizio(t) }}>
        <Icon name="timer" className="size-5" /> Timer circuito
      </Button>
    )
  }

  const finito = idx >= fasi.length || trascorsi >= totale
  const f = fasi[Math.min(idx, fasi.length - 1)]
  const rest = finito ? 0 : Math.ceil(acc + f.sec - trascorsi)

  return (
    <div className={`mt-3 rounded-xl p-3 text-white ${finito ? 'bg-green-600' : f.tipo === 'lavoro' ? 'bg-accent' : 'bg-zinc-700'}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase opacity-80">{finito ? 'Fine' : `${f.tipo === 'lavoro' ? 'Lavoro' : 'Pausa'} · giro ${f.giro}/${c.giri}`}</div>
          <div className="text-lg font-semibold">{finito ? '' : (f.tipo === 'pausa' ? 'Prossimo: ' : '') + esercizio(f.id).nome}</div>
        </div>
        <div className="text-4xl font-bold tabular-nums">{rest}</div>
      </div>
      <button type="button" onClick={() => setInizio(null)} className="mt-2 h-10 w-full rounded-lg bg-white/20 text-sm font-semibold active:bg-white/30">
        {finito ? 'Chiudi' : 'Ferma'}
      </button>
    </div>
  )
}
