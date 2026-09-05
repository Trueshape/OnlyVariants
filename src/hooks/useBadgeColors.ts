import { useCallback, useEffect, useState } from 'react';

// The game's fixed rarity/price tiers (see utils/tierPrices.ts) - a variant
// with rarity 'Unknown' never renders a rarity badge, so that's not here.
export type RarityTier = 'Rare' | 'SuperRare' | 'Ultimate' | 'Spotlight';
export const RARITY_TIERS: RarityTier[] = ['Rare', 'SuperRare', 'Ultimate', 'Spotlight'];

export type PriceCurrency = 'gold' | 'token';
export const PRICE_CURRENCIES: PriceCurrency[] = ['gold', 'token'];

// Every distinct badge/chip shown on a card. One color each - the badge's
// background/border are derived from it (see utils/color.ts badgeStyle),
// so picking a color re-themes the whole pill consistently. Rarity and
// Price are per-tier/per-currency rather than one key each, so e.g. gold
// and token prices can have their own color.
export type BadgeKey =
  | 'source'
  | `rarity:${RarityTier}`
  | 'artist'
  | 'theme'
  | 'vaultQuality'
  | `price:${PriceCurrency}`
  | 'bundle';

export const BADGE_KEYS: BadgeKey[] = [
  'source',
  ...RARITY_TIERS.map((t) => `rarity:${t}` as const),
  'artist',
  'theme',
  'vaultQuality',
  ...PRICE_CURRENCIES.map((c) => `price:${c}` as const),
  'bundle',
];

export const RARITY_TIER_LABELS: Record<RarityTier, string> = {
  Rare: 'Rare',
  SuperRare: 'Super Rare',
  Ultimate: 'Ultimate',
  Spotlight: 'Spotlight',
};

export const PRICE_CURRENCY_LABELS: Record<PriceCurrency, string> = {
  gold: 'Gold',
  token: 'Token',
};

export const BADGE_LABELS: Record<BadgeKey, string> = {
  source: 'Source',
  ...Object.fromEntries(
    RARITY_TIERS.map((t) => [`rarity:${t}`, `Rarity: ${RARITY_TIER_LABELS[t]}`])
  ),
  artist: 'Artist',
  theme: 'Theme',
  vaultQuality: 'Vault Quality',
  ...Object.fromEntries(
    PRICE_CURRENCIES.map((c) => [`price:${c}`, `Price: ${PRICE_CURRENCY_LABELS[c]}`])
  ),
  bundle: 'Bundle',
} as Record<BadgeKey, string>;

const STORAGE_KEY = 'marvelSnapBadgeColors';

// Matches each badge's previous hardcoded color (every rarity tier, and
// both price currencies, shared one color each), so turning this feature on
// doesn't change anything until the user picks something else.
export const DEFAULT_BADGE_COLORS: Record<BadgeKey, string> = {
  source: '#2ecc71',
  ...Object.fromEntries(RARITY_TIERS.map((t) => [`rarity:${t}`, '#8fa1f7'])),
  vaultQuality: '#c39bd3',
  artist: '#dfe2e8',
  theme: '#dfe2e8',
  ...Object.fromEntries(PRICE_CURRENCIES.map((c) => [`price:${c}`, '#dfe2e8'])),
  bundle: '#dfe2e8',
} as Record<BadgeKey, string>;

type Colors = Partial<Record<BadgeKey, string>>;

function load(): Colors {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Colors;
  } catch {
    return {};
  }
}

export interface UseBadgeColors {
  get: (key: BadgeKey) => string;
  isCustomized: (key: BadgeKey) => boolean;
  set: (key: BadgeKey, color: string) => void;
  reset: (key: BadgeKey) => void;
}

export function useBadgeColors(): UseBadgeColors {
  const [colors, setColors] = useState<Colors>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
    } catch {
      // ignore storage write failures (quota / privacy mode)
    }
  }, [colors]);

  // Falls back to a plain neutral rather than undefined for a key outside
  // the known set (e.g. a future rarity tier `get` is called with via a
  // cast) - callers always get a valid CSS color, never a crash.
  const get = useCallback(
    (key: BadgeKey) => colors[key] ?? DEFAULT_BADGE_COLORS[key] ?? '#dfe2e8',
    [colors]
  );
  const isCustomized = useCallback((key: BadgeKey) => key in colors, [colors]);

  const set = useCallback((key: BadgeKey, color: string) => {
    setColors((prev) => ({ ...prev, [key]: color }));
  }, []);

  const reset = useCallback((key: BadgeKey) => {
    setColors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  return { get, isCustomized, set, reset };
}
