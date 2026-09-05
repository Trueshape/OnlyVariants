import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { toKebabCase, toDisplayName } from './lib/names.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_ORIGIN = 'https://snapcomplete-app.pages.dev';
const VARIANTS_PAGE = 'https://snapcomplete.com/collect/variants';
// Last-known good bundle URL - only used if we can't discover the current
// one. The hash changes every time snapcomplete redeploys.
const FALLBACK_BUNDLE_URL = `${APP_ORIGIN}/assets/variants.json-Cpgvu77z.js`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const RAW_PATH = path.join(__dirname, '../bundle-raw.js');
const OUTPUT_PATH = path.join(__dirname, '../public/variants-complete.json');
const FINAL_PATH = path.join(__dirname, '../public/variants.json');
const META_PATH = path.join(__dirname, '../public/variants-meta.json');

async function fetchText(url) {
  const res = await axios.get(url, {
    headers: { 'User-Agent': UA },
    responseType: 'text',
    transformResponse: [(d) => d],
  });
  return res.data;
}

// Find the current variants.json-<hash>.js bundle by scanning the app's
// entry chunks (referenced from the variants page). Returns null on any
// failure so the caller can fall back to the last-known URL.
async function discoverBundleUrl() {
  try {
    const html = await fetchText(VARIANTS_PAGE);
    const chunks = [
      ...new Set(
        [...html.matchAll(/snapcomplete-app\.pages\.dev(\/assets\/[A-Za-z0-9._-]+\.js)/g)].map(
          (m) => m[1]
        )
      ),
    ];
    // the entry chunk (index-*.js) is the most likely to reference it
    chunks.sort((a, b) => (a.includes('/index-') ? -1 : 0) - (b.includes('/index-') ? -1 : 0));
    for (const chunkPath of chunks) {
      const js = await fetchText(APP_ORIGIN + chunkPath);
      const hit = js.match(/variants\.json-[A-Za-z0-9._-]+\.js/);
      if (hit) return `${APP_ORIGIN}/assets/${hit[0]}`;
    }
  } catch (err) {
    console.warn('⚠️  Impossibile scoprire l\'URL del bundle:', err.message);
  }
  return null;
}

async function main() {
  console.log('🚀 Marvel Snap - Estrattore Completo Variants');
  console.log('==============================================\n');

  // Always download a fresh copy of the bundle rather than reusing a cached
  // one, so re-running this (including automatically on every dev startup)
  // actually picks up newly announced/datamined cards instead of silently
  // reusing stale data forever. Pass --cached to force the old cached-file
  // behaviour (useful when iterating on the parsing logic offline).
  const useCache = process.argv.includes('--cached');
  let content;
  if (useCache && fs.existsSync(RAW_PATH)) {
    console.log('📂 Uso bundle già scaricato (bundle-raw.js)\n');
    content = fs.readFileSync(RAW_PATH, 'utf-8');
  } else {
    const url = (await discoverBundleUrl()) || FALLBACK_BUNDLE_URL;
    console.log(`📄 Scarico il bundle: ${url}\n`);
    content = await fetchText(url);
    fs.writeFileSync(RAW_PATH, content);
  }

  console.log('🔧 Eseguendo il bundle in sandbox...\n');

  // The bundle is: <sentry IIFE>; import{_t as e}from"./index-<hash>.js";
  // var t=e({...big data...}); export{t as default};
  // Strip everything up to and including that import (the hash varies) and
  // stub `e` as identity - the real decoding happens below. Then expose the
  // data instead of ES-exporting it.
  let patched = content.replace(
    /^[\s\S]*?import\s*\{\s*_t as e\s*\}\s*from\s*"[^"]*";/,
    'const e = (x) => x;'
  );
  patched = patched.replace(/export\s*\{\s*t as default\s*\};?/, 'globalThis.__extractedData = t;');

  if (!patched.startsWith('const e =') || !patched.includes('globalThis.__extractedData')) {
    throw new Error(
      "Il formato del bundle di snapcomplete e' cambiato: aggiorna le regex in extractAllVariants.js"
    );
  }

  const sandbox = { globalThis: {}, console };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(patched, sandbox, { timeout: 10000 });

  const data = sandbox.__extractedData;

  if (!data) {
    throw new Error('Impossibile estrarre i dati dal bundle');
  }

  console.log(`✅ Dati grezzi estratti: ${data.n} varianti totali\n`);
  console.log('🔨 Decodificando ogni variante...\n');

  const {
    baseCardDict,
    baseCardIdx,
    suffix,
    artistNameDict,
    artistRoleDict,
    artists,
    cols,
  } = data;

  const variants = [];

  for (let i = 0; i < data.n; i++) {
    const baseCardName = baseCardDict[baseCardIdx[i]];
    const cardSuffix = suffix[i];
    const paddedSuffix = String(cardSuffix).padStart(2, '0');

    // Build ID matching the site's URL pattern (kebab-case-suffix)
    const kebabName = toKebabCase(baseCardName);
    const id = `${kebabName}-${paddedSuffix}`;

    // Decode variant label (name of the variant art/style)
    const variantLabelIdx = cols.variantLabel.idx[i];
    const variantLabel =
      variantLabelIdx >= 0 ? cols.variantLabel.dict[variantLabelIdx] : null;

    // Decode rarity
    const rarityIdx = cols.rarity.idx[i];
    const rarity = rarityIdx >= 0 ? cols.rarity.dict[rarityIdx] : null;

    // Decode source (how to obtain it)
    const sourceIdx = cols.source.idx[i];
    const source = sourceIdx >= 0 ? cols.source.dict[sourceIdx] : null;

    const sourceKeyIdx = cols.sourceKey.idx[i];
    const sourceKey = sourceKeyIdx >= 0 ? cols.sourceKey.dict[sourceKeyIdx] : null;

    // Decode release date
    const releaseDateIdx = cols.releaseDate.idx[i];
    const releaseDate =
      releaseDateIdx >= 0 ? cols.releaseDate.dict[releaseDateIdx] : null;

    // Decode series
    const seriesIdx = cols.series.idx[i];
    const series = seriesIdx >= 0 ? cols.series.dict[seriesIdx] : null;

    // Decode vault quality
    const vaultQualityIdx = cols.vaultQuality.idx[i];
    const vaultQuality =
      vaultQualityIdx >= 0 ? cols.vaultQuality.dict[vaultQualityIdx] : null;

    // Decode custom image URL (only some variants have overrides)
    const imageUrlIdx = cols.imageUrl.idx[i];
    const customImagePath =
      imageUrlIdx >= 0 ? cols.imageUrl.dict[imageUrlIdx] : null;

    // Build the image URL. snapcomplete serves two sizes of each variant:
    //   snapcomplete-thumbs.pages.dev/288/variants/{Name}_{NN}.webp  -> 288x311
    //   snapcomplete-cdn.pages.dev/variants/{Name}_{NN}.webp         -> 460x497
    // We use the larger one (what the site's own detail page loads).
    const defaultImagePath = `/variants/${baseCardName}_${paddedSuffix}.webp`;
    const imagePath = customImagePath || defaultImagePath;
    const imageUrl = imagePath.startsWith('http')
      ? imagePath
      : `https://snapcomplete-cdn.pages.dev${imagePath}`;

    // Decode orphan flag
    const orphanIdx = cols.orphan.idx[i];
    const orphan = orphanIdx >= 0 ? cols.orphan.dict[orphanIdx] : false;

    // Decode release status: if releaseDate exists and is in the past, it's released
    let releaseStatus = 'unknown';
    if (releaseDate) {
      const releaseDateTime = new Date(releaseDate).getTime();
      releaseStatus = releaseDateTime <= Date.now() ? 'released' : 'unreleased';
    } else if (orphan) {
      releaseStatus = 'unreleased';
    }

    // Decode artists.
    // A person can appear more than once (e.g. as both Artist and Colorist
    // on the same variant) - when that happens, keep just the plain name
    // (no role suffix) instead of listing it twice.
    const artistData = artists[i];
    const rolesByName = new Map(); // name -> Set of roles (excluding 'Artist')
    const namesSeen = []; // preserves first-seen order

    if (artistData && artistData.length > 0) {
      for (let j = 0; j < artistData.length; j += 2) {
        const nameIdx = artistData[j];
        const roleIdx = artistData[j + 1];
        if (nameIdx !== undefined && artistNameDict[nameIdx]) {
          const name = artistNameDict[nameIdx];
          const role = roleIdx !== undefined ? artistRoleDict[roleIdx] : 'Artist';

          if (!rolesByName.has(name)) {
            rolesByName.set(name, new Set());
            namesSeen.push(name);
          }
          // 'Colorist'/'Inker' credits are never shown (per product decision)
          // - only the plain name is kept for them, same as an 'Artist' credit.
          if (role !== 'Artist' && role !== 'Colorist' && role !== 'Inker') {
            rolesByName.get(name).add(role);
          } else if (role === 'Artist') {
            // Being credited as Artist means we show the plain name only
            rolesByName.set(name, new Set());
          }
        }
      }
    }

    const artistNames = namesSeen.map((name) => {
      const roles = rolesByName.get(name);
      return roles.size > 0 ? `${name} (${[...roles].join(', ')})` : name;
    });

    variants.push({
      id,
      cardName: toDisplayName(baseCardName),
      cardNameRaw: baseCardName,
      variantName: variantLabel || 'Unknown Variant',
      artName: artistNames.join(', '),
      releaseDate: releaseDate || undefined,
      releaseStatus,
      rarity: rarity || 'Unknown',
      source: source || undefined,
      sourceKey: sourceKey || undefined,
      series: series || undefined,
      vaultQuality: vaultQuality || undefined,
      imageUrl,
      snapFanUrl: `https://snap.fan/cards/${kebabName}`,
      sourceUrl: `https://snapcomplete.com/collect/variants/${id}`,
      orphan: !!orphan,
      addedDate: new Date().toISOString(),
    });
  }

  console.log(`✅ Decodificate ${variants.length} varianti\n`);

  // Load the previous variants.json (if any) once: used both to report newly
  // appeared unreleased/datamined cards and to carry forward each variant's
  // original addedDate (see below).
  let previous = [];
  try {
    if (fs.existsSync(FINAL_PATH)) {
      previous = JSON.parse(fs.readFileSync(FINAL_PATH, 'utf-8'));
    }
  } catch (err) {
    console.warn('⚠️  Impossibile leggere i dati precedenti:', err.message);
  }
  const previousById = new Map(previous.map((v) => [v.id, v]));

  // Carry forward the original addedDate for variants we've already seen, so
  // re-running the scraper doesn't rewrite every entry (and bump the version
  // hash) just because `new Date()` moved on. Only genuinely new variants get
  // a fresh addedDate.
  for (const v of variants) {
    const prev = previousById.get(v.id);
    if (prev?.addedDate) v.addedDate = prev.addedDate;
  }

  // Stable order (by id) so the serialized output only changes when the data
  // actually changes, keeping git diffs meaningful.
  variants.sort((a, b) => a.id.localeCompare(b.id));

  // Report newly appeared unreleased/datamined cards - this is what makes it
  // worth re-running this script regularly (e.g. automatically on every dev
  // startup) instead of only once.
  const newUnreleased = variants.filter(
    (v) => (v.releaseStatus === 'unreleased' || v.releaseStatus === 'unknown') && !previousById.has(v.id)
  );
  if (previous.length > 0) {
    if (newUnreleased.length > 0) {
      console.log(`🆕 ${newUnreleased.length} nuove varianti non rilasciate/con data sconosciuta trovate:`);
      newUnreleased.forEach((v) => console.log(`   - ${v.cardName} (${v.variantName}) [${v.id}]`));
      console.log('');
    } else {
      console.log('ℹ️  Nessuna nuova variante non rilasciata trovata rispetto all\'ultimo import.\n');
    }
  }

  // Save results
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const variantsJson = JSON.stringify(variants, null, 2);
  fs.writeFileSync(OUTPUT_PATH, variantsJson);
  // Also write directly to the file the app actually loads (public/variants.json)
  fs.writeFileSync(FINAL_PATH, variantsJson);

  // Write a small metadata file so the app can detect changes without
  // re-downloading the full (multi-MB) variants.json every time.
  // Keep the previous generatedAt when the data hash is unchanged, so a
  // no-op re-run produces no git diff at all.
  const hash = crypto.createHash('sha256').update(variantsJson).digest('hex').slice(0, 16);
  let generatedAt = new Date().toISOString();
  try {
    const prevMeta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
    if (prevMeta.version === hash && prevMeta.generatedAt) {
      generatedAt = prevMeta.generatedAt;
    }
  } catch {
    // no previous meta - use the fresh timestamp
  }
  const meta = { version: hash, count: variants.length, generatedAt };
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));

  console.log(`💾 Risultati salvati in: ${OUTPUT_PATH}`);
  console.log(`💾 Copiati in: ${FINAL_PATH}`);
  console.log(`💾 Metadata salvati in: ${META_PATH} (version: ${hash})`);
  console.log(`📊 Totale varianti: ${variants.length}\n`);

  // Statistics
  const released = variants.filter((v) => v.releaseStatus === 'released').length;
  const unreleased = variants.filter((v) => v.releaseStatus === 'unreleased').length;
  const unknown = variants.filter((v) => v.releaseStatus === 'unknown').length;

  console.log('📈 Statistiche:');
  console.log(`  - Rilasciate: ${released}`);
  console.log(`  - Non rilasciate: ${unreleased}`);
  console.log(`  - Sconosciute: ${unknown}`);

  const rarityStats = {};
  variants.forEach((v) => {
    rarityStats[v.rarity] = (rarityStats[v.rarity] || 0) + 1;
  });
  console.log('\n🎨 Per rarità:');
  Object.entries(rarityStats).forEach(([rarity, count]) => {
    console.log(`  - ${rarity}: ${count}`);
  });

  console.log('\n📋 Prime 10 varianti:');
  variants.slice(0, 10).forEach((v, i) => {
    console.log(
      `  ${i + 1}. ${v.cardName} - ${v.variantName} (${v.rarity}) [${v.releaseStatus}]`
    );
  });

  console.log('\n🖼️  Esempio URL immagine:', variants[0].imageUrl);
}

main().catch((err) => {
  console.error('❌ Errore:', err.message);
  console.error(err.stack);
  process.exit(1);
});
