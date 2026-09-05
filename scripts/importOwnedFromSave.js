import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default location of the Marvel Snap save file on Windows. Derivata da
// os.homedir() (es. C:\Users\<utente-attuale>) cosi' funziona subito anche
// su un PC nuovo, senza dover modificare il percorso a mano.
// Puo' comunque essere sovrascritta con:
// node importOwnedFromSave.js "C:\percorso\CollectionState.json"
const DEFAULT_SAVE_PATH = path.join(
  os.homedir(),
  'AppData',
  'LocalLow',
  'Second Dinner',
  'SNAP',
  'Standalone',
  'States',
  'nvprod',
  'CollectionState.json'
);

const OUTPUT_PATH = path.join(__dirname, '../public/owned-variants.json');

/**
 * Convert PascalCase to kebab-case (must match the same logic used in
 * extractAllVariants.js so the generated ids line up with variants.json)
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function main() {
  const savePath = process.argv[2] || DEFAULT_SAVE_PATH;

  console.log('🚀 Marvel Snap - Importa Varianti Possedute dal Salvataggio');
  console.log('===========================================================\n');
  console.log(`📄 Leggendo: ${savePath}\n`);

  if (!fs.existsSync(savePath)) {
    console.error(`❌ File non trovato: ${savePath}`);
    console.error('\nPassa il percorso corretto come argomento:');
    console.error('  node scripts/importOwnedFromSave.js "C:\\percorso\\CollectionState.json"');
    process.exit(1);
  }

  // Strip UTF-8 BOM if present
  let raw = fs.readFileSync(savePath, 'utf-8');
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }

  const data = JSON.parse(raw);
  const ownershipEntries = data?.ServerState?.CardOwnership?.Dao?.S;

  if (!Array.isArray(ownershipEntries)) {
    console.error('❌ Struttura del salvataggio inattesa (CardOwnership.Dao.S non trovato)');
    console.error('Il formato del salvataggio potrebbe essere cambiato con un aggiornamento del gioco.');
    process.exit(1);
  }

  console.log(`✅ Trovate ${ownershipEntries.length} carte base nel salvataggio\n`);

  const ownedIds = [];

  for (const entry of ownershipEntries) {
    const baseCardName = entry.C; // e.g. "Crystal"
    const variantSuffixes = entry.V || []; // e.g. [1, 2, 3, 6, 4]

    if (!baseCardName) continue;

    const kebabName = toKebabCase(baseCardName);

    for (const suffix of variantSuffixes) {
      const paddedSuffix = String(suffix).padStart(2, '0');
      ownedIds.push(`${kebabName}-${paddedSuffix}`);
    }
  }

  console.log(`✅ Estratte ${ownedIds.length} varianti possedute\n`);

  // La vera data di acquisizione (quando la variante è stata ottenuta in gioco,
  // non quando è stata aggiunta a una lista nell'app) viene da
  // ServerState.Cards[].TimeCreated. Ogni entry lì è un'istanza fisica della
  // carta (CardDefId + ArtVariantDefId, es. "Darkhawk" + "Darkhawk_08"), il cui
  // suffisso numerico corrisponde allo stesso "V" usato sopra. Se la stessa
  // variante compare più volte (es. dopo uno split), teniamo la data più
  // vecchia: è la prima volta che è stata ottenuta.
  const cardEntries = data?.ServerState?.Cards;
  const acquisitionDates = {};

  if (Array.isArray(cardEntries)) {
    for (const card of cardEntries) {
      const artVariantId = card?.ArtVariantDefId; // e.g. "Darkhawk_08"
      const timeCreated = card?.TimeCreated;
      if (!artVariantId || !timeCreated) continue;

      const match = artVariantId.match(/^(.+)_(\d+)$/);
      if (!match) continue;

      const [, cardDefId, suffix] = match;
      const kebabName = toKebabCase(cardDefId);
      const paddedSuffix = String(Number(suffix)).padStart(2, '0');
      const id = `${kebabName}-${paddedSuffix}`;

      const existing = acquisitionDates[id];
      if (!existing || new Date(timeCreated).getTime() < new Date(existing).getTime()) {
        acquisitionDates[id] = timeCreated;
      }
    }
  }

  console.log(`✅ Estratte ${Object.keys(acquisitionDates).length} date di acquisizione\n`);

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const output = {
    ownedIds,
    acquisitionDates,
    count: ownedIds.length,
    importedAt: new Date().toISOString(),
  };

  // Keep the previous importedAt when nothing else changed, so a no-op
  // re-import (e.g. on every `npm run dev`) produces no git diff.
  try {
    const prev = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
    const strip = (o) => JSON.stringify({ ...o, importedAt: null });
    if (strip(prev) === strip(output) && prev.importedAt) {
      output.importedAt = prev.importedAt;
    }
  } catch {
    // no previous file - use the fresh timestamp
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`💾 Salvato in: ${OUTPUT_PATH}`);
  console.log('\n📋 Prime 10 varianti possedute:');
  ownedIds.slice(0, 10).forEach((id, i) => console.log(`  ${i + 1}. ${id}`));

  console.log('\n✅ Fatto! Ricarica l\'app per vedere le tue varianti possedute.');
}

main();
