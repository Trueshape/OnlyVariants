import { useCallback, useEffect, useState } from 'react';

// How a card flags a status (list membership, "unreleased", "owned",
// "unowned"): a diagonal corner ribbon, a straight top bar, or nothing.
export type IndicatorStyle = 'none' | 'ribbon' | 'bar';

export interface StatusStyle {
  indicator: { style: IndicatorStyle; color: string; opacity: number };
  border: { enabled: boolean; color: string };
  // Tab ids where this status's border/indicator are suppressed even if
  // active for the card - e.g. every card is "owned" while browsing the
  // Owned tab, so its border there is just noise.
  hiddenOnTabs: string[];
}

const STORAGE_KEY = 'marvelSnapStatusStyles';

export const DEFAULT_STYLE: StatusStyle = {
  indicator: { style: 'none', color: '#e74c3c', opacity: 1 },
  border: { enabled: false, color: '#e74c3c' },
  hiddenOnTabs: [],
};

// Built-in status keys ship a sensible preset COLOR so turning one on for
// the first time doesn't start from a random hue, but never a style/border
// active out of the box - the whole point of this settings system is that
// nothing shows until the user picks it, so what a card displays always
// matches what its row on the settings page says. Every other key (a list
// tab the user hasn't configured) falls back to DEFAULT_STYLE - same colors
// as no preset at all.
export const BUILTIN_DEFAULTS: Record<string, StatusStyle> = {
  unreleased: {
    indicator: { style: 'none', color: '#e74c3c', opacity: 0.75 },
    border: { enabled: false, color: '#e74c3c' },
    hiddenOnTabs: [],
  },
  owned: {
    indicator: { style: 'none', color: '#e74c3c', opacity: 1 },
    border: { enabled: false, color: '#2f6b4c' },
    hiddenOnTabs: [],
  },
  unowned: {
    indicator: { style: 'none', color: '#e74c3c', opacity: 1 },
    border: { enabled: false, color: '#e74c3c' },
    hiddenOnTabs: [],
  },
  wishlist: {
    indicator: { style: 'none', color: '#e74c3c', opacity: 1 },
    border: { enabled: false, color: '#8f4a45' },
    hiddenOnTabs: [],
  },
};

// Status keys that always exist, regardless of the user's tabs/lists.
export const BUILTIN_STATUS_KEYS = ['owned', 'unowned', 'unreleased'] as const;

// Settings may hold objects saved by an older version of this hook (missing
// a field added later, e.g. hiddenOnTabs) - merge field-by-field rather than
// trusting a stored value to be a complete StatusStyle, or a missing field
// crashes every card that reads it (e.g. `.hiddenOnTabs.includes(...)` on
// undefined).
type Settings = Record<string, Partial<StatusStyle>>;

// Pure resolution logic, exported for testing without touching localStorage.
export function resolveStatusStyle(settings: Settings, key: string): StatusStyle {
  const base = BUILTIN_DEFAULTS[key] ?? DEFAULT_STYLE;
  const stored = settings[key];
  if (!stored) return base;
  return {
    indicator: stored.indicator ?? base.indicator,
    border: stored.border ?? base.border,
    hiddenOnTabs: stored.hiddenOnTabs ?? base.hiddenOnTabs,
  };
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Settings;
  } catch {
    return {};
  }
}

export interface UseStatusStyles {
  /** Resolved style for `key` (falls back to a built-in default, then fully off). */
  get: (key: string) => StatusStyle;
  /** Whether `key` has an explicit (non-default) style saved. */
  isCustomized: (key: string) => boolean;
  set: (key: string, style: StatusStyle) => void;
  /** Drop the explicit style for `key`, reverting it to its default. */
  reset: (key: string) => void;
}

export function useStatusStyles(): UseStatusStyles {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage write failures (quota / privacy mode)
    }
  }, [settings]);

  const get = useCallback((key: string) => resolveStatusStyle(settings, key), [settings]);
  const isCustomized = useCallback((key: string) => key in settings, [settings]);

  const set = useCallback((key: string, style: StatusStyle) => {
    setSettings((prev) => ({ ...prev, [key]: style }));
  }, []);

  const reset = useCallback((key: string) => {
    setSettings((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  return { get, isCustomized, set, reset };
}
