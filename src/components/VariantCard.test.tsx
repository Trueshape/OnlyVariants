// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import VariantCard from './VariantCard';
import { CardConfigProvider } from '../contexts/CardConfigContext';
import type { CardConfig } from '../contexts/cardConfigStore';
import { DEFAULT_STYLE, type StatusStyle } from '../hooks/useStatusStyles';
import type { Variant } from '../types/variant';

afterEach(() => cleanup());

function makeVariant(overrides: Partial<Variant> = {}): Variant {
  return {
    id: 'v1',
    cardName: 'Iron Man',
    variantName: 'Cyber',
    releaseStatus: 'released',
    addedDate: '2024-01-01',
    ...overrides,
  };
}

/** A CardConfig whose every status resolves to DEFAULT_STYLE (fully off)
 * unless explicitly overridden - matches the app's real zero-default
 * behavior, so tests only need to opt into what they're checking. */
function makeConfig(overrides: Partial<CardConfig> & { styles?: Record<string, StatusStyle> } = {}): CardConfig {
  const styles = overrides.styles ?? {};
  return {
    listTabs: overrides.listTabs ?? [],
    listStore: overrides.listStore ?? {
      list: () => ({ has: () => false, add: () => {}, remove: () => {}, size: 0, ids: [] }),
      destroy: () => {},
    },
    statusStyles: overrides.statusStyles ?? {
      get: (key: string) => styles[key] ?? DEFAULT_STYLE,
      isCustomized: () => false,
      set: () => {},
      reset: () => {},
    },
    badgeColors: overrides.badgeColors ?? {
      get: () => '#dfe2e8',
      isCustomized: () => false,
      set: () => {},
      reset: () => {},
    },
  };
}

/** The `.info-value` text next to a given `.info-label` (e.g. "Price:"),
 * since several info rows can be present at once. */
function infoValueFor(container: HTMLElement, label: string): string | undefined {
  const labels = [...container.querySelectorAll('.info-label')];
  const row = labels.find((el) => el.textContent === label)?.closest('.info-row');
  return row?.querySelector('.info-value')?.textContent?.replace(/\s+/g, ' ').trim();
}

function renderCard(
  variant: Variant,
  props: Partial<React.ComponentProps<typeof VariantCard>> = {},
  config: CardConfig = makeConfig()
) {
  return render(
    <CardConfigProvider value={config}>
      <VariantCard variant={variant} isOwned={false} {...props} />
    </CardConfigProvider>
  );
}

describe('VariantCard', () => {
  it('makes the card title a link to sourceUrl when present', () => {
    renderCard(makeVariant({ sourceUrl: 'https://snapcomplete.com/x' }));
    const link = screen.getByRole('link', { name: 'Iron Man' });
    expect(link).toHaveAttribute('href', 'https://snapcomplete.com/x');
  });

  it('renders the card title as plain text when there is no sourceUrl', () => {
    renderCard(makeVariant({ sourceUrl: undefined }));
    expect(screen.getByText('Iron Man')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows an "Unknown" source badge when the variant has no source', () => {
    renderCard(makeVariant({ source: undefined }));
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('shows the real source when present', () => {
    renderCard(makeVariant({ source: 'General Pool' }));
    expect(screen.getByText('General Pool')).toBeInTheDocument();
  });

  it('strips the "(Inker)" role suffix from an artist name', () => {
    renderCard(makeVariant({ artName: 'Dan Hipp (Inker), Jane Doe' }));
    expect(screen.getByText('Dan Hipp')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByText(/Inker/)).not.toBeInTheDocument();
  });

  it('shows a confirmed gold price over the estimated tier price', () => {
    const { container } = renderCard(makeVariant({ rarity: 'SuperRare', goldCost: 900 }));
    expect(infoValueFor(container, 'Price:')).toBe('900 Gold');
  });

  it('falls back to the tier-estimated price when there is no confirmed cost', () => {
    const { container } = renderCard(makeVariant({ rarity: 'SuperRare' }));
    // toLocaleString()'s thousands separator depends on the runtime's ICU
    // data, so compare digits only rather than assuming "1,200".
    expect(infoValueFor(container, 'Price:')?.replace(/,/g, '')).toBe('1200 Gold');
  });

  it('applies the active border color when the matching status is enabled', () => {
    const config = makeConfig({
      styles: {
        owned: { ...DEFAULT_STYLE, border: { enabled: true, color: '#2f6b4c' } },
      },
    });
    const { container } = renderCard(makeVariant(), { isOwned: true, activeViewId: 'all' }, config);
    const card = container.querySelector('.variant-card') as HTMLElement;
    expect(card.style.borderColor).toBe('rgb(47, 107, 76)');
  });

  it('does not apply a border when the matching status is hidden on the active tab', () => {
    const config = makeConfig({
      styles: {
        owned: { ...DEFAULT_STYLE, border: { enabled: true, color: '#2f6b4c' }, hiddenOnTabs: ['owned'] },
      },
    });
    const { container } = renderCard(makeVariant(), { isOwned: true, activeViewId: 'owned' }, config);
    const card = container.querySelector('.variant-card') as HTMLElement;
    expect(card.style.borderColor).toBe('');
  });

  it('shows the indicator label (e.g. Unreleased) when its status is active and configured', () => {
    const config = makeConfig({
      styles: {
        unreleased: { ...DEFAULT_STYLE, indicator: { style: 'bar', color: '#e74c3c', opacity: 0.75 } },
      },
    });
    renderCard(makeVariant({ releaseStatus: 'unreleased' }), { activeViewId: 'unreleased' }, config);
    expect(screen.getByText('Unreleased')).toBeInTheDocument();
  });

  it('calls onFilterSource when the source badge is clicked', () => {
    const onFilterSource = vi.fn();
    renderCard(makeVariant({ source: 'General Pool' }), { onFilterSource });
    screen.getByText('General Pool').click();
    expect(onFilterSource).toHaveBeenCalledWith('General Pool');
  });
});
