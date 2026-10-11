import { describe, expect, it } from 'vitest';
import { resolveAcquisitionDates } from './acquisitionDates.js';

const MTIME = '2026-10-11T16:00:00.000Z';
const prevImport = {
  ownedIds: ['venom-01', 'thor-02'],
  acquisitionDates: { 'venom-01': '2024-01-03T00:00:00Z', 'thor-02': '2025-05-05T00:00:00Z' },
  importedAt: '2026-10-09T12:00:00.000Z',
};

describe('resolveAcquisitionDates', () => {
  it('keeps a date that was already decided, even if the save would say otherwise', () => {
    const out = resolveAcquisitionDates({
      ownedIds: ['venom-01'],
      instancesById: { 'venom-01': [{ created: '2020-01-01T00:00:00Z' }] },
      prev: prevImport,
      saveMtimeIso: MTIME,
    });
    expect(out['venom-01']).toBe('2024-01-03T00:00:00Z');
  });

  it('dates a newly owned variant by its fresh instance, not an older one', () => {
    const out = resolveAcquisitionDates({
      ownedIds: ['venom-01', 'venom-30'],
      instancesById: {
        'venom-30': [
          { created: '2026-09-15T21:59:00Z', updated: '2026-10-10T19:02:30Z' },
          { created: '2026-10-10T19:02:08Z', updated: '2026-10-10T19:02:08Z' },
        ],
      },
      prev: prevImport,
      saveMtimeIso: MTIME,
    });
    expect(out['venom-30']).toBe('2026-10-10T19:02:08Z');
  });

  it('uses the update time when art was applied to an instance made before the last import', () => {
    const out = resolveAcquisitionDates({
      ownedIds: ['venom-30'],
      instancesById: {
        'venom-30': [{ created: '2026-09-15T21:59:00Z', updated: '2026-10-10T19:02:30Z' }],
      },
      prev: prevImport,
      saveMtimeIso: MTIME,
    });
    expect(out['venom-30']).toBe('2026-10-10T19:02:30Z');
  });

  it('falls back to the save file time when nothing in the save is newer than the last import', () => {
    const out = resolveAcquisitionDates({
      ownedIds: ['x-01'],
      instancesById: { 'x-01': [{ created: '2026-01-01T00:00:00Z', updated: '2026-01-01T00:00:00Z' }] },
      prev: prevImport,
      saveMtimeIso: MTIME,
    });
    expect(out['x-01']).toBe(MTIME);
  });

  it('seeds every date from the save on the very first run', () => {
    const out = resolveAcquisitionDates({
      ownedIds: ['venom-01', 'thor-02'],
      instancesById: {
        'venom-01': [{ created: '2024-01-03T00:00:00Z' }, { created: '2025-01-01T00:00:00Z' }],
        'thor-02': [{ created: '2025-05-05T00:00:00Z' }],
      },
      prev: null,
      saveMtimeIso: MTIME,
    });
    expect(out).toEqual({
      'venom-01': '2024-01-03T00:00:00Z',
      'thor-02': '2025-05-05T00:00:00Z',
    });
  });
});
