import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { esercizio } from '../../domain/data'
import { espandi, type Coinvolgimento, type MuscoloId } from '../../domain/muscles'
import { faseAnimazione } from '../../figures/engine'
import { FIGURE } from '../../figures/poses'
import { oggetti3D, S, scheletro3D, type Giunto, type Oggetto3D, type V3 } from '../../figures/pose3d'

// colori condivisi con la mappa muscolare
const BASE = new THREE.Color('#3a3a3c')
const ROSSI = ['#3a3a3c', '#7a2e29', '#c0322b', '#ff3b30'].map((c) => new THREE.Color(c))

/** Segmenti del manichino e muscoli che ne determinano il colore. */
const SEGMENTI: { a: Giunto; b: Giunto; r: number; muscoli: MuscoloId[] }[] = [
  { a: 'mid', b: 'shoulder', r: 0.12, muscoli: ['pettorale-alto', 'pettorale-basso', 'gran-dorsale', 'trapezio-medio', 'trapezio-basso', 'erettori-spinali'] },
  { a: 'hip', b: 'mid', r: 0.11, muscoli: ['retto-addominale', 'obliqui', 'lombari', 'erettori-spinali'] },
  { a: 'shN', b: 'shF', r: 0.06, muscoli: ['trapezio-alto', 'trapezio-medio'] },
  { a: 'hipN', b: 'hipF', r: 0.09, muscoli: ['grande-gluteo', 'medio-gluteo'] },
  { a: 'shN', b: 'elbowN', r: 0.048, muscoli: ['bicipite', 'tricipite', 'deltoide-anteriore', 'deltoide-posteriore'] },
  { a: 'shF', b: 'elbowF', r: 0.048, muscoli: ['bicipite', 'tricipite', 'deltoide-anteriore', 'deltoide-posteriore'] },
  { a: 'elbowN', b: 'handN', r: 0.038, muscoli: ['avambraccio-flessori', 'avambraccio-estensori'] },
  { a: 'elbowF', b: 'handF', r: 0.038, muscoli: ['avambraccio-flessori', 'avambraccio-estensori'] },
  { a: 'hipN', b: 'kneeN', r: 0.07, muscoli: ['retto-femorale', 'vasto-laterale', 'vasto-mediale', 'bicipite-femorale', 'semitendinoso', 'adduttori'] },
  { a: 'hipF', b: 'kneeF', r: 0.07, muscoli: ['retto-femorale', 'vasto-laterale', 'vasto-mediale', 'bicipite-femorale', 'semitendinoso', 'adduttori'] },
  { a: 'kneeN', b: 'ankleN', r: 0.05, muscoli: ['gastrocnemio-laterale', 'gastrocnemio-mediale', 'soleo', 'tibiale-anteriore'] },
  { a: 'kneeF', b: 'ankleF', r: 0.05, muscoli: ['gastrocnemio-laterale', 'gastrocnemio-mediale', 'soleo', 'tibiale-anteriore'] },
  { a: 'ankleN', b: 'toeN', r: 0.035, muscoli: [] },
  { a: 'ankleF', b: 'toeF', r: 0.035, muscoli: [] },
]
const SNODI: { g: Giunto; r: number; muscoli: MuscoloId[] }[] = [
  { g: 'shN', r: 0.07, muscoli: ['deltoide-anteriore', 'deltoide-posteriore'] },
  { g: 'shF', r: 0.07, muscoli: ['deltoide-anteriore', 'deltoide-posteriore'] },
  { g: 'hipN', r: 0.085, muscoli: ['grande-gluteo', 'medio-gluteo'] },
  { g: 'hipF', r: 0.085, muscoli: ['grande-gluteo', 'medio-gluteo'] },
  { g: 'mid', r: 0.115, muscoli: ['retto-addominale', 'obliqui', 'erettori-spinali'] },
  { g: 'elbowN', r: 0.045, muscoli: [] },
  { g: 'elbowF', r: 0.045, muscoli: [] },
  { g: 'kneeN', r: 0.058, muscoli: [] },
  { g: 'kneeF', r: 0.058, muscoli: [] },
  { g: 'handN', r: 0.04, muscoli: [] },
  { g: 'handF', r: 0.04, muscoli: [] },
  { g: 'ankleN', r: 0.04, muscoli: [] },
  { g: 'ankleF', r: 0.04, muscoli: [] },
]

const colore = (c: Coinvolgimento, ms: MuscoloId[]) => ROSSI[Math.max(0, ...ms.map((m) => c[m] ?? 0))]

const Y = new THREE.Vector3(0, 1, 0)
function orienta(mesh: THREE.Object3D, a: V3, b: V3) {
  const va = new THREE.Vector3(...a)
  const vb = new THREE.Vector3(...b)
  const d = vb.clone().sub(va)
  const l = d.length()
  mesh.position.copy(va).add(vb).multiplyScalar(0.5)
  mesh.scale.set(1, Math.max(l, 1e-4), 1)
  if (l > 1e-6) mesh.quaternion.setFromUnitVectors(Y, d.normalize())
}

type Vista = 'lato' | 'fronte' | 'tre-quarti' | 'alto'
const CAMERE: Record<Vista, V3> = {
  lato: [0, 1.0, 3.6],
  fronte: [3.6, 1.1, 0],
  'tre-quarti': [2.4, 1.5, 2.6],
  alto: [0.01, 4.2, 0.4],
}

export default function Viewer3D({ id }: { id: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [vista, setVista] = useState<Vista>('tre-quarti')
  const [pausa, setPausa] = useState(false)
  const stato = useRef({ vista, pausa, camera: null as THREE.PerspectiveCamera | null, controls: null as OrbitControls | null })
  stato.current.vista = vista
  stato.current.pausa = pausa

  useEffect(() => {
    const el = host.current
    if (!el || !FIGURE[id]) return
    const scuro = window.matchMedia('(prefers-color-scheme: dark)').matches
    const coinvolti = espandi(esercizio(id).muscoli)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50)
    const controls = new OrbitControls(camera, renderer.domElement)
    // inquadra la figura: centro verticale delle due posizioni (le trazioni stanno in alto)
    const ys = [0, 1].flatMap((t) => Object.values(scheletro3D(id, t).giunti).map((p) => p[1]))
    const centroY = Math.min(1.3, Math.max(0.45, (Math.min(...ys) + Math.max(...ys)) / 2))
    controls.target.set(0, centroY, 0)
    {
      const [x, y, z] = CAMERE[stato.current.vista]
      camera.position.set(x, y + centroY - 0.8, z)
    }
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 1.5
    controls.maxDistance = 7
    controls.maxPolarAngle = Math.PI * 0.49
    stato.current.camera = camera
    stato.current.controls = controls

    scene.add(new THREE.HemisphereLight(0xffffff, scuro ? 0x222222 : 0x999999, 1.6))
    const sole = new THREE.DirectionalLight(0xffffff, 2)
    sole.position.set(2, 5, 3)
    sole.castShadow = true
    sole.shadow.mapSize.set(1024, 1024)
    Object.assign(sole.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2 })
    scene.add(sole)

    // pavimento (inclinato per lo sprint in salita)
    const pav = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), new THREE.MeshStandardMaterial({ color: scuro ? 0x1c1c1e : 0xe7e5e4 }))
    pav.rotation.x = -Math.PI / 2
    pav.receiveShadow = true
    const pendenza = FIGURE[id].slope ?? 0
    const suolo = new THREE.Group()
    suolo.add(pav)
    suolo.rotation.z = (pendenza * Math.PI) / 180
    suolo.position.y = -4 * S
    scene.add(suolo)
    if (FIGURE[id].floor === false && id !== 'open_book') suolo.visible = false

    // manichino
    const matCorpo = (c: THREE.Color) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.05 })
    const cil = new THREE.CylinderGeometry(1, 1, 1, 20)
    const sfera = new THREE.SphereGeometry(1, 24, 16)
    const segmenti = SEGMENTI.map((s) => {
      const m = new THREE.Mesh(cil, matCorpo(colore(coinvolti, s.muscoli)))
      m.castShadow = true
      scene.add(m)
      return { s, m }
    })
    const snodi = SNODI.map((n) => {
      const m = new THREE.Mesh(sfera, matCorpo(n.muscoli.length ? colore(coinvolti, n.muscoli) : BASE))
      m.scale.setScalar(n.r)
      m.castShadow = true
      scene.add(m)
      return { n, m }
    })
    const testa = new THREE.Mesh(sfera, matCorpo(BASE))
    testa.scale.set(0.1, 0.12, 0.1)
    testa.castShadow = true
    scene.add(testa)
    const collo = new THREE.Mesh(cil, matCorpo(colore(coinvolti, ['trapezio-alto'])))
    scene.add(collo)

    // attrezzi: ricreati a ogni fotogramma (sono pochi e semplici)
    const matAttrezzo = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.5 })
    const matAccento = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 })
    const matMuro = new THREE.MeshStandardMaterial({ color: scuro ? 0x2a2a2d : 0xd6d3d1, transparent: true, opacity: 0.18, depthWrite: false })
    const matTappeto = new THREE.MeshStandardMaterial({ color: 0xf97316, transparent: true, opacity: 0.25 })
    const lineaMat = { attrezzo: new THREE.LineBasicMaterial({ color: 0x64748b }), accento: new THREE.LineBasicMaterial({ color: 0xf97316 }) }
    const gruppoAttrezzi = new THREE.Group()
    scene.add(gruppoAttrezzi)
    const boxGeo = new THREE.BoxGeometry(1, 1, 1)
    const disegnaAttrezzi = (ogg: Oggetto3D[]) => {
      for (const c of [...gruppoAttrezzi.children]) {
        gruppoAttrezzi.remove(c)
        if (c instanceof THREE.Line) c.geometry.dispose()
      }
      for (const o of ogg) {
        if (o.k === 'box') {
          const m = new THREE.Mesh(boxGeo, o.tono === 'muro' ? matMuro : o.tono === 'tappeto' ? matTappeto : matAttrezzo)
          m.position.set(...o.centro)
          m.scale.set(...o.dim)
          m.receiveShadow = true
          gruppoAttrezzi.add(m)
        } else if (o.k === 'cilindro') {
          const m = new THREE.Mesh(cil, o.tono === 'accento' ? matAccento : matAttrezzo)
          orienta(m, o.a, o.b)
          m.scale.x = m.scale.z = o.r
          m.castShadow = true
          gruppoAttrezzi.add(m)
        } else if (o.k === 'sfera') {
          const m = new THREE.Mesh(sfera, o.tono === 'accento' ? matAccento : matAttrezzo)
          m.position.set(...o.centro)
          m.scale.setScalar(o.r)
          m.castShadow = true
          gruppoAttrezzi.add(m)
        } else {
          const geo = new THREE.BufferGeometry().setFromPoints(o.punti.map((p) => new THREE.Vector3(...p)))
          gruppoAttrezzi.add(new THREE.Line(geo, lineaMat[o.tono]))
        }
      }
    }

    const def = FIGURE[id]
    // ?t3d=0..1 blocca l'animazione su un istante (utile per controllare le pose)
    const tFisso = Number(new URLSearchParams(location.hash.split('?')[1] ?? '').get('t3d') ?? NaN)
    let t0 = performance.now()
    let tPausa = 0
    let raf = 0
    const frame = (now: number) => {
      if (stato.current.pausa) {
        if (!tPausa) tPausa = now
      } else if (tPausa) {
        t0 += now - tPausa
        tPausa = 0
      }
      const t = Number.isFinite(tFisso) ? tFisso : faseAnimazione(def, (tPausa || now) - t0)
      const { giunti: g, j2d, piano } = scheletro3D(id, t)
      for (const { s, m } of segmenti) {
        orienta(m, g[s.a], g[s.b])
        m.scale.x = m.scale.z = s.r
      }
      for (const { n, m } of snodi) m.position.set(...g[n.g])
      testa.position.set(...g.head)
      orienta(collo, g.shoulder, g.head)
      collo.scale.x = collo.scale.z = 0.045
      collo.scale.y *= 0.5
      disegnaAttrezzi(oggetti3D(id, t, g, j2d, def, piano))
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }

    const ridimensiona = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    ridimensiona()
    const ro = new ResizeObserver(ridimensiona)
    ro.observe(el)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose()
      })
      cil.dispose()
      sfera.dispose()
      boxGeo.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [id])

  // cambio di inquadratura
  useEffect(() => {
    const { camera, controls } = stato.current
    if (!camera || !controls) return
    const [x, y, z] = CAMERE[vista]
    camera.position.set(x, y + controls.target.y - 0.8, z)
    controls.update()
  }, [vista])

  return (
    <div>
      <div ref={host} className="aspect-square w-full touch-none overflow-hidden rounded-xl bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-950 sm:aspect-[4/3]" />
      <div className="mt-2 flex gap-1.5 overflow-x-auto">
        {(
          [
            ['tre-quarti', '3/4'],
            ['lato', 'Lato'],
            ['fronte', 'Fronte'],
            ['alto', 'Alto'],
          ] as const
        ).map(([v, l]) => (
          <button key={v} type="button" onClick={() => setVista(v)} className={`h-9 flex-1 rounded-lg text-sm font-semibold ${vista === v ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
            {l}
          </button>
        ))}
        <button type="button" onClick={() => setPausa((p) => !p)} className="h-9 rounded-lg bg-zinc-200 px-3 text-sm font-semibold dark:bg-zinc-800" aria-label={pausa ? 'Riprendi' : 'Pausa'}>
          {pausa ? '▶' : '❚❚'}
        </button>
      </div>
    </div>
  )
}

