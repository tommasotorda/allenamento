/**
 * Motore delle figure: un omino stilizzato definito da angoli (cinematica diretta)
 * o da bersagli per mani/piedi (cinematica inversa a due segmenti), disegnato come SVG.
 *
 * Convenzioni: angoli in gradi, 0 = destra, 90 = giu', -90 = su (asse y dello schermo).
 * In vista di profilo la figura guarda a destra; gli arti "N" sono quelli vicini
 * (pieni), gli "F" quelli lontani (sbiaditi). Con `front: true` la figura e' vista
 * di fronte: spalle e anche hanno larghezza e gli arti hanno la stessa opacita'.
 */

export type Vec = [number, number]

export const W = 240
export const H = 196
/** Quota a cui poggia il centro di un'articolazione a contatto con il pavimento. */
export const G = 180

const L = { torso: 44, neck: 13, ua: 25, fa: 23, th: 36, sh: 34, ft: 10, headR: 9 }

export interface IK {
  ik: Vec
  /** Lato della piega: 1 = senso orario rispetto alla retta radice-bersaglio, -1 = antiorario. */
  bend?: 1 | -1
  /** Solo gambe: angolo del piede. */
  foot?: number
}
export type Arm = [number, number] | IK
export type Leg = [number, number, number?] | IK

export interface Pose {
  /** Anca [x, y]; senza y la figura viene appoggiata a terra automaticamente. */
  hip: [number, number?]
  /** Con appoggio automatico: sollevamento dal suolo (salti). */
  lift?: number
  torso: number
  /** Curvatura della schiena in px (+ verso la schiena). */
  curve?: number
  head?: number
  armN: Arm
  armF?: Arm
  legN: Leg
  legF?: Leg
}

export type Joints = Record<
  | 'hip' | 'hipN' | 'hipF' | 'shoulder' | 'shN' | 'shF' | 'head' | 'mid'
  | 'elbowN' | 'handN' | 'elbowF' | 'handF'
  | 'kneeN' | 'ankleN' | 'toeN' | 'kneeF' | 'ankleF' | 'toeF',
  Vec
> & { torsoAngle: number; curve: number }

export type Prop =
  | { k: 'plate'; at: Vec; r?: number }
  | { k: 'dumbbell'; at: Vec }
  | { k: 'kettlebell'; at: Vec; dir?: number }
  | { k: 'ball'; at: Vec; r?: number }
  | { k: 'bench'; x1: number; x2: number; top: number }
  | { k: 'box'; x1: number; x2: number; top: number }
  | { k: 'wall'; x: number; side?: 'left' | 'right' }
  | { k: 'post'; x: number; top: number }
  | { k: 'band'; from: Vec; to: Vec }
  | { k: 'strap'; from: Vec; to: Vec }
  | { k: 'bar'; at: Vec; len?: number }
  | { k: 'pullbar'; at: Vec }
  | { k: 'sled'; x: number; handle?: Vec; front?: 'left' | 'right' }
  | { k: 'rope'; from: Vec; to: Vec; phase: number }
  | { k: 'slider'; at: Vec }
  | { k: 'belly'; at: Vec; r: number }
  | { k: 'mat'; x1: number; x2: number }
  | { k: 'rug'; x1: number; y1: number; x2: number; y2: number; skew?: number }

export interface FiguraDef {
  a: Pose
  b: Pose
  props?: (j: Joints, t: number) => Prop[]
  /** Oggetti da disegnare dietro la figura (panche, muri...). */
  back?: (j: Joints, t: number) => Prop[]
  front?: boolean
  floor?: boolean
  /** Pendenza del terreno in gradi (salita verso destra). */
  slope?: number
  /** Fotogramma per la miniatura statica: 0 = A, 1 = B. */
  thumb?: 0 | 1
  /** Frazione del ciclo ferma su ciascuna posizione. */
  hold?: number
  /** Durata di un ciclo completo A -> B -> A in ms. */
  period?: number
}

// ---------- geometria ----------

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const dir = (a: number): Vec => [Math.cos(rad(a)), Math.sin(rad(a))]
const add = (p: Vec, a: number, l: number): Vec => {
  const [dx, dy] = dir(a)
  return [p[0] + dx * l, p[1] + dy * l]
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpV = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
/** Interpolazione angolare lungo l'arco piu' corto. */
function lerpA(a: number, b: number, t: number) {
  let d = ((b - a) % 360 + 540) % 360 - 180
  if (Math.abs(d) === 180) d = b > a ? 180 : -180
  return a + d * t
}

/** Cinematica inversa a due segmenti: restituisce gli angoli del primo e secondo segmento. */
function solveIK(root: Vec, target: Vec, l1: number, l2: number, bend: 1 | -1): [number, number] {
  const dx = target[0] - root[0]
  const dy = target[1] - root[1]
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.001)
  const base = deg(Math.atan2(dy, dx))
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
  const alpha = deg(Math.acos(Math.max(-1, Math.min(1, cosA))))
  const a1 = base + bend * alpha
  const mid = add(root, a1, l1)
  const a2 = deg(Math.atan2(target[1] - mid[1], target[0] - mid[0]))
  return [a1, a2]
}

const isIK = (x: Arm | Leg | undefined): x is IK => !!x && !Array.isArray(x)

// ---------- risoluzione della posa ----------

interface Resolved {
  hip: Vec
  auto: boolean
  lift: number
  torso: number
  curve: number
  head: number
  armN: Arm
  armF: Arm
  legN: Leg
  legF: Leg
}

function normalizza(p: Pose): Resolved {
  return {
    hip: [p.hip[0], p.hip[1] ?? 0],
    auto: p.hip[1] === undefined,
    lift: p.lift ?? 0,
    torso: p.torso,
    curve: p.curve ?? 0,
    head: p.head ?? p.torso,
    armN: p.armN,
    armF: p.armF ?? p.armN,
    legN: p.legN,
    legF: p.legF ?? p.legN,
  }
}

function groundY(def: FiguraDef, x: number) {
  return G - Math.tan(rad(def.slope ?? 0)) * (x - W / 2)
}

function scheletro(r: Resolved, def: FiguraDef): Joints {
  const front = !!def.front
  const hip = r.hip
  const shoulder = add(hip, r.torso, L.torso)
  const head = add(shoulder, r.head, L.neck)
  const perp = r.torso + 90
  const shN = front ? add(shoulder, perp, 12) : shoulder
  const shF = front ? add(shoulder, perp, -12) : shoulder
  const hipN = front ? add(hip, perp, 7) : hip
  const hipF = front ? add(hip, perp, -7) : hip

  const arm = (root: Vec, a: Arm): [Vec, Vec] => {
    const [u, f] = isIK(a) ? solveIK(root, a.ik, L.ua, L.fa, a.bend ?? 1) : a
    const e = add(root, u, L.ua)
    return [e, add(e, f, L.fa)]
  }
  const leg = (root: Vec, l: Leg, piedeDef: number): [Vec, Vec, Vec] => {
    let t: number, s: number, f: number
    if (isIK(l)) {
      ;[t, s] = solveIK(root, l.ik, L.th, L.sh, l.bend ?? -1)
      f = l.foot ?? piedeDef
    } else {
      ;[t, s] = [l[0], l[1]]
      f = l[2] ?? piedeDef
    }
    const k = add(root, t, L.th)
    const an = add(k, s, L.sh)
    return [k, an, add(an, f, L.ft)]
  }

  const [elbowN, handN] = arm(shN, r.armN)
  const [elbowF, handF] = arm(shF, r.armF)
  const [kneeN, ankleN, toeN] = leg(hipN, r.legN, front ? 20 : 0)
  const [kneeF, ankleF, toeF] = leg(hipF, r.legF, front ? 160 : 0)
  const mid = lerpV(hip, shoulder, 0.5)

  const j = {
    hip, hipN, hipF, shoulder, shN, shF, head, mid,
    elbowN, handN, elbowF, handF, kneeN, ankleN, toeN, kneeF, ankleF, toeF,
    torsoAngle: r.torso, curve: r.curve,
  } as Joints

  if (r.auto) {
    const punti: Vec[] = [hipN, hipF, shN, shF, elbowN, handN, elbowF, handF, kneeN, ankleN, toeN, kneeF, ankleF, toeF, [head[0], head[1] + 5]]
    const dy = Math.min(...punti.map((p) => groundY(def, p[0]) - r.lift - p[1]))
    for (const k of Object.keys(j) as (keyof Joints)[]) {
      const v = j[k]
      if (Array.isArray(v)) j[k] = [v[0], v[1] + dy] as never
    }
  }
  return j
}

/** Converte un arto in angoli usando lo scheletro gia' risolto del fotogramma. */
function angoliArto(j: Joints, quale: 'N' | 'F', tipo: 'arm' | 'leg'): number[] {
  const ang = (a: Vec, b: Vec) => deg(Math.atan2(b[1] - a[1], b[0] - a[0]))
  if (tipo === 'arm') {
    const s = quale === 'N' ? j.shN : j.shF
    const e = quale === 'N' ? j.elbowN : j.elbowF
    const h = quale === 'N' ? j.handN : j.handF
    return [ang(s, e), ang(e, h)]
  }
  const hp = quale === 'N' ? j.hipN : j.hipF
  const k = quale === 'N' ? j.kneeN : j.kneeF
  const a = quale === 'N' ? j.ankleN : j.ankleF
  const t = quale === 'N' ? j.toeN : j.toeF
  return [ang(hp, k), ang(k, a), ang(a, t)]
}

/** Scheletro interpolato tra A (t=0) e B (t=1). */
export function posaA(def: FiguraDef, t: number): Joints {
  const a = normalizza(def.a)
  const b = normalizza(def.b)
  const ja = scheletro(a, def)
  const jb = scheletro(b, def)
  if (t <= 0) return ja
  if (t >= 1) return jb

  const auto = a.auto && b.auto
  const r: Resolved = {
    hip: auto ? [lerp(a.hip[0], b.hip[0], t), 0] : lerpV(ja.hip, jb.hip, t),
    auto,
    lift: lerp(a.lift, b.lift, t),
    torso: lerpA(a.torso, b.torso, t),
    curve: lerp(a.curve, b.curve, t),
    head: lerpA(a.head, b.head, t),
    armN: [0, 0],
    armF: [0, 0],
    legN: [0, 0, 0],
    legF: [0, 0, 0],
  }
  for (const [campo, quale, tipo] of [
    ['armN', 'N', 'arm'],
    ['armF', 'F', 'arm'],
    ['legN', 'N', 'leg'],
    ['legF', 'F', 'leg'],
  ] as const) {
    const la = a[campo]
    const lb = b[campo]
    if (isIK(la) && isIK(lb)) {
      r[campo] = { ik: lerpV(la.ik, lb.ik, t), bend: la.bend, foot: lerpA(la.foot ?? 0, lb.foot ?? 0, t) } as never
    } else {
      const xa = angoliArto(ja, quale, tipo)
      const xb = angoliArto(jb, quale, tipo)
      r[campo] = xa.map((v, i) => lerpA(v, xb[i], t)) as never
    }
  }
  return scheletro(r, def)
}

// ---------- disegno ----------

const f1 = (n: number) => Math.round(n * 10) / 10
const pt = (p: Vec) => `${f1(p[0])},${f1(p[1])}`
const line = (a: Vec, b: Vec, extra = '') => `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}"${extra}/>`
const poly = (ps: Vec[], extra = '') => `<polyline points="${ps.map(pt).join(' ')}" fill="none"${extra}/>`

const PROP = 'var(--fig-prop,#64748b)'
const ACC = 'var(--fig-accent,#f97316)'
const FLOOR = 'var(--fig-floor,#cbd5e1)'

function disegnaProp(p: Prop): string {
  switch (p.k) {
    case 'plate': {
      const r = p.r ?? 12
      return `<circle cx="${f1(p.at[0])}" cy="${f1(p.at[1])}" r="${r}" fill="${PROP}" fill-opacity=".25" stroke="${PROP}" stroke-width="3"/><circle cx="${f1(p.at[0])}" cy="${f1(p.at[1])}" r="2.5" fill="${PROP}"/>`
    }
    case 'dumbbell':
      return `<rect x="${f1(p.at[0] - 7)}" y="${f1(p.at[1] - 5)}" width="14" height="10" rx="3" fill="${PROP}"/>`
    case 'kettlebell': {
      const c = add(p.at, p.dir ?? 90, 9)
      return `<circle cx="${f1(p.at[0])}" cy="${f1(p.at[1])}" r="3.5" fill="none" stroke="${PROP}" stroke-width="2.5"/><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="7.5" fill="${PROP}"/>`
    }
    case 'ball':
      return `<circle cx="${f1(p.at[0])}" cy="${f1(p.at[1])}" r="${p.r ?? 8}" fill="${ACC}"/>`
    case 'bench': {
      const { x1, x2, top } = p
      return `<g stroke="${PROP}" stroke-linecap="round">${line([x1 + 6, top + 4], [x1 + 6, G + 4], ' stroke-width="3"')}${line([x2 - 6, top + 4], [x2 - 6, G + 4], ' stroke-width="3"')}</g><rect x="${x1}" y="${top}" width="${x2 - x1}" height="6" rx="2" fill="${PROP}"/>`
    }
    case 'box':
      return `<rect x="${p.x1}" y="${p.top}" width="${p.x2 - p.x1}" height="${f1(G + 4 - p.top)}" rx="2" fill="${PROP}" fill-opacity=".22" stroke="${PROP}" stroke-width="2.5"/>`
    case 'wall': {
      const left = p.side === 'left'
      const x = left ? 0 : p.x
      const w = left ? p.x : W - p.x
      return `<rect x="${x}" y="4" width="${w}" height="${G}" fill="${PROP}" fill-opacity=".15"/>${line([p.x, 4], [p.x, G + 4], ` stroke="${PROP}" stroke-width="3"`)}`
    }
    case 'post':
      return line([p.x, p.top], [p.x, G + 4], ` stroke="${PROP}" stroke-width="5" stroke-linecap="round"`)
    case 'band':
      return line(p.from, p.to, ` stroke="${ACC}" stroke-width="3" stroke-linecap="round"`)
    case 'strap':
      return line(p.from, p.to, ` stroke="${PROP}" stroke-width="2.5" stroke-linecap="round"`)
    case 'bar': {
      const l = p.len ?? 28
      return line([p.at[0] - l, p.at[1]], [p.at[0] + l, p.at[1]], ` stroke="${PROP}" stroke-width="4" stroke-linecap="round"`)
    }
    case 'pullbar':
      return `${line([p.at[0] - 40, p.at[1] - 6], [p.at[0] + 40, p.at[1] - 6], ` stroke="${PROP}" stroke-width="2" stroke-opacity=".5"`)}<circle cx="${f1(p.at[0])}" cy="${f1(p.at[1])}" r="5" fill="${PROP}"/>`
    case 'sled': {
      const x = p.x
      const verso = p.front === 'left' ? -1 : 1
      const base = `<path d="M${x} ${G + 4} h${40 * verso} l${4 * verso} -8 h${-44 * verso} z" fill="${PROP}"/><rect x="${verso > 0 ? x + 8 : x - 32}" y="${G - 16}" width="24" height="12" rx="2" fill="${PROP}" fill-opacity=".5"/>`
      return p.handle ? base + line([x, G - 2], p.handle, ` stroke="${PROP}" stroke-width="4" stroke-linecap="round"`) : base
    }
    case 'rope': {
      const n = 24
      const ps: Vec[] = []
      for (let i = 0; i <= n; i++) {
        const u = i / n
        const amp = 10 * (1 - u) * Math.sin(u * Math.PI * 3 - p.phase * Math.PI * 2)
        ps.push([lerp(p.from[0], p.to[0], u), lerp(p.from[1], p.to[1], u) + amp])
      }
      return poly(ps, ` stroke="${PROP}" stroke-width="3.5" stroke-linecap="round"`)
    }
    case 'slider':
      return `<ellipse cx="${f1(p.at[0])}" cy="${G + 2}" rx="9" ry="3" fill="${ACC}"/>`
    case 'belly':
      return `<circle cx="${f1(p.at[0])}" cy="${f1(p.at[1])}" r="${f1(p.r)}" fill="${ACC}" fill-opacity=".35"/>`
    case 'rug': {
      const k = p.skew ?? 0
      return `<path d="M${p.x1 + k} ${p.y1} H${p.x2 + k} L${p.x2} ${p.y2} H${p.x1} Z" fill="${ACC}" fill-opacity=".18"/>`
    }
    case 'mat':
      return `<rect x="${p.x1}" y="${G + 3}" width="${p.x2 - p.x1}" height="4" rx="2" fill="${ACC}" fill-opacity=".35"/>`
  }
}

function torsoPath(j: Joints): string {
  const [hx, hy] = j.hip
  const [sx, sy] = j.shoulder
  if (!j.curve) return `M${f1(hx)} ${f1(hy)} L${f1(sx)} ${f1(sy)}`
  // normale verso la schiena: direzione del busto ruotata di -90 gradi
  const [nx, ny] = dir(j.torsoAngle - 90)
  const cx = (hx + sx) / 2 + nx * j.curve * 2
  const cy = (hy + sy) / 2 + ny * j.curve * 2
  return `M${f1(hx)} ${f1(hy)} Q${f1(cx)} ${f1(cy)} ${f1(sx)} ${f1(sy)}`
}

/** SVG completo della figura al tempo t (0 = posizione A, 1 = posizione B). */
export function figuraSvg(def: FiguraDef, t: number, attrs = ''): string {
  const j = posaA(def, t)
  const front = !!def.front
  const out: string[] = []

  if (def.floor !== false) {
    const y1 = groundY(def, 0) + 4
    const y2 = groundY(def, W) + 4
    out.push(`<line x1="0" y1="${f1(y1)}" x2="${W}" y2="${f1(y2)}" stroke="${FLOOR}" stroke-width="2"/>`)
  }
  if (def.back) out.push(...def.back(j, t).map(disegnaProp))

  const limb = (ps: Vec[], w: number) => poly(ps, ` stroke-width="${w}"`)
  const lontano: string[] = [
    limb([j.hipF, j.kneeF, j.ankleF, j.toeF], 7),
    limb([j.shF, j.elbowF, j.handF], 6),
  ]
  out.push(`<g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"${front ? '' : ' opacity=".4"'}>${lontano.join('')}</g>`)

  const vicino: string[] = [`<path d="${torsoPath(j)}" fill="none" stroke-width="9"/>`]
  if (front) {
    vicino.push(line(j.shN, j.shF, ' stroke-width="8"'), line(j.hipN, j.hipF, ' stroke-width="8"'))
  }
  vicino.push(limb([j.hipN, j.kneeN, j.ankleN, j.toeN], 7), limb([j.shN, j.elbowN, j.handN], 6))
  out.push(`<g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${vicino.join('')}</g>`)
  out.push(`<circle cx="${f1(j.head[0])}" cy="${f1(j.head[1])}" r="${L.headR}" fill="currentColor"/>`)

  if (def.props) out.push(...def.props(j, t).map(disegnaProp))

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ${attrs}>${out.join('')}</svg>`
}

// ---------- animazione ----------

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)

/** Mappa il tempo (ms) nella fase t 0..1..0 con pause sulle due posizioni. */
export function faseAnimazione(def: FiguraDef, ms: number): number {
  const periodo = def.period ?? 2800
  const hold = def.hold ?? 0.18
  const u = (ms % periodo) / periodo
  const muovi = 0.5 - hold
  if (u < hold / 2) return 0
  if (u < hold / 2 + muovi) return easeInOut((u - hold / 2) / muovi)
  if (u < hold / 2 + muovi + hold) return 1
  if (u < 1 - hold / 2) return 1 - easeInOut((u - hold / 2 - muovi - hold) / muovi)
  return 0
}

export { add, lerpV, dir }
