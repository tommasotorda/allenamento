# Allenamento

PWA personale per seguire la scheda settimanale e registrare i progressi. Un solo utente, nessun server: i dati stanno in IndexedDB sul dispositivo. Specifica completa: `../piano-app-allenamento.json`.

## Comandi

- `npm run dev` – sviluppo
- `npm test` – Vitest (logica di dominio, backup, validazione dati)
- `npm run build` – valida i dati, typecheck e build in `dist/`
- `npm run validate` – fallisce se il programma usa esercizi inesistenti o se manca descrizione/figura
- `npm run figures:preview -- <id,id> <out.html>` – foglio HTML con le pose A / metà / B delle figure
- `npm run icons` – rigenera le icone PWA (solo macOS: usa Quick Look e sips)

## Stack

React 19 + TypeScript + Vite, Tailwind v4, Dexie (IndexedDB), React Router (HashRouter, per GitHub Pages), Recharts (caricato solo in Progressi), vite-plugin-pwa.

## Struttura

- `src/data/` – JSON statici: `exercises.json`, `program.json`, `tests.json`
- `src/domain/` – logica pura e testata: calendario/ciclo, progressione, statistiche, struttura seduta, validazione
- `src/db/` – schema Dexie, repository, backup (export/import JSON con foto in base64)
- `src/figures/` – illustrazioni degli esercizi: `engine.ts` (omino con cinematica diretta/inversa, disegno SVG, animazione) e `poses.ts` (posa A e B per ogni esercizio)
- `src/features/` – schermate: oggi, scheda, progressi, esercizi, impostazioni

## Vincoli sui testi (dalla specifica)

- Nessuna sezione su dieta, calorie, macronutrienti.
- L'unico testo descrittivo ammesso è l'esecuzione degli esercizi (posizione, movimento, respirazione).
- Vietati: avvisi di sicurezza ("fermati se..."), commenti sulla condizione fisica, spiegazioni del perché, messaggi motivazionali, badge, notifiche di incoraggiamento.
- Nessun campo di testo libero nei log: solo numeri e scelte.
- Registrare una seduta di palestra deve richiedere solo tap e stepper.

## Figure

Le immagini degli esercizi sono generate da codice (nessun file esterno, nessuna licenza da gestire, funzionano offline). Aggiungendo un esercizio a `exercises.json` va aggiunta la sua voce in `FIGURE` (`src/figures/poses.ts`), altrimenti `npm run validate` fallisce. Angoli in gradi: 0 = destra, 90 = giù, -90 = su; la figura guarda a destra. Le foto scattate dall'utente hanno priorità sulle figure nelle miniature.

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) pubblica su GitHub Pages a ogni push su `main`; `BASE_PATH` viene impostato al nome del repo.
