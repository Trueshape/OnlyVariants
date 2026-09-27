export interface Variant {
  id: string;
  cardName: string;
  cardNameRaw?: string;
  variantName: string;
  artName?: string;
  releaseDate?: string;
  releaseStatus: 'released' | 'unreleased' | 'unknown';
  imageUrl?: string;
  sourceUrl?: string;
  snapFanUrl?: string;
  rarity?: string;
  source?: string;
  sourceKey?: string;
  series?: string;
  vaultQuality?: string;
  orphan?: boolean;
  // Populated by `npm run import-costs` from the Marvel Snap shop save
  // (ShopState.json): the real-money bundle a variant was seen listed in,
  // when it's only ever appeared that way (no itemized gold/token price -
  // that part of a purchase is priced per rarity/vault tier instead, see
  // utils/tierPrices.ts, since every card of a tier costs the same).
  bundleName?: string;
  addedDate: string;
}
