# Allenamento

PWA personale per seguire la scheda settimanale e registrare i progressi. Un solo utente, nessun server: i dati stanno in IndexedDB sul dispositivo. Specifica completa: `../piano-app-allenamento.json`.

## Comandi

- `npm run dev` – sviluppo
- `npm test` – Vitest (logica di dominio, backup, validazione dati)
- `npm run build` – valida i dati, typecheck e build in `dist/`
- `npm run validate` – fallisce se il programma usa esercizi inesistenti o se manca descrizione/figura
- `npm run figures:preview -- <id,id> <out.html>` – foglio HTML con le pose A / metà / B delle figure (base del 3D)
- `npx tsx scripts/preview-muscles.ts <id,id> <out.html>` – anteprima delle mappe muscolari
- `npm run icons` – rigenera le icone PWA (solo macOS: usa Quick Look e sips)

## Stack

React 19 + TypeScript + Vite, Tailwind v4, Dexie (IndexedDB), React Router (HashRouter, per GitHub Pages), Recharts (caricato solo in Progressi), three.js (caricato solo nella scheda esercizio), vite-plugin-pwa.

## Struttura

- `src/data/` – JSON statici: `exercises.json`, `program.json`, `tests.json`
- `src/domain/` – logica pura e testata: calendario/ciclo, progressione, statistiche, struttura seduta, validazione, muscoli (`muscles.ts`), scheda personalizzata e suggerimenti di sostituzione (`editing.ts`)
- `src/db/` – schema Dexie, repository, backup (export/import JSON con foto in base64)
- `src/figures/` – `engine.ts` + `poses.ts`: pose A e B di ogni esercizio (2D, cinematica diretta/inversa); `pose3d.ts` le porta in 3D per il visore; `muscleGeometry.ts` + `muscleMap.ts`: mappa muscolare stile Technogym
- `src/features/` – schermate: oggi, scheda, progressi, esercizi, impostazioni

## Vincoli sui testi (dalla specifica)

- Nessuna sezione su dieta, calorie, macronutrienti.
- L'unico testo descrittivo ammesso è l'esecuzione degli esercizi (posizione, movimento, respirazione).
- Vietati: avvisi di sicurezza ("fermati se..."), commenti sulla condizione fisica, spiegazioni del perché, messaggi motivazionali, badge, notifiche di incoraggiamento.
- Nessun campo di testo libero nei log: solo numeri e scelte.
- Registrare una seduta di palestra deve richiedere solo tap e stepper.

## Figure

Tutto è generato da codice: niente immagini esterne, niente licenze, funziona offline.

- **Mappa muscolare** (miniature ed elenchi): SVG fronte/retro a pannelli poligonali. Ogni gruppo è `<g id="<prefisso>-<vista>-<muscolo>" class="muscolo" data-livello="0-3">`; il colore viene dal CSS (`.mappa-muscoli`, variabili `--mm-1..3` in `index.css`, scala di rossi).
- **Coinvolgimento muscolare**: campo `muscoli` in `exercises.json` (muscolo o alias → 1 stabilizzatore, 2 secondario, 3 primario). Serve alla mappa, al colore del manichino 3D e ai suggerimenti di sostituzione (somiglianza coseno).
- **Visore 3D** (scheda esercizio): manichino geometrico three.js animato con le stesse pose 2D. Gli esercizi non di profilo hanno un piano diverso in `PIANI` e, se serve, un movimento speciale in `speciali` (`pose3d.ts`).

Aggiungendo un esercizio a `exercises.json` servono `esecuzione`, `muscoli` e la voce in `FIGURE` (`src/figures/poses.ts`), altrimenti `npm run validate` fallisce. Angoli delle pose in gradi: 0 = destra, 90 = giù, -90 = su; la figura guarda a destra. Le foto scattate dall'utente hanno priorità nelle miniature.

## Scheda personalizzata

Tabella Dexie `schede` (singleton): contiene solo i blocchi modificati (palestra/mobilità per giorno, varianti del core). `programmaEffettivo()` la unisce al programma originale; `useCiclo().programma` è sempre quello da usare nelle schermate. Fasi, pista e sbloccabili non sono modificabili. Inclusa in export/import (backup versione 2; la versione 1 si importa ancora).

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) pubblica su GitHub Pages a ogni push su `main`; `BASE_PATH` viene impostato al nome del repo.
