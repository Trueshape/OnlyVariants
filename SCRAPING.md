# Pipeline dati

Tutti i file in `public/*.json` sono generati. Tre script li producono; girano
automaticamente prima di `npm run dev` (`scripts/predev.js`) e insieme da
`aggiorna-dati.bat`. Ogni script è "best effort": se la fonte non è
disponibile logga un warning e lascia intatto il file esistente.

Gli script sono **deterministici**: rigenerarli senza che i dati siano
cambiati non produce alcun diff git (voci ordinate per `id`, `addedDate` /
`importedAt` / `generatedAt` conservati quando il resto è identico).

## 1. `npm run scrape-all` — elenco varianti

`scripts/extractAllVariants.js`

1. Scarica il bundle JS di snapcomplete (`BUNDLE_URL` nello script) in
   `bundle-raw.js` (cache locale, git-ignorata).
2. Lo esegue in una sandbox `vm` con gli import stubbati per estrarre
   l'array grezzo delle varianti.
3. Normalizza ogni voce: id kebab-case, nome visualizzato, artisti, data e
   stato di rilascio, rarità, source/series, URL immagine.
4. Riporta l'`addedDate` originale dalle voci già note; assegna una data
   nuova solo alle varianti mai viste (e le elenca in console).
5. Scrive `public/variants-complete.json` e `public/variants.json`
   (identici), più `public/variants-meta.json` con l'hash del contenuto —
   l'app riscarica il file completo solo quando `version` cambia.

Flag: `--cached` riusa `bundle-raw.js` senza riscaricare (utile per
iterare sul parsing offline).

## 2. `npm run import-owned` — collezione posseduta

`scripts/importOwnedFromSave.js`

Legge il salvataggio di Marvel Snap:

```
%USERPROFILE%\AppData\LocalLow\Second Dinner\SNAP\Standalone\States\nvprod\CollectionState.json
```

- `ServerState.OwnedCardDefs[].ArtVariantDefIds` → lista degli id posseduti.
- `ServerState.Cards[].TimeCreated` → vera data di acquisizione in gioco
  (la più vecchia se una variante compare più volte). Diversa da quando la
  carta è stata aggiunta a una lista nell'app.

Output: `public/owned-variants.json` (`ownedIds`, `acquisitionDates`,
`count`, `importedAt`).

Percorso alternativo: `node scripts/importOwnedFromSave.js "C:\path\CollectionState.json"`.

## 3. `npm run import-costs` — costi / bundle

`scripts/importCostData.js`

Legge `ShopState.json` (stessa cartella del punto 2) ed estrae, per le
varianti viste di recente nello shop/vault, il nome del bundle di
provenienza. La copertura è **parziale** per natura. L'app mostra solo
`bundleName`; gli eventuali costi gold/token non vengono usati nella UI.

Output: `public/cost-data.json` (`entries`, `count`, `importedAt`).

## Come l'app consuma i dati

`src/services/snapCompleteService.ts` fa il fetch di `variants-meta.json`,
confronta `version` con la copia in `localStorage` e riscarica
`variants.json` solo se è cambiata. In caso di errore totale ripiega su un
piccolo set di dati mock. `src/App.tsx` unisce poi `owned-variants.json` e
`cost-data.json` sopra le varianti caricate.
