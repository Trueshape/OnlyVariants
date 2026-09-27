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
  it('prices a released card by its tier - same price for every card of that tier', () => {
    expect(getVariantPrice({ releaseStatus: 'released', rarity: 'Rare' })).toEqual({
      amount: 700,
      currency: 'gold',
    });
    expect(getVariantPrice({ releaseStatus: 'released', vaultQuality: 'Sensational' })).toEqual({
      amount: 2000,
      currency: 'gold',
    });
  });

  it('never prices an unreleased or unknown-date card - its eventual tier is unconfirmed', () => {
    expect(getVariantPrice({ releaseStatus: 'unreleased', rarity: 'Rare' })).toBeUndefined();
    expect(getVariantPrice({ releaseStatus: 'unknown', rarity: 'Rare' })).toBeUndefined();
  });

  it('returns undefined for a released card with no priceable tier', () => {
    expect(getVariantPrice({ releaseStatus: 'released', rarity: 'Unknown' })).toBeUndefined();
  });
});
