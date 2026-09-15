import { useEffect, useState } from 'react';

export type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'date-newest'
  | 'date-oldest'
  | 'rarity'
  | 'date-added'
  | 'date-added-oldest';

// The active tab + all filter/sort choices, persisted so reopening the app
// lands you back where you were.
const VIEW_KEY = 'marvelSnapListView';

interface SavedView {
  activeTabId?: string;
  searchQuery?: string;
  characterFilter?: string;
  artistFilter?: string;
  themeFilter?: string;
  sourceFilter?: string;
  rarityFilter?: string;
  vaultQualityFilter?: string;
  sortBy?: SortOption;
}

function loadView(): SavedView {
  try {
    return JSON.parse(localStorage.getItem(VIEW_KEY) || '{}') as SavedView;
  } catch {
    return {};
  }
}

export interface UseListView {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  characterFilter: string;
  setCharacterFilter: (v: string) => void;
  artistFilter: string;
  setArtistFilter: (v: string) => void;
  themeFilter: string;
  setThemeFilter: (v: string) => void;
  sourceFilter: string;
  setSourceFilter: (v: string) => void;
  rarityFilter: string;
  setRarityFilter: (v: string) => void;
  vaultQualityFilter: string;
  setVaultQualityFilter: (v: string) => void;
  sortBy: SortOption;
  setSortBy: (v: SortOption) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

/**
 * Filter/sort state for the main list, persisted to localStorage.
 * `activeTabId` is owned by App (so the nav logo can jump tabs directly)
 * but is saved alongside this state, so it's taken as a param rather than
 * managed here.
 */
export function useListView(activeTabId: string): UseListView {
  const [saved] = useState(loadView);
  const [searchQuery, setSearchQuery] = useState(saved.searchQuery ?? '');
  const [characterFilter, setCharacterFilter] = useState(saved.characterFilter ?? 'all');
  const [artistFilter, setArtistFilter] = useState(saved.artistFilter ?? 'all');
  const [themeFilter, setThemeFilter] = useState(saved.themeFilter ?? 'all');
  const [sourceFilter, setSourceFilter] = useState(saved.sourceFilter ?? 'all');
  const [rarityFilter, setRarityFilter] = useState(saved.rarityFilter ?? 'all');
  const [vaultQualityFilter, setVaultQualityFilter] = useState(saved.vaultQualityFilter ?? 'all');
  const [sortByRaw, setSortBy] = useState<SortOption>(saved.sortBy ?? 'name-asc');
  // Whether this session has already defaulted the Owned tab's sort once.
  // Plain state (not a ref) so the adjustment below stays a pure part of
  // rendering rather than a mutation hidden inside it - see "Adjusting
  // state when a prop changes" in the React docs for this pattern.
  const [hasAutoSortedOwned, setHasAutoSortedOwned] = useState(false);

  // The first time this session the Owned tab is opened, it should already
  // read "most recently acquired first", regardless of whatever sort was
  // last used or saved - after that, the user's own choice (including
  // picking that same sort again, or switching away from it) is left alone
  // for the rest of the session.
  const isFirstOwnedVisitThisSession = activeTabId === 'owned' && !hasAutoSortedOwned;
  if (isFirstOwnedVisitThisSession) {
    setHasAutoSortedOwned(true);
    if (sortByRaw !== 'date-added') setSortBy('date-added');
  }

  // The acquisition-date sort options only make sense - and only appear in
  // the "Sort by" dropdown at all - on the Owned tab. Derived rather than
  // synced back with an effect, so leaving that tab can't leave the grid
  // sorted by a criterion the dropdown no longer even offers (it'd fall
  // back to showing "Card Name (A-Z)" with a different order actually
  // applied) - and switching back to Owned still remembers the choice.
  const sortBy: SortOption = isFirstOwnedVisitThisSession
    ? 'date-added'
    : activeTabId !== 'owned' && (sortByRaw === 'date-added' || sortByRaw === 'date-added-oldest')
      ? 'name-asc'
      : sortByRaw;

  useEffect(() => {
    const view: SavedView = {
      activeTabId,
      searchQuery,
      characterFilter,
      artistFilter,
      themeFilter,
      sourceFilter,
      rarityFilter,
      vaultQualityFilter,
      sortBy,
    };
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(view));
    } catch {
      // ignore write failures
    }
  }, [
    activeTabId,
    searchQuery,
    characterFilter,
    artistFilter,
    themeFilter,
    sourceFilter,
    rarityFilter,
    vaultQualityFilter,
    sortBy,
  ]);

  const hasActiveFilters =
    characterFilter !== 'all' ||
    artistFilter !== 'all' ||
    themeFilter !== 'all' ||
    sourceFilter !== 'all' ||
    rarityFilter !== 'all' ||
    vaultQualityFilter !== 'all' ||
    !!searchQuery;

  const clearFilters = () => {
    setSearchQuery('');
    setCharacterFilter('all');
    setArtistFilter('all');
    setThemeFilter('all');
    setSourceFilter('all');
    setRarityFilter('all');
    setVaultQualityFilter('all');
  };

  return {
    searchQuery,
    setSearchQuery,
    characterFilter,
    setCharacterFilter,
    artistFilter,
    setArtistFilter,
    themeFilter,
    setThemeFilter,
    sourceFilter,
    setSourceFilter,
    rarityFilter,
    setRarityFilter,
    vaultQualityFilter,
    setVaultQualityFilter,
    sortBy,
    setSortBy,
    hasActiveFilters,
    clearFilters,
  };
}
