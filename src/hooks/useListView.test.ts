// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useListView } from './useListView';

describe('useListView', () => {
  // Each test starts from a clean slate - the hook persists to
  // localStorage and reads it back on mount, so a prior test's state
  // would otherwise leak into the next one.
  beforeEach(() => localStorage.clear());

  it('keeps an acquisition-date sort while on the Owned tab', () => {
    const { result } = renderHook(({ tabId }) => useListView(tabId), {
      initialProps: { tabId: 'owned' },
    });
    act(() => result.current.setSortBy('date-added'));
    expect(result.current.sortBy).toBe('date-added');
  });

  it('resets an acquisition-date sort to name-asc when leaving the Owned tab', () => {
    const { result, rerender } = renderHook(({ tabId }) => useListView(tabId), {
      initialProps: { tabId: 'owned' },
    });
    act(() => result.current.setSortBy('date-added-oldest'));
    expect(result.current.sortBy).toBe('date-added-oldest');

    rerender({ tabId: 'all' });
    expect(result.current.sortBy).toBe('name-asc');
  });

  it('leaves an ordinary sort untouched when switching tabs', () => {
    const { result, rerender } = renderHook(({ tabId }) => useListView(tabId), {
      initialProps: { tabId: 'owned' },
    });
    act(() => result.current.setSortBy('rarity'));
    rerender({ tabId: 'all' });
    expect(result.current.sortBy).toBe('rarity');
  });
});
