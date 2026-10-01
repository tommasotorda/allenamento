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
- `npx tsx scripts/prova-generatore.ts [id,id]` – stampa le schede generate dai profili standard
- `python3 scripts/catalogo_meta.py` / `python3 scripts/catalogo_nuovi.py` / `python3 scripts/catalogo_aggiunte.py` – metadati del generatore ed esercizi aggiunti in `exercises.json` (idempotenti)

## Stack

React 19 + TypeScript + Vite, Tailwind v4, Dexie (IndexedDB), React Router (HashRouter, per GitHub Pages), Recharts (caricato solo in Progressi), three.js (caricato solo nella scheda esercizio), vite-plugin-pwa.

## Struttura

- `src/data/` – JSON statici: `exercises.json`, `program.json`, `tests.json`
- `src/domain/` – logica pura e testata: calendario/ciclo, progressione, statistiche, struttura seduta, validazione, muscoli (`muscles.ts`), modifica dei blocchi e suggerimenti di sostituzione (`editing.ts`), piani (`plans.ts`), generatore (`generator.ts`), profili standard (`profili.ts`), adattamenti e proposte (`adattamento.ts`)
- `src/db/` – schema Dexie, repository, backup (export/import JSON con foto in base64)
- `src/figures/` – `engine.ts` + `poses.ts` (con `poses2.ts` e `poses3.ts` per gli esercizi aggiunti dopo): pose A e B di ogni esercizio (2D, cinematica diretta/inversa); `pose3d.ts` le porta in 3D per il visore; `muscleGeometry.ts` + `muscleMap.ts`: mappa muscolare stile Technogym
- `src/features/` – schermate: oggi, scheda, progressi, esercizi, impostazioni, piani (questionario, le mie schede, profili), adattamento

## Scostamenti dalla specifica

- Il campo "dolore ginocchio" delle misure non è più mostrato (modulo, grafici, PDF): troppo specifico. Il dato resta in `Misura.doloreGinocchio` per compatibilità.

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

## Piani (schede)

- L'utente ha più **piani** (tabella Dexie `piani`), uno attivo (`impostazioni.pianoAttivo`). Ogni piano ha il suo `programma`, la copia `originale` per ripristinare i blocchi, `inizio` (lunedì) e `settimane` (12 = scadenza a 3 mesi).
- Le sedute hanno ID liberi (`s1`, `lun`…) e `programma.settimana` le assegna ai giorni, weekend compresi. `Seduta.core` indica il blocco core iniziale.
- `useCiclo()` restituisce piano attivo, programma, settimana, fase e `scaduto`: è la fonte da usare nelle schermate. Le sedute registrate salvano `pianoId` e `nomeSeduta`.
- Migrazione: la versione 3 del database crea il "Piano originale" dal JSON con le modifiche fatte nella v2; i backup v1/v2 si importano allo stesso modo.
- Primo avvio: nessun piano creato in automatico. Senza schede (`useSenzaSchede()`) Oggi e Scheda mostrano `InvitoScheda` (`piani/NuovaScheda.tsx`) con i modi per crearne una; il "Piano originale" resta tra i profili. Impostazioni → Schede → "Elimina tutte le schede" (`eliminaTutteLeSchede`) riporta a questo stato senza toccare storico, misure e profili.

## Generatore, profili e adattamenti

- Categoria `cardio` per le macchine (tapis roulant, cyclette, air bike, vogatore: attrezzo `macchine-cardio`); attrezzo `fitball`. Gli addominali in flessione (crunch, V-up) hanno schema `isolamento`, così il blocco core automatico resta su esercizi di stabilità.
- Ogni esercizio ha `schemi` di movimento, `attrezzi` (gruppi AND di alternative OR, `[]` = corpo libero), `livello`, `impatto`, `sollecita` (zone), `funzionale`.
- `Risposte.corpoLibero`: se falso (e ci sono attrezzi) esclude gli esercizi di forza/potenza a corpo libero; se vero li preferisce leggermente. Assente = vero. Durate da 30 min a 2 ore (4-10 esercizi).
- `generaProgramma(risposte)`: split in base ai giorni (total body, gambe/superiore, condizionamento), slot per schema scelti per disponibilità (attrezzi, livello, zone da evitare) e punteggio (funzionale, focus, obiettivo). Parametri e fasi dipendono dagli obiettivi (il primo per i principali e le fasi, il secondo per gli accessori); potenza aggiunge un esplosivo in apertura, resistenza un circuito finale, mobilità più stretching/yoga.
- Profili standard = risposte preimpostate (`profili.ts`) che aprono il questionario precompilato; i profili salvati dall'utente (`profili` in Dexie) sono copie di programmi. Il "+ Nuovo profilo" in fondo a Profili li crea con il questionario o da un'AI (`?per=profilo`: si salva un profilo invece di una scheda) oppure da una scheda esistente.
- `adatta(programma, direzioni, contesto)` restituisce il nuovo programma e l'elenco delle modifiche; si applica come nuovo piano e il precedente va in archivio. `proposteAdattamento()` propone di adattare alla scadenza, dopo i test di metà ciclo, a metà delle sedute o con 1RM stimato +10%; le proposte rimandate stanno in `piano.proposteChiuse`.
- Deterministico: stesse risposte, stessa scheda (c'è un test).
- Questionario dettagliato: `suddivisione` (auto, full body, superiore/inferiore, spinta/tirata/gambe, gruppi muscolari — `modelliPer`), `attrezziGiorno` (attrezzi e corpo libero per singolo giorno), `sport` (tipo, giorni, durata). Gli slot `Mu(...)` scelgono esercizi in cui quei muscoli sono primari: gli esercizi di isolamento (schema `isolamento`) entrano solo così. Nei giorni con sport la seduta ha l'attività, un esercizio in meno e niente salti; i giorni di solo sport diventano sedute con l'attività e un defaticamento.
- Principi di programmazione in `programmazione.ts`: serie settimanali per gruppo muscolare dentro un intervallo per obiettivo e livello (`volumeTarget`, braccia e polpacci al 60%, core escluso), schiena almeno quanto il petto, ordine (esplosivi, fondamentali, complementari, isolamento, trasporti, core), riscaldamento specifico (`Seduta.riscaldamento`), superserie (`Prescrizione.superserie` = lettera del gruppo; il primo della coppia ha recupero 0, il timer parte dopo l'ultimo). `etichetteSuperserie` dà A1/A2 per la UI.
- `Risposte.eserciziPerSeduta` (4-16, assente = in base alla durata) conta tutta la seduta: `ripartisci` lo divide tra riscaldamento, palestra (ogni esercizio di un circuito conta) e defaticamento; senza blocco core a parte. Gli slot del modello si scorrono di nuovo finché la seduta è piena, se il catalogo lo consente. `superserie` 'alcune' (con `coppieSuperserie`) o 'tutte'. Con `suddivisione: 'libera'` il questionario mostra il passo Composizione e `composizione[giorno]` elenca i componenti (`modelloComposto`: prima i fondamentali di ogni componente, poi gli altri a rotazione).
- **Riepilogo del carico** (`RiepilogoCarico.tsx`): serie settimanali per gruppo con slider (`impostaVolumeGruppo` cambia le serie degli esercizi dedicati, o dei secondari se non ce ne sono, da 1 a 6; `limitiVolumeGruppo` dà l'intervallo raggiungibile) e mappa del carico (`caricoMuscoli`: serie × coinvolgimento, colore continuo con `mappaSvg(..., { intensita })`). È nell'anteprima del questionario e della scheda da AI (i ritocchi restano nello stato di sessione) e nella scheda attiva (scheda Carico).
- Nell'editor della seduta "Superserie con il successivo" / "Sciogli superserie" (`alternaSuperserie`), anche nella scheda libera.
- **Scheda da un'AI** (`schedaLlm.ts`, pagina `/scheda-ai`): `modelloPerLlm()` produce il JSON da dare a un LLM (istruzioni, formato `allenamento/scheda@1`, catalogo esercizi con id, misura, attrezzi e muscoli, esempio valido). `importaSchedaLlm(testo)` accetta anche blocchi di codice e nomi al posto degli id, controlla ogni campo e restituisce tutti gli errori con posizione e suggerimento; niente core né pista nel formato. Origine del piano: `importata`. Cambiando il formato va aggiornato anche l'esempio (c'è un test).
- `Seduta.attivita` è generica (tennis, calcio...): i minuti stanno in `SedutaLog.tennisMin` (nome storico).

## PDF

- **Progressi** (`esportaProgressi.ts`): riepilogo, misure, forza per esercizio, volume, test e storico; grafici disegnati con le primitive di jsPDF. Stile e utilità comuni in `pdf/comune.ts`.

### Scheda

`src/features/pdf/esportaPdf.ts` (jsPDF + svg2pdf.js, caricati solo al clic): indice con un pulsante per giorno e, per ogni giorno, tre viste (Scheda, Muscoli, Dettaglio) collegate da linguette e segnalibri. Solo link interni tra pagine, perché il JavaScript nei PDF funziona solo in Acrobat. Le figure 2D (`figuraSvg`, posizione iniziale e finale) e le mappe muscolari (`mappaSvg` con `inline: true`) sono vettoriali. Il testo passa per `t()` perché il font standard è Windows-1252.

## Pagina esercizio

Chi apre un esercizio passa nello stato della navigazione una lista (`features/esercizi/lista.tsx`): swipe/frecce scorrono tra le voci (`navigate` con `replace`, così "indietro" torna alla lista). Le voci con `blocco`/`indice` e `pianoId` si modificano da `ModificaNellaScheda` (specifiche con `PrescrizioneForm`, sostituzione, rimozione). Sul visore 3D lo scorrimento vale solo se rapido, altrimenti il trascinamento ruota la figura.

Nel selettore degli esercizi (`ExercisePicker`, usato dagli editor dei blocchi e dalla scheda libera) il tasto a destra aggiunge o sostituisce subito; toccando la riga si apre `AnteprimaEsercizio` (visore 3D, muscoli, esecuzione) come livello sopra il selettore, con frecce/tastiera/swipe sull'elenco visibile. Non cambia pagina, quindi chiudendola filtro e scorrimento restano. Visore, muscoli ed esecuzione sono componenti condivisi con la pagina esercizio. Quando si aggiunge a un blocco (`seduta` passato da `BlockEditor`), "Aggiungi alla scheda" apre il modulo delle specifiche (`PrescrizioneForm`, in un file suo) e "Conferma" salva restando nell'anteprima; le voci già presenti mostrano `VoceInSeduta` (modifica, prima/dopo, superserie con la successiva, rimozione). Spostamento e superserie ci sono anche in `ModificaNellaScheda`.

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) pubblica su GitHub Pages a ogni push su `main`. Il repo si chiama `allenamento`, quindi l'app sta in `/allenamento/` (`BASE_PATH` impostato dal workflow; diventerebbe `/` con un repo `<utente>.github.io`).
