import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default location of the Marvel Snap shop save file on Windows. Derivata
// da os.homedir() (es. C:\Users\<utente-attuale>) cosi' funziona subito
// anche su un PC nuovo, senza dover modificare il percorso a mano.
// Puo' comunque essere sovrascritta con:
// node importCostData.js "C:\percorso\ShopState.json"
const DEFAULT_SAVE_PATH = path.join(
  os.homedir(),
  'AppData',
  'LocalLow',
  'Second Dinner',
  'SNAP',
  'Standalone',
  'States',
  'nvprod',
  'ShopState.json'
);

const OUTPUT_PATH = path.join(__dirname, '../public/cost-data.json');

/**
 * Convert PascalCase to kebab-case (must match extractAllVariants.js so the
 * generated ids line up with variants.json)
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Convert a game ArtVariantDefId like "MrFantastic_10" into our variant id
 * format, e.g. "mr-fantastic-10".
 */
function toVariantId(artVariantDefId) {
  const [base, suffix] = artVariantDefId.split('_');
  if (!base || !suffix) return null;
  const paddedSuffix = String(parseInt(suffix, 10)).padStart(2, '0');
  return `${toKebabCase(base)}-${paddedSuffix}`;
}

// The card variant is only ever actually "for sale" wrapped in one of these
// vendor item shapes. Every other place an ArtVariantDefId shows up in the
// save (CosmeticsVendor avatar icons, CardUpgradeVendor level-ups, etc.) is
// NOT a variant purchase and must not be read as one - e.g. CosmeticsVendor
// items carry their own unrelated GoldCost (avatar icon price, ~400 gold)
// that has nothing to do with the price of owning the card variant itself
// (which only ever comes in the real tiers: 700 / 1200 gold, vendor tokens,
// or a Collector's Vault gold price).
function priceFromAncestors(ancestors) {
  // Walk from the closest ancestor outward and stop at the first vendor
  // item shape we recognize.
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const anc = ancestors[i];
    const type = anc && anc.$type;
    if (!type) continue;

    if (type.startsWith('CubeShop.DailyOfferItemData')) {
      const price = anc.ItemSalePrice ?? anc.ItemBasePrice;
      if (price !== undefined) return { goldCost: price };
      return null;
    }

    if (type.startsWith('CubeShop.Model.CardShopModuleItem') || type.startsWith('CubeShop.CardShopModuleItem')) {
      const cost = anc.OverrideCurrencyCost ?? anc.CurrencyCost;
      if (cost === undefined) return null;
      if (anc.CurrencyTypeId === 'CollectorsTokens') return { tokenCost: cost };
      return { goldCost: cost };
    }

    if (type.startsWith('CubeShop.CollectorsVaultItemData')) {
      const info = {};
      if (anc.GoldCost !== undefined) info.goldCost = anc.GoldCost;
      if (anc.CollectorsQualityDefId) info.vaultQuality = anc.CollectorsQualityDefId;
      return info;
    }

    // Cosmetics vendor (avatar/icon purchases) and card-upgrade vendor
    // (leveling up an already-owned variant) are explicitly NOT a variant
    // purchase price - stop here rather than letting an unrelated GoldCost
    // from further up the tree get attributed to this variant.
    if (type.startsWith('CubeShop.CosmeticsVendorItemData') || type.startsWith('CubeShop.CardUpgradeVendorItemData')) {
      return null;
    }
  }
  return null;
}

// Bundle name lookup: BundleDefId / ProductRewardDefId on a nearby ancestor,
// for the (much larger) set of variants we've merely seen referenced in a
// bundle/battle pass listing without an itemized gold/token price.
function bundleNameFromAncestors(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const anc = ancestors[i];
    if (!anc || typeof anc !== 'object') continue;
    if (anc.BundleDefId) return anc.BundleDefId;
    if (anc.ProductRewardDefId) return anc.ProductRewardDefId;
  }
  return undefined;
}

/**
 * The Marvel Snap shop save is a deeply-nested, versioned game-state dump.
 * We walk the whole tree looking for actual `Cube.Common.Card` objects that
 * carry an ArtVariantDefId (a real card/variant reference - this excludes
 * CardArtAvatar objects, which are cosmetic profile-icon references and use
 * an unrelated price).
 */
function extractCostEntries(root) {
  const entries = [];

  function walk(obj, ancestors) {
    if (Array.isArray(obj)) {
      for (const item of obj) walk(item, ancestors);
      return;
    }
    if (obj && typeof obj === 'object') {
      if (obj.$type === 'Cube.Common.Card, SecondDinner.Cube.Common' && obj.ArtVariantDefId) {
        const price = priceFromAncestors(ancestors);
        const bundleName = bundleNameFromAncestors(ancestors);
        entries.push({
          variant: obj.ArtVariantDefId,
          goldCost: price?.goldCost,
          tokenCost: price?.tokenCost,
          vaultQuality: price?.vaultQuality,
          bundleName,
        });
      }
      const nextAncestors = [...ancestors, obj];
      for (const value of Object.values(obj)) {
        walk(value, nextAncestors);
      }
    }
  }

  walk(root, []);
  return entries;
}

function main() {
  const savePath = process.argv[2] || DEFAULT_SAVE_PATH;

  console.log('🚀 Marvel Snap - Importa Dati di Costo dal Salvataggio');
  console.log('=======================================================\n');
  console.log(`📄 Leggendo: ${savePath}\n`);

  if (!fs.existsSync(savePath)) {
    console.error(`❌ File non trovato: ${savePath}`);
    console.error('\nPassa il percorso corretto come argomento:');
    console.error('  node scripts/importCostData.js "C:\\percorso\\ShopState.json"');
    process.exit(1);
  }

  let raw = fs.readFileSync(savePath, 'utf-8');
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }

  const data = JSON.parse(raw);
  const rawEntries = extractCostEntries(data);

  console.log(`✅ Trovati ${rawEntries.length} riferimenti a varianti (vendute) nello shop\n`);

  // Build a map keyed by our variant id, merging multiple sightings of the
  // same variant and preferring entries that actually carry a currency cost.
  const byVariant = new Map();

  for (const entry of rawEntries) {
    const id = toVariantId(entry.variant);
    if (!id) continue;

    const { goldCost, tokenCost, vaultQuality, bundleName } = entry;

    const existing = byVariant.get(id);
    const hasCost = goldCost !== undefined || tokenCost !== undefined;
    const existingHasCost = existing && (existing.goldCost !== undefined || existing.tokenCost !== undefined);

    // Keep the richest entry we've seen for this variant: one with an
    // explicit cost wins over one that only has a bundle name.
    if (!existing || (hasCost && !existingHasCost)) {
      byVariant.set(id, {
        id,
        goldCost,
        tokenCost,
        vaultQuality,
        bundleName,
      });
    } else {
      if (!existing.bundleName && bundleName) existing.bundleName = bundleName;
      if (!existing.vaultQuality && vaultQuality) existing.vaultQuality = vaultQuality;
    }
  }

  // Stable order (by id) so re-runs only change the file when data changes.
  const costData = [...byVariant.values()].sort((a, b) =>
    String(a.id).localeCompare(String(b.id))
  );
  const withCost = costData.filter((c) => c.goldCost !== undefined || c.tokenCost !== undefined);
  const withBundleOnly = costData.filter(
    (c) => c.goldCost === undefined && c.tokenCost === undefined && c.bundleName
  );

  console.log(`✅ ${costData.length} varianti uniche con qualche informazione di acquisto`);
  console.log(`   - ${withCost.length} con costo gold/token esatto`);
  console.log(`   - ${withBundleOnly.length} solo con nome bundle (nessun costo, es. bundle a pagamento reale)\n`);

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const output = {
    entries: costData,
    count: costData.length,
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

  console.log(`💾 Salvato in: ${OUTPUT_PATH}\n`);
  console.log('📋 Esempi con costo:');
  withCost.slice(0, 10).forEach((c) => {
    const cost = c.goldCost !== undefined ? `${c.goldCost} gold` : `${c.tokenCost} token`;
    console.log(`  - ${c.id}: ${cost}${c.vaultQuality ? ` (Vault: ${c.vaultQuality})` : ''}`);
  });

  console.log(
    '\nℹ️  Nota: questa copertura dipende da cosa hai visto di recente nello shop/vault ' +
      'del tuo account — NON è uno storico completo di tutte le varianti. Rilancia questo ' +
      'script periodicamente per ampliare la copertura nel tempo.\n'
  );

  console.log("✅ Fatto! Ricarica l'app per vedere i dati di costo.");
}

main();
