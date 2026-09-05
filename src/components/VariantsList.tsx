import { useMemo, useState } from 'react';
import type { Variant } from '../types/variant';
import type { UseTabs, TabDef } from '../hooks/useTabs';
import { useCardConfig } from '../hooks/useCardConfig';
import { useListView } from '../hooks/useListView';
import TabBar from './TabBar';
import VariantCard from './VariantCard';
import VariantsFilterBar from './VariantsFilterBar';
import { VAULT_SOURCE_LABEL } from '../utils/vaultFilter';
import CardLightbox from './CardLightbox';
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

const RARITY_ORDER: Record<string, number> = {
  Spotlight: 0,
  Ultimate: 1,
  SuperRare: 2,
  Rare: 3,
  Unknown: 4,
};

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
  const view = useListView(activeTabId);
  const {
    searchQuery,
    characterFilter,
    artistFilter,
    themeFilter,
    sourceFilter,
    rarityFilter,
    vaultQualityFilter,
    sortBy,
    setSourceFilter,
    setVaultQualityFilter,
  } = view;
  // The lightbox holds its own snapshot of the list it was opened from, so
  // changing filters behind it can't shift its index onto a stale card.
  const [lightbox, setLightbox] = useState<{ variants: Variant[]; index: number } | null>(null);

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

      <VariantsFilterBar
        searchQuery={searchQuery}
        onSearchQueryChange={view.setSearchQuery}
        characterFilter={characterFilter}
        onCharacterFilterChange={view.setCharacterFilter}
        characterOptions={characterOptions}
        artistFilter={artistFilter}
        onArtistFilterChange={view.setArtistFilter}
        artistOptions={artistOptions}
        themeFilter={themeFilter}
        onThemeFilterChange={view.setThemeFilter}
        themeOptions={themeOptions}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        sourceOptions={sourceOptions}
        rarityFilter={rarityFilter}
        onRarityFilterChange={view.setRarityFilter}
        vaultQualityFilter={vaultQualityFilter}
        onVaultQualityFilterChange={setVaultQualityFilter}
        sortBy={sortBy}
        onSortByChange={view.setSortBy}
        isOwnedTab={isOwnedTab}
        hasActiveFilters={view.hasActiveFilters}
        onClearFilters={view.clearFilters}
        filteredCount={filteredVariants.length}
        activeTabTotal={activeTabTotal}
        cardColumns={cardColumns}
      />

      <div className="variants-grid">
        {filteredVariants.length > 0 ? (
          filteredVariants.map((variant, i) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              isOwned={ownedIds.has(variant.id)}
              onZoom={() => setLightbox({ variants: filteredVariants, index: i })}
              activeViewId={activeTab.id}
              onFilterRarity={view.setRarityFilter}
              onFilterSource={setSourceFilter}
              onFilterArtist={view.setArtistFilter}
              onFilterTheme={view.setThemeFilter}
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
