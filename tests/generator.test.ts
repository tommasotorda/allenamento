import { describe, expect, it } from 'vitest'
import { adatta, contestoDa, proposteAdattamento } from '../src/domain/adattamento'
import { esercizio, programma as programmaJson } from '../src/domain/data'
import { disponibile, generaProgramma, RISPOSTE_VUOTE, type Risposte } from '../src/domain/generator'
import { espandi, type MuscoloId } from '../src/domain/muscles'
import { creaPiano, pianoOriginale } from '../src/domain/plans'
import { volumeSettimanaleGruppi, volumeTarget } from '../src/domain/programmazione'
import { PROFILI } from '../src/domain/profili'
import { strutturaSeduta } from '../src/domain/session'
import { isCircuito, type Prescrizione, type Programma, type SedutaLog, type Serie } from '../src/domain/types'

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

  it('corpo libero selezionabile insieme agli attrezzi', () => {
    const base: Risposte = { ...RISPOSTE_VUOTE, obiettivi: ['forza'], livello: 2, attrezzi: ['manubri', 'kettlebell'] }
    const conCL = ids(generaProgramma({ ...base, corpoLibero: true }))
    const senzaCL = ids(generaProgramma({ ...base, corpoLibero: false }))
    const cl = (id: string) => ['forza', 'potenza', 'ricostruzione'].includes(esercizio(id).categoria) && esercizio(id).attrezzi.every((g) => g.includes('tappetino'))
    expect(conCL.some(cl)).toBe(true)
    expect(senzaCL.some(cl)).toBe(false)
    // i manubri restano usati anche con il corpo libero
    expect(conCL.some((id) => esercizio(id).attrezzi.flat().includes('manubri'))).toBe(true)
  })

  it('sedute fino a 2 ore hanno piu\' esercizi', () => {
    const base: Risposte = { ...RISPOSTE_VUOTE, obiettivi: ['forza'], livello: 2, attrezzi: ['manubri', 'kettlebell', 'bilanciere', 'panca', 'sbarra', 'cavo', 'elastico'] }
    const n = (d: Risposte['durataMin']) => (generaProgramma({ ...base, durataMin: d }).sedute.s1.palestra ?? []).length
    expect(n(120)).toBeGreaterThan(n(60))
    expect(n(120)).toBeGreaterThanOrEqual(9)
  })

  it('suddivisioni: spinta/tirata/gambe e gruppi muscolari con isolamento', () => {
    const base: Risposte = { ...RISPOSTE_VUOTE, obiettivi: ['massa'], livello: 2, durataMin: 60, attrezzi: ['manubri', 'bilanciere', 'panca', 'sbarra', 'cavo'], giorni: ['lun', 'mar', 'mer', 'gio', 'ven'] }
    const ppl = generaProgramma({ ...base, suddivisione: 'ppl' })
    expect(ppl.settimana.map((x) => ppl.sedute[x.sedutaId].nome)).toEqual(['Spinta A', 'Tirata A', 'Gambe', 'Spinta B', 'Tirata B'])
    const gruppi = generaProgramma({ ...base, suddivisione: 'gruppi' })
    expect(gruppi.settimana.map((x) => gruppi.sedute[x.sedutaId].nome)).toEqual(['Petto e tricipiti', 'Schiena e bicipiti', 'Gambe', 'Spalle e core', 'Braccia'])
    const braccia = gruppi.sedute[gruppi.settimana[4].sedutaId].palestra!.map((v) => esercizio((v as { esercizioId: string }).esercizioId))
    const isola = (m: string) => braccia.some((e) => e.schemi.includes('isolamento') && espandi(e.muscoli)[m as MuscoloId] === 3)
    expect(isola('bicipite') && isola('tricipite')).toBe(true)
    // l'isolamento compare solo con suddivisioni che lo prevedono
    expect(ids(generaProgramma({ ...base, suddivisione: 'fullbody' })).some((id) => esercizio(id).schemi.includes('isolamento'))).toBe(false)
  })

  it('attrezzi diversi in un giorno', () => {
    const r: Risposte = { ...RISPOSTE_VUOTE, obiettivi: ['forza'], livello: 2, attrezzi: ['bilanciere', 'panca', 'manubri'], corpoLibero: false, giorni: ['lun', 'ven'], attrezziGiorno: { ven: { attrezzi: ['elastico'], corpoLibero: true } } }
    const p = generaProgramma(r)
    const ven = p.sedute[p.settimana.find((x) => x.giorno === 'ven')!.sedutaId]
    for (const v of [...(ven.palestra ?? []), ...(ven.mobilita ?? [])]) {
      const e = esercizio((v as { esercizioId: string }).esercizioId)
      expect(e.attrezzi.every((g) => g.some((a) => a === 'elastico' || a === 'tappetino')), e.id).toBe(true)
    }
    const lun = p.sedute[p.settimana.find((x) => x.giorno === 'lun')!.sedutaId]
    expect(lun.palestra!.some((v) => esercizio((v as { esercizioId: string }).esercizioId).attrezzi.flat().includes('bilanciere'))).toBe(true)
  })

  it('altri sport: nei giorni di allenamento come attivita\', negli altri come seduta a parte', () => {
    const r: Risposte = { ...RISPOSTE_VUOTE, obiettivi: ['potenza'], livello: 2, attrezzi: ['kettlebell', 'box', 'palla-medica'], giorni: ['lun', 'mer'], sport: [{ tipo: 'Calcio', giorni: ['mer', 'sab'], durataMin: 90 }] }
    const p = generaProgramma(r)
    expect(p.settimana.map((x) => x.giorno)).toEqual(['lun', 'mer', 'sab'])
    const mer = p.sedute[p.settimana[1].sedutaId]
    expect(mer.attivita).toEqual({ tipo: 'calcio', durataMin: 90 })
    // niente salti nel giorno dello sport, esplosivi in apertura solo negli altri giorni
    expect(mer.palestra!.some((v) => esercizio((v as { esercizioId: string }).esercizioId).impatto)).toBe(false)
    const sab = p.sedute[p.settimana[2].sedutaId]
    expect(sab).toMatchObject({ nome: 'Calcio', attivita: { tipo: 'calcio' }, palestra: [], core: false })
    expect(sab.mobilita!.length).toBeGreaterThan(0)
  })

  const completa: Risposte = { ...RISPOSTE_VUOTE, obiettivi: ['massa'], livello: 2, durataMin: 60, attrezzi: ['manubri', 'bilanciere', 'panca', 'sbarra', 'cavo', 'elastico'], giorni: ['lun', 'mer', 'ven'] }
  const voci = (p: Programma) => Object.values(p.sedute).flatMap((s) => (s.palestra ?? []).filter((v) => !isCircuito(v)) as Prescrizione[])

  it('composizione libera: ogni giorno allena quello che si sceglie', () => {
    const p = generaProgramma({ ...completa, suddivisione: 'libera', composizione: { lun: ['petto', 'tricipiti'], mer: ['schiena', 'bicipiti'], ven: ['quadricipiti', 'femorali-glutei', 'polpacci'] } })
    expect(p.settimana.map((x) => p.sedute[x.sedutaId].nome)).toEqual(['Petto + Tricipiti', 'Schiena + Bicipiti', 'Quadricipiti + Femorali e glutei + Polpacci'])
    const lun = p.sedute[p.settimana[0].sedutaId].palestra!.map((v) => esercizio((v as Prescrizione).esercizioId))
    expect(lun.every((e) => !e.schemi.some((x) => ['squat', 'hinge', 'affondo', 'tirata-orizzontale', 'tirata-verticale'].includes(x)))).toBe(true)
  })

  it('numero di esercizi per seduta scelto', () => {
    for (const n of [4, 8, 11]) {
      const p = generaProgramma({ ...completa, eserciziPerSeduta: n })
      for (const s of Object.values(p.sedute)) expect(s.palestra).toHaveLength(n)
    }
  })

  it('superserie: tutta la scheda o alcune coppie, recupero dopo il secondo', () => {
    const tutte = voci(generaProgramma({ ...completa, superserie: 'tutte' }))
    expect(tutte.filter((v) => v.superserie).length).toBeGreaterThanOrEqual(tutte.length - 3)
    const p = generaProgramma({ ...completa, superserie: 'alcune', coppieSuperserie: 2 })
    for (const s of Object.values(p.sedute)) {
      const v = s.palestra as Prescrizione[]
      expect(v.filter((x) => x.superserie)).toHaveLength(4)
      for (let i = 0; i + 1 < v.length; i++) if (v[i].superserie && v[i].superserie === v[i + 1].superserie) expect(v[i].recuperoSec).toBe(0)
    }
    expect(voci(generaProgramma(completa)).some((v) => v.superserie)).toBe(false)
  })

  it('riscaldamento specifico, fondamentali prima e volume nell\'intervallo', () => {
    const p = generaProgramma({ ...completa, suddivisione: 'fullbody' })
    for (const s of Object.values(p.sedute)) {
      expect(s.riscaldamento!.length).toBeGreaterThan(0)
      const primo = esercizio((s.palestra![0] as Prescrizione).esercizioId)
      expect(primo.tipoRegistrazione).toBe('carico_ripetizioni')
    }
    const vol = volumeSettimanaleGruppi(p)
    const [min] = volumeTarget('massa', 2)
    for (const g of ['petto', 'schiena', 'quadricipiti'] as const) expect(vol[g], g).toBeGreaterThanOrEqual(min)
    expect(vol.schiena).toBeGreaterThanOrEqual(vol.petto)
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
