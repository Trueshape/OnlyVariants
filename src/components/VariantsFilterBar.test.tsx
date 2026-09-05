// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import VariantsFilterBar from './VariantsFilterBar';
import { VAULT_SOURCE_LABEL, VAULT_QUALITY_TIERS } from '../utils/vaultFilter';
import type { CardColumns } from '../hooks/useCardColumns';

afterEach(() => cleanup());

const cardColumns = {} as CardColumns;

// Labels aren't wired to their <select> via htmlFor/id (purely visual
// layout), so look the field up by its label text instead of by role.
function selectFor(labelText: string): HTMLSelectElement {
  const label = screen.getByText(labelText);
  const select = label.closest('.filter-field')?.querySelector('select');
  if (!select) throw new Error(`no <select> found for label "${labelText}"`);
  return select;
}

function baseProps() {
  return {
    searchQuery: '',
    onSearchQueryChange: vi.fn(),
    characterFilter: 'all',
    onCharacterFilterChange: vi.fn(),
    characterOptions: ['Iron Man', 'Spider-Man'],
    artistFilter: 'all',
    onArtistFilterChange: vi.fn(),
    artistOptions: ['Dan Hipp'],
    themeFilter: 'all',
    onThemeFilterChange: vi.fn(),
    themeOptions: ['Cyber'],
    sourceFilter: 'all',
    onSourceFilterChange: vi.fn(),
    sourceOptions: ['General Pool', VAULT_SOURCE_LABEL],
    rarityFilter: 'all',
    onRarityFilterChange: vi.fn(),
    vaultQualityFilter: 'all',
    onVaultQualityFilterChange: vi.fn(),
    sortBy: 'name-asc' as const,
    onSortByChange: vi.fn(),
    isOwnedTab: false,
    hasActiveFilters: false,
    onClearFilters: vi.fn(),
    filteredCount: 12,
    activeTabTotal: 20,
    cardColumns,
  };
}

describe('VariantsFilterBar', () => {
  it('shows the filtered/total counts and no clear button when nothing is active', () => {
    const { container } = render(<VariantsFilterBar {...baseProps()} />);
    const counts = container.querySelector('.results-count');
    expect(counts?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Showing: 12 of 20');
    expect(screen.queryByTitle('Clear all filters')).not.toBeInTheDocument();
  });

  it('shows a clear-filters button when a filter is active, and wires it up', () => {
    const props = baseProps();
    props.hasActiveFilters = true;
    render(<VariantsFilterBar {...props} />);
    fireEvent.click(screen.getByTitle('Clear all filters'));
    expect(props.onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('reports search input changes to the parent', () => {
    const props = baseProps();
    render(<VariantsFilterBar {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Spider-Man/), { target: { value: 'venom' } });
    expect(props.onSearchQueryChange).toHaveBeenCalledWith('venom');
  });

  it('only shows the Vault quality chip row while the Vault source is selected', () => {
    const props = baseProps();
    const { rerender } = render(<VariantsFilterBar {...props} />);
    expect(screen.queryByText('Filter by Vault quality')).not.toBeInTheDocument();

    rerender(<VariantsFilterBar {...props} sourceFilter={VAULT_SOURCE_LABEL} />);
    expect(screen.getByText('Filter by Vault quality')).toBeInTheDocument();
    for (const tier of VAULT_QUALITY_TIERS) {
      expect(screen.getByRole('button', { name: tier })).toBeInTheDocument();
    }
  });

  it('clears the Vault quality filter when switching away from the Vault source', () => {
    const props = baseProps();
    props.sourceFilter = VAULT_SOURCE_LABEL;
    render(<VariantsFilterBar {...props} />);
    fireEvent.change(selectFor('Source'), { target: { value: 'General Pool' } });
    expect(props.onSourceFilterChange).toHaveBeenCalledWith('General Pool');
    expect(props.onVaultQualityFilterChange).toHaveBeenCalledWith('all');
  });
});
