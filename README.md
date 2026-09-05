# OnlyVariants

App web per tracciare la collezione di **varianti** di Marvel Snap: quali possiedi,
quali vuoi (wishlist), quali sono in arrivo e quanto costano nei bundle.

I dati vengono generati in locale da due fonti:

- l'elenco completo delle varianti, decodificato dal bundle di
  [snapcomplete.com](https://snapcomplete.com);
- il tuo salvataggio di Marvel Snap sul PC (carte possedute, date di
  acquisizione, costi/bundle visti nello shop).

Vedi [SCRAPING.md](SCRAPING.md) per il dettaglio della pipeline dati.

## Requisiti

- **Windows** (per i file `.bat`). Su altri OS: serve Node.js 20.19+ e si
  usa `npm` direttamente.
- (opzionale) Marvel Snap installato su questo PC, per l'import automatico
  della collezione. Senza, l'app parte comunque (0 carte possedute finché
  non generi i dati).

**Node.js non serve installarlo**: `avvia-sito.bat` ne scarica una copia
portable in `tools/node/` al primo avvio (nessun installer, nessun admin).

## Avvio rapido

Windows, doppio click:

- `avvia-sito.bat` — scarica Node (prima volta), installa le dipendenze,
  avvia il dev server e apre il browser
- `aggiorna-dati.bat` — riscarica varianti + reimporta collezione/costi

Su un PC nuovo: scarica il progetto (ZIP da GitHub o `git clone`) e fai
doppio click su `avvia-sito.bat`. Nient'altro.

Da terminale (se hai già Node):

```bash
npm install --legacy-peer-deps
npm run dev            # http://localhost:5173
```

`npm run dev` esegue prima `scripts/predev.js`, che rigenera i dati dal
salvataggio locale e ricontrolla le nuove varianti annunciate. Se il gioco
non è installato o non c'è rete, salta l'operazione e usa i dati esistenti.

## Script

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Dev server (con reimport dati automatico) |
| `npm run build` | Type-check (`tsc -b`) + build di produzione in `dist/` |
| `npm run preview` | Anteprima della build di produzione |
| `npm run lint` | [oxlint](https://oxc.rs) |
| `npm test` | Test unitari ([vitest](https://vitest.dev)) |
| `npm run scrape-all` | Riscarica e decodifica l'elenco varianti da snapcomplete |
| `npm run import-owned` | Importa le carte possedute da `CollectionState.json` |
| `npm run import-costs` | Importa costi/bundle da `ShopState.json` |

## Struttura

```
public/                 # dati generati, serviti come static asset
  variants.json           # elenco completo varianti (fonte per l'app) - committato
  variants-meta.json      # { version, count, generatedAt } per il cache-busting
  owned-variants.json     # ID posseduti + date di acquisizione - gitignored (dati personali)
  cost-data.json          # bundle/gold/token per variante - gitignored (dati personali, copertura parziale)
src/
  components/
    Navigation.tsx        # navbar + toggle "nascondi dettagli card"
    TabBar.tsx            # barra tab (crea/rinomina/riordina/elimina)
    VariantsList.tsx      # pagina principale: tab, filtri, ordinamento
    VariantCard.tsx       # singola card
    CardContextMenu.tsx   # menu right-click: aggiungi/togli dalle liste
    CardLightbox.tsx      # immagine ingrandita (click sulla card)
    UnreleasedCards.tsx   # timeline delle varianti non ancora uscite
    SettingsPage.tsx      # backup + Card styles + Badge colors
  hooks/
    useTabs.ts            # config tab (ordine, nomi, liste) + persistenza
    useListStore.ts       # N liste di ID varianti, una chiave localStorage per lista
    useStatusStyles.ts    # bordo/indicatore/hide-on per stato (Owned, Unowned, liste...)
    useBadgeColors.ts     # colore per badge (Source, Rarity per livello, Artist, Theme, Vault Quality, Price, Bundle)
  services/
    snapCompleteService.ts # carica/caching di variants.json, helper filtri
  types/variant.ts
scripts/                # pipeline dati (vedi SCRAPING.md)
```

## Interazioni sulle card

- **Click** sull'immagine → lightbox ingrandito (← / → o swipe per scorrere)
- **Right-click** sulla card (o il bottone ⋮) → menu per aggiungere/togliere la
  carta da qualsiasi lista, e "Open on SnapComplete"
- I chip rarità / fonte / artista / tema filtrano la griglia

## Tab

Le tab sono personalizzabili e salvate in `localStorage`:

- **+** in fondo crea una nuova lista (nome inline)
- **doppio click** sul nome per rinominare; **right-click** → Rename / Delete
- **trascina** per riordinare (o `Ctrl`/`Cmd` + frecce sulla tab attiva)
- `Wishlist`, `All`, `Owned`, `Unowned` sono fisse (non rinominabili/eliminabili)

## Settings (`/settings`)

- **Backup**: esporta/importa liste, tab e impostazioni come file JSON (utile
  per spostarsi tra PC o browser; le cache di varianti/carte possedute sono
  escluse). L'export finisce nella cartella Download del browser.
- **Card styles**: per ogni stato (Owned, Unowned, Unreleased, Wishlist, e
  ogni altra lista) scegli un bordo (on/off + colore) e/o un indicatore
  (nessuno / ribbon / barra, con colore e trasparenza), oltre a su quali tab
  nasconderlo. Tutto spento di default: l'utente attiva quello che vuole.
- **Badge colors**: un colore per ciascun badge della card (Source, un colore
  per ogni livello di Rarity - Rare/Super Rare/Ultimate/Spotlight -, Artist,
  Theme, Vault Quality, Price, Bundle).

## Persistenza (localStorage)

Tutto lo stato utente vive nel browser (nulla sul server).

| Chiave | Contenuto |
|---|---|
| `marvelSnapTabs` | configurazione tab (ordine, nomi, liste) |
| `marvelSnapWishlist` | wishlist (tab fissa) |
| `marvelSnapCustomList` | lista della tab "Bronze Age" |
| `marvelSnapFavorites` / `marvelSnapDisliked` | liste con indicatore sulla card |
| `marvelSnapList:<id>` | una lista per ogni tab creata dall'utente |
| `marvelSnapListView` | tab attiva + filtri + ordinamento della pagina principale |
| `marvelSnapCardColumns` | carte per riga, valore separato per modalità normale e "hide details" (`{normal,compact}`) |
| `marvelSnapStatusStyles` | bordo/indicatore/hide-on per stato, impostati da `/settings` |
| `marvelSnapBadgeColors` | colore per badge (Source/Rarity/Artist/Theme/Vault Quality/Price/Bundle) |
| `marvelSnapOwned` / `marvelSnapAcquisitionDates` | cache dell'ultimo import |
| `marvelSnapHideCardDetails` | toggle globale "nascondi nome/badge/info" |
| `marvelSnapUnreleasedWishlistOnly` | toggle "Wishlist only" nella sezione Unreleased |
| `marvelSnapVariants` / `marvelSnapVariantsVersion` | cache di `variants.json` |

## Stack

React 18 + TypeScript, Vite, React Router, lucide-react per le icone.
Lint con oxlint. Nessun framework CSS: CSS puro per componente.
