/**
 * Pose degli esercizi aggiunti (addominali, piegamenti, cardio, braccia, polpacci, ginocchio e caviglia).
 * Stesse convenzioni di poses.ts; i movimenti fuori dal piano del disegno sono completati
 * in 3D da `speciali` in pose3d.ts.
 */
import { G, lerpV, type FiguraDef, type Joints, type Pose, type Vec } from './engine'

const mani = (j: Joints): Vec => lerpV(j.handN, j.handF, 0.5)
const IN_PIEDI: Pose = { hip: [120], torso: -90, armN: [95, 92], armF: [85, 95], legN: [90, 90], legF: [92, 88] }
const piedi = (x: number) => ({ legN: { ik: [x + 2, G] as Vec, foot: 0 }, legF: { ik: [x, G] as Vec, foot: 0 } })
const tappeto = () => [{ k: 'mat' as const, x1: 20, x2: 225 }]

/** Piegamento: A braccia tese, B petto vicino al pavimento (mani in `mano`). */
const PIEGAMENTO_A = (mano = 143): Pose => ({ hip: [mano - 40, G - 30], torso: -25, head: -20, armN: { ik: [mano, G], bend: -1 }, armF: { ik: [mano - 2, G], bend: -1 }, legN: [155, 155, 110], legF: [155, 155, 110] })
const PIEGAMENTO_B = (mano = 143): Pose => ({ hip: [mano - 33, G - 9], torso: -7, head: -5, armN: { ik: [mano, G], bend: -1 }, armF: { ik: [mano - 2, G], bend: -1 }, legN: [174, 174, 110], legF: [174, 174, 110] })
const PLANK_MANI: Pose = PIEGAMENTO_A()

/** Passo di corsa: A con la gamba vicina avanti, B con la gamba vicina dietro. */
const CORSA_A: Pose = { hip: [120], torso: -82, armN: [135, -30], armF: [45, -60], legN: [50, 105, -5], legF: [120, 150, 40] }
const CORSA_B: Pose = { hip: [120], torso: -82, armN: [45, -60], armF: [135, -30], legN: [120, 150, 40], legF: [50, 105, -5] }

/** Seduta a terra con le gambe piegate (russian twist). */
const SEDUTO_V: Pose = { hip: [112, G - 6], torso: -125, head: -110, armN: { ik: [128, G - 40], bend: 1 }, armF: { ik: [128, G - 40], bend: 1 }, legN: { ik: [156, G], bend: -1, foot: 0 }, legF: { ik: [154, G], bend: -1, foot: 0 } }

/** Pedali della cyclette: centro della pedivella e posizione del pedale all'angolo `a`. */
const PEDIVELLA: Vec = [138, G - 30]
const pedale = (a: number): Vec => [PEDIVELLA[0] + 14 * Math.cos((a * Math.PI) / 180), PEDIVELLA[1] + 14 * Math.sin((a * Math.PI) / 180)]

export const FIGURE_AGGIUNTE: Record<string, FiguraDef> = {
  // ---------------- addominali: flessione ----------------
  crunch_alzata: {
    a: { hip: [130, G - 5], torso: 180, armN: { ik: [100, G - 26], bend: -1 }, armF: { ik: [100, G - 26], bend: -1 }, legN: { ik: [166, G], bend: -1, foot: 0 }, legF: { ik: [164, G], bend: -1, foot: 0 } },
    b: { hip: [130, G - 5], torso: -92, armN: [-88, -88], armF: [-90, -90], legN: { ik: [166, G], bend: -1, foot: 0 }, legF: { ik: [164, G], bend: -1, foot: 0 } },
    back: tappeto,
    props: (j) => [{ k: 'plate', at: mani(j), r: 9 }],
  },
  crunch_inverso: {
    a: { hip: [125, G - 5], torso: 180, armN: [2, 0], armF: [0, 0], legN: [-90, 0, -90], legF: [-88, 2, -88] },
    b: { hip: [122, G - 16], torso: 165, armN: [8, 0], armF: [6, 0], legN: [-140, -60, -100], legF: [-138, -58, -98] },
    back: tappeto,
  },
  toes_to_bar: {
    a: { hip: [120, 106], torso: -90, armN: { ik: [120, 14], bend: 1 }, armF: { ik: [120, 14], bend: 1 }, legN: [94, 88, 60], legF: [96, 86, 60] },
    b: { hip: [124, 98], torso: -106, armN: { ik: [120, 14], bend: 1 }, armF: { ik: [120, 14], bend: 1 }, legN: [-76, -76, 10], legF: [-74, -74, 10] },
    back: () => [{ k: 'pullbar', at: [120, 14] }],
  },
  v_up: {
    a: { hip: [130], torso: 180, armN: [180, 180], armF: [182, 182], legN: [0, 0, -70], legF: [2, 2, -70] },
    b: { hip: [130, G - 6], torso: -125, armN: [-40, -40], armF: [-42, -42], legN: [-55, -55, -40], legF: [-53, -53, -40] },
    back: tappeto,
  },
  crunch_cavo: {
    a: { hip: [110, G - 38], torso: -80, armN: [-55, 150], armF: [-57, 150], legN: [90, 180, 180], legF: [92, 180, 180] },
    b: { hip: [110, G - 38], torso: -20, curve: 5, head: 0, armN: [5, -150], armF: [3, -150], legN: [90, 180, 180], legF: [92, 180, 180] },
    back: () => [{ k: 'post', x: 225, top: 14 }],
    props: (j) => [{ k: 'strap', from: [225, 20], to: j.handN }],
  },
  hollow_rock: {
    hold: 0.05,
    period: 1600,
    a: { hip: [130], torso: -175, curve: -3, head: -160, armN: [-175, -180], armF: [-173, -178], legN: [-30, -30, -75], legF: [-28, -28, -75] },
    b: { hip: [130], torso: -150, curve: -3, head: -140, armN: [-150, -155], armF: [-148, -153], legN: [-5, -5, -60], legF: [-3, -3, -60] },
    back: tappeto,
  },

  // ---------------- rotazione e obliqui ----------------
  russian_twist: {
    hold: 0.1,
    a: SEDUTO_V,
    b: SEDUTO_V,
    back: tappeto,
    props: (j) => [{ k: 'ball', at: mani(j), r: 8 }],
  },
  bicicletta: {
    hold: 0.05,
    period: 1600,
    a: { hip: [130, G - 5], torso: -168, head: -150, armN: [-120, 150], armF: [-118, 150], legN: [-100, 10, -60], legF: [-12, -12, -70] },
    b: { hip: [130, G - 5], torso: -168, head: -150, armN: [-120, 150], armF: [-118, 150], legN: [-12, -12, -70], legF: [-100, 10, -60] },
    back: tappeto,
  },
  cross_crunch: {
    a: { hip: [125, G - 8], torso: 180, armN: [-140, 160], armF: [175, 178], legN: [4, 2, 0], legF: [2, 0, 0] },
    b: { hip: [125, G - 10], torso: -150, curve: -4, head: -140, armN: [-80, 160], armF: [168, 172], legN: [-18, -8, 0], legF: [-16, -6, 0] },
    back: tappeto,
  },
  twist_cavo: {
    a: { ...IN_PIEDI, hip: [110], armN: [0, 0], armF: [2, 2], legN: [80, 95], legF: [100, 85] },
    b: { ...IN_PIEDI, hip: [110], armN: [0, 0], armF: [2, 2], legN: [80, 95], legF: [100, 85] },
    back: () => [{ k: 'post', x: 222, top: 40 }],
    props: (j) => [{ k: 'strap', from: [222, j.handN[1]], to: j.handN }],
  },

  // ---------------- anti-movimento ----------------
  stir_the_pot: {
    a: { hip: [95, G - 50], torso: -25, head: -20, armN: [82, -5], armF: [80, -7], legN: [147, 147, 110], legF: [147, 147, 110] },
    b: { hip: [95, G - 50], torso: -25, head: -20, armN: [98, 5], armF: [96, 3], legN: [147, 147, 110], legF: [147, 147, 110] },
    back: () => [{ k: 'ball', at: [148, G - 20], r: 24 }],
  },
  plank_archer: {
    a: PLANK_MANI,
    b: { ...PLANK_MANI, armF: [60, 60] },
    back: tappeto,
  },
  body_saw: {
    a: { hip: [100, G - 16], torso: -12, armN: [90, 0], armF: [92, 0], legN: [168, 168, 100], legF: [168, 168, 100] },
    b: { hip: [80, G - 16], torso: -12, armN: [60, 0], armF: [62, 0], legN: [172, 172, 100], legF: [172, 172, 100] },
    back: tappeto,
    props: (j) => [{ k: 'slider', at: j.ankleN }],
  },
  plank_pull_through: {
    a: { ...PLANK_MANI, armF: { ik: [128, G - 4], bend: -1 } },
    b: { ...PLANK_MANI, armF: { ik: [148, G - 4], bend: -1 } },
    back: tappeto,
    props: (j) => [{ k: 'dumbbell', at: j.handF }],
  },

  // ---------------- dinamici ----------------
  mountain_climber: {
    hold: 0,
    period: 900,
    a: { ...PLANK_MANI, legN: { ik: [118, G - 6], bend: -1, foot: 20 }, legF: { ik: [36, G - 2], bend: -1, foot: 110 } },
    b: { ...PLANK_MANI, legN: { ik: [36, G - 2], bend: -1, foot: 110 }, legF: { ik: [118, G - 6], bend: -1, foot: 20 } },
    back: tappeto,
  },
  plank_jack: {
    hold: 0.05,
    period: 1000,
    a: PLANK_MANI,
    b: { ...PLANK_MANI, hip: [103, G - 33] },
    back: tappeto,
  },
  flutter_kick: {
    hold: 0,
    period: 800,
    a: { hip: [130, G - 5], torso: 180, head: -170, armN: [5, 0], armF: [3, 0], legN: [-18, -18, -70], legF: [-5, -5, -80] },
    b: { hip: [130, G - 5], torso: 180, head: -170, armN: [5, 0], armF: [3, 0], legN: [-5, -5, -80], legF: [-18, -18, -70] },
    back: tappeto,
  },

  // ---------------- cardio ----------------
  tapis_roulant: {
    hold: 0,
    period: 900,
    a: CORSA_A,
    b: CORSA_B,
    back: () => [{ k: 'box', x1: 40, x2: 200, top: G - 6 }, { k: 'post', x: 196, top: 70 }],
    props: () => [{ k: 'bar', at: [186, 78], len: 10 }],
  },
  cyclette: {
    hold: 0,
    period: 1200,
    a: { hip: [104, G - 82], torso: -62, head: -50, armN: { ik: [164, 84], bend: 1 }, armF: { ik: [162, 84], bend: 1 }, legN: { ik: pedale(-90), foot: 10 }, legF: { ik: pedale(90), foot: 10 } },
    b: { hip: [104, G - 82], torso: -62, head: -50, armN: { ik: [164, 84], bend: 1 }, armF: { ik: [162, 84], bend: 1 }, legN: { ik: pedale(90), foot: 10 }, legF: { ik: pedale(-90), foot: 10 } },
    back: () => [{ k: 'post', x: 104, top: G - 78 }, { k: 'post', x: 168, top: 80 }, { k: 'box', x1: 90, x2: 180, top: G - 4 }],
    props: (j) => [{ k: 'strap', from: PEDIVELLA, to: j.ankleN }, { k: 'bar', at: [164, 84], len: 8 }],
  },
  air_bike: {
    hold: 0,
    period: 1300,
    a: { hip: [104, G - 82], torso: -70, head: -60, armN: { ik: [168, 72], bend: 1 }, armF: { ik: [150, 92], bend: 1 }, legN: { ik: pedale(-90), foot: 10 }, legF: { ik: pedale(90), foot: 10 } },
    b: { hip: [104, G - 82], torso: -70, head: -60, armN: { ik: [150, 92], bend: 1 }, armF: { ik: [168, 72], bend: 1 }, legN: { ik: pedale(90), foot: 10 }, legF: { ik: pedale(-90), foot: 10 } },
    back: () => [{ k: 'post', x: 104, top: G - 78 }, { k: 'box', x1: 90, x2: 190, top: G - 4 }, { k: 'post', x: 180, top: G - 60 }],
    props: (j) => [{ k: 'strap', from: [158, 140], to: j.handN }, { k: 'strap', from: PEDIVELLA, to: j.ankleN }],
  },
  vogatore: {
    hold: 0.08,
    period: 2400,
    a: { hip: [135, G - 22], torso: -60, head: -50, armN: { ik: [190, G - 34], bend: 1 }, armF: { ik: [190, G - 34], bend: 1 }, legN: { ik: [172, G - 12], bend: -1, foot: -70 }, legF: { ik: [170, G - 12], bend: -1, foot: -70 } },
    b: { hip: [103, G - 22], torso: -108, head: -100, armN: { ik: [104, 128], bend: 1 }, armF: { ik: [104, 128], bend: 1 }, legN: { ik: [172, G - 12], bend: -1, foot: -70 }, legF: { ik: [170, G - 12], bend: -1, foot: -70 } },
    back: (j) => [{ k: 'box', x1: 40, x2: 215, top: G - 4 }, { k: 'box', x1: j.hip[0] - 14, x2: j.hip[0] + 14, top: G - 16 }, { k: 'post', x: 210, top: G - 50 }],
    props: (j) => [{ k: 'strap', from: [210, G - 38], to: j.handN }, { k: 'bar', at: j.handN, len: 8 }],
  },

  // ---------------- tirate ----------------
  lat_machine_inversa: {
    a: { hip: [116, G - 66], torso: -98, armN: { ik: [124, 24], bend: 1 }, armF: { ik: [122, 24], bend: 1 }, legN: [0, 90], legF: [2, 88] },
    b: { hip: [116, G - 66], torso: -102, armN: { ik: [128, 76], bend: 1 }, armF: { ik: [126, 76], bend: 1 }, legN: [0, 90], legF: [2, 88] },
    back: (j) => [{ k: 'box', x1: 92, x2: 132, top: G - 62 }, { k: 'strap', from: [124, 0], to: j.handN }],
    props: (j) => [{ k: 'bar', at: j.handN, len: 12 }],
  },
  pulley_alto: {
    a: { hip: [96, G - 30], torso: -90, armN: [-28, -28], armF: [-26, -26], legN: { ik: [166, G - 12], bend: 1, foot: -80 }, legF: { ik: [164, G - 12], bend: 1, foot: -80 } },
    b: { hip: [96, G - 30], torso: -98, armN: [115, -60], armF: [117, -58], legN: { ik: [166, G - 12], bend: 1, foot: -80 }, legF: { ik: [164, G - 12], bend: 1, foot: -80 } },
    back: () => [{ k: 'box', x1: 76, x2: 116, top: G - 26 }, { k: 'post', x: 228, top: 20 }],
    props: (j) => [{ k: 'strap', from: [228, 30], to: j.handN }],
  },
  rematore_alto: {
    front: true,
    a: { hip: [120, G - 70], torso: -90, armN: [96, 92], armF: [84, 88], legN: [86, 90], legF: [94, 90] },
    b: { hip: [120, G - 70], torso: -90, armN: [-8, 128], armF: [-172, 52], legN: [86, 90], legF: [94, 90] },
    props: (j) => [{ k: 'bar', at: mani(j), len: 22 }],
  },
  rematore_isometrico: {
    hold: 0.35,
    a: { hip: [100, G - 64], torso: -38, head: -30, armN: [90, 90], armF: [90, 90], ...piedi(108) },
    b: { hip: [100, G - 64], torso: -38, head: -30, armN: [-158, 88], armF: [-158, 88], ...piedi(108) },
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },

  // ---------------- gambe ----------------
  squat_sumo: {
    front: true,
    a: { hip: [120, G - 64], torso: -90, armN: [97, 93], armF: [83, 87], legN: { ik: [152, G], bend: -1, foot: 20 }, legF: { ik: [88, G], bend: 1, foot: 160 } },
    b: { hip: [120, G - 38], torso: -90, armN: [97, 93], armF: [83, 87], legN: { ik: [152, G], bend: -1, foot: 20 }, legF: { ik: [88, G], bend: 1, foot: 160 } },
    props: (j) => [{ k: 'kettlebell', at: mani(j), dir: 90 }],
  },
  affondo_avanti: {
    a: { hip: [110, G - 69], torso: -90, armN: [92, 92], armF: [92, 92], legN: { ik: [112, G], foot: 0 }, legF: { ik: [108, G], foot: 0 } },
    b: { hip: [150, G - 38], torso: -88, armN: [92, 92], armF: [92, 92], legN: { ik: [172, G], foot: 0 }, legF: { ik: [108, G - 4], foot: 40 } },
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },
  ponte_distensione: {
    a: { hip: [96, G - 30], torso: 147, head: 160, armN: { ik: [64, G - 30], bend: 1 }, armF: { ik: [64, G - 30], bend: 1 }, legN: { ik: [138, G], bend: -1, foot: 0 }, legF: { ik: [136, G], bend: -1, foot: 0 } },
    b: { hip: [96, G - 30], torso: 147, head: 160, armN: [-88, -88], armF: [-90, -90], legN: { ik: [138, G], bend: -1, foot: 0 }, legF: { ik: [136, G], bend: -1, foot: 0 } },
    back: tappeto,
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },

  // ---------------- spalle ----------------
  halo_spinta: {
    a: { ...IN_PIEDI, armN: [60, -100], armF: [62, -100] },
    b: { ...IN_PIEDI, armN: [-90, -90], armF: [-88, -90] },
    props: (j) => [{ k: 'kettlebell', at: mani(j), dir: -90 }],
  },
  alzate_frontali: {
    a: { ...IN_PIEDI, armN: [92, 88], armF: [90, 86] },
    b: { ...IN_PIEDI, armN: [-2, -6], armF: [0, -4] },
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },
  push_press_kettlebell: {
    a: { hip: [118, G - 62], torso: -90, armN: [60, -100], armF: [95, 92], legN: { ik: [124, G], foot: 0 }, legF: { ik: [122, G], foot: 0 } },
    b: { hip: [120, G - 69], torso: -90, armN: [-90, -90], armF: [95, 92], legN: { ik: [124, G], foot: 0 }, legF: { ik: [122, G], foot: 0 } },
    props: (j, t) => [{ k: 'kettlebell', at: j.handN, dir: 160 - 30 * t }],
  },

  // ---------------- piegamenti ----------------
  push_up_ginocchia: {
    a: { hip: [100, G - 28], torso: -30, head: -25, armN: { ik: [142, G], bend: -1 }, armF: { ik: [140, G], bend: -1 }, legN: [129, 180, 180], legF: [129, 180, 180] },
    b: { hip: [104, G - 14], torso: -10, head: -8, armN: { ik: [142, G], bend: -1 }, armF: { ik: [140, G], bend: -1 }, legN: [157, 180, 180], legF: [157, 180, 180] },
    back: tappeto,
  },
  push_up_inclinati: {
    a: { hip: [84, G - 39], torso: -36, head: -30, armN: { ik: [156, G - 37], bend: -1 }, armF: { ik: [154, G - 37], bend: -1 }, legN: [144, 144, 110], legF: [144, 144, 110] },
    b: { hip: [92, G - 30], torso: -22, head: -18, armN: { ik: [156, G - 37], bend: -1 }, armF: { ik: [154, G - 37], bend: -1 }, legN: [153, 153, 110], legF: [153, 153, 110] },
    back: () => [{ k: 'bench', x1: 140, x2: 210, top: G - 34 }],
  },
  push_up_declinati: {
    a: { hip: [102, G - 43], torso: -5, head: 0, armN: { ik: [150, G], bend: -1 }, armF: { ik: [148, G], bend: -1 }, legN: [175, 175, 100], legF: [175, 175, 100] },
    b: { hip: [102, G - 27], torso: 9, head: 12, armN: { ik: [150, G], bend: -1 }, armF: { ik: [148, G], bend: -1 }, legN: [188, 188, 100], legF: [188, 188, 100] },
    back: () => [{ k: 'box', x1: 8, x2: 60, top: G - 34 }],
  },
  push_up_diamante: {
    a: PIEGAMENTO_A(136),
    b: PIEGAMENTO_B(136),
    back: tappeto,
  },
  push_up_larghi: {
    a: PIEGAMENTO_A(),
    b: PIEGAMENTO_B(),
    back: tappeto,
  },
  pike_push_up: {
    a: { hip: [98, G - 70], torso: 30, head: 60, armN: { ik: [140, G], bend: -1 }, armF: { ik: [138, G], bend: -1 }, legN: { ik: [82, G], foot: 0 }, legF: { ik: [80, G], foot: 0 } },
    b: { hip: [100, G - 66], torso: 55, head: 80, armN: { ik: [140, G], bend: -1 }, armF: { ik: [138, G], bend: -1 }, legN: { ik: [82, G], foot: 0 }, legF: { ik: [80, G], foot: 0 } },
    back: tappeto,
  },
  push_up_arciere: {
    a: PIEGAMENTO_A(),
    b: PIEGAMENTO_B(),
    back: tappeto,
  },
  push_up_esplosivi: {
    hold: 0.05,
    period: 1300,
    a: PIEGAMENTO_B(),
    b: { hip: [105, G - 40], torso: -28, head: -22, armN: { ik: [144, G - 10], bend: -1 }, armF: { ik: [142, G - 10], bend: -1 }, legN: [148, 148, 110], legF: [148, 148, 110] },
    back: tappeto,
  },
  push_up_rotazione: {
    a: PIEGAMENTO_B(),
    b: { ...PLANK_MANI, armF: [-90, -90] },
    back: tappeto,
  },
  push_up_spiderman: {
    a: PIEGAMENTO_A(),
    b: { ...PIEGAMENTO_B(), legN: [0, 165, 60] },
    back: tappeto,
  },
  hindu_push_up: {
    period: 3200,
    a: { hip: [99, G - 58], torso: 39, head: 50, armN: { ik: [170, G], bend: -1 }, armF: { ik: [168, G], bend: -1 }, legN: { ik: [60, G], foot: 0 }, legF: { ik: [60, G], foot: 0 } },
    b: { hip: [124, G - 22], torso: -32, head: -40, armN: { ik: [170, G], bend: -1 }, armF: { ik: [168, G], bend: -1 }, legN: { ik: [60, G], foot: 110 }, legF: { ik: [60, G], foot: 110 } },
    back: tappeto,
  },

  // ---------------- braccia ----------------
  curl_concentrazione: {
    a: { hip: [110, G - 38], torso: -55, head: -40, armN: [90, 90], armF: [60, 100], legN: [0, 90], legF: [10, 88] },
    b: { hip: [110, G - 38], torso: -55, head: -40, armN: [90, -100], armF: [60, 100], legN: [0, 90], legF: [10, 88] },
    back: () => [{ k: 'bench', x1: 70, x2: 128, top: G - 34 }],
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },
  curl_ez: {
    a: { ...IN_PIEDI, armN: [92, 90], armF: [90, 90] },
    b: { ...IN_PIEDI, armN: [95, -75], armF: [93, -75] },
    props: (j) => [{ k: 'bar', at: j.handN, len: 14 }],
  },
  curl_polsi: {
    a: { hip: [100, G - 38], torso: -60, head: -45, armN: [92, 10], armF: [90, 10], legN: [0, 90], legF: [2, 88] },
    b: { hip: [100, G - 38], torso: -60, head: -45, armN: [92, 10], armF: [90, 10], legN: [0, 90], legF: [2, 88] },
    back: () => [{ k: 'bench', x1: 60, x2: 118, top: G - 34 }],
    props: (j, t) => [{ k: 'dumbbell', at: [j.handN[0] + 5, j.handN[1] + 7 - 12 * t] }],
  },
  curl_inverso: {
    a: { ...IN_PIEDI, armN: [92, 90], armF: [90, 90] },
    b: { ...IN_PIEDI, armN: [95, -70], armF: [93, -70] },
    props: (j) => [{ k: 'bar', at: j.handN, len: 22 }],
  },

  // ---------------- polpacci ----------------
  calf_multipower: {
    a: { hip: [118, G - 88], torso: -90, armN: [40, -150], armF: [42, -150], legN: [90, 90, -25], legF: [92, 88, -25] },
    b: { hip: [120, G - 100], torso: -90, armN: [40, -150], armF: [42, -150], legN: [90, 90, 60], legF: [92, 88, 60] },
    back: () => [{ k: 'box', x1: 108, x2: 150, top: G - 14 }, { k: 'post', x: 78, top: 14 }, { k: 'post', x: 166, top: 14 }],
    props: (j) => [{ k: 'bar', at: [j.shoulder[0] - 4, j.shoulder[1] + 2], len: 40 }],
  },
  calf_seduto: {
    a: { hip: [96, G - 52], torso: -90, armN: [70, 0], armF: [72, 0], legN: [0, 90, -25], legF: [2, 88, -25] },
    b: { hip: [96, G - 52], torso: -90, armN: [62, 2], armF: [64, 2], legN: [-10, 94, 55], legF: [-8, 92, 55] },
    back: () => [{ k: 'box', x1: 66, x2: 112, top: G - 48 }, { k: 'box', x1: 124, x2: 158, top: G - 12 }],
    props: (j) => [{ k: 'bar', at: [j.kneeN[0] - 4, j.kneeN[1] - 8], len: 10 }],
  },

  // ---------------- ginocchio e caviglia ----------------
  step_down_eccentrico: {
    a: { hip: [108, G - 104], torso: -88, armN: [70, 20], armF: [72, 20], legN: { ik: [110, G - 34], foot: 0 }, legF: [80, 88, 20] },
    b: { hip: [100, G - 70], torso: -72, armN: [40, 10], armF: [42, 10], legN: { ik: [110, G - 34], foot: 0 }, legF: [64, 64, 10] },
    back: () => [{ k: 'box', x1: 60, x2: 126, top: G - 30 }],
  },
  camminata_laterale_elastico: {
    front: true,
    hold: 0.1,
    a: { hip: [108, G - 60], torso: -84, armN: [70, 150], armF: [110, 30], legN: { ik: [126, G], bend: -1, foot: 20 }, legF: { ik: [92, G], bend: 1, foot: 160 } },
    b: { hip: [124, G - 60], torso: -84, armN: [70, 150], armF: [110, 30], legN: { ik: [158, G], bend: -1, foot: 20 }, legF: { ik: [96, G], bend: 1, foot: 160 } },
    props: (j) => [{ k: 'band', from: j.ankleN, to: j.ankleF }],
  },
  eversione_caviglia: {
    a: { hip: [70, G - 6], torso: -80, head: -70, armN: [70, 30], armF: [110, 60], legN: [0, 0, -80], legF: [2, 2, -70] },
    b: { hip: [70, G - 6], torso: -80, head: -70, armN: [70, 30], armF: [110, 60], legN: [0, 0, -50], legF: [2, 2, -70] },
    back: (j) => [{ k: 'post', x: 222, top: G - 34 }, { k: 'band', from: [222, G - 28], to: j.toeN }, ...tappeto()],
  },

  // ---------------- potenza ----------------
  squat_jump: {
    hold: 0.05,
    period: 1200,
    a: { hip: [108], torso: -50, head: -40, armN: [100, 100], armF: [98, 98], legN: [60, 115], legF: [62, 113] },
    b: { hip: [118], lift: 14, torso: -88, armN: [-80, -80], armF: [-78, -78], legN: [90, 92, 60], legF: [92, 90, 60] },
  },
  step_up_saltato: {
    hold: 0.05,
    period: 1200,
    a: { hip: [118, G - 70], torso: -82, armN: [130, 100], armF: [50, -40], legN: { ik: [150, G - 36], foot: 0 }, legF: { ik: [110, G], foot: 0 } },
    b: { hip: [140, G - 116], torso: -86, armN: [40, -40], armF: [140, 110], legN: [75, 110, 30], legF: [115, 90, 40] },
    back: () => [{ k: 'box', x1: 128, x2: 192, top: G - 32 }],
  },

  // ---------------- funzionali e atletici ----------------
  skater_jump: {
    front: true,
    hold: 0.15,
    period: 1600,
    a: { hip: [150, G - 60], torso: -80, armN: [140, 150], armF: [50, 40], legN: { ik: [158, G], bend: -1, foot: 20 }, legF: { ik: [142, G - 16], bend: 1, foot: 160 } },
    b: { hip: [90, G - 60], torso: -100, armN: [130, 140], armF: [40, 30], legN: { ik: [98, G - 16], bend: -1, foot: 20 }, legF: { ik: [82, G], bend: 1, foot: 160 } },
  },
  salto_lungo: {
    hold: 0.1,
    period: 1500,
    a: { hip: [70], torso: -45, head: -35, armN: [150, 150], armF: [148, 148], legN: [60, 115], legF: [62, 113] },
    b: { hip: [150], lift: 18, torso: -60, head: -50, armN: [-20, -20], armF: [-18, -18], legN: [20, 110], legF: [22, 108] },
  },
  cossack_squat: {
    front: true,
    a: { hip: [145, G - 34], torso: -80, armN: [60, 160], armF: [120, 20], legN: { ik: [160, G], bend: -1, foot: 20 }, legF: { ik: [77, G], bend: 1, foot: -100 } },
    b: { hip: [92, G - 34], torso: -100, armN: [60, 160], armF: [120, 20], legN: { ik: [160, G], bend: -1, foot: -80 }, legF: { ik: [77, G], bend: 1, foot: 160 } },
  },
  landmine_rotazione: {
    front: true,
    a: { hip: [120, G - 68], torso: -84, armN: { ik: [170, 66], bend: 1 }, armF: { ik: [170, 66], bend: 1 }, legN: { ik: [140, G], bend: -1, foot: 20 }, legF: { ik: [100, G], bend: 1, foot: 160 } },
    b: { hip: [120, G - 68], torso: -96, armN: { ik: [70, 66], bend: -1 }, armF: { ik: [70, 66], bend: -1 }, legN: { ik: [140, G], bend: -1, foot: 20 }, legF: { ik: [100, G], bend: 1, foot: 160 } },
    props: (j) => [{ k: 'strap', from: [120, G], to: mani(j) }],
  },
  strappo_manubrio: {
    a: { hip: [98, G - 46], torso: -32, head: -25, armN: [90, 90], armF: [100, 95], ...piedi(122) },
    b: { hip: [118, G - 69], torso: -90, armN: [-90, -90], armF: [95, 92], ...piedi(122) },
    props: (j) => [{ k: 'dumbbell', at: j.handN }],
  },
  inchworm: {
    period: 3600,
    a: { hip: [110, G - 68], torso: 80, head: 85, armN: { ik: [134, G], bend: -1 }, armF: { ik: [132, G], bend: -1 }, legN: { ik: [112, G], foot: 0 }, legF: { ik: [110, G], foot: 0 } },
    b: { hip: [173, G - 30], torso: -25, head: -20, armN: { ik: [214, G], bend: -1 }, armF: { ik: [212, G], bend: -1 }, legN: { ik: [112, G], foot: 110 }, legF: { ik: [110, G], foot: 110 } },
    back: tappeto,
  },
  step_up_laterale: {
    front: true,
    a: { hip: [130, G - 66], torso: -90, armN: [96, 92], armF: [84, 88], legN: { ik: [165, G - 34], bend: -1, foot: 20 }, legF: { ik: [102, G], bend: 1, foot: 160 } },
    b: { hip: [162, G - 104], torso: -90, armN: [96, 92], armF: [84, 88], legN: { ik: [168, G - 34], bend: -1, foot: 20 }, legF: [100, 95, 160] },
    back: () => [{ k: 'box', x1: 148, x2: 212, top: G - 30 }],
    props: (j) => [{ k: 'dumbbell', at: j.handN }, { k: 'dumbbell', at: j.handF }],
  },
  navetta: {
    hold: 0.1,
    period: 1400,
    a: { ...CORSA_A, torso: -65, head: -60 },
    b: { hip: [130, G - 40], torso: -30, head: -25, armN: [85, 95], armF: [160, -170], legN: { ik: [162, G], foot: 0 }, legF: { ik: [88, G], foot: 20 } },
  },
}
