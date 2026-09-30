import { describe, expect, it } from 'vitest'
import { adatta, contestoDa, proposteAdattamento } from '../src/domain/adattamento'
import { esercizio, programma as programmaJson } from '../src/domain/data'
import { disponibile, generaProgramma, RISPOSTE_VUOTE, type Risposte } from '../src/domain/generator'
import { creaPiano, pianoOriginale } from '../src/domain/plans'
import { PROFILI } from '../src/domain/profili'
import { strutturaSeduta } from '../src/domain/session'
import { isCircuito, type Programma, type SedutaLog, type Serie } from '../src/domain/types'

const ids = (p: Programma) =>
  Object.values(p.sedute).flatMap((s) => [...(s.palestra ?? []).flatMap((v) => (isCircuito(v) ? v.esercizi : [v.esercizioId])), ...(s.mobilita ?? []).map((v) => v.esercizioId)])

describe('generatore', () => {
  it('ogni profilo standard genera una scheda valida', () => {
    for (const pr of PROFILI) {
      const p = generaProgramma(pr.risposte)
      expect(p.settimana.map((x) => x.giorno)).toEqual(pr.risposte.giorni)
      expect(p.fasi.flatMap((f) => f.settimane).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
      for (const id of ids(p)) expect(disponibile(esercizio(id), pr.risposte), `${pr.id}: ${id}`).toBe(true)
      // ogni seduta si risolve senza errori per tutte le settimane
      for (const { sedutaId } of p.settimana) for (let w = 1; w <= 12; w++) strutturaSeduta(p, sedutaId, w, p.fasi.find((f) => f.settimane.includes(w))!, [])
    }
  })

  it('rispetta attrezzi, livello e zone da evitare', () => {
    const r: Risposte = { ...RISPOSTE_VUOTE, obiettivi: ['forza'], livello: 1, attrezzi: ['manubri'], evitare: ['ginocchia', 'polsi'] }
    const p = generaProgramma(r)
    for (const id of ids(p)) {
      const e = esercizio(id)
      expect(e.livello).toBe(1)
      expect(e.impatto).toBe(false)
      expect(e.sollecita).not.toContain('ginocchia')
      expect(e.attrezzi.every((g) => g.some((a) => a === 'manubri' || a === 'tappetino'))).toBe(true)
    }
  })

  it('e\' deterministico', () => {
    expect(generaProgramma(PROFILI[1].risposte)).toEqual(generaProgramma(PROFILI[1].risposte))
  })

  it('la resistenza aggiunge un circuito, la mobilita\' allunga il defaticamento', () => {
    const base: Risposte = { ...RISPOSTE_VUOTE, attrezzi: ['kettlebell', 'manubri', 'elastico'], durataMin: 60 }
    const res = generaProgramma({ ...base, obiettivi: ['resistenza'] })
    expect(Object.values(res.sedute).some((s) => s.palestra?.some(isCircuito))).toBe(true)
    const mob = generaProgramma({ ...base, obiettivi: ['forza', 'mobilita'] })
    expect(Object.values(mob.sedute).every((s) => (s.mobilita?.length ?? 0) >= 4)).toBe(true)
  })

  it('la corsa aggiunge la pista', () => {
    const p = generaProgramma({ ...RISPOSTE_VUOTE, obiettivi: ['resistenza'], corsa: true, giorni: ['lun', 'mer', 'ven', 'sab'] })
    expect(Object.values(p.sedute).filter((s) => s.pista).length).toBe(2)
  })

  it('il focus sulla catena posteriore porta esercizi per i lombari', () => {
    const r: Risposte = { ...RISPOSTE_VUOTE, obiettivi: ['stabilita'], attrezzi: ['manubri', 'panca-iperestensioni', 'elastico'], focus: ['catena-posteriore'] }
    const p = generaProgramma(r)
    expect(ids(p).some((id) => ['back_extension', 'stacco_rumeno_manubri', 'superman', 'good_morning'].includes(id))).toBe(true)
  })
})

describe('adattamento', () => {
  const ctx = contestoDa(programmaJson)

  it('forza: principali a basse ripetizioni con RPE della fase, fasi di forza', () => {
    const { programma: p, modifiche } = adatta(programmaJson, ['forza'], ctx)
    expect(p.sedute.lun.palestra![0]).toMatchObject({ esercizioId: 'trap_bar_deadlift', ripetizioni: '4-6', rpe: 'fase' })
    expect(p.fasi[4].nome).toBe('Picco')
    expect(modifiche.length).toBeGreaterThan(0)
  })

  it('resistenza + mobilita\': circuito e almeno 4 allungamenti per seduta', () => {
    const { programma: p } = adatta(programmaJson, ['resistenza', 'mobilita'], ctx)
    for (const s of Object.values(p.sedute)) {
      if (!s.palestra?.length) continue
      expect(s.palestra.some(isCircuito)).toBe(true)
      expect(s.mobilita!.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('potenza aggiunge un esplosivo in apertura dove manca', () => {
    const { programma: p } = adatta(programmaJson, ['potenza'], ctx)
    const primo = p.sedute.mar.palestra![0]
    expect(isCircuito(primo)).toBe(false)
    const e = esercizio((primo as { esercizioId: string }).esercizioId)
    expect(e.schemi.some((s) => s === 'pliometria' || s === 'balistico')).toBe(true)
  })

  it('non modifica il programma di partenza', () => {
    const copia = JSON.stringify(programmaJson)
    adatta(programmaJson, ['forza', 'stabilita', 'mobilita'], ctx)
    expect(JSON.stringify(programmaJson)).toBe(copia)
  })
})

describe('proposte di adattamento', () => {
  const log = (i: number, data: string): SedutaLog => ({ id: `s${i}`, data, templateId: 'lun', pianoId: 'originale', settimanaCiclo: 1, inizio: data + 'T10:00:00Z', fine: data + 'T11:00:00Z', pista: { durataMin: null, distanzaM: null, fcMedia: null, ripetuteFatte: null }, tennisMin: null })
  const serie = (i: number, data: string, kg: number): Serie => ({ id: `x${i}`, sedutaId: `s${i}`, esercizioId: 'trap_bar_deadlift', data, numero: 1, ripetizioni: 5, caricoKg: kg, durataSec: null, distanzaM: null, lato: null, rpe: 7 })

  it('alla scadenza delle 12 settimane', () => {
    const p = pianoOriginale('2026-06-01')
    expect(proposteAdattamento(p, '2026-08-23', [], [], []).map((x) => x.chiave)).toEqual([])
    expect(proposteAdattamento(p, '2026-08-24', [], [], []).map((x) => x.chiave)).toContain('scadenza')
  })

  it('per progressi di forza e si possono rimandare', () => {
    const p = pianoOriginale('2026-09-07')
    const sedute = [log(1, '2026-09-07'), log(2, '2026-09-14'), log(3, '2026-09-21')]
    const s = [serie(1, '2026-09-07', 100), serie(2, '2026-09-14', 105), serie(3, '2026-09-21', 112.5)]
    const pr = proposteAdattamento(p, '2026-09-22', sedute, s, [])
    expect(pr.map((x) => x.chiave)).toContain('1rm-trap_bar_deadlift')
    expect(proposteAdattamento({ ...p, proposteChiuse: ['1rm-trap_bar_deadlift'] }, '2026-09-22', sedute, s, [])).toEqual([])
  })

  it('dopo i test di meta\' ciclo', () => {
    const p = creaPiano({ nome: 'x', origine: 'profilo', obiettivi: ['forza'], programma: programmaJson, inizio: '2026-08-03' })
    const test = [{ testId: 'cooper', data: '2026-09-22', valore: 2400 }, { testId: 'trazioni_max', data: '2026-09-23', valore: 8 }]
    expect(proposteAdattamento(p, '2026-09-28', [], [], test).map((x) => x.chiave)).toContain('test-8')
  })
})
