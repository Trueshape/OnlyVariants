// Marvel Snap's shop/vault prices are fixed per rarity/vault tier, not
// per-card - the same table SnapComplete's own price filter uses (Rare
// 700g, Super Rare 1,200g, CV: Amazing 1,400g, CV: Sensational 2,000g,
// CV: Exquisite 2,500g, Spotlight 3,500t, Ultimate 5,000t) and every card
// of that tier is priced identically, no exceptions. Vault quality takes
// priority over rarity when both are present, since a card's price while
// it's in the vault is set by the vault tier, not its base rarity.
// Anything that matches neither (Promo, Album, Season Pass, a real-money
// bundle with no itemized currency price, etc.) has no fixed-currency
// price at all, so this returns undefined rather than guessing.

export type Currency = 'gold' | 'token';

export interface TierPrice {
  amount: number;
  currency: Currency;
}

const RARITY_PRICES: Record<string, TierPrice> = {
  Rare: { amount: 700, currency: 'gold' },
  SuperRare: { amount: 1200, currency: 'gold' },
  Spotlight: { amount: 3500, currency: 'token' },
  Ultimate: { amount: 5000, currency: 'token' },
};

const VAULT_QUALITY_PRICES: Record<string, TierPrice> = {
  Amazing: { amount: 1400, currency: 'gold' },
  Sensational: { amount: 2000, currency: 'gold' },
  Exquisite: { amount: 2500, currency: 'gold' },
};

export function estimatedTierPrice(variant: {
  rarity?: string;
  vaultQuality?: string;
}): TierPrice | undefined {
  if (variant.vaultQuality) {
    const price = VAULT_QUALITY_PRICES[variant.vaultQuality];
    if (price) return price;
  }
  if (variant.rarity) {
    const price = RARITY_PRICES[variant.rarity];
    if (price) return price;
  }
  return undefined;
}

// Every card of a tier costs the same, so the fixed tier price IS the
// price - there's no separate "confirmed" price to prefer over it.
// Unreleased cards get none: their eventual tier/price isn't confirmed yet.
export function getVariantPrice(variant: {
  releaseStatus: string;
  rarity?: string;
  vaultQuality?: string;
}): TierPrice | undefined {
  const isUnreleased = variant.releaseStatus === 'unreleased' || variant.releaseStatus === 'unknown';
  if (isUnreleased) return undefined;
  return estimatedTierPrice(variant);
}
