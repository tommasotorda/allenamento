/**
 * Pose A (inizio) e B (fine) per ogni esercizio della libreria.
 * Vedi engine.ts per le convenzioni sugli angoli.
 */
import { G, add, lerpV, type FiguraDef, type Joints, type Pose, type Vec } from './engine'

/** Passo di corsa/camminata: A con gamba vicina avanti, B con gamba vicina dietro. */
function falcata(opts: { lean: number; ampiezza: number; braccia: 'corsa' | 'pesi' | 'avanti' | 'dietro'; x?: number }): { a: Pose; b: Pose } {
  const { lean, ampiezza: k } = opts
  const x = opts.x ?? 120
  const avanti: [number, number, number] = [90 - 40 * k, 90 + 15 * k, -5]
  const dietro: [number, number, number] = [90 + 30 * k, 90 + 60 * k, 40 * k]
  const bAvanti: [number, number] = [90 - 45 * k, -30]
  const bDietro: [number, number] = [90 + 45 * k, 90 - 60 * k]
  const pesi: [number, number] = [92, 92]
  const armi = (n: 'a' | 'b'): { armN: [number, number]; armF: [number, number] } => {
    switch (opts.braccia) {
      case 'corsa':
        return n === 'a' ? { armN: bDietro, armF: bAvanti } : { armN: bAvanti, armF: bDietro }
      case 'pesi':
        return { armN: pesi, armF: pesi }
      case 'avanti':
        return { armN: [-20 + lean + 90, -15 + lean + 90], armF: [-20 + lean + 90, -15 + lean + 90] }
      case 'dietro':
        return { armN: [20, 20], armF: [20, 20] }
    }
  }
  return {
    a: { hip: [x], torso: -90 + lean, legN: avanti, legF: dietro, ...armi('a') },
    b: { hip: [x], torso: -90 + lean, legN: dietro, legF: avanti, ...armi('b') },
  }
}

/** Palla che parte dalle mani e vola verso un punto nella seconda meta' del movimento. */
function volo(mani: Vec, arrivo: Vec, t: number, da = 0.55): Vec {
  if (t <= da) return mani
  return lerpV(mani, arrivo, (t - da) / (1 - da))
}

const mani = (j: Joints): Vec => lerpV(j.handN, j.handF, 0.5)

export const FIGURE: Record<string, FiguraDef> = {
  // ---------------- CORE ----------------
  plank: {
    a: { hip: [100], torso: -9, armN: [90, 0], legN: [150, 180, 180] },
    b: { hip: [100], torso: -12, armN: [90, 0], legN: [168, 168, 110] },
    back: () => [{ k: 'mat', x1: 20, x2: 220 }],
  },
  side_plank: {
    a: { hip: [100], torso: -32, head: -40, armN: [60, 100], armF: [90, 0], legN: [180, 180, 190], legF: [178, 178, 190] },
    b: { hip: [100], torso: -12, head: -15, armN: [-90, -90], armF: [90, 0], legN: [168, 168, 180], legF: [166, 166, 180] },
    back: () => [{ k: 'mat', x1: 20, x2: 220 }],
  },
  dead_bug: {
    a: { hip: [140], torso: 180, armN: [-90, -90], armF: [-88, -88], legN: [-90, 0, -90], legF: [-88, 2, -88] },
    b: { hip: [140], torso: 180, armN: [192, 190], armF: [-88, -88], legN: [-90, 0, -90], legF: [-8, -6, -70] },
    back: () => [{ k: 'mat', x1: 40, x2: 225 }],
  },
  bird_dog: {
    a: { hip: [95], torso: -10, head: -5, armN: [95, 105], armF: [92, 102], legN: [90, 180, 180], legF: [88, 180, 180] },
    b: { hip: [95], torso: -10, head: -5, armN: [-8, -8], armF: [92, 102], legN: [90, 180, 180], legF: [178, 178, 180] },
    back: () => [{ k: 'mat', x1: 20, x2: 220 }],
  },
  pallof_press: {
    a: { hip: [130], torso: -90, armN: [105, -20], armF: [100, -25], legN: [80, 100], legF: [95, 88] },
    b: { hip: [130], torso: -90, armN: [2, 2], armF: [4, 4], legN: [80, 100], legF: [95, 88] },
    back: (j) => [{ k: 'post', x: 30, top: 20 }, { k: 'band', from: [30, j.handN[1] + 2], to: j.handN }],
  },
  hollow_hold: {
    a: { hip: [130], torso: 180, armN: [180, 180], armF: [182, 182], legN: [0, 0, -70], legF: [2, 2, -70] },
    b: { hip: [130], torso: -165, curve: -3, head: -150, armN: [-165, -170], armF: [-163, -168], legN: [-14, -14, -60], legF: [-12, -12, -60] },
    back: () => [{ k: 'mat', x1: 20, x2: 225 }],
  },
  mcgill_curl_up: {
    a: { hip: [140], torso: 180, armN: [3, 0], legN: [-50, 50, 0], legF: [0, 0, -80] },
    b: { hip: [140], torso: -170, head: -160, armN: [10, 2], legN: [-50, 50, 0], legF: [0, 0, -80] },
    back: () => [{ k: 'mat', x1: 40, x2: 225 }],
  },

  // ---------------- FORZA ----------------
  trap_bar_deadlift: {
    thumb: 0,
    a: { hip: [100, G - 52], torso: -42, head: -35, armN: [90, 90], armF: [90, 90], legN: { ik: [124, G], foot: 0 }, legF: { ik: [122, G], foot: 0 } },
    b: { hip: [118, G - 69], torso: -90, armN: [92, 90], armF: [90, 90], legN: { ik: [124, G], foot: 0 }, legF: { ik: [122, G], foot: 0 } },
    props: (j) => [{ k: 'plate', at: [j.handN[0], j.handN[1] + 2], r: 13 }],
  },
  trazioni: {
    thumb: 1,
    a: { hip: [120, 118], torso: -90, armN: { ik: [120, 26], bend: 1 }, armF: { ik: [120, 26], bend: 1 }, legN: [95, 155, 100], legF: [99, 160, 100] },
    b: { hip: [110, 72], torso: -88, armN: { ik: [120, 26], bend: 1 }, armF: { ik: [120, 26], bend: 1 }, legN: [95, 155, 100], legF: [99, 160, 100] },
    back: () => [{ k: 'pullbar', at: [120, 26] }],
  },
  hip_thrust: {
    a: { hip: [88, G - 14], torso: -150, head: -140, armN: { ik: [92, G - 26], bend: -1 }, legN: { ik: [128, G], bend: -1, foot: 0 }, legF: { ik: [126, G], bend: -1, foot: 0 } },
    b: { hip: [92, G - 36], torso: 180, head: -150, armN: { ik: [94, G - 46], bend: -1 }, legN: { ik: [128, G], bend: -1, foot: 0 }, legF: { ik: [126, G], bend: -1, foot: 0 } },
    back: () => [{ k: 'bench', x1: 18, x2: 56, top: G - 34 }],
    props: (j) => [{ k: 'plate', at: [j.hip[0] + 2, j.hip[1] - 12], r: 13 }],
  },
  rematore_manubrio: {
    a: { hip: [90, G - 70], torso: 0, head: -10, armN: [90, 90], armF: { ik: [132, G - 34], bend: 1 }, legN: [95, 88], legF: [90, 180, 180] },
    b: { hip: [90, G - 70], torso: 0, head: -10, armN: [-140, 90], armF: { ik: [132, G - 34], bend: 1 }, legN: [95, 88], legF: [90, 180, 180] },
    back: () => [{ k: 'bench', x1: 50, x2: 150, top: G - 30 }],
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },
  farmer_carry: {
    ...falcata({ lean: 0, ampiezza: 0.55, braccia: 'pesi' }),
    hold: 0,
    period: 1300,
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },
  box_squat: {
    a: { hip: [108, G - 69], torso: -90, armN: [80, -95], armF: [80, -95], legN: { ik: [120, G], foot: 0 }, legF: { ik: [118, G], foot: 0 } },
    b: { hip: [80, G - 40], torso: -58, head: -65, armN: [60, -80], armF: [60, -80], legN: { ik: [120, G], foot: 0 }, legF: { ik: [118, G], foot: 0 } },
    back: () => [{ k: 'box', x1: 40, x2: 84, top: G - 34 }],
    props: (j) => [{ k: 'kettlebell', at: j.handN, dir: 90 }],
  },
  panca_piana: {
    a: { hip: [140, G - 38], torso: 180, armN: [60, -92], armF: [62, -92], legN: { ik: [168, G], bend: -1, foot: 0 }, legF: { ik: [166, G], bend: -1, foot: 0 } },
    b: { hip: [140, G - 38], torso: 180, armN: [-80, -80], armF: [-80, -80], legN: { ik: [168, G], bend: -1, foot: 0 }, legF: { ik: [166, G], bend: -1, foot: 0 } },
    back: () => [{ k: 'bench', x1: 80, x2: 152, top: G - 33 }],
    props: (j) => [{ k: 'plate', at: j.handN, r: 13 }],
  },
  military_press: {
    a: { hip: [120], torso: -90, head: -85, armN: [60, -95], armF: [62, -95], legN: [90, 90], legF: [92, 88] },
    b: { hip: [120], torso: -90, head: -80, armN: [-92, -90], armF: [-92, -90], legN: [90, 90], legF: [92, 88] },
    props: (j) => [{ k: 'plate', at: j.handN, r: 13 }],
  },
  landmine_press: {
    a: { hip: [95], torso: -80, armN: [60, -95], armF: [95, 92], legN: [65, 100], legF: [120, 115, 30] },
    b: { hip: [95], torso: -78, armN: [-35, -35], armF: [95, 92], legN: [65, 100], legF: [120, 115, 30] },
    props: (j) => {
      const pivot: Vec = [225, G + 2]
      const ang = Math.atan2(j.handN[1] - pivot[1], j.handN[0] - pivot[0])
      const fine: Vec = [j.handN[0] + Math.cos(ang) * 10, j.handN[1] + Math.sin(ang) * 10]
      return [
        { k: 'strap', from: pivot, to: fine },
        { k: 'plate', at: add(j.handN, (ang * 180) / Math.PI + 180, 22), r: 11 },
      ]
    },
  },
  stacco_rumeno_manubri: {
    a: { hip: [112, G - 68], torso: -90, armN: [95, 92], armF: [93, 92], legN: { ik: [118, G], foot: 0 }, legF: { ik: [116, G], foot: 0 } },
    b: { hip: [96, G - 66], torso: -22, head: -15, armN: [90, 90], armF: [90, 90], legN: { ik: [118, G], foot: 0 }, legF: { ik: [116, G], foot: 0 } },
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },
  face_pull: {
    a: { hip: [95], torso: -90, armN: [-12, -8], armF: [-10, -6], legN: [85, 95], legF: [95, 88] },
    b: { hip: [95], torso: -92, armN: [-150, 0], armF: [-148, 2], legN: [85, 95], legF: [95, 88] },
    back: () => [{ k: 'post', x: 215, top: 12 }],
    props: (j) => [{ k: 'band', from: [215, j.head[1]], to: j.handN }],
  },
  push_up: {
    a: { hip: [103, G - 30], torso: -25, head: -20, armN: { ik: [143, G], bend: -1 }, armF: { ik: [141, G], bend: -1 }, legN: [155, 155, 110], legF: [155, 155, 110] },
    b: { hip: [110, G - 9], torso: -7, head: -5, armN: { ik: [143, G], bend: -1 }, armF: { ik: [141, G], bend: -1 }, legN: [174, 174, 110], legF: [174, 174, 110] },
    thumb: 0,
  },
  copenhagen_plank: {
    a: { hip: [105, G - 5], torso: -27, head: -35, armN: [60, 100], armF: [90, 0], legN: [-157, 180, 190], legF: [180, 180, 190] },
    b: { hip: [110, G - 28], torso: 5, head: -5, armN: [-90, -90], armF: [90, 0], legN: [-175, -175, 190], legF: [150, 100, 190] },
    back: () => [{ k: 'bench', x1: 8, x2: 58, top: G - 30 }],
  },
  rematore_trx: {
    a: { hip: [110], torso: -140, head: -130, armN: [-50, -50], armF: [-48, -48], legN: [40, 40, -50], legF: [40, 40, -50] },
    b: { hip: [118], torso: -118, head: -105, armN: [120, -30], armF: [122, -30], legN: [62, 62, -30], legF: [62, 62, -30] },
    back: (j) => [{ k: 'strap', from: [210, 6], to: j.handN }],
  },
  turkish_get_up: {
    hold: 0.25,
    period: 3600,
    a: { hip: [130], torso: 180, armN: [-90, -90], armF: [145, 180], legN: [-50, 50, 0], legF: [0, 0, -80] },
    b: { hip: [110], torso: -90, armN: [-92, -90], armF: [95, 92], legN: [0, 90, 0], legF: [90, 180, 180] },
    props: (j) => [{ k: 'kettlebell', at: j.handN, dir: -90 }],
  },
  suitcase_carry: {
    ...falcata({ lean: 0, ampiezza: 0.55, braccia: 'pesi' }),
    hold: 0,
    period: 1300,
    props: (j) => [{ k: 'kettlebell', at: j.handN, dir: 90 }],
  },

  // ---------------- RICOSTRUZIONE ----------------
  spanish_squat: {
    a: { hip: [110, G - 69], torso: -90, armN: [10, 0], armF: [12, 2], legN: { ik: [120, G], foot: 0 }, legF: { ik: [118, G], foot: 0 } },
    b: { hip: [86, G - 44], torso: -82, armN: [0, 0], armF: [2, 2], legN: { ik: [120, G], bend: -1, foot: 0 }, legF: { ik: [118, G], bend: -1, foot: 0 } },
    back: () => [{ k: 'post', x: 205, top: 40 }],
    props: (j) => [{ k: 'band', from: [205, j.kneeN[1]], to: [j.kneeN[0] - 3, j.kneeN[1]] }],
  },
  terminal_knee_extension: {
    a: { hip: [110, G - 67], torso: -90, armN: [95, 92], legN: { ik: [118, G], bend: -1, foot: 0 }, legF: [97, 92] },
    b: { hip: [110, G - 69], torso: -90, armN: [95, 92], legN: { ik: [112, G], bend: -1, foot: 0 }, legF: [97, 92] },
    back: () => [{ k: 'post', x: 205, top: 40 }],
    props: (j) => [{ k: 'band', from: [205, j.kneeN[1] - 4], to: [j.kneeN[0] - 3, j.kneeN[1]] }],
  },
  reverse_sled_drag: {
    ...(() => {
      const f = falcata({ lean: -12, ampiezza: 0.5, braccia: 'avanti', x: 90 })
      const arms = { armN: [35, 35] as [number, number], armF: [37, 37] as [number, number] }
      return { a: { ...f.a, ...arms }, b: { ...f.b, ...arms } }
    })(),
    hold: 0,
    period: 1500,
    props: (j) => [{ k: 'sled', x: 175 }, { k: 'strap', from: j.handN, to: [180, G - 8] }],
  },
  step_up_basso: {
    a: { hip: [110, G - 66], torso: -85, armN: [85, 95], legN: { ik: [150, G - 22], foot: 0 }, legF: { ik: [108, G], foot: 0 } },
    b: { hip: [148, G - 90], torso: -90, armN: [95, 92], legN: { ik: [152, G - 22], foot: 0 }, legF: [100, 105, 30] },
    back: () => [{ k: 'box', x1: 138, x2: 200, top: G - 18 }],
  },
  slider_leg_curl: {
    a: { hip: [110, G - 16], torso: 162, armN: { ik: [110, G - 1], bend: -1 }, legN: { ik: [180, G - 2], foot: -60 }, legF: { ik: [178, G - 2], foot: -60 } },
    b: { hip: [104, G - 32], torso: 141, armN: { ik: [108, G - 1], bend: -1 }, legN: { ik: [140, G - 2], bend: -1, foot: -40 }, legF: { ik: [138, G - 2], bend: -1, foot: -40 } },
    props: (j) => [{ k: 'slider', at: j.ankleN }],
  },
  polpacci_monopodalici: {
    a: { hip: [112, G - 88], torso: -90, armN: { ik: [168, G - 100], bend: 1 }, legN: [90, 90, -30], legF: [100, 165, 180] },
    b: { hip: [115, G - 102], torso: -90, armN: { ik: [168, G - 100], bend: 1 }, legN: [90, 90, 60], legF: [100, 165, 180] },
    back: () => [{ k: 'box', x1: 118, x2: 172, top: G - 19 }, { k: 'wall', x: 172 }],
  },
  tibialis_raise: {
    a: { hip: [87], torso: -101, armN: [80, 95], legN: [79, 79, 0], legF: [80, 80, 0] },
    b: { hip: [87], torso: -101, armN: [80, 95], legN: [79, 79, -35], legF: [80, 80, -35] },
    back: () => [{ k: 'wall', x: 66, side: 'left' }],
  },

  // ---------------- POTENZA ----------------
  kettlebell_swing: {
    a: { hip: [100], torso: -30, head: -20, armN: [115, 118], armF: [113, 116], legN: [70, 105], legF: [72, 103] },
    b: { hip: [115], torso: -92, armN: [-8, -10], armF: [-6, -8], legN: [90, 90], legF: [92, 88] },
    props: (j) => [{ k: 'kettlebell', at: j.handN, dir: Math.atan2(j.handN[1] - j.elbowN[1], j.handN[0] - j.elbowN[0]) * (180 / Math.PI) }],
  },
  saltelli_sul_posto: {
    hold: 0.05,
    period: 900,
    a: { hip: [120], torso: -88, armN: [80, 30], armF: [82, 30], legN: [80, 100, 0], legF: [82, 98, 0] },
    b: { hip: [120], lift: 10, torso: -90, armN: [80, 30], armF: [82, 30], legN: [88, 92, 50], legF: [90, 90, 50] },
  },
  lancio_palla_medica_petto: {
    a: { hip: [95], torso: -85, armN: [105, -25], armF: [100, -30], legN: [80, 100], legF: [105, 85] },
    b: { hip: [98], torso: -80, armN: [-5, -5], armF: [-3, -3], legN: [80, 100], legF: [105, 85] },
    back: () => [{ k: 'wall', x: 210 }],
    props: (j, t) => [{ k: 'ball', at: volo([mani(j)[0] + 6, mani(j)[1]], [200, j.shoulder[1] + 4], t), r: 9 }],
  },
  lancio_rotazionale: {
    front: true,
    a: { hip: [110], torso: -100, head: -95, armN: [130, 150], armF: [120, 140], legN: [70, 100], legF: [110, 80] },
    b: { hip: [112], torso: -82, head: -85, armN: [-5, -5], armF: [-10, -5], legN: [70, 100], legF: [110, 80] },
    back: () => [{ k: 'wall', x: 214 }],
    props: (j, t) => [{ k: 'ball', at: volo(mani(j), [204, j.shoulder[1] + 8], t), r: 9 }],
  },
  overhead_back_toss: {
    a: { hip: [130], torso: -45, head: -40, armN: [100, 95], armF: [98, 93], legN: [60, 110], legF: [62, 108] },
    b: { hip: [130], torso: -98, head: -110, armN: [-110, -115], armF: [-108, -113], legN: [90, 90, 40], legF: [92, 88, 40] },
    props: (j, t) => [{ k: 'ball', at: volo(mani(j), [30, 20], t, 0.75), r: 9 }],
  },
  push_press_manubri: {
    a: { hip: [118, G - 62], torso: -90, armN: [60, -95], armF: [62, -95], legN: { ik: [124, G], foot: 0 }, legF: { ik: [122, G], foot: 0 } },
    b: { hip: [120, G - 69], torso: -90, armN: [-90, -90], armF: [-88, -90], legN: { ik: [124, G], foot: 0 }, legF: { ik: [122, G], foot: 0 } },
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },
  sled_push: {
    a: { hip: [95], torso: -38, head: -30, armN: [-5, -5], armF: [-3, -3], legN: [55, 115, 0], legF: [135, 150, 60] },
    b: { hip: [95], torso: -38, head: -30, armN: [-5, -5], armF: [-3, -3], legN: [135, 150, 60], legF: [55, 115, 0] },
    hold: 0,
    period: 1400,
    props: (j) => [{ k: 'sled', x: j.handN[0] + 4, handle: j.handN }],
  },
  battle_rope: {
    a: { hip: [90], torso: -70, armN: [35, -25], armF: [75, 20], legN: [55, 115], legF: [70, 105] },
    b: { hip: [90], torso: -70, armN: [75, 20], armF: [35, -25], legN: [55, 115], legF: [70, 105] },
    hold: 0,
    period: 700,
    back: () => [{ k: 'post', x: 228, top: G - 10 }],
    props: (j, t) => [{ k: 'rope', from: j.handN, to: [228, G - 6], phase: t }],
  },

  // ---------------- PISTA ----------------
  sprint_salita: {
    ...falcata({ lean: 18, ampiezza: 1, braccia: 'corsa' }),
    slope: 8,
    hold: 0,
    period: 700,
  },
  corsa_zona2: {
    ...falcata({ lean: 6, ampiezza: 0.6, braccia: 'corsa' }),
    hold: 0,
    period: 1100,
  },
  ripetute_soglia: {
    ...falcata({ lean: 10, ampiezza: 0.8, braccia: 'corsa' }),
    hold: 0,
    period: 900,
  },
  intervalli_30_30: {
    ...falcata({ lean: 12, ampiezza: 0.9, braccia: 'corsa' }),
    hold: 0,
    period: 800,
  },

  // ---------------- MOBILITA' ----------------
  cat_cow: {
    a: { hip: [95], torso: -10, curve: 7, head: 70, armN: [95, 105], armF: [92, 102], legN: [90, 180, 180], legF: [88, 180, 180] },
    b: { hip: [95], torso: -10, curve: -6, head: -40, armN: [95, 105], armF: [92, 102], legN: [90, 180, 180], legF: [88, 180, 180] },
    back: () => [{ k: 'mat', x1: 20, x2: 220 }],
  },
  anche_90_90: {
    // vista frontale dall'alto: le gambe giacciono sul tappetino
    front: true,
    floor: false,
    a: { hip: [120, G - 40], torso: -95, head: -92, armN: [70, 20], armF: [110, 160], legN: [22, 150, 170], legF: [150, 212, 200] },
    b: { hip: [120, G - 40], torso: -85, head: -88, armN: [70, 20], armF: [110, 160], legN: [30, -32, -20], legF: [158, 28, 10] },
    back: () => [{ k: 'rug', x1: 20, y1: G - 70, x2: 200, y2: G + 4, skew: 20 }],
  },
  ginocchio_muro: {
    a: { hip: [128, G - 66], torso: -88, armN: { ik: [196, G - 100], bend: 1 }, armF: { ik: [196, G - 98], bend: 1 }, legN: { ik: [178, G], foot: 0 }, legF: { ik: [80, G], foot: 30 } },
    b: { hip: [148, G - 58], torso: -84, armN: { ik: [196, G - 94], bend: 1 }, armF: { ik: [196, G - 92], bend: 1 }, legN: { ik: [178, G], foot: 0 }, legF: { ik: [80, G], foot: 30 } },
    back: () => [{ k: 'wall', x: 200 }],
  },
  equilibrio_monopodalico: {
    a: { hip: [120], torso: -90, armN: [70, 60], armF: [110, 120], legN: [90, 90], legF: [92, 88] },
    b: { hip: [120], torso: -90, armN: [70, 60], armF: [110, 120], legN: [0, 95, 10], legF: [90, 90] },
  },
  rotazioni_esterne_elastico: {
    front: true,
    a: { hip: [120], torso: -90, armN: [90, 190], armF: [90, 90], legN: [85, 90], legF: [95, 90] },
    b: { hip: [120], torso: -90, armN: [88, -10], armF: [90, 90], legN: [85, 90], legF: [95, 90] },
    back: () => [{ k: 'post', x: 22, top: 50 }],
    props: (j) => [{ k: 'band', from: [22, j.handN[1]], to: j.handN }],
  },
  open_book: {
    floor: false,
    a: { hip: [150, 100], torso: 180, head: 180, armN: [90, 90], armF: [92, 92], legN: [90, 0, 0], legF: [92, 2, 0] },
    b: { hip: [150, 100], torso: 180, head: -140, armN: [-90, -90], armF: [92, 92], legN: [90, 0, 0], legF: [92, 2, 0] },
    // vista dall'alto: il tappetino e' il pavimento
    back: () => [{ k: 'rug', x1: 60, y1: 30, x2: 220, y2: 170 }],
  },
  respirazione_diaframmatica: {
    period: 4000,
    hold: 0.1,
    a: { hip: [140, G - 5], torso: 180, armN: { ik: [118, G - 12], bend: -1 }, armF: { ik: [132, G - 12], bend: -1 }, legN: { ik: [192, G], bend: -1, foot: 0 }, legF: { ik: [190, G], bend: -1, foot: 0 } },
    b: { hip: [140, G - 5], torso: 180, armN: { ik: [118, G - 13], bend: -1 }, armF: { ik: [132, G - 19], bend: -1 }, legN: { ik: [192, G], bend: -1, foot: 0 }, legF: { ik: [190, G], bend: -1, foot: 0 } },
    back: (j, t) => [{ k: 'mat', x1: 60, x2: 220 }, { k: 'belly', at: [j.hip[0] - 10, j.hip[1] - 2], r: 5 + 6 * t }],
  },
}
