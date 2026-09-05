import { beforeEach, describe, expect, it } from 'vitest';
import { readIds } from './useListStore';

describe('readIds', () => {
  beforeEach(() => localStorage.clear());

  it('returns [] when nothing is stored', () => {
    expect(readIds('k')).toEqual([]);
  });

  it('reads the current string-array format', () => {
    localStorage.setItem('k', JSON.stringify(['a', 'b', 'c']));
    expect(readIds('k')).toEqual(['a', 'b', 'c']);
  });

  it('migrates the legacy array-of-objects format to ids', () => {
    localStorage.setItem(
      'k',
      JSON.stringify([
        { id: 'iron-man-01', cardName: 'Iron Man', addedToWishlist: 'x' },
        { id: 'thor-02', cardName: 'Thor' },
      ])
    );
    expect(readIds('k')).toEqual(['iron-man-01', 'thor-02']);
  });

  it('de-duplicates', () => {
    localStorage.setItem('k', JSON.stringify(['a', 'a', 'b']));
    expect(readIds('k')).toEqual(['a', 'b']);
  });

  it('returns [] for malformed JSON', () => {
    localStorage.setItem('k', '{not json');
    expect(readIds('k')).toEqual([]);
  });

  it('returns [] when the stored value is not an array', () => {
    localStorage.setItem('k', JSON.stringify({ a: 1 }));
    expect(readIds('k')).toEqual([]);
  });
});
