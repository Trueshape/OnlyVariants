import type { Variant } from '../types/variant';

const VARIANTS_CACHE_KEY = 'marvelSnapVariants';
const VARIANTS_VERSION_KEY = 'marvelSnapVariantsVersion';

interface VariantsMeta {
  version: string;
  count: number;
  generatedAt: string;
}

// Try to read+parse the cached variants from localStorage.
// Returns null on any failure (missing, corrupted, etc) instead of throwing,
// so a bad cache never takes down the whole app.
function readCachedVariants(expectedVersion: string): Variant[] | null {
  try {
    const cachedVersion = localStorage.getItem(VARIANTS_VERSION_KEY);
    if (cachedVersion !== expectedVersion) return null;

    const cachedData = localStorage.getItem(VARIANTS_CACHE_KEY);
    if (!cachedData) return null;

    return JSON.parse(cachedData);
  } catch (error) {
    console.warn('⚠️  Cache locale delle varianti non valida, la ignoro:', error);
    return null;
  }
}

// Last-resort read: return whatever variant list is cached, regardless of
// version, for use when the data files can't be reached at all.
function readCachedAnyVariants(): Variant[] | null {
  try {
    const cachedData = localStorage.getItem(VARIANTS_CACHE_KEY);
    if (!cachedData) return null;
    const parsed = JSON.parse(cachedData);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

// Best-effort write to localStorage. Some browsers enforce a ~5-10MB quota
// per origin, and this dataset (~3MB) can bump into it depending on what
// else is stored. A failure here must NEVER cause us to discard variants
// we already successfully fetched from the network.
function writeCachedVariants(variants: Variant[], version: string): void {
  try {
    localStorage.setItem(VARIANTS_CACHE_KEY, JSON.stringify(variants));
    localStorage.setItem(VARIANTS_VERSION_KEY, version);
  } catch (error) {
    console.warn(
      '⚠️  Impossibile salvare la cache locale delle varianti (quota localStorage superata?). ' +
        'L\'app funzionerà comunque, ma riscaricherà i dati ad ogni refresh.',
      error
    );
  }
}

// Midnight, local time, for calendar-day comparisons that ignore both
// time-of-day and the UTC release timestamp's own clock hour.
function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export const snapCompleteService = {
  // Fetch all variants, using localStorage as a cache and only re-downloading
  // the (multi-MB) variants.json when public/variants-meta.json reports a new version.
  async getAllVariants(): Promise<Variant[]> {
    try {
      // 1. Check the small metadata file first (cheap, fast)
      const metaResponse = await fetch('/variants-meta.json', { cache: 'no-store' });

      if (metaResponse.ok) {
        const meta: VariantsMeta = await metaResponse.json();

        const cached = readCachedVariants(meta.version);
        if (cached) {
          console.log(`✅ Using cached variants (version ${meta.version}, ${meta.count} varianti)`);
          return cached;
        }

        // New/changed data available (or cache unusable) — download the full file
        console.log(`🔄 Scarico ${meta.count} varianti (version ${meta.version})...`);
        const response = await fetch('/variants.json');
        if (response.ok) {
          const variants = await response.json();
          // Caching is best-effort — never let it block returning fresh data
          writeCachedVariants(variants, meta.version);
          console.log(`✅ Loaded ${variants.length} variants (version ${meta.version})`);
          return variants;
        }
      }

      // No meta file available — fall back to plain fetch (no version tracking)
      const response = await fetch('/variants.json');
      if (response.ok) {
        const variants = await response.json();
        console.log(`✅ Loaded ${variants.length} variants from scraped data`);
        return variants;
      }

      throw new Error(`variants.json responded ${response.status}`);
    } catch (error) {
      // A stale cache is better than nothing - use it even if its version
      // no longer matches the (now unreachable) meta file.
      const stale = readCachedAnyVariants();
      if (stale) {
        console.warn('⚠️  Could not reach the variant data, using the last cached copy:', error);
        return stale;
      }
      console.error('❌ Could not load variant data and no cache is available:', error);
      throw error instanceof Error ? error : new Error('Failed to load variant data');
    }
  },

  // Search variants by name
  searchVariants(variants: Variant[], query: string): Variant[] {
    const lowerQuery = query.toLowerCase();
    return variants.filter(
      (v) =>
        v.cardName.toLowerCase().includes(lowerQuery) ||
        v.variantName.toLowerCase().includes(lowerQuery) ||
        v.artName?.toLowerCase().includes(lowerQuery)
    );
  },

  // Get variants that aren't out yet: both the ones with a confirmed
  // release date ('unreleased') and the ones merely datamined/leaked with
  // no confirmed date at all ('unknown') - they're just as much "not
  // released" as the dated ones, they just don't have a date to sort by.
  // A dated one whose day has already passed is stale data (its status
  // hasn't caught up to 'released' yet) rather than a real future card, so
  // it's dropped instead of piling up as a "past" entry in the timeline.
  getUnreleasedVariants(variants: Variant[]): Variant[] {
    const startOfToday = startOfLocalDay(new Date());
    return variants
      .filter((v) => v.releaseStatus === 'unreleased' || v.releaseStatus === 'unknown')
      .filter((v) => {
        if (!v.releaseDate) return true;
        const date = new Date(v.releaseDate);
        return isNaN(date.getTime()) || startOfLocalDay(date) >= startOfToday;
      })
      .sort((a, b) => {
        // Variants with no confirmed release date always sort to the end,
        // regardless of name/id order, instead of being interleaved with
        // the dated ones wherever they happened to appear in the source data.
        if (a.releaseDate && !b.releaseDate) return -1;
        if (!a.releaseDate && b.releaseDate) return 1;
        if (!a.releaseDate && !b.releaseDate) return 0;
        return new Date(a.releaseDate!).getTime() - new Date(b.releaseDate!).getTime();
      });
  },

  // Get only released variants
  getReleasedVariants(variants: Variant[]): Variant[] {
    return variants.filter((v) => v.releaseStatus === 'released');
  },
};
