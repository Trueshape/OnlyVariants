// Acquisition dates for owned variants. Kept in its own module so the rules
// can be unit-tested without a real save file.
//
// A save's per-instance TimeCreated is NOT a reliable "when did I get this
// variant": the variant's art can be applied to an older, already-levelled
// instance, so the oldest instance of a variant can predate the day you
// actually got it (Venom 30: instance from Sep 15, variant obtained Oct 10).
// So instead of re-deriving every date from the save on each run, a variant's
// date is decided ONCE - the first time it shows up as owned - and then kept.

/**
 * Oldest instance TimeCreated per variant id. This is the legacy rule, used
 * only to seed variants that were already owned before this run had any
 * previous import to compare against.
 */
export function legacyDates(instancesById) {
  const dates = {};
  for (const [id, instances] of Object.entries(instancesById)) {
    for (const inst of instances) {
      if (!inst.created) continue;
      if (!dates[id] || Date.parse(inst.created) < Date.parse(dates[id])) {
        dates[id] = inst.created;
      }
    }
  }
  return dates;
}

/**
 * @param {object} args
 * @param {string[]} args.ownedIds - variant ids owned now
 * @param {Record<string, {created?: string, updated?: string}[]>} args.instancesById
 * @param {{ownedIds?: string[], acquisitionDates?: Record<string,string>, importedAt?: string} | null} args.prev
 *   the previous import (null on the very first run)
 * @param {string} args.saveMtimeIso - when the game last wrote the save
 * @returns {Record<string, string>}
 */
export function resolveAcquisitionDates({ ownedIds, instancesById, prev, saveMtimeIso }) {
  const legacy = legacyDates(instancesById);
  const prevOwned = new Set(prev?.ownedIds ?? []);
  const prevDates = prev?.acquisitionDates ?? {};
  const prevImportedMs = prev?.importedAt ? Date.parse(prev.importedAt) : NaN;
  const hasBaseline = prevOwned.size > 0 && Number.isFinite(prevImportedMs);

  const result = {};
  for (const id of ownedIds) {
    // Already decided on an earlier run: never re-derive it.
    if (prevDates[id]) {
      result[id] = prevDates[id];
      continue;
    }

    if (!hasBaseline || prevOwned.has(id)) {
      // No previous import to compare with (or an id the previous import
      // owned but never dated): fall back to what the save says.
      if (legacy[id]) result[id] = legacy[id];
      continue;
    }

    // Newly owned since the previous import: the earliest thing that
    // happened to one of its instances after that import is when you got it
    // (a fresh instance being created, or the art applied to an old one).
    const candidates = [];
    for (const inst of instancesById[id] ?? []) {
      for (const t of [inst.created, inst.updated]) {
        if (t && Date.parse(t) > prevImportedMs) candidates.push(t);
      }
    }
    candidates.sort((a, b) => Date.parse(a) - Date.parse(b));
    result[id] = candidates[0] ?? saveMtimeIso;
  }
  return result;
}
