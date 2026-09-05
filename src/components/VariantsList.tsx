import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Variant } from '../types/variant';
import type { UseTabs, TabDef } from '../hooks/useTabs';
import { useCardConfig } from '../hooks/useCardConfig';
import TabBar from './TabBar';
import VariantCard from './VariantCard';
import CardLightbox from './CardLightbox';
import CardScaleControl from './CardScaleControl';
import type { CardColumns } from '../hooks/useCardColumns';
import '../styles/VariantsList.css';

interface VariantsListProps {
  allVariants: Variant[];
  ownedIds: Set<string>;
  acquisitionDates: Record<string, string>;
  tabs: UseTabs;
  /** Delete a tab AND wipe its list data (App wires this up). */
  onDeleteTab: (id: string) => void;
  cardColumns: CardColumns;
  /** Lifted to App so the nav logo can jump straight to a tab (e.g. "wishlist"). */
  activeTabId: string;
  setActiveTabId: (id: string) => void;
}

type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'date-newest'
  | 'date-oldest'
  | 'rarity'
  | 'date-added'
  | 'date-added-oldest';

const RARITY_ORDER: Record<string, number> = {
  Spotlight: 0,
  Ultimate: 1,
  SuperRare: 2,
  Rare: 3,
  Unknown: 4,
};

const RARITY_TIERS = ['Rare', 'SuperRare', 'Ultimate', 'Spotlight', 'Unknown'];

const VAULT_SOURCE_LABEL = "Collector's Vault";
const VAULT_QUALITY_TIERS = ['Sensational', 'Amazing', 'Exquisite'];

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

export default function VariantsList({
  allVariants,
  ownedIds,
  acquisitionDates,
  tabs,
  onDeleteTab,
  cardColumns,
  activeTabId,
  setActiveTabId,
}: VariantsListProps) {
  const { listStore } = useCardConfig();
  const [saved] = useState(loadView);
  const [searchQuery, setSearchQuery] = useState(saved.searchQuery ?? '');
  const [characterFilter, setCharacterFilter] = useState(saved.characterFilter ?? 'all');
  const [artistFilter, setArtistFilter] = useState(saved.artistFilter ?? 'all');
  const [themeFilter, setThemeFilter] = useState(saved.themeFilter ?? 'all');
  const [sourceFilter, setSourceFilter] = useState(saved.sourceFilter ?? 'all');
  const [rarityFilter, setRarityFilter] = useState(saved.rarityFilter ?? 'all');
  const [vaultQualityFilter, setVaultQualityFilter] = useState(saved.vaultQualityFilter ?? 'all');
  const [sortBy, setSortBy] = useState<SortOption>(saved.sortBy ?? 'name-asc');
  // The lightbox holds its own snapshot of the list it was opened from, so
  // changing filters behind it can't shift its index onto a stale card.
  const [lightbox, setLightbox] = useState<{ variants: Variant[]; index: number } | null>(null);

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

  const activeTab: TabDef = tabs.tabs.find((t) => t.id === activeTabId) ?? tabs.tabs[0];

  const ownedVariants = useMemo(
    () => allVariants.filter((v) => ownedIds.has(v.id)),
    [allVariants, ownedIds]
  );

  const unownedVariants = useMemo(
    () => allVariants.filter((v) => !ownedIds.has(v.id)),
    [allVariants, ownedIds]
  );

  // Not out yet: a confirmed future date, or datamined with no date at all.
  const unreleasedVariants = useMemo(
    () =>
      allVariants.filter(
        (v) => v.releaseStatus === 'unreleased' || v.releaseStatus === 'unknown'
      ),
    [allVariants]
  );

  // Build the dropdown option lists from the actual data
  const characterOptions = useMemo(
    () => [...new Set(allVariants.map((v) => v.cardName))].sort(),
    [allVariants]
  );

  const artistOptions = useMemo(() => {
    const names = new Set<string>();
    allVariants.forEach((v) => {
      v.artName
        ?.split(',')
        .map((n) => n.trim())
        .filter(Boolean)
        .forEach((n) => names.add(n));
    });
    return [...names].sort();
  }, [allVariants]);

  const themeOptions = useMemo(
    () =>
      [...new Set(allVariants.map((v) => v.variantName).filter((n) => n && n !== 'Unknown Variant'))].sort(),
    [allVariants]
  );

  const sourceOptions = useMemo(() => {
    const options = [...new Set(allVariants.map((v) => v.source).filter((s): s is string => !!s))].sort();
    if (allVariants.some((v) => !!v.vaultQuality)) {
      options.push(VAULT_SOURCE_LABEL);
    }
    return options;
  }, [allVariants]);

  // The set of variant ids in the active tab's list (null for view tabs).
  const activeListIds =
    activeTab.kind === 'view' || !activeTab.listKey
      ? null
      : listStore.list(activeTab.listKey).ids;

  const isOwnedTab = activeTab.id === 'owned';

  const filteredVariants = useMemo(() => {
    let variants = allVariants;

    if (activeTab.id === 'owned') {
      variants = ownedVariants;
    } else if (activeTab.id === 'unowned') {
      variants = unownedVariants;
    } else if (activeTab.id === 'unreleased') {
      variants = unreleasedVariants;
    } else if (activeTab.id === 'all') {
      variants = allVariants;
    } else if (activeListIds) {
      const set = new Set(activeListIds);
      variants = allVariants.filter((v) => set.has(v.id));
    }

    if (characterFilter !== 'all') {
      variants = variants.filter((v) => v.cardName === characterFilter);
    }
    if (artistFilter !== 'all') {
      variants = variants.filter((v) =>
        v.artName
          ?.split(',')
          .map((n) => n.trim())
          .includes(artistFilter)
      );
    }
    if (themeFilter !== 'all') {
      variants = variants.filter((v) => v.variantName === themeFilter);
    }
    if (sourceFilter !== 'all') {
      variants =
        sourceFilter === VAULT_SOURCE_LABEL
          ? variants.filter((v) => !!v.vaultQuality)
          : variants.filter((v) => v.source === sourceFilter);
    }
    if (rarityFilter !== 'all') {
      variants = variants.filter((v) => (v.rarity || 'Unknown') === rarityFilter);
    }
    if (vaultQualityFilter !== 'all') {
      variants = variants.filter((v) => v.vaultQuality === vaultQualityFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      variants = variants.filter(
        (v) =>
          v.cardName.toLowerCase().includes(q) ||
          v.variantName.toLowerCase().includes(q) ||
          v.artName?.toLowerCase().includes(q)
      );
    }

    const sorted = [...variants];
    switch (sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => a.cardName.localeCompare(b.cardName));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.cardName.localeCompare(a.cardName));
        break;
      case 'date-newest':
        sorted.sort(
          (a, b) =>
            new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime()
        );
        break;
      case 'date-oldest':
        sorted.sort(
          (a, b) =>
            new Date(a.releaseDate || 0).getTime() - new Date(b.releaseDate || 0).getTime()
        );
        break;
      case 'rarity':
        sorted.sort(
          (a, b) =>
            (RARITY_ORDER[a.rarity || 'Unknown'] ?? 5) - (RARITY_ORDER[b.rarity || 'Unknown'] ?? 5)
        );
        break;
      case 'date-added': {
        // Vera data di acquisizione in gioco (da CollectionState.json), non
        // quando la carta e' stata aggiunta a una lista nell'app.
        sorted.sort((a, b) => {
          const aTime = acquisitionDates[a.id] ? new Date(acquisitionDates[a.id]).getTime() : 0;
          const bTime = acquisitionDates[b.id] ? new Date(acquisitionDates[b.id]).getTime() : 0;
          return bTime - aTime; // descending, newest first
        });
        break;
      }
      case 'date-added-oldest': {
        sorted.sort((a, b) => {
          const aTime = acquisitionDates[a.id] ? new Date(acquisitionDates[a.id]).getTime() : 0;
          const bTime = acquisitionDates[b.id] ? new Date(acquisitionDates[b.id]).getTime() : 0;
          return aTime - bTime; // ascending, oldest first
        });
        break;
      }
    }

    return sorted;
  }, [
    allVariants,
    ownedVariants,
    unownedVariants,
    unreleasedVariants,
    activeTab,
    activeListIds,
    acquisitionDates,
    characterFilter,
    artistFilter,
    themeFilter,
    sourceFilter,
    rarityFilter,
    vaultQualityFilter,
    searchQuery,
    sortBy,
  ]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of tabs.tabs) {
      if (tab.id === 'all') counts[tab.id] = allVariants.length;
      else if (tab.id === 'owned') counts[tab.id] = ownedVariants.length;
      else if (tab.id === 'unowned') counts[tab.id] = unownedVariants.length;
      else if (tab.id === 'unreleased') counts[tab.id] = unreleasedVariants.length;
      else if (tab.listKey) counts[tab.id] = listStore.list(tab.listKey).size;
      else counts[tab.id] = 0;
    }
    return counts;
  }, [
    tabs.tabs,
    allVariants.length,
    ownedVariants.length,
    unownedVariants.length,
    unreleasedVariants.length,
    listStore,
  ]);

  const activeTabTotal = tabCounts[activeTab.id] ?? filteredVariants.length;

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

  return (
    <div className="variants-list-container">
      <TabBar
        tabs={tabs.tabs}
        activeId={activeTab.id}
        counts={tabCounts}
        onSelect={setActiveTabId}
        canRename={tabs.canRename}
        canDelete={tabs.canDelete}
        onRename={tabs.rename}
        onMove={tabs.move}
        onAddList={tabs.addList}
        onDelete={onDeleteTab}
      />

      <div className="filter-bar">
        <div className="filter-bar-grid">
        <div className="filter-field filter-search">
          <label>Search variant or card</label>
          <div className="search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder="e.g. Spider-Man, Dan Hipp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="filter-field">
          <label>Character</label>
          <select value={characterFilter} onChange={(e) => setCharacterFilter(e.target.value)}>
            <option value="all">All characters</option>
            {characterOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Artist</label>
          <select value={artistFilter} onChange={(e) => setArtistFilter(e.target.value)}>
            <option value="all">All artists</option>
            {artistOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Theme</label>
          <select value={themeFilter} onChange={(e) => setThemeFilter(e.target.value)}>
            <option value="all">All themes</option>
            {themeOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Source</label>
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              if (e.target.value !== VAULT_SOURCE_LABEL) setVaultQualityFilter('all');
            }}
          >
            <option value="all">All sources</option>
            {sourceOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Rarity</label>
          <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)}>
            <option value="all">All rarities</option>
            {RARITY_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Sort by</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
            <option value="name-asc">Card Name (A-Z)</option>
            <option value="name-desc">Card Name (Z-A)</option>
            <option value="date-newest">Release Date (newest)</option>
            <option value="date-oldest">Release Date (oldest)</option>
            <option value="rarity">Rarity</option>
            {isOwnedTab && (
              <>
                <option value="date-added">Acquisition Date (newest)</option>
                <option value="date-added-oldest">Acquisition Date (oldest)</option>
              </>
            )}
          </select>
        </div>
        </div>

        <div className="rarity-filter-row-inline">
          <div className="rarity-row-content">
            <div className="results-count results-count-full">
              {hasActiveFilters && (
                <button className="clear-filters" onClick={clearFilters} title="Clear all filters">
                  <X size={14} />
                  Clear filters
                </button>
              )}
              Showing: <strong>{filteredVariants.length}</strong> of {activeTabTotal}
            </div>
            <CardScaleControl cardColumns={cardColumns} />
          </div>
        </div>
      </div>

      {sourceFilter === VAULT_SOURCE_LABEL && (
        <div className="rarity-filter-row">
          <span className="rarity-filter-label">Filter by Vault quality</span>
          <div className="rarity-chips">
            <button
              className={`rarity-chip vault-chip ${vaultQualityFilter === 'all' ? 'active' : ''}`}
              onClick={() => setVaultQualityFilter('all')}
            >
              All
            </button>
            {VAULT_QUALITY_TIERS.map((tier) => (
              <button
                key={tier}
                className={`rarity-chip vault-chip ${vaultQualityFilter === tier ? 'active' : ''}`}
                onClick={() => setVaultQualityFilter(tier)}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="variants-grid">
        {filteredVariants.length > 0 ? (
          filteredVariants.map((variant, i) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              isOwned={ownedIds.has(variant.id)}
              onZoom={() => setLightbox({ variants: filteredVariants, index: i })}
              activeViewId={activeTab.id}
              onFilterRarity={setRarityFilter}
              onFilterSource={setSourceFilter}
              onFilterArtist={setArtistFilter}
              onFilterTheme={setThemeFilter}
              onFilterVaultQuality={(quality) => {
                setSourceFilter(VAULT_SOURCE_LABEL);
                setVaultQualityFilter(quality);
              }}
            />
          ))
        ) : (
          <div className="empty-state">
            <p>No variants found</p>
          </div>
        )}
      </div>

      {lightbox && (
        <CardLightbox
          variants={lightbox.variants}
          index={lightbox.index}
          onNavigate={(index) => setLightbox((lb) => (lb ? { ...lb, index } : lb))}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
