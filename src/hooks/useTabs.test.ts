import { describe, expect, it } from 'vitest';
import { reconcile, reorderTabs, DEFAULT_TABS, type TabDef } from './useTabs';

const ids = (tabs: TabDef[]) => tabs.map((t) => t.id);

describe('reorderTabs', () => {
  const base: TabDef[] = [
    { id: 'a', name: 'A', kind: 'view' },
    { id: 'b', name: 'B', kind: 'view' },
    { id: 'c', name: 'C', kind: 'view' },
    { id: 'd', name: 'D', kind: 'view' },
  ];

  it('moves a tab before another', () => {
    expect(ids(reorderTabs(base, 'd', 'b'))).toEqual(['a', 'd', 'b', 'c']);
  });

  it('moves a tab to the end when beforeId is null', () => {
    expect(ids(reorderTabs(base, 'a', null))).toEqual(['b', 'c', 'd', 'a']);
  });

  it('moving a tab before itself is a no-op in order', () => {
    expect(ids(reorderTabs(base, 'b', 'b'))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ignores an unknown id', () => {
    expect(ids(reorderTabs(base, 'zzz', 'a'))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not mutate the input', () => {
    const copy = base.slice();
    reorderTabs(base, 'a', 'c');
    expect(base).toEqual(copy);
  });
});

describe('reconcile', () => {
  it('keeps the stored order', () => {
    const stored: TabDef[] = [
      { id: 'all', name: 'All', kind: 'view' },
      { id: 'wishlist', name: 'Renamed?', kind: 'wishlist', listKey: 'marvelSnapWishlist' },
      { id: 'owned', name: 'Owned', kind: 'view' },
      { id: 'unowned', name: 'Unowned', kind: 'view' },
      { id: 'unreleased', name: 'Unreleased', kind: 'view' },
      { id: 'u1', name: 'My List', kind: 'list', listKey: 'marvelSnapList:u1' },
    ];
    expect(ids(reconcile(stored))).toEqual([
      'all',
      'wishlist',
      'owned',
      'unowned',
      'unreleased',
      'u1',
    ]);
  });

  it('inserts a newly-added pinned tab after its default predecessor', () => {
    // stored config predates the "unreleased" pinned tab
    const stored: TabDef[] = [
      { id: 'wishlist', name: 'Wishlist', kind: 'wishlist', listKey: 'marvelSnapWishlist' },
      { id: 'all', name: 'All', kind: 'view' },
      { id: 'owned', name: 'Owned', kind: 'view' },
      { id: 'unowned', name: 'Unowned', kind: 'view' },
      { id: 'u1', name: 'My List', kind: 'list', listKey: 'marvelSnapList:u1' },
    ];
    // 'unreleased' comes right after 'unowned' in DEFAULT_TABS
    expect(ids(reconcile(stored))).toEqual([
      'wishlist',
      'all',
      'owned',
      'unowned',
      'unreleased',
      'u1',
    ]);
  });

  it('forces pinned tabs back to their canonical name', () => {
    const stored: TabDef[] = [
      { id: 'wishlist', name: 'Hacked', kind: 'list', listKey: 'x' },
      { id: 'all', name: 'x', kind: 'view' },
      { id: 'owned', name: 'x', kind: 'view' },
      { id: 'unowned', name: 'x', kind: 'view' },
    ];
    const out = reconcile(stored);
    expect(out.find((t) => t.id === 'wishlist')).toMatchObject({
      name: 'Wishlist',
      kind: 'wishlist',
      listKey: 'marvelSnapWishlist',
    });
  });

  it('adds every missing pinned tab', () => {
    const stored: TabDef[] = [{ id: 'u1', name: 'Only mine', kind: 'list', listKey: 'k' }];
    const out = ids(reconcile(stored));
    for (const id of ['wishlist', 'all', 'owned', 'unowned', 'unreleased']) {
      expect(out).toContain(id);
    }
    expect(out).toContain('u1');
  });

  it('drops duplicate ids', () => {
    const stored: TabDef[] = [
      ...DEFAULT_TABS,
      { id: 'favorites', name: 'dupe', kind: 'list', listKey: 'marvelSnapFavorites' },
    ];
    const out = ids(reconcile(stored));
    expect(out.filter((id) => id === 'favorites')).toHaveLength(1);
  });
});
