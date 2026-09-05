import { useCallback, useEffect, useMemo, useState } from 'react';

const KEY = 'marvelSnapCardColumns';
const MIN = 1;
// The full-detail layout tops out lower than the image-only one.
const MAX_NORMAL = 8;
const MAX_COMPACT = 12;
const DEFAULT_NORMAL = 4;
const DEFAULT_COMPACT = 8;

const maxForMode = (compact: boolean) => (compact ? MAX_COMPACT : MAX_NORMAL);

function clamp(n: number, max: number) {
  return Math.min(max, Math.max(MIN, Math.round(n)));
}

interface Both {
  normal: number;
  compact: number;
}

// Accepts the current object format and the older plain-number format.
function load(): Both {
  const fallback = { normal: DEFAULT_NORMAL, compact: DEFAULT_COMPACT };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'number' && Number.isFinite(parsed)) {
      return { normal: clamp(parsed, MAX_NORMAL), compact: DEFAULT_COMPACT };
    }
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Partial<Both>;
      return {
        normal: Number.isFinite(o.normal) ? clamp(o.normal as number, MAX_NORMAL) : DEFAULT_NORMAL,
        compact: Number.isFinite(o.compact) ? clamp(o.compact as number, MAX_COMPACT) : DEFAULT_COMPACT,
      };
    }
  } catch {
    // fall through
  }
  return fallback;
}

// Don't let the grid get absurdly cramped on small windows.
function maxColsForWidth(w: number) {
  if (w < 380) return 1;
  if (w < 560) return 2;
  if (w < 820) return 4;
  if (w < 1100) return 6;
  if (w < 1500) return 9;
  return MAX_COMPACT;
}

export interface CardColumns {
  /** The chosen count for the current mode (what the control shows). */
  columns: number;
  fewer: () => void;
  more: () => void;
  canGoFewer: boolean;
  canGoMore: boolean;
}

/**
 * Cards per row. The count is stored separately for the normal and the
 * "hide card details" layouts (`compact`), each with its own max (8 / 12),
 * so each mode remembers its own value. The effective value (chosen count
 * capped for the window width) goes to data-card-cols on <html>; the CSS
 * has one explicit `repeat(N, ...)` rule per value.
 */
export function useCardColumns(compact: boolean): CardColumns {
  const [both, setBoth] = useState<Both>(load);
  const [maxFit, setMaxFit] = useState<number>(() =>
    typeof window === 'undefined' ? MAX_COMPACT : maxColsForWidth(window.innerWidth)
  );

  useEffect(() => {
    const onResize = () => setMaxFit(maxColsForWidth(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(both));
    } catch {
      // ignore write failures
    }
  }, [both]);

  const modeMax = maxForMode(compact);
  const columns = Math.min(compact ? both.compact : both.normal, modeMax);
  const effective = Math.min(columns, maxFit);

  useEffect(() => {
    document.documentElement.dataset.cardCols = String(effective);
  }, [effective]);

  const step = useCallback(
    (delta: number) =>
      setBoth((prev) => {
        const next = clamp((compact ? prev.compact : prev.normal) + delta, maxForMode(compact));
        return compact ? { ...prev, compact: next } : { ...prev, normal: next };
      }),
    [compact]
  );

  const fewer = useCallback(() => step(-1), [step]);
  const more = useCallback(() => step(1), [step]);

  return useMemo(
    () => ({ columns, fewer, more, canGoFewer: columns > MIN, canGoMore: columns < modeMax }),
    [columns, fewer, more, modeMax]
  );
}
