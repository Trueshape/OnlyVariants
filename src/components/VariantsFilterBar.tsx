import { Search, X } from 'lucide-react';
import type { CardColumns } from '../hooks/useCardColumns';
import type { SortOption } from '../hooks/useListView';
import { VAULT_SOURCE_LABEL, VAULT_QUALITY_TIERS } from '../utils/vaultFilter';
import CardScaleControl from './CardScaleControl';

const RARITY_TIERS = ['Rare', 'SuperRare', 'Ultimate', 'Spotlight', 'Unknown'];

interface VariantsFilterBarProps {
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  characterFilter: string;
  onCharacterFilterChange: (v: string) => void;
  characterOptions: string[];
  artistFilter: string;
  onArtistFilterChange: (v: string) => void;
  artistOptions: string[];
  themeFilter: string;
  onThemeFilterChange: (v: string) => void;
  themeOptions: string[];
  sourceFilter: string;
  onSourceFilterChange: (v: string) => void;
  sourceOptions: string[];
  rarityFilter: string;
  onRarityFilterChange: (v: string) => void;
  vaultQualityFilter: string;
  onVaultQualityFilterChange: (v: string) => void;
  sortBy: SortOption;
  onSortByChange: (v: SortOption) => void;
  isOwnedTab: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  filteredCount: number;
  activeTabTotal: number;
  cardColumns: CardColumns;
}

export default function VariantsFilterBar({
  searchQuery,
  onSearchQueryChange,
  characterFilter,
  onCharacterFilterChange,
  characterOptions,
  artistFilter,
  onArtistFilterChange,
  artistOptions,
  themeFilter,
  onThemeFilterChange,
  themeOptions,
  sourceFilter,
  onSourceFilterChange,
  sourceOptions,
  rarityFilter,
  onRarityFilterChange,
  vaultQualityFilter,
  onVaultQualityFilterChange,
  sortBy,
  onSortByChange,
  isOwnedTab,
  hasActiveFilters,
  onClearFilters,
  filteredCount,
  activeTabTotal,
  cardColumns,
}: VariantsFilterBarProps) {
  return (
    <>
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
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="filter-field">
            <label>Character</label>
            <select value={characterFilter} onChange={(e) => onCharacterFilterChange(e.target.value)}>
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
            <select value={artistFilter} onChange={(e) => onArtistFilterChange(e.target.value)}>
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
            <select value={themeFilter} onChange={(e) => onThemeFilterChange(e.target.value)}>
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
                onSourceFilterChange(e.target.value);
                if (e.target.value !== VAULT_SOURCE_LABEL) onVaultQualityFilterChange('all');
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
            <select value={rarityFilter} onChange={(e) => onRarityFilterChange(e.target.value)}>
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
            <select value={sortBy} onChange={(e) => onSortByChange(e.target.value as SortOption)}>
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
                <button className="clear-filters" onClick={onClearFilters} title="Clear all filters">
                  <X size={14} />
                  Clear filters
                </button>
              )}
              Showing: <strong>{filteredCount}</strong> of {activeTabTotal}
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
              onClick={() => onVaultQualityFilterChange('all')}
            >
              All
            </button>
            {VAULT_QUALITY_TIERS.map((tier) => (
              <button
                key={tier}
                className={`rarity-chip vault-chip ${vaultQualityFilter === tier ? 'active' : ''}`}
                onClick={() => onVaultQualityFilterChange(tier)}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
