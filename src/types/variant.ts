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
  // (ShopState.json). Coverage is partial - only variants recently seen in
  // the shop/vault on this account will have this data. goldCost/tokenCost
  // are mutually exclusive (a variant is priced in one currency or the
  // other, never both); bundleName is set instead when it's only been seen
  // listed in a real-money bundle, with no itemized currency price.
  bundleName?: string;
  goldCost?: number;
  tokenCost?: number;
  addedDate: string;
}
