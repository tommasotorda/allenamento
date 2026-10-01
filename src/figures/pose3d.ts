/**
 * Porta le pose 2D del motore (engine.ts) nello spazio 3D.
 * Assi: X avanti (verso cui guarda la figura di profilo), Y su, Z laterale. Unita' in metri.
 * Il disegno 2D e' la proiezione su un piano; la larghezza del corpo (spalle, anche)
 * viene aggiunta lungo l'asse mancante, a seconda del piano in cui e' disegnato l'esercizio.
 */
import { G, posaA, type FiguraDef, type Joints, type Prop, type Vec } from './engine'
import { FIGURE } from './poses'

export type V3 = [number, number, number]

/** metri per unita' 2D: la figura in piedi (~140 unita') e' alta circa 1,75 m */
export const S = 1 / 80
const SPALLA = 0.17
const ANCA = 0.1

type Piano = 'sagittale' | 'frontale' | 'laterale' | 'trasverso'

/** Piano di disegno degli esercizi non di profilo. */
const PIANI: Record<string, Piano> = {
  lancio_rotazionale: 'frontale',
  rotazioni_esterne_elastico: 'frontale',
  anche_90_90: 'frontale',
  side_plank: 'laterale',
  copenhagen_plank: 'laterale',
  open_book: 'trasverso',
  affondo_laterale: 'frontale',
  kettlebell_windmill: 'frontale',
  lat_machine: 'frontale',
  guerriero_2: 'frontale',
  triangolo: 'frontale',
  albero: 'frontale',
  stretch_laterale: 'frontale',
  stretch_adduttori: 'frontale',
  alzate_laterali: 'frontale',
  croci_cavo: 'frontale',
  rematore_alto: 'frontale',
  squat_sumo: 'frontale',
  camminata_laterale_elastico: 'frontale',
  cross_crunch: 'laterale',
  skater_jump: 'frontale',
  cossack_squat: 'frontale',
  landmine_rotazione: 'frontale',
  step_up_laterale: 'frontale',
}

export const NOMI_GIUNTI = [
  'hip', 'shoulder', 'head', 'mid',
  'hipN', 'kneeN', 'ankleN', 'toeN', 'hipF', 'kneeF', 'ankleF', 'toeF',
  'shN', 'elbowN', 'handN', 'shF', 'elbowF', 'handF',
] as const
export type Giunto = (typeof NOMI_GIUNTI)[number]
export type Scheletro3D = Record<Giunto, V3>

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k]

function mappa(piano: Piano, p: Vec): V3 {
  const u = (p[0] - 120) * S
  const h = (G + 4 - p[1]) * S
  switch (piano) {
    case 'sagittale':
      return [u, h, 0]
    case 'frontale':
    case 'laterale':
      return [0, h, u]
    case 'trasverso':
      // vista dall'alto: la y del disegno e' la profondita', il corpo e' sdraiato su un fianco
      return [u, 0.2, (p[1] - 100) * S]
  }
}

/** Direzione (3D) del lato "vicino" e ampiezza per spalle e anche. */
function offsetLato(piano: Piano, j: Joints): V3 {
  switch (piano) {
    case 'sagittale':
      return [0, 0, 1]
    case 'frontale':
      return [0, 0, 0] // la larghezza e' gia' nel disegno
    case 'trasverso':
      return [0, 1, 0]
    case 'laterale': {
      // perpendicolare al busto nel piano del disegno, verso l'alto
      const dx = j.shoulder[0] - j.hip[0]
      const dy = j.shoulder[1] - j.hip[1]
      const l = Math.hypot(dx, dy) || 1
      let px = -dy / l
      let py = dx / l
      if (py > 0) {
        px = -px
        py = -py
      }
      return [0, -py, px]
    }
  }
}

export function scheletro3D(id: string, t: number): { giunti: Scheletro3D; j2d: Joints; def: FiguraDef; piano: Piano } {
  const def = FIGURE[id]
  const piano = PIANI[id] ?? 'sagittale'
  const j = posaA(def, t)
  const o = offsetLato(piano, j)
  const g = {} as Scheletro3D
  for (const n of NOMI_GIUNTI) g[n] = mappa(piano, j[n])
  const braccioN = ['shN', 'elbowN', 'handN'] as const
  const braccioF = ['shF', 'elbowF', 'handF'] as const
  const gambaN = ['hipN', 'kneeN', 'ankleN', 'toeN'] as const
  const gambaF = ['hipF', 'kneeF', 'ankleF', 'toeF'] as const
  for (const n of braccioN) g[n] = add(g[n], scale(o, SPALLA))
  for (const n of braccioF) g[n] = add(g[n], scale(o, -SPALLA))
  for (const n of gambaN) g[n] = add(g[n], scale(o, ANCA))
  for (const n of gambaF) g[n] = add(g[n], scale(o, -ANCA))

  speciali[id]?.(g, t)
  return { giunti: g, j2d: j, def, piano }
}

const UA = 25 * S
const FA = 23 * S
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const norm = (v: V3): V3 => {
  const l = Math.hypot(...v) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

/** Porta le braccia dalla direzione `da` (t=0) all'apertura laterale (t=1), gomiti poco piegati. */
function apriBraccia(g: Scheletro3D, t: number, da: V3, apertura: number) {
  for (const [n, s] of [['N', 1], ['F', -1]] as const) {
    const d = norm(lerp3(da, [0, 0, s * apertura], t))
    const e = add(g[`sh${n}`], scale(d, UA))
    g[`elbow${n}`] = e
    g[`hand${n}`] = add(e, scale(norm(lerp3(d, [da[0], da[1], 0], 0.15)), FA))
  }
}

/** Ruota i giunti indicati attorno all'asse che passa per `c` con direzione `asse`, di `gradi`. */
function ruota(g: Scheletro3D, nomi: readonly Giunto[], c: V3, asse: V3, gradi: number) {
  const k = norm(asse)
  const a = (gradi * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  for (const n of nomi) {
    const v: V3 = [g[n][0] - c[0], g[n][1] - c[1], g[n][2] - c[2]]
    const kv = k[0] * v[0] + k[1] * v[1] + k[2] * v[2]
    const x: V3 = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]]
    g[n] = [0, 1, 2].map((i) => c[i] + v[i] * cos + x[i] * sin + k[i] * kv * (1 - cos)) as V3
  }
}

const BUSTO = ['shN', 'elbowN', 'handN', 'shF', 'elbowF', 'handF', 'head', 'shoulder', 'mid'] as const
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
/** Mani a terra piu' larghe (z > 0 lato vicino); il gomito sta a meta' tra spalla e mano, piu' in alto se il braccio e' piegato. */
function maniLarghe(g: Scheletro3D, zN: number, zF: number) {
  for (const [n, z] of [['N', zN], ['F', zF]] as const) {
    const sh = g[`sh${n}`]
    const h: V3 = [g[`hand${n}`][0], g[`hand${n}`][1], z]
    const piega = Math.max(0, UA + FA - Math.hypot(...sub3(h, sh)))
    g[`hand${n}`] = h
    g[`elbow${n}`] = add(lerp3(sh, h, 0.5), [0, piega * 0.3, (z > 0 ? 1 : -1) * piega * 0.6])
  }
}

/** Movimenti che non stanno in un piano: il braccio o la gamba ruotano fuori dal disegno. */
const speciali: Record<string, (g: Scheletro3D, t: number) => void> = {
  // il braccio superiore si apre ad arco sopra il corpo, dall'avanti all'indietro
  open_book(g, t) {
    const a = Math.PI * t
    const d: V3 = [0, Math.sin(a), Math.cos(a)]
    g.elbowN = add(g.shN, scale(d, UA))
    g.handN = add(g.shN, scale(d, UA + FA))
  },
  // gomito al fianco, l'avambraccio ruota sul piano orizzontale da dentro a fuori
  rotazioni_esterne_elastico(g, t) {
    const a = (-70 + 140 * t) * (Math.PI / 180)
    g.elbowN = add(g.shN, [0, -UA, 0])
    g.handN = add(g.elbowN, [Math.cos(a) * FA, 0, Math.sin(a) * FA])
  },
  // braccia che si aprono di lato (fuori dal piano del disegno)
  alzate_posteriori(g, t) {
    apriBraccia(g, t, [0, -1, 0], 0.9)
  },
  band_pull_apart(g, t) {
    apriBraccia(g, t, [1, 0, 0], 1)
  },
  // supino: le braccia si aprono di lato partendo dalla verticale
  croci_manubri(g, t) {
    apriBraccia(g, t, [0, 1, 0], 1)
  },
  ytw_prono(g, t) {
    // da Y (braccia avanti e in alto) a T (braccia di lato)
    apriBraccia(g, t, [1, 0.2, 0], 1)
  },
  // braccio incrociato davanti al petto, l'altra mano sul gomito
  stretch_spalla(g, t) {
    const d: V3 = norm([Math.sin((Math.PI / 2) * t) * 0.3, -1 + t, -t * 1.1])
    g.elbowN = add(g.shN, scale(d, UA))
    g.handN = add(g.elbowN, scale(norm([0.2, 0, -1]), FA * t + FA * 0.2 * (1 - t)))
    if (t > 0.05) {
      g.handF = lerp3(g.handF, add(g.elbowN, [0.05, 0, 0]), t)
      g.elbowF = lerp3(g.elbowF, add(g.shF, [0.18, -0.12, 0.05]), t)
    }
  },
  // caviglia sul ginocchio opposto, ginocchio aperto di lato
  stretch_piriforme(g) {
    g.ankleN = add(g.kneeF, [0, 0.05, 0.07])
    g.toeN = add(g.ankleN, [0, 0.02, -0.1])
    g.kneeN = add(lerp3(g.hipN, g.ankleN, 0.5), [0.05, 0.1, 0.3])
  },
  // tibia anteriore di traverso sul tappetino
  piccione(g, t) {
    if (t < 0.02) return
    const k = add(g.hipN, [UA * 1.3 * t, -g.hipN[1] + 0.06, 0.18 * t])
    g.kneeN = lerp3(g.kneeN, k, t)
    g.ankleN = lerp3(g.ankleN, add(g.kneeN, [0.02, 0, -0.38]), t)
    g.toeN = add(g.ankleN, [0, 0, -0.1])
  },
  // ginocchia che cadono di lato, braccia aperte a T
  torsione_supina(g, t) {
    for (const [n, s] of [['N', 1], ['F', -1]] as const) {
      g[`elbow${n}`] = add(g[`sh${n}`], [0, 0, s * UA])
      g[`hand${n}`] = add(g[`sh${n}`], [0, 0, s * (UA + FA)])
    }
    const a = (Math.PI / 2.4) * t
    for (const n of ['kneeN', 'ankleN', 'toeN', 'kneeF', 'ankleF', 'toeF'] as const) {
      const p = g[n]
      const h = p[1] - g.hip[1]
      g[n] = [p[0], g.hip[1] + h * Math.cos(a), p[2] - h * Math.sin(a)]
    }
  },
  // farfalla: i piedi stanno davanti al bacino
  stretch_adduttori(g) {
    for (const n of ['ankleN', 'toeN', 'ankleF', 'toeF'] as const) g[n] = [g[n][0] + 0.32, g[n][1], g[n][2] * 0.3]
    for (const n of ['kneeN', 'kneeF'] as const) g[n] = [g[n][0] + 0.15, g[n][1] + 0.08, g[n][2]]
  },
  // rotazione del busto da un lato all'altro attorno alla colonna
  russian_twist(g, t) {
    ruota(g, BUSTO, g.hip, sub3(g.shoulder, g.hip), 50 - 100 * t)
  },
  bicicletta(g, t) {
    ruota(g, BUSTO, g.hip, sub3(g.shoulder, g.hip), 30 - 60 * t)
  },
  // braccia tese che ruotano con il busto, dal cavo verso l'esterno
  twist_cavo(g, t) {
    ruota(g, BUSTO, g.hip, [0, 1, 0], -45 + 85 * t)
  },
  // il braccio libero si allunga di lato, teso, con la mano a terra
  plank_archer(g, t) {
    const h: V3 = [g.shF[0], 0.12, g.shF[2] - 0.36]
    g.handF = lerp3(g.handF, h, t)
    g.elbowF = lerp3(g.elbowF, lerp3(g.shF, h, 0.5), t)
  },
  // il manubrio passa sotto il corpo dal lato vicino a quello lontano
  plank_pull_through(g, t) {
    g.handF = [g.handF[0], g.handF[1], 0.15 - 0.45 * t]
    g.elbowF = add(lerp3(g.shF, g.handF, 0.5), [0, 0.05, 0])
  },
  // i piedi si aprono e si chiudono
  plank_jack(g, t) {
    for (const [n, s] of [['N', 1], ['F', -1]] as const) {
      g[`knee${n}`] = add(g[`knee${n}`], [0, 0, s * 0.1 * t])
      g[`ankle${n}`] = add(g[`ankle${n}`], [0, 0, s * 0.22 * t])
      g[`toe${n}`] = add(g[`toe${n}`], [0, 0, s * 0.22 * t])
    }
  },
  push_up_larghi(g) {
    maniLarghe(g, 0.42, -0.42)
  },
  push_up_diamante(g) {
    maniLarghe(g, 0.04, -0.04)
  },
  // mani molto larghe: si scende verso la mano vicina, l'altro braccio resta teso
  push_up_arciere(g, t) {
    const sposta: V3 = [0, 0, 0.14 * t]
    for (const n of ['hip', 'mid', 'shoulder', 'head', 'shN', 'shF', 'hipN', 'hipF'] as const) g[n] = add(g[n], sposta)
    maniLarghe(g, 0.5, -0.55)
    g.elbowF = lerp3(g.shF, g.handF, 0.5)
  },
  // il ginocchio sale di lato verso il gomito
  push_up_spiderman(g, t) {
    for (const [n, z] of [['kneeN', 0.38], ['ankleN', 0.3], ['toeN', 0.3]] as const) {
      const p = g[n]
      g[n] = [p[0], Math.max(p[1], 0.06), p[2] + z * t]
    }
  },
  // il kettlebell gira attorno alla testa, poi sale sopra la testa
  halo_spinta(g, t) {
    if (t >= 0.5) return
    const u = t / 0.5
    const a = 2 * Math.PI * u
    const c = add(g.head, [0, 0.02, 0])
    const m: V3 = add(c, [0.24 * Math.cos(a), 0, 0.24 * Math.sin(a)])
    g.handN = add(m, [0, 0, 0.04])
    g.handF = add(m, [0, 0, -0.04])
    g.elbowN = add(lerp3(g.shN, g.handN, 0.5), [0.04, -0.08, 0.08])
    g.elbowF = add(lerp3(g.shF, g.handF, 0.5), [0.04, -0.08, -0.08])
  },
  // la pianta del piede ruota verso l'esterno
  eversione_caviglia(g, t) {
    g.toeN = add(g.toeN, [0, -0.02 * t, 0.07 * t])
  },
  // 90/90: da seduti le gambe stanno sul pavimento, il disegno le mostra viste dall'alto
  anche_90_90(g) {
    // seduti a terra: il bacino scende al pavimento, le gambe (disegnate viste dall'alto) si stendono sul suolo
    const hy = g.hip[1]
    const giu = hy - 0.1
    for (const n of ['hip', 'mid', 'shoulder', 'head', 'shN', 'elbowN', 'handN', 'shF', 'elbowF', 'handF'] as const) {
      g[n] = [g[n][0], g[n][1] - giu, g[n][2]]
    }
    for (const n of ['kneeN', 'ankleN', 'toeN', 'kneeF', 'ankleF', 'toeF'] as const) {
      const p = g[n]
      g[n] = [(hy - p[1]) * 1.1, 0.06, p[2]]
    }
    g.hipN = [0, 0.09, g.hipN[2]]
    g.hipF = [0, 0.09, g.hipF[2]]
  },
}

// ---------- attrezzi ----------

export type Oggetto3D =
  | { k: 'box'; centro: V3; dim: V3; tono: 'attrezzo' | 'muro' | 'tappeto' }
  | { k: 'cilindro'; a: V3; b: V3; r: number; tono: 'attrezzo' | 'accento' }
  | { k: 'sfera'; centro: V3; r: number; tono: 'attrezzo' | 'accento' }
  | { k: 'linea'; punti: V3[]; tono: 'attrezzo' | 'accento' }

/** Converte un punto 2D di un attrezzo: se coincide con un giunto usa la posizione 3D del giunto. */
function punto(piano: Piano, j2d: Joints, g: Scheletro3D, p: Vec): V3 {
  for (const n of ['handN', 'handF', 'kneeN', 'kneeF', 'ankleN', 'ankleF'] as const) {
    if (Math.hypot(j2d[n][0] - p[0], j2d[n][1] - p[1]) < 4) return g[n]
  }
  return mappa(piano, p)
}

const centroMani = (g: Scheletro3D): V3 => scale(add(g.handN, g.handF), 0.5)

export function oggetti3D(id: string, t: number, g: Scheletro3D, j2d: Joints, def: FiguraDef, piano: Piano): Oggetto3D[] {
  const props: Prop[] = [...(def.back?.(j2d, t) ?? []), ...(def.props?.(j2d, t) ?? [])]
  const out: Oggetto3D[] = []
  const manoUnica = id === 'suitcase_carry' || id === 'rematore_manubrio' || id === 'landmine_press' || id === 'turkish_get_up' || id === 'push_press_kettlebell' || id === 'strappo_manubrio'
  const maniInsieme = Math.hypot(j2d.handN[0] - j2d.handF[0], j2d.handN[1] - j2d.handF[1]) < 3
  const P = (p: Vec) => punto(piano, j2d, g, p)
  const lato = piano === 'sagittale'

  for (const pr of props) {
    switch (pr.k) {
      case 'plate': {
        const c = lato ? ([P(pr.at)[0], P(pr.at)[1], 0] as V3) : P(pr.at)
        const r = (pr.r ?? 12) * S
        if (id === 'landmine_press') {
          out.push({ k: 'cilindro', a: add(c, [0, 0, -0.03]), b: add(c, [0, 0, 0.03]), r, tono: 'attrezzo' })
          break
        }
        out.push({ k: 'cilindro', a: add(c, [0, 0, -0.55]), b: add(c, [0, 0, 0.55]), r: 0.014, tono: 'attrezzo' })
        for (const z of [-0.36, 0.36]) out.push({ k: 'cilindro', a: add(c, [0, 0, z - 0.04]), b: add(c, [0, 0, z + 0.04]), r, tono: 'attrezzo' })
        break
      }
      case 'dumbbell': {
        const mani = maniInsieme && !manoUnica ? [g.handN, g.handF] : [P(pr.at)]
        for (const m of mani) {
          out.push({ k: 'cilindro', a: add(m, [0, 0, -0.1]), b: add(m, [0, 0, 0.1]), r: 0.02, tono: 'attrezzo' })
          for (const z of [-0.1, 0.1]) out.push({ k: 'cilindro', a: add(m, [0, 0, z - 0.03]), b: add(m, [0, 0, z + 0.03]), r: 0.055, tono: 'attrezzo' })
        }
        break
      }
      case 'kettlebell': {
        const m = manoUnica ? P(pr.at) : centroMani(g)
        const d = ((pr.dir ?? 90) * Math.PI) / 180
        const c: V3 = lato ? [m[0] + Math.cos(d) * 0.11, m[1] - Math.sin(d) * 0.11, m[2]] : [m[0], m[1] - 0.11, m[2]]
        out.push({ k: 'sfera', centro: c, r: 0.095, tono: 'attrezzo' })
        break
      }
      case 'ball': {
        const vicino = Math.hypot(j2d.handN[0] - pr.at[0], j2d.handN[1] - pr.at[1]) < 14
        const c = vicino ? centroMani(g) : mappa(piano, pr.at)
        out.push({ k: 'sfera', centro: c, r: (pr.r ?? 8) * S * 1.2, tono: 'accento' })
        break
      }
      case 'bench':
      case 'box': {
        const a = mappa(piano, [pr.x1, pr.top])
        const b = mappa(piano, [pr.x2, G + 4])
        const larg = pr.k === 'bench' ? 0.34 : 0.55
        const dim: V3 = lato ? [Math.abs(b[0] - a[0]), a[1], larg] : [larg, a[1], Math.abs(b[2] - a[2])]
        const centro: V3 = lato ? [(a[0] + b[0]) / 2, a[1] / 2, 0] : [0, a[1] / 2, (a[2] + b[2]) / 2]
        out.push({ k: 'box', centro, dim, tono: 'attrezzo' })
        break
      }
      case 'wall': {
        const a = mappa(piano, [pr.x, 0])
        const dietro = pr.side === 'left' ? -0.05 : 0.05
        out.push(
          lato
            ? { k: 'box', centro: [a[0] + dietro, 1.1, 0], dim: [0.06, 2.2, 1.4], tono: 'muro' }
            : { k: 'box', centro: [0, 1.1, a[2] + dietro], dim: [1.4, 2.2, 0.06], tono: 'muro' },
        )
        break
      }
      case 'post': {
        const a = mappa(piano, [pr.x, pr.top])
        const b = mappa(piano, [pr.x, G + 4])
        out.push({ k: 'cilindro', a: b, b: a, r: 0.035, tono: 'attrezzo' })
        break
      }
      case 'band':
      case 'strap': {
        const tono = pr.k === 'band' ? 'accento' : 'attrezzo'
        const a = P(pr.from)
        const b = P(pr.to)
        if (maniInsieme && !manoUnica && (b === g.handN || a === g.handN)) {
          // presa a due mani: un capo per mano
          const altro = a === g.handN ? b : a
          out.push({ k: 'linea', punti: [altro, g.handN], tono }, { k: 'linea', punti: [altro, g.handF], tono })
        } else out.push({ k: 'linea', punti: [a, b], tono })
        break
      }
      case 'bar': {
        const c = P(pr.at)
        out.push({ k: 'cilindro', a: add(c, [0, 0, -0.4]), b: add(c, [0, 0, 0.4]), r: 0.015, tono: 'attrezzo' })
        break
      }
      case 'pullbar': {
        const c = mappa(piano, pr.at)
        out.push({ k: 'cilindro', a: add(c, [0, 0, -0.7]), b: add(c, [0, 0, 0.7]), r: 0.018, tono: 'attrezzo' })
        break
      }
      case 'sled': {
        const verso = pr.front === 'left' ? -1 : 1
        const a = mappa(piano, [pr.x, G + 4])
        out.push({ k: 'box', centro: [a[0] + verso * 0.25, 0.06, 0], dim: [0.55, 0.1, 0.6], tono: 'attrezzo' })
        out.push({ k: 'box', centro: [a[0] + verso * 0.25, 0.2, 0], dim: [0.3, 0.18, 0.35], tono: 'attrezzo' })
        if (pr.handle) for (const z of [-0.2, 0.2]) out.push({ k: 'cilindro', a: [a[0], 0.1, z], b: [g.handN[0], g.handN[1], z], r: 0.02, tono: 'attrezzo' })
        break
      }
      case 'rope': {
        const fine = mappa(piano, pr.to)
        for (const m of [g.handN, g.handF]) {
          const pts: V3[] = []
          for (let i = 0; i <= 20; i++) {
            const u = i / 20
            const amp = 0.12 * (1 - u) * Math.sin(u * Math.PI * 3 - pr.phase * Math.PI * 2 + (m === g.handF ? Math.PI : 0))
            pts.push([m[0] + (fine[0] - m[0]) * u, m[1] + (fine[1] - m[1]) * u + amp, m[2] * (1 - u)])
          }
          out.push({ k: 'linea', punti: pts, tono: 'attrezzo' })
        }
        break
      }
      case 'slider': {
        const sotto = Math.hypot(j2d.handN[0] - pr.at[0], j2d.handN[1] - pr.at[1]) < 4 ? [g.handN, g.handF] : [g.ankleN, g.ankleF]
        for (const p of sotto) out.push({ k: 'cilindro', a: [p[0], 0, p[2]], b: [p[0], 0.015, p[2]], r: 0.08, tono: 'accento' })
        break
      }
      case 'mat':
      case 'rug':
        out.push({ k: 'box', centro: [0, 0.005, 0], dim: piano === 'sagittale' ? [2.2, 0.01, 0.8] : [1.2, 0.01, 2], tono: 'tappeto' })
        break
      case 'belly':
        break
    }
  }
  return out
}
