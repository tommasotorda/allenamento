/**
 * Pose dei nuovi esercizi (funzionali, catena posteriore, schiena, stretching, yoga).
 * Stesse convenzioni di poses.ts; i movimenti fuori dal piano del disegno sono completati
 * in 3D da `speciali` in pose3d.ts.
 */
import { G, lerpV, type FiguraDef, type Joints, type Pose, type Vec } from './engine'

const mani = (j: Joints): Vec => lerpV(j.handN, j.handF, 0.5)
function volo(da: Vec, a: Vec, t: number, soglia = 0.55): Vec {
  return t <= soglia ? da : lerpV(da, a, (t - soglia) / (1 - soglia))
}

const IN_PIEDI: Pose = { hip: [120], torso: -90, armN: [95, 92], armF: [85, 95], legN: [90, 90], legF: [92, 88] }
const PLANK_MANI = (x = 103): Pose => ({ hip: [x, G - 30], torso: -25, head: -20, armN: { ik: [x + 40, G], bend: -1 }, armF: { ik: [x + 38, G], bend: -1 }, legN: [155, 155, 110], legF: [155, 155, 110] })
const QUADRUPEDIA: Pose = { hip: [95], torso: -10, head: -5, armN: [95, 105], armF: [92, 102], legN: [90, 180, 180], legF: [88, 180, 180] }
const piedi = (x: number) => ({ legN: { ik: [x + 2, G] as Vec, foot: 0 }, legF: { ik: [x, G] as Vec, foot: 0 } })
const tappeto = () => [{ k: 'mat' as const, x1: 20, x2: 225 }]

export const NUOVE_FIGURE: Record<string, FiguraDef> = {
  // ---------------- funzionali ----------------
  goblet_squat: {
    a: { hip: [108, G - 69], torso: -90, armN: [80, -95], armF: [80, -95], ...piedi(118) },
    b: { hip: [86, G - 34], torso: -66, head: -72, armN: [60, -80], armF: [60, -80], ...piedi(118) },
    props: (j) => [{ k: 'kettlebell', at: j.handN, dir: 90 }],
  },
  affondo_indietro: {
    a: { hip: [128, G - 69], torso: -90, armN: [92, 92], armF: [92, 92], legN: { ik: [130, G], foot: 0 }, legF: { ik: [126, G], foot: 0 } },
    b: { hip: [108, G - 38], torso: -88, armN: [92, 92], armF: [92, 92], legN: { ik: [130, G], foot: 0 }, legF: { ik: [64, G - 4], foot: 40 } },
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },
  affondo_laterale: {
    front: true,
    a: { hip: [120, G - 64], torso: -90, armN: [95, 95], armF: [85, 85], legN: { ik: [165, G], foot: 20 }, legF: { ik: [75, G], foot: 160 } },
    b: { hip: [150, G - 38], torso: -82, armN: [120, 150], armF: [60, 30], legN: { ik: [165, G], bend: -1, foot: 20 }, legF: { ik: [75, G], foot: 160 } },
    back: tappeto,
  },
  split_squat_bulgaro: {
    a: { hip: [112, G - 66], torso: -88, armN: [92, 92], armF: [92, 92], legN: { ik: [132, G], foot: 0 }, legF: { ik: [62, G - 38], foot: 180 } },
    b: { hip: [100, G - 40], torso: -80, armN: [92, 92], armF: [92, 92], legN: { ik: [132, G], foot: 0 }, legF: { ik: [62, G - 38], foot: 180 } },
    back: () => [{ k: 'bench', x1: 30, x2: 80, top: G - 34 }],
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },
  stacco_monopodalico: {
    a: { hip: [115, G - 69], torso: -90, armN: [92, 92], armF: [88, 92], legN: { ik: [118, G], foot: 0 }, legF: [100, 95, 20] },
    b: { hip: [106, G - 66], torso: -8, head: -5, armN: [90, 90], armF: [100, 95], legN: { ik: [118, G], foot: 0 }, legF: [178, 178, 90] },
    props: (j) => [{ k: 'kettlebell', at: j.handN, dir: 90 }],
  },
  stacco_kettlebell: {
    a: { hip: [98, G - 46], torso: -32, head: -25, armN: [90, 90], armF: [90, 90], ...piedi(122) },
    b: { hip: [118, G - 69], torso: -90, armN: [92, 90], armF: [90, 90], ...piedi(122) },
    props: (j) => [{ k: 'kettlebell', at: mani(j), dir: 90 }],
  },
  kettlebell_clean: {
    a: { hip: [100], torso: -30, head: -20, armN: [115, 118], armF: [100, 95], legN: [70, 105], legF: [72, 103] },
    b: { hip: [115], torso: -90, armN: [70, -100], armF: [95, 92], legN: [90, 90], legF: [92, 88] },
    props: (j, t) => [{ k: 'kettlebell', at: j.handN, dir: 90 + 80 * t }],
  },
  thruster_manubri: {
    a: { hip: [86, G - 36], torso: -70, head: -78, armN: [60, -95], armF: [62, -95], ...piedi(120) },
    b: { hip: [118, G - 69], torso: -90, armN: [-90, -90], armF: [-88, -90], ...piedi(120) },
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },
  wall_ball: {
    a: { hip: [86, G - 36], torso: -70, head: -78, armN: [95, -40], armF: [95, -40], ...piedi(120) },
    b: { hip: [118, G - 69], torso: -90, armN: [-72, -72], armF: [-72, -72], ...piedi(120) },
    back: () => [{ k: 'wall', x: 205 }],
    props: (j, t) => [{ k: 'ball', at: volo([mani(j)[0] + 4, mani(j)[1]], [196, 22], t, 0.6), r: 9 }],
  },
  slam_palla_medica: {
    a: { hip: [120], torso: -92, armN: [-95, -95], armF: [-93, -93], legN: [90, 90, 40], legF: [92, 88, 40] },
    b: { hip: [110], torso: -35, head: -10, armN: [70, 80], armF: [70, 80], legN: [65, 110], legF: [68, 108] },
    props: (j, t) => [{ k: 'ball', at: volo(mani(j), [160, G - 9], t, 0.5), r: 9 }],
  },
  burpee: {
    hold: 0.15,
    a: { hip: [120], lift: 8, torso: -90, armN: [-95, -95], armF: [-93, -93], legN: [90, 90, 40], legF: [92, 88, 40] },
    b: PLANK_MANI(),
  },
  bear_crawl: {
    hold: 0,
    period: 1400,
    a: { hip: [95, G - 40], torso: -8, head: -5, armN: { ik: [146, G] }, armF: { ik: [130, G] }, legN: { ik: [106, G], foot: 60 }, legF: { ik: [90, G], foot: 60 } },
    b: { hip: [95, G - 40], torso: -8, head: -5, armN: { ik: [130, G] }, armF: { ik: [146, G] }, legN: { ik: [90, G], foot: 60 }, legF: { ik: [106, G], foot: 60 } },
    back: tappeto,
  },
  renegade_row: {
    a: { ...PLANK_MANI(), armN: { ik: [143, G - 6], bend: -1 }, armF: { ik: [141, G - 6], bend: -1 } },
    b: { ...PLANK_MANI(), armN: [-150, 95], armF: { ik: [141, G - 6], bend: -1 } },
    props: (j) => [{ k: 'dumbbell', at: j.handN }, { k: 'dumbbell', at: j.handF }],
  },
  overhead_carry: {
    hold: 0,
    period: 1300,
    a: { hip: [120], torso: -90, armN: [-90, -90], armF: [92, 92], legN: [68, 98, -5], legF: [107, 123, 22] },
    b: { hip: [120], torso: -90, armN: [-90, -90], armF: [92, 92], legN: [107, 123, 22], legF: [68, 98, -5] },
    props: (j) => [{ k: 'kettlebell', at: j.handN, dir: -90 }],
  },
  kettlebell_windmill: {
    front: true,
    a: { hip: [120], torso: -90, armN: [-90, -90], armF: [95, 95], legN: [72, 95, 20], legF: [108, 85, 160] },
    b: { hip: [125], torso: -148, head: -150, armN: [-90, -90], armF: [120, 110], legN: [72, 95, 20], legF: [108, 85, 160] },
    props: (j) => [{ k: 'kettlebell', at: j.handN, dir: -90 }],
    back: tappeto,
  },
  chop_mezzo_ginocchio: {
    a: { hip: [110, G - 38], torso: -90, armN: [-40, -40], armF: [-42, -42], legN: [0, 90, 0], legF: [90, 180, 180] },
    b: { hip: [110, G - 38], torso: -95, armN: [115, 130], armF: [113, 128], legN: [0, 90, 0], legF: [90, 180, 180] },
    back: () => [{ k: 'post', x: 225, top: 14 }],
    props: (j) => [{ k: 'band', from: [225, 20], to: j.handN }],
  },
  ab_rollout: {
    a: { hip: [70, G - 36], torso: -20, head: -15, armN: { ik: [111, G - 6], bend: 1 }, armF: { ik: [111, G - 6], bend: 1 }, legN: { ik: [36, G - 3], bend: -1, foot: 180 }, legF: { ik: [36, G - 3], bend: -1, foot: 180 } },
    b: { hip: [104, G - 16], torso: -5, head: -3, armN: { ik: [193, G - 8], bend: 1 }, armF: { ik: [193, G - 8], bend: 1 }, legN: { ik: [36, G - 3], bend: -1, foot: 180 }, legF: { ik: [36, G - 3], bend: -1, foot: 180 } },
    props: (j) => [{ k: 'slider', at: j.handN }],
    back: tappeto,
  },
  plank_shoulder_tap: {
    a: PLANK_MANI(),
    b: { ...PLANK_MANI(), armN: [120, -60] },
    back: tappeto,
  },
  hanging_knee_raise: {
    a: { hip: [120, 118], torso: -90, armN: { ik: [120, 26], bend: 1 }, armF: { ik: [120, 26], bend: 1 }, legN: [95, 90, 70], legF: [97, 90, 70] },
    b: { hip: [118, 118], torso: -95, armN: { ik: [120, 26], bend: 1 }, armF: { ik: [120, 26], bend: 1 }, legN: [-5, 90, 40], legF: [-3, 92, 40] },
    back: () => [{ k: 'pullbar', at: [120, 26] }],
  },
  box_jump: {
    a: { hip: [95], torso: -50, head: -40, armN: [135, 135], armF: [133, 133], legN: [60, 115], legF: [62, 113] },
    b: { hip: [152, G - 36 - 66], torso: -85, armN: [20, 20], armF: [22, 22], legN: { ik: [156, G - 36], foot: 0 }, legF: { ik: [150, G - 36], foot: 0 } },
    back: () => [{ k: 'box', x1: 128, x2: 190, top: G - 32 }],
  },
  // ---------------- lombari e catena posteriore ----------------
  back_extension: {
    a: { hip: [130, G - 70], torso: 72, head: 80, armN: [60, -120], armF: [60, -120], legN: [135, 135, 45], legF: [135, 135, 45] },
    b: { hip: [130, G - 70], torso: -42, head: -40, armN: [60, -120], armF: [60, -120], legN: [135, 135, 45], legF: [135, 135, 45] },
    back: () => [
      { k: 'bench', x1: 112, x2: 142, top: G - 66 },
      { k: 'box', x1: 66, x2: 92, top: G - 18 },
    ],
  },
  superman: {
    a: { hip: [100, G - 4], torso: 0, head: 0, armN: [0, 0], armF: [2, 2], legN: [180, 180, 180], legF: [178, 178, 180] },
    b: { hip: [100, G - 4], torso: -12, head: -18, armN: [-16, -16], armF: [-14, -14], legN: [194, 194, 190], legF: [192, 192, 190] },
    back: tappeto,
  },
  good_morning: {
    a: { hip: [114, G - 69], torso: -90, armN: [110, -80], armF: [112, -80], ...piedi(118) },
    b: { hip: [96, G - 66], torso: -12, head: -8, armN: [110 + 78, -80 + 78], armF: [112 + 78, -80 + 78], ...piedi(118) },
    props: (j) => [{ k: 'plate', at: [j.shoulder[0], j.shoulder[1] - 4], r: 13 }],
  },
  ponte_glutei: {
    a: { hip: [102, G - 5], torso: 180, armN: [2, 0], armF: [0, 0], legN: { ik: [138, G], bend: -1, foot: 0 }, legF: { ik: [136, G], bend: -1, foot: 0 } },
    b: { hip: [96, G - 30], torso: 147, head: 160, armN: [20, 0], armF: [18, 0], legN: { ik: [138, G], bend: -1, foot: 0 }, legF: { ik: [136, G], bend: -1, foot: 0 } },
    back: tappeto,
  },
  ponte_monopodalico: {
    a: { hip: [102, G - 5], torso: 180, armN: [2, 0], armF: [0, 0], legN: [-70, -70, -30], legF: { ik: [136, G], bend: -1, foot: 0 } },
    b: { hip: [96, G - 30], torso: 147, head: 160, armN: [20, 0], armF: [18, 0], legN: [-35, -35, 0], legF: { ik: [136, G], bend: -1, foot: 0 } },
    back: tappeto,
  },
  // ---------------- deltoidi posteriori e schiena ----------------
  alzate_posteriori: {
    a: { hip: [100, G - 66], torso: -18, head: -12, armN: [92, 88], armF: [90, 86], ...piedi(106) },
    b: { hip: [100, G - 66], torso: -18, head: -12, armN: [92, 88], armF: [90, 86], ...piedi(106) },
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },
  band_pull_apart: {
    a: { ...IN_PIEDI, armN: [-2, -2], armF: [2, 2] },
    b: { ...IN_PIEDI, armN: [-2, -2], armF: [2, 2] },
    props: (j) => [{ k: 'band', from: j.handF, to: j.handN }],
  },
  ytw_prono: {
    a: { hip: [100, G - 4], torso: 0, head: 0, armN: [-12, -12], armF: [-10, -10], legN: [180, 180, 180], legF: [178, 178, 180] },
    b: { hip: [100, G - 4], torso: -4, head: -8, armN: [-12, -12], armF: [-10, -10], legN: [180, 180, 180], legF: [178, 178, 180] },
    back: tappeto,
  },
  lat_machine: {
    front: true,
    a: { hip: [120, G - 66], torso: -90, armN: [-62, -80], armF: [-118, -100], legN: [75, 90], legF: [105, 90] },
    b: { hip: [120, G - 66], torso: -90, armN: [65, -92], armF: [115, -88], legN: [75, 90], legF: [105, 90] },
    back: (j) => [{ k: 'box', x1: 104, x2: 136, top: G - 62 }, { k: 'strap', from: [120, 0], to: [120, mani(j)[1]] }],
    props: (j) => [{ k: 'bar', at: [120, mani(j)[1]], len: 36 }],
  },
  rematore_cavo: {
    a: { hip: [96, G - 30], torso: -88, armN: [0, 0], armF: [2, 2], legN: { ik: [166, G - 12], bend: 1, foot: -80 }, legF: { ik: [164, G - 12], bend: 1, foot: -80 } },
    b: { hip: [96, G - 30], torso: -95, armN: [160, 0], armF: [162, 0], legN: { ik: [166, G - 12], bend: 1, foot: -80 }, legF: { ik: [164, G - 12], bend: 1, foot: -80 } },
    back: () => [{ k: 'box', x1: 76, x2: 116, top: G - 26 }, { k: 'post', x: 228, top: 60 }],
    props: (j) => [{ k: 'strap', from: [228, j.handN[1]], to: j.handN }],
  },
  rematore_bilanciere: {
    a: { hip: [100, G - 64], torso: -38, head: -30, armN: [90, 90], armF: [90, 90], ...piedi(108) },
    b: { hip: [100, G - 64], torso: -38, head: -30, armN: [-158, 88], armF: [-158, 88], ...piedi(108) },
    props: (j) => [{ k: 'plate', at: j.handN, r: 13 }],
  },
  rematore_panca_inclinata: {
    a: { hip: [95, G - 48], torso: -32, head: -25, armN: [90, 90], armF: [90, 90], legN: { ik: [52, G], foot: 70 }, legF: { ik: [50, G], foot: 70 } },
    b: { hip: [95, G - 48], torso: -32, head: -25, armN: [-160, 90], armF: [-160, 90], legN: { ik: [52, G], foot: 70 }, legF: { ik: [50, G], foot: 70 } },
    back: () => [{ k: 'strap', from: [80, G - 36], to: [142, G - 76] }, { k: 'post', x: 104, top: G - 50 }],
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },
  pulldown_braccia_tese: {
    a: { hip: [110], torso: -78, armN: [-38, -38], armF: [-36, -36], legN: [85, 95], legF: [95, 88] },
    b: { hip: [110], torso: -78, armN: [82, 82], armF: [84, 84], legN: [85, 95], legF: [95, 88] },
    back: () => [{ k: 'post', x: 222, top: 10 }],
    props: (j) => [{ k: 'strap', from: [222, 18], to: j.handN }],
  },
  // ---------------- stretching ----------------
  stretch_femorali: {
    period: 4000,
    a: { hip: [110, G - 5], torso: 180, armN: [-40, -45], armF: [-38, -43], legN: [-40, -40, -60], legF: [0, 0, -80] },
    b: { hip: [110, G - 5], torso: 180, armN: [-58, -62], armF: [-56, -60], legN: [-78, -78, -20], legF: [0, 0, -80] },
    back: tappeto,
    props: (j) => [{ k: 'band', from: j.handN, to: j.toeN }],
  },
  stretch_quadricipite: {
    period: 4000,
    a: { ...IN_PIEDI, armF: { ik: [168, G - 100], bend: 1 }, hip: [120, G - 69], legN: { ik: [122, G], foot: 0 }, legF: { ik: [118, G], foot: 0 } },
    b: { hip: [120, G - 69], torso: -90, armN: [115, 125], armF: { ik: [168, G - 100], bend: 1 }, legN: [95, -112, -150], legF: { ik: [118, G], foot: 0 } },
    back: () => [{ k: 'wall', x: 172 }],
  },
  stretch_flessori_anca: {
    period: 4000,
    a: { hip: [108, G - 38], torso: -90, armN: [100, -60], armF: [100, -60], legN: { ik: [150, G], foot: 0 }, legF: { ik: [72, G - 3], bend: -1, foot: 180 } },
    b: { hip: [120, G - 32], torso: -95, armN: [100, -60], armF: [100, -60], legN: { ik: [150, G], foot: 0 }, legF: { ik: [72, G - 3], bend: -1, foot: 180 } },
    back: tappeto,
  },
  stretch_piriforme: {
    period: 4000,
    a: { hip: [100, G - 5], torso: 180, armN: [-25, -10], armF: [-23, -10], legN: [-60, 20, 0], legF: { ik: [140, G], bend: -1, foot: 0 } },
    b: { hip: [100, G - 5], torso: 180, armN: [-45, -20], armF: [-43, -20], legN: [-80, 10, 0], legF: [-80, 0, -30] },
    back: tappeto,
  },
  stretch_pettorale: {
    period: 4000,
    a: { hip: [110], torso: -90, armN: [180, -90], armF: [95, 92], legN: [90, 90], legF: [92, 88] },
    b: { hip: [118], torso: -88, armN: [186, -84], armF: [95, 92], legN: [85, 92], legF: [95, 88] },
    back: (j) => [{ k: 'wall', x: j.handN[0] - 3, side: 'left' }],
  },
  stretch_polpacci: {
    period: 4000,
    a: { hip: [112, G - 69], torso: -88, armN: { ik: [178, G - 108], bend: 1 }, armF: { ik: [178, G - 106], bend: 1 }, legN: { ik: [136, G], foot: 0 }, legF: { ik: [80, G], foot: 0 } },
    b: { hip: [122, G - 63], torso: -78, armN: { ik: [178, G - 104], bend: 1 }, armF: { ik: [178, G - 102], bend: 1 }, legN: { ik: [136, G], foot: 0 }, legF: { ik: [80, G], foot: 0 } },
    back: () => [{ k: 'wall', x: 182 }],
  },
  stretch_spalla: {
    period: 4000,
    a: IN_PIEDI,
    b: { ...IN_PIEDI, armN: [2, 0], armF: [40, -40] },
  },
  stretch_adduttori: {
    period: 4000,
    front: true,
    a: { hip: [120, G - 6], torso: -90, armN: [100, 110], armF: [80, 70], legN: [12, 158, 180], legF: [168, 22, 0] },
    b: { hip: [120, G - 6], torso: -90, head: -80, armN: [105, 115], armF: [75, 65], legN: [4, 164, 180], legF: [176, 16, 0] },
    back: tappeto,
  },
  stretch_laterale: {
    period: 4000,
    front: true,
    a: { hip: [120], torso: -90, armN: [-88, -92], armF: [95, 95], legN: [88, 90], legF: [92, 90] },
    b: { hip: [124], torso: -112, head: -120, armN: [-140, -155], armF: [110, 70], legN: [88, 90], legF: [92, 90] },
  },
  // ---------------- yoga ----------------
  cane_testa_giu: {
    period: 4000,
    a: { hip: [124, G - 29], torso: -24, head: -20, armN: { ik: [170, G], bend: -1 }, armF: { ik: [168, G], bend: -1 }, legN: { ik: [60, G], foot: 110 }, legF: { ik: [60, G], foot: 110 } },
    b: { hip: [99, G - 58], torso: 39, head: 50, armN: { ik: [170, G], bend: -1 }, armF: { ik: [168, G], bend: -1 }, legN: { ik: [60, G], foot: 0 }, legF: { ik: [60, G], foot: 0 } },
    back: tappeto,
  },
  posizione_bambino: {
    period: 4000,
    a: QUADRUPEDIA,
    b: { hip: [80, G - 20], torso: 12, head: 20, armN: [0, 0], armF: [2, 0], legN: [30, 180, 180], legF: [30, 180, 180] },
    back: tappeto,
  },
  cobra: {
    period: 4000,
    a: { hip: [100, G - 4], torso: 0, head: 5, armN: { ik: [140, G], bend: -1 }, armF: { ik: [138, G], bend: -1 }, legN: [180, 180, 180], legF: [178, 178, 180] },
    b: { hip: [100, G - 4], torso: -38, head: -50, armN: { ik: [140, G], bend: -1 }, armF: { ik: [138, G], bend: -1 }, legN: [180, 180, 180], legF: [178, 178, 180] },
    back: tappeto,
  },
  guerriero_1: {
    period: 4000,
    a: { hip: [105, G - 55], torso: -90, armN: [95, 95], armF: [90, 92], legN: { ik: [150, G], foot: 0 }, legF: { ik: [60, G], foot: 30 } },
    b: { hip: [114, G - 38], torso: -92, head: -95, armN: [-95, -95], armF: [-93, -93], legN: { ik: [150, G], foot: 0 }, legF: { ik: [60, G], foot: 30 } },
    back: tappeto,
  },
  guerriero_2: {
    period: 4000,
    front: true,
    a: { hip: [120, G - 52], torso: -90, armN: [95, 95], armF: [85, 85], legN: { ik: [180, G], foot: 0 }, legF: { ik: [60, G], foot: 180 } },
    b: { hip: [128, G - 40], torso: -90, armN: [0, 0], armF: [180, 180], legN: { ik: [180, G], bend: -1, foot: 0 }, legF: { ik: [60, G], foot: 180 } },
    back: tappeto,
  },
  triangolo: {
    period: 4000,
    front: true,
    a: { hip: [120, G - 58], torso: -90, armN: [0, 0], armF: [180, 180], legN: { ik: [172, G], foot: 0 }, legF: { ik: [68, G], foot: 180 } },
    b: { hip: [116, G - 58], torso: -16, head: -20, armN: [92, 92], armF: [-88, -88], legN: { ik: [172, G], foot: 0 }, legF: { ik: [68, G], foot: 180 } },
    back: tappeto,
  },
  piccione: {
    period: 4000,
    a: QUADRUPEDIA,
    b: { hip: [100, G - 10], torso: -80, head: -85, armN: [95, 95], armF: [92, 92], legN: [10, 175, 180], legF: [180, 180, 180] },
    back: tappeto,
  },
  albero: {
    period: 4000,
    front: true,
    a: { hip: [120], torso: -90, armN: [100, -120], armF: [80, -60], legN: [88, 90], legF: [92, 90] },
    b: { hip: [120], torso: -90, armN: [-100, -95], armF: [-80, -85], legN: [35, 150, 170], legF: [92, 90] },
  },
  affondo_basso: {
    period: 4000,
    a: { hip: [110, G - 38], torso: -90, armN: [95, 95], armF: [92, 92], legN: { ik: [150, G], foot: 0 }, legF: { ik: [72, G - 3], bend: -1, foot: 180 } },
    b: { hip: [122, G - 30], torso: -96, head: -100, armN: [-96, -96], armF: [-94, -94], legN: { ik: [150, G], foot: 0 }, legF: { ik: [72, G - 3], bend: -1, foot: 180 } },
    back: tappeto,
  },
  torsione_supina: {
    period: 4000,
    a: { hip: [100, G - 5], torso: 180, armN: [90, 90], armF: [90, 90], legN: { ik: [132, G], bend: -1, foot: 0 }, legF: { ik: [130, G], bend: -1, foot: 0 } },
    b: { hip: [100, G - 5], torso: 180, armN: [90, 90], armF: [90, 90], legN: { ik: [132, G], bend: -1, foot: 0 }, legF: { ik: [130, G], bend: -1, foot: 0 } },
    back: tappeto,
  },
  saluto_al_sole: {
    period: 4000,
    a: { hip: [116, G - 69], torso: -94, head: -100, armN: [-100, -100], armF: [-98, -98], ...piedi(118) },
    b: { hip: [112, G - 68], torso: 78, head: 90, armN: [90, 95], armF: [92, 95], ...piedi(118) },
    back: tappeto,
  },
}
