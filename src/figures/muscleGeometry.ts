/**
 * Geometria della mappa muscolare stile Technogym: figura in posa ad A, pannelli poligonali.
 * Ogni figura occupa un riquadro 100 x 210 con asse di simmetria x = 50.
 * I pannelli sono definiti per il lato destro dello schermo (x >= 50) e specchiati;
 * quelli `centrale` attraversano l'asse e non vengono duplicati.
 */
import type { MuscoloId } from '../domain/muscles'

type Pt = [number, number]
export interface Pannello {
  pts: Pt[]
  centrale?: boolean
}

export interface Vista {
  /** parti neutre del corpo (testa, mani, articolazioni) */
  corpo: Pannello[]
  muscoli: Partial<Record<MuscoloId, Pannello[]>>
}

const TESTA: Pannello = { pts: [], centrale: true } // disegnata come cerchio a parte

// ---- parti comuni della sagoma ----
const MANO: Pannello = { pts: [[84, 103.5], [89, 102.5], [92.5, 111], [90.5, 115.5], [86.5, 113.5]] }
const PIEDE: Pannello = { pts: [[55.5, 193], [61.5, 192.5], [65, 200], [64, 202], [55.5, 202]] }
const COLLO: Pannello = { centrale: true, pts: [[46, 21.5], [54, 21.5], [54.5, 30.2], [45.5, 30.2]] }

export const FRONTE: Vista = {
  corpo: [
    TESTA,
    COLLO,
    MANO,
    PIEDE,
    // bacino / inguine
    { pts: [[51, 90.5], [57.5, 89.5], [61.5, 91.5], [62.5, 96.5], [56, 100], [51, 101]] },
    // ginocchio
    { pts: [[55, 149.5], [62.5, 146.5], [63.5, 154], [58, 156], [55.5, 155]] },
    // gomito
    { pts: [[72.5, 70.5], [76.5, 72.5], [80.5, 69.5], [81, 72.5], [77, 74]] },
    // stinco interno
    { pts: [[55.5, 156.5], [57.5, 157], [57.5, 178], [58.5, 190.5], [56, 192], [54.5, 176]] },
  ],
  muscoli: {
    'trapezio-alto': [{ pts: [[54.8, 23.5], [57.8, 29], [60, 31.5], [51, 32.5], [51, 31], [55.2, 30.4]] }],
    'deltoide-anteriore': [{ pts: [[59.5, 31], [67.5, 31.5], [72.5, 36], [74, 45.5], [69, 47], [63, 40], [60, 34]] }],
    'pettorale-alto': [{ pts: [[51, 33.5], [59.5, 32.5], [62.5, 37], [66.5, 42], [66.5, 44], [51, 43]] }],
    'pettorale-basso': [{ pts: [[51, 44], [66.5, 45], [65.5, 51.5], [60, 55.5], [51, 55.5]] }],
    bicipite: [{ pts: [[69, 48], [74.5, 46.5], [78.5, 56], [80, 68], [76, 71.5], [72, 69.5], [69.5, 58]] }],
    'avambraccio-flessori': [{ pts: [[77.5, 74.5], [81.5, 73.5], [85.5, 84], [89, 98], [86, 102.5], [83, 102]] }],
    'retto-addominale': [
      { pts: [[51, 57], [58, 57], [58, 65.5], [51, 65.5]] },
      { pts: [[51, 66.5], [58, 66.5], [58, 75.5], [51, 75.5]] },
      { pts: [[51, 76.5], [58, 76.5], [57, 88], [51, 89.5]] },
    ],
    obliqui: [{ pts: [[59, 57], [63.5, 55], [66, 60.5], [65.5, 72], [64, 82], [61.5, 90], [58, 87.5], [59, 76.5]] }],
    adduttori: [{ pts: [[51.5, 102], [56.5, 101.5], [56, 120], [53.3, 130]] }],
    'retto-femorale': [{ pts: [[57.3, 101.3], [62.3, 99], [63.5, 112], [62, 132.5], [59.2, 136.8], [56.9, 120.5]] }],
    'vasto-laterale': [{ pts: [[63.2, 98.5], [67, 99], [68, 112], [67, 126], [64, 145.5], [61.8, 143.8], [62.9, 133.5], [64.3, 112]] }],
    'vasto-mediale': [{ pts: [[53.4, 131.2], [56.1, 121.5], [58.9, 137.9], [62.1, 134], [61, 144], [56, 148.5], [54.3, 142]] }],
    'tibiale-anteriore': [{ pts: [[58.5, 157], [63.5, 155.5], [64, 165], [62, 178], [59.5, 190], [58.5, 178]] }],
  },
}

export const RETRO: Vista = {
  corpo: [
    TESTA,
    COLLO,
    MANO,
    PIEDE,
    // cavo popliteo
    { pts: [[55, 146.5], [63, 145.5], [63.5, 153], [55.5, 153]] },
    // gomito
    { pts: [[72.5, 70.5], [76.5, 72.5], [80.5, 69.5], [81, 72.5], [77, 74]] },
    // tendine d'Achille / caviglia
    { pts: [[56.5, 188.5], [61, 187.5], [61.5, 192.5], [56, 193]] },
    // zona sacrale
    { centrale: true, pts: [[47, 90.5], [53, 90.5], [52, 96], [50, 98], [48, 96]] },
  ],
  muscoli: {
    'trapezio-alto': [{ pts: [[50, 22.5], [54.5, 23], [57, 28.5], [66, 32], [58.5, 34], [50, 33]] }],
    'trapezio-medio': [{ pts: [[50, 34], [58.5, 35], [66, 33.5], [63, 40], [57, 43], [50, 44]] }],
    'trapezio-basso': [{ pts: [[50, 45], [57, 44], [60.5, 44], [55.5, 54], [50, 60]] }],
    'deltoide-posteriore': [{ pts: [[61.5, 31.5], [67.5, 31.5], [72.5, 36], [74, 45.5], [69, 47], [64.5, 41], [66.5, 34.5]] }],
    'gran-dorsale': [{ pts: [[56.5, 56], [61.5, 45], [64.2, 41.8], [68.5, 47], [67, 58], [65.5, 68], [62.5, 77], [56.8, 72.5]] }],
    'erettori-spinali': [{ pts: [[50.8, 61.5], [55.5, 56.5], [56, 72], [55, 82], [50.8, 82]] }],
    lombari: [{ pts: [[50.8, 83], [55.5, 83], [61.5, 78.5], [62.5, 88.5], [53.5, 90], [50.8, 90]] }],
    tricipite: [{ pts: [[69, 48], [74.5, 46.5], [78.5, 56], [80, 68], [76, 71.5], [72, 69.5], [69.5, 58]] }],
    'avambraccio-estensori': [{ pts: [[77.5, 74.5], [81.5, 73.5], [85.5, 84], [89, 98], [86, 102.5], [83, 102]] }],
    'medio-gluteo': [{ pts: [[56, 91], [63, 90], [66.5, 96], [65.5, 99.5], [58, 97.5]] }],
    'grande-gluteo': [{ pts: [[53, 91], [55.5, 91.5], [57.5, 98.5], [66, 100.5], [67, 110], [59, 114.5], [51, 112.5], [51, 99]] }],
    'bicipite-femorale': [{ pts: [[60.5, 115.5], [67, 112], [67, 124], [64, 145], [61.5, 143.5], [61.5, 128]] }],
    semitendinoso: [{ pts: [[52.5, 114.5], [59.5, 115.5], [60.5, 128], [60.5, 143.5], [56, 146], [54, 128]] }],
    'gastrocnemio-mediale': [{ pts: [[55, 154], [58.8, 154], [58.8, 172], [56, 174], [54, 164]] }],
    'gastrocnemio-laterale': [{ pts: [[59.5, 154], [63.5, 154], [64.5, 164], [61.5, 172], [59.5, 172.5]] }],
    soleo: [{ pts: [[55.5, 175], [59, 173.5], [62.5, 173], [61, 186.5], [56.5, 188]] }],
  },
}

/** Punti del pannello specchiato rispetto all'asse x = 50. */
export const specchia = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [100 - x, y] as Pt).reverse()
