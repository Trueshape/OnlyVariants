import { describe, expect, it } from 'vitest';
import { snapCompleteService } from './snapCompleteService';
import type { Variant } from '../types/variant';

const v = (over: Partial<Variant>): Variant => ({
  id: over.id ?? 'x',
  cardName: over.cardName ?? 'Card',
  variantName: over.variantName ?? 'Variant',
  releaseStatus: over.releaseStatus ?? 'released',
  addedDate: '2026-01-01',
  ...over,
});

describe('searchVariants', () => {
  const data = [
    v({ id: '1', cardName: 'Spider-Man', variantName: 'Gold', artName: 'Dan Hipp' }),
    v({ id: '2', cardName: 'Iron Man', variantName: 'Kingpin Special', artName: 'Alex Ross' }),
    v({ id: '3', cardName: 'Thor', variantName: 'Baby', artName: undefined }),
  ];

  it('matches on card name, case-insensitively', () => {
    expect(snapCompleteService.searchVariants(data, 'iron').map((x) => x.id)).toEqual(['2']);
  });

  it('matches on variant name', () => {
    expect(snapCompleteService.searchVariants(data, 'gold').map((x) => x.id)).toEqual(['1']);
  });

  it('matches on artist and tolerates a missing artist', () => {
    expect(snapCompleteService.searchVariants(data, 'ross').map((x) => x.id)).toEqual(['2']);
    expect(snapCompleteService.searchVariants(data, 'nobody')).toEqual([]);
  });
});

describe('getUnreleasedVariants', () => {
  // Relative to "now" so the fixture never drifts into the past as the
  // calendar moves on.
  const daysFromNow = (n: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString();
  };

  it('keeps only unreleased/unknown and sorts dated ones ascending, undated last', () => {
    const data = [
      v({ id: 'released', releaseStatus: 'released', releaseDate: daysFromNow(-30) }),
      v({ id: 'late', releaseStatus: 'unreleased', releaseDate: daysFromNow(60) }),
      v({ id: 'nodate', releaseStatus: 'unknown' }),
      v({ id: 'soon', releaseStatus: 'unreleased', releaseDate: daysFromNow(5) }),
    ];
    expect(snapCompleteService.getUnreleasedVariants(data).map((x) => x.id)).toEqual([
      'soon',
      'late',
      'nodate',
    ]);
  });

  it('drops a dated unreleased/unknown variant whose day has already passed', () => {
    const data = [
      v({ id: 'yesterday', releaseStatus: 'unreleased', releaseDate: daysFromNow(-1) }),
      v({ id: 'today', releaseStatus: 'unreleased', releaseDate: daysFromNow(0) }),
      v({ id: 'tomorrow', releaseStatus: 'unreleased', releaseDate: daysFromNow(1) }),
    ];
    expect(snapCompleteService.getUnreleasedVariants(data).map((x) => x.id)).toEqual([
      'today',
      'tomorrow',
    ]);
  });
});
