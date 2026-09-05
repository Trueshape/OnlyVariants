import { useCallback, useEffect, useMemo, useState } from 'react';

// A tab is either a computed "view" (All / Owned / Unowned - no stored data)
// or a "list" the user adds cards to (persisted under `listKey`). 'wishlist'
// is a list too, but pinned and non-renameable.
export type TabKind = 'view' | 'wishlist' | 'list';
// Some list tabs pick their context-menu icon (Star/ThumbsDown) from this
// role rather than from the (renameable) tab name.
export type TabRole = 'favorites' | 'disliked';

export interface TabDef {
  id: string;
  name: string;
  kind: TabKind;
  listKey?: string;
  role?: TabRole;
}

const STORAGE_KEY = 'marvelSnapTabs';

// Pinned tabs: always present, fixed name, can't be deleted.
const PINNED_IDS = new Set(['wishlist', 'all', 'owned', 'unowned', 'unreleased']);

const DEFAULT_TABS: TabDef[] = [
  { id: 'wishlist', name: 'Wishlist', kind: 'wishlist', listKey: 'marvelSnapWishlist' },
  { id: 'all', name: 'All', kind: 'view' },
  { id: 'owned', name: 'Owned', kind: 'view' },
  { id: 'unowned', name: 'Unowned', kind: 'view' },
  { id: 'unreleased', name: 'Unreleased', kind: 'view' },
  { id: 'custom', name: 'Bronze Age', kind: 'list', listKey: 'marvelSnapCustomList' },
  { id: 'disliked', name: 'Disliked', kind: 'list', listKey: 'marvelSnapDisliked', role: 'disliked' },
  { id: 'favorites', name: 'Favorites', kind: 'list', listKey: 'marvelSnapFavorites', role: 'favorites' },
];

export { PINNED_IDS, DEFAULT_TABS };

// Move `id` so it lands just before `beforeId` (null = to the end). Pure,
// exported for testing.
export function reorderTabs(tabs: TabDef[], id: string, beforeId: string | null): TabDef[] {
  if (id === beforeId) return tabs;
  const from = tabs.findIndex((t) => t.id === id);
  if (from === -1) return tabs;
  const next = tabs.slice();
  const [moved] = next.splice(from, 1);
  const to = beforeId === null ? next.length : next.findIndex((t) => t.id === beforeId);
  next.splice(to === -1 ? next.length : to, 0, moved);
  return next;
}

// A pinned tab is authoritative for its kind/name/listKey; stored config only
// controls its position. Everything else is taken from storage as-is.
export function reconcile(stored: TabDef[]): TabDef[] {
  const byId = new Map(stored.map((t) => [t.id, t]));
  const result: TabDef[] = [];
  const seen = new Set<string>();

  for (const t of stored) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    const pinnedDefault = DEFAULT_TABS.find((d) => d.id === t.id && PINNED_IDS.has(d.id));
    result.push(pinnedDefault ? { ...pinnedDefault } : t);
  }
  // Make sure every pinned tab exists. A newly-added pinned tab (not in the
  // stored config) is inserted right after its predecessor from the default
  // order, so it lands somewhere sensible instead of always at the end.
  DEFAULT_TABS.forEach((d, i) => {
    if (!PINNED_IDS.has(d.id) || byId.has(d.id)) return;
    let at = result.length;
    for (let j = i - 1; j >= 0; j--) {
      const prev = result.findIndex((t) => t.id === DEFAULT_TABS[j].id);
      if (prev !== -1) {
        at = prev + 1;
        break;
      }
    }
    result.splice(at, 0, { ...d });
  });
  return result;
}

function load(): TabDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TABS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TABS;
    return reconcile(parsed as TabDef[]);
  } catch {
    return DEFAULT_TABS;
  }
}

export interface UseTabs {
  tabs: TabDef[];
  /** localStorage keys of every list-bearing tab (for useListStore). */
  listKeys: string[];
  canRename: (id: string) => boolean;
  canDelete: (id: string) => boolean;
  rename: (id: string, name: string) => void;
  /** Move `id` so it lands just before `beforeId` (or to the end). */
  move: (id: string, beforeId: string | null) => void;
  /** Create a new list tab; returns its id. */
  addList: (name: string) => string;
  remove: (id: string) => void;
}

export function useTabs(): UseTabs {
  const [tabs, setTabs] = useState<TabDef[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
    } catch {
      // ignore write failures
    }
  }, [tabs]);

  const canRename = useCallback((id: string) => !PINNED_IDS.has(id), []);
  const canDelete = useCallback((id: string) => !PINNED_IDS.has(id), []);

  const rename = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTabs((prev) => prev.map((t) => (t.id === id && !PINNED_IDS.has(id) ? { ...t, name: trimmed } : t)));
  }, []);

  const move = useCallback((id: string, beforeId: string | null) => {
    setTabs((prev) => reorderTabs(prev, id, beforeId));
  }, []);

  const addList = useCallback((name: string) => {
    const id = `u${Date.now().toString(36)}`;
    setTabs((prev) => [
      ...prev,
      { id, name: name.trim() || 'New list', kind: 'list', listKey: `marvelSnapList:${id}` },
    ]);
    return id;
  }, []);

  const remove = useCallback((id: string) => {
    if (PINNED_IDS.has(id)) return;
    setTabs((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const listKeys = useMemo(
    () => tabs.filter((t) => t.listKey).map((t) => t.listKey as string),
    [tabs]
  );

  return { tabs, listKeys, canRename, canDelete, rename, move, addList, remove };
}
