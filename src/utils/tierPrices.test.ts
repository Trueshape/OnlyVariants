import { describe, expect, it } from 'vitest';
import { estimatedTierPrice, getVariantPrice } from './tierPrices';

describe('estimatedTierPrice', () => {
  it('prices standard rarities in gold', () => {
    expect(estimatedTierPrice({ rarity: 'Rare' })).toEqual({ amount: 700, currency: 'gold' });
    expect(estimatedTierPrice({ rarity: 'SuperRare' })).toEqual({ amount: 1200, currency: 'gold' });
  });

  it('prices Spotlight/Ultimate in tokens', () => {
    expect(estimatedTierPrice({ rarity: 'Spotlight' })).toEqual({ amount: 3500, currency: 'token' });
    expect(estimatedTierPrice({ rarity: 'Ultimate' })).toEqual({ amount: 5000, currency: 'token' });
  });

  it('prices vault quality tiers in gold', () => {
    expect(estimatedTierPrice({ vaultQuality: 'Amazing' })).toEqual({ amount: 1400, currency: 'gold' });
    expect(estimatedTierPrice({ vaultQuality: 'Sensational' })).toEqual({ amount: 2000, currency: 'gold' });
    expect(estimatedTierPrice({ vaultQuality: 'Exquisite' })).toEqual({ amount: 2500, currency: 'gold' });
  });

  it('prefers vault quality over rarity when both are present', () => {
    expect(estimatedTierPrice({ rarity: 'Rare', vaultQuality: 'Exquisite' })).toEqual({
      amount: 2500,
      currency: 'gold',
    });
  });

  it('returns undefined for an unpriced tier (Promo, real-money bundle, etc.)', () => {
    expect(estimatedTierPrice({ rarity: 'Unknown' })).toBeUndefined();
    expect(estimatedTierPrice({})).toBeUndefined();
  });
});

describe('getVariantPrice', () => {
  it('prefers a confirmed goldCost/tokenCost over the tier estimate', () => {
    expect(
      getVariantPrice({ goldCost: 999, releaseStatus: 'released', rarity: 'Rare' })
    ).toEqual({ amount: 999, currency: 'gold', estimated: false });
    expect(
      getVariantPrice({ tokenCost: 111, releaseStatus: 'released', rarity: 'Ultimate' })
    ).toEqual({ amount: 111, currency: 'token', estimated: false });
  });

  it('falls back to an estimated tier price for a released card with no confirmed cost', () => {
    expect(getVariantPrice({ releaseStatus: 'released', rarity: 'Rare' })).toEqual({
      amount: 700,
      currency: 'gold',
      estimated: true,
    });
  });

  it('never estimates for an unreleased or unknown-date card', () => {
    expect(getVariantPrice({ releaseStatus: 'unreleased', rarity: 'Rare' })).toBeUndefined();
    expect(getVariantPrice({ releaseStatus: 'unknown', rarity: 'Rare' })).toBeUndefined();
  });

  it('still honors a confirmed cost even on an unreleased card', () => {
    expect(
      getVariantPrice({ goldCost: 2000, releaseStatus: 'unreleased', vaultQuality: 'Sensational' })
    ).toEqual({ amount: 2000, currency: 'gold', estimated: false });
  });

  it('returns undefined for a released card with no priceable tier', () => {
    expect(getVariantPrice({ releaseStatus: 'released', rarity: 'Unknown' })).toBeUndefined();
  });
});
