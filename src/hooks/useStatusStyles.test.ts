import { describe, expect, it } from 'vitest';
import { resolveStatusStyle, DEFAULT_STYLE, BUILTIN_DEFAULTS } from './useStatusStyles';

describe('resolveStatusStyle', () => {
  it('returns the built-in default for a known key with no explicit style', () => {
    expect(resolveStatusStyle({}, 'unreleased')).toEqual(BUILTIN_DEFAULTS.unreleased);
    expect(resolveStatusStyle({}, 'owned')).toEqual(BUILTIN_DEFAULTS.owned);
    expect(resolveStatusStyle({}, 'unowned')).toEqual(BUILTIN_DEFAULTS.unowned);
  });

  it('returns the generic (invisible) default for an unknown key', () => {
    expect(resolveStatusStyle({}, 'bronze-age')).toEqual(DEFAULT_STYLE);
  });

  it('prefers an explicit style over the built-in default', () => {
    const custom = {
      indicator: { style: 'ribbon' as const, color: '#00ff00', opacity: 0.5 },
      border: { enabled: true, color: '#00ff00' },
      hiddenOnTabs: [],
    };
    expect(resolveStatusStyle({ unreleased: custom }, 'unreleased')).toEqual(custom);
  });

  it('lets an explicit style apply to any key, not just built-ins', () => {
    const custom = {
      indicator: { style: 'bar' as const, color: '#0000ff', opacity: 1 },
      border: { enabled: false, color: '#0000ff' },
      hiddenOnTabs: ['all'],
    };
    expect(resolveStatusStyle({ wishlist: custom }, 'wishlist')).toEqual(custom);
  });

  it('fills in a field missing from a value saved by an older version (no hiddenOnTabs)', () => {
    const legacy = {
      indicator: { style: 'ribbon' as const, color: '#00ff00', opacity: 0.5 },
      border: { enabled: true, color: '#00ff00' },
    };
    const result = resolveStatusStyle({ owned: legacy }, 'owned');
    expect(result.indicator).toEqual(legacy.indicator);
    expect(result.border).toEqual(legacy.border);
    expect(result.hiddenOnTabs).toEqual(BUILTIN_DEFAULTS.owned.hiddenOnTabs);
  });

  it('fills in indicator/border from defaults when only hiddenOnTabs was saved', () => {
    const result = resolveStatusStyle({ owned: { hiddenOnTabs: ['all'] } }, 'owned');
    expect(result.indicator).toEqual(BUILTIN_DEFAULTS.owned.indicator);
    expect(result.border).toEqual(BUILTIN_DEFAULTS.owned.border);
    expect(result.hiddenOnTabs).toEqual(['all']);
  });
});
