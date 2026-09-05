import { useCallback, useMemo, useState } from 'react';

export interface ListHandle {
  has: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  size: number;
  /** Stable reference while the list's contents are unchanged. */
  ids: string[];
}

interface Entry {
  set: Set<string>;
  ids: string[];
}

// Accepts both the current format (string[]) and the legacy format where a
// list stored a full variant copy ([{ id, ... }]). Anything unparseable
// yields an empty list rather than throwing.
export function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = parsed
      .map((entry) =>
        typeof entry === 'string'
          ? entry
          : entry && typeof entry === 'object' && 'id' in entry
            ? String((entry as { id: unknown }).id)
            : null
      )
      .filter((id): id is string => !!id);
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

const EMPTY: Entry = { set: new Set(), ids: [] };

export interface ListStore {
  /** A handle for the list stored under `key`. */
  list: (key: string) => ListHandle;
  /** Forget a list and wipe its localStorage entry (tab deletion). */
  destroy: (key: string) => void;
}

/**
 * Manages an arbitrary number of variant-id lists, each persisted to
 * localStorage under its own key. `initialKeys` are loaded from storage
 * once on mount; a key created later (a new custom tab) simply starts
 * empty, which is correct - a brand-new list has no stored data.
 */
export function useListStore(initialKeys: string[]): ListStore {
  const [map, setMap] = useState<Map<string, Entry>>(() => {
    const m = new Map<string, Entry>();
    for (const k of initialKeys) {
      const ids = readIds(k);
      m.set(k, { set: new Set(ids), ids });
    }
    return m;
  });

  const mutate = useCallback((key: string, fn: (s: Set<string>) => void) => {
    setMap((prev) => {
      const set = new Set(prev.get(key)?.set ?? []);
      fn(set);
      const ids = [...set];
      try {
        localStorage.setItem(key, JSON.stringify(ids));
      } catch {
        // quota exceeded / private mode - keep working in memory
      }
      const next = new Map(prev);
      next.set(key, { set, ids });
      return next;
    });
  }, []);

  const destroy = useCallback((key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setMap((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const list = useCallback(
    (key: string): ListHandle => {
      const entry = map.get(key) ?? EMPTY;
      return {
        has: (id) => entry.set.has(id),
        add: (id) => mutate(key, (s) => s.add(id)),
        remove: (id) => mutate(key, (s) => s.delete(id)),
        size: entry.set.size,
        ids: entry.ids,
      };
    },
    [map, mutate]
  );

  return useMemo(() => ({ list, destroy }), [list, destroy]);
}
