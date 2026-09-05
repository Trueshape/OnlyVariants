import { useState } from 'react';
import { User, Palette, Sparkles, Package, Coins } from 'lucide-react';
import type { Variant } from '../types/variant';
import type { TabDef } from '../hooks/useTabs';
import type { ListStore } from '../hooks/useListStore';
import type { UseStatusStyles } from '../hooks/useStatusStyles';
import type { UseBadgeColors, BadgeKey } from '../hooks/useBadgeColors';
import CardContextMenu, { type CardContextMenuItem } from './CardContextMenu';
import { CARD_PLACEHOLDER } from '../utils/placeholder';
import { hexToRgba, badgeStyle } from '../utils/color';
import { getVariantPrice } from '../utils/tierPrices';
import '../styles/VariantCard.css';

interface VariantCardProps {
  variant: Variant;
  isOwned: boolean;
  // Every list-bearing tab (wishlist + all list tabs), in tab-bar order. The
  // card reads/toggles membership through listStore.
  listTabs: TabDef[];
  listStore: ListStore;
  // Per-status (owned / unowned / unreleased / each list) border and
  // ribbon-or-bar indicator, editable from the Card styles settings page.
  statusStyles: UseStatusStyles;
  // Per-badge (Source, Rarity, Artist, Theme, Vault Quality, Price, Bundle)
  // color, editable from the Badge colors settings page.
  badgeColors: UseBadgeColors;
  // Click the card image to open the full-size lightbox.
  onZoom?: () => void;
  // Id of the tab currently being viewed (or a stand-in id for a page with
  // no tab, e.g. the Unreleased timeline). A status whose hiddenOnTabs
  // (Card styles settings) includes this id shows neither its border nor
  // its indicator here - e.g. "Owned" is hidden by default while viewing
  // the Owned tab, since every card there already matches it.
  activeViewId?: string;
  // Optional: when provided, the matching badge becomes clickable and acts
  // as a shortcut to filter the list by that value (used on the main list
  // page; omitted where there's no filter bar, e.g. the unreleased timeline).
  onFilterRarity?: (rarity: string) => void;
  onFilterSource?: (source: string) => void;
  onFilterArtist?: (artist: string) => void;
  onFilterTheme?: (theme: string) => void;
  onFilterVaultQuality?: (quality: string) => void;
}


export default function VariantCard({
  variant,
  isOwned,
  listTabs,
  listStore,
  statusStyles,
  badgeColors,
  onZoom,
  activeViewId,
  onFilterRarity,
  onFilterSource,
  onFilterArtist,
  onFilterTheme,
  onFilterVaultQuality,
}: VariantCardProps) {
  const id = variant.id;

  const inList = (tab: TabDef) => !!tab.listKey && listStore.list(tab.listKey).has(id);

  // 'unknown' = variant datamined/leaked but with no confirmed release date:
  // just as much "not released" as the dated ones, we just don't know when.
  const isUnreleased = variant.releaseStatus === 'unreleased' || variant.releaseStatus === 'unknown';

  const price = getVariantPrice(variant);

  const isHiddenHere = (key: string) =>
    !!activeViewId && statusStyles.get(key).hiddenOnTabs.includes(activeViewId);

  // At most one indicator (ribbon or bar) shows at a time. List tabs are
  // checked first, in tab-bar order (the user's own drag-and-drop ordering
  // already expresses their priority), then "unreleased"; the first one
  // that's both active for this card and configured to something other than
  // "none" wins. A status hidden on the currently-viewed tab never becomes a
  // candidate at all, so a differently-configured status further down the
  // list can still show.
  const indicatorCandidates = [
    ...listTabs.map((tab) => ({ key: tab.id, label: tab.name, active: inList(tab) && !isHiddenHere(tab.id) })),
    { key: 'unreleased', label: 'Unreleased', active: isUnreleased && !isHiddenHere('unreleased') },
  ];
  const activeIndicator = indicatorCandidates
    .filter((c) => c.active)
    .map((c) => ({ ...c, config: statusStyles.get(c.key).indicator }))
    .find((c) => c.config.style !== 'none');

  // Same one-at-a-time rule for the card border, but with owned/unowned as
  // the fallback after every list: a card that also matches an enabled list
  // border (e.g. Wishlist) shows that instead of the generic owned/unowned
  // color, since list membership is the more specific signal.
  const borderCandidates = [
    ...listTabs.map((tab) => ({ key: tab.id, active: inList(tab) && !isHiddenHere(tab.id) })),
    { key: 'owned', active: isOwned && !isHiddenHere('owned') },
    { key: 'unowned', active: !isOwned && !isHiddenHere('unowned') },
  ];
  const activeBorder = borderCandidates
    .filter((c) => c.active)
    .map((c) => ({ ...c, config: statusStyles.get(c.key).border }))
    .find((c) => c.config.enabled);

  // ---------- Right-click / long-press context menu ----------
  // Every list add/remove goes through this one menu. `contextmenu` also
  // fires on touch long-press, so no separate touch handler is needed.
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };
  const closeMenu = () => setMenu(null);

  const iconFor = (tab: TabDef): CardContextMenuItem['icon'] =>
    tab.kind === 'wishlist' ? 'wishlist' : tab.role === 'favorites' ? 'favorites' : tab.role === 'disliked' ? 'disliked' : 'list';

  const menuItems: CardContextMenuItem[] = listTabs
    .filter((tab) => !!tab.listKey)
    .map((tab) => {
      const list = listStore.list(tab.listKey as string);
      const checked = list.has(id);
      return {
        key: tab.id,
        label: tab.name,
        icon: iconFor(tab),
        checked,
        // Owned cards can't be wishlisted - but if one already is (added
        // before being obtained), still allow removing it.
        disabled: tab.kind === 'wishlist' && isOwned && !checked,
        onSelect: () => (checked ? list.remove(id) : list.add(id)),
      };
    });
  if (variant.sourceUrl) {
    menuItems.push({
      key: 'external',
      label: 'Open on SnapComplete',
      icon: 'external',
      closeOnSelect: true,
      onSelect: () => window.open(variant.sourceUrl, '_blank', 'noopener,noreferrer'),
    });
  }
  // "(Inker)" role suffixes aren't shown, same as "(Colorist)" already
  // isn't (per product decision) - just the plain name.
  const artistNames = variant.artName
    ? variant.artName
        .split(',')
        .map((n) => n.trim().replace(/\s*\(inker\)\s*$/i, ''))
        .filter(Boolean)
    : [];

  return (
    <div
      className={`variant-card ${isUnreleased ? 'unreleased' : ''}`}
      style={activeBorder ? { borderColor: activeBorder.config.color } : undefined}
      onContextMenu={openMenu}
    >
      <div
        className={`card-hero ${onZoom ? 'card-hero-zoomable' : ''}`}
        onClick={onZoom}
        role={onZoom ? 'button' : undefined}
        title={onZoom ? 'Click to enlarge' : undefined}
      >
        <img
          src={variant.imageUrl || CARD_PLACEHOLDER}
          alt={`${variant.cardName} - ${variant.variantName}`}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (img.src !== CARD_PLACEHOLDER) img.src = CARD_PLACEHOLDER;
          }}
        />

        {activeIndicator && (
          <div
            className={activeIndicator.config.style === 'ribbon' ? 'card-hero-ribbon' : 'card-hero-status-bar'}
            style={{ background: hexToRgba(activeIndicator.config.color, activeIndicator.config.opacity) }}
            title={activeIndicator.label}
          >
            <span>{activeIndicator.label}</span>
          </div>
        )}
      </div>

      <div className="card-body">
        <h3 className="card-title">
          {variant.sourceUrl ? (
            <a
              href={variant.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open on SnapComplete"
            >
              {variant.cardName}
            </a>
          ) : (
            variant.cardName
          )}
        </h3>

        <div className="chip-row">
          <span
            className={`chip chip-source ${onFilterSource ? 'chip-clickable' : ''}`}
            style={badgeStyle(badgeColors.get('source'))}
            onClick={onFilterSource ? () => onFilterSource(variant.source || 'Unknown') : undefined}
            role={onFilterSource ? 'button' : undefined}
            title={onFilterSource ? `Filter by source: ${variant.source || 'Unknown'}` : undefined}
          >
            {variant.source || 'Unknown'}
          </span>
          {variant.rarity && variant.rarity !== 'Unknown' && (
            <span
              className={`chip chip-rarity ${onFilterRarity ? 'chip-clickable' : ''}`}
              style={badgeStyle(badgeColors.get(`rarity:${variant.rarity}` as BadgeKey))}
              onClick={onFilterRarity ? () => onFilterRarity(variant.rarity!) : undefined}
              role={onFilterRarity ? 'button' : undefined}
              title={onFilterRarity ? `Filter by rarity: ${variant.rarity}` : undefined}
            >
              {variant.rarity}
            </span>
          )}
        </div>

        <div className="info-rows">
          {artistNames.length > 0 && (
            <div className="info-row">
              <User size={13} />
              <span className="info-label">Artist:</span>
              <span className="info-value-group">
                {artistNames.map((name) => (
                  <span
                    key={name}
                    className={`info-value ${onFilterArtist ? 'info-value-clickable' : ''}`}
                    style={badgeStyle(badgeColors.get('artist'), 0.06, 0.1)}
                    onClick={onFilterArtist ? () => onFilterArtist(name) : undefined}
                    role={onFilterArtist ? 'button' : undefined}
                    title={onFilterArtist ? `Filter by artist: ${name}` : undefined}
                  >
                    {name}
                  </span>
                ))}
              </span>
            </div>
          )}
          {variant.variantName && variant.variantName !== 'Unknown Variant' && (
            <div className="info-row">
              <Palette size={13} />
              <span className="info-label">Theme:</span>
              <span
                className={`info-value ${onFilterTheme ? 'info-value-clickable' : ''}`}
                style={badgeStyle(badgeColors.get('theme'), 0.06, 0.1)}
                onClick={onFilterTheme ? () => onFilterTheme(variant.variantName) : undefined}
                role={onFilterTheme ? 'button' : undefined}
                title={onFilterTheme ? `Filter by theme: ${variant.variantName}` : undefined}
              >
                {variant.variantName}
              </span>
            </div>
          )}
          {variant.vaultQuality && (
            <div className="info-row">
              <Sparkles size={13} />
              <span className="info-label">Vault Quality:</span>
              <span
                className={`info-value info-value-vault ${onFilterVaultQuality ? 'info-value-clickable' : ''}`}
                style={badgeStyle(badgeColors.get('vaultQuality'), 0.2, 0.45)}
                onClick={onFilterVaultQuality ? () => onFilterVaultQuality(variant.vaultQuality!) : undefined}
                role={onFilterVaultQuality ? 'button' : undefined}
                title={onFilterVaultQuality ? `Filter by Vault quality: ${variant.vaultQuality}` : undefined}
              >
                {variant.vaultQuality}
              </span>
            </div>
          )}
          {price && (
            <div className="info-row" title={price.estimated ? 'Estimated from its rarity/vault tier - not a confirmed price from your account' : undefined}>
              <Coins size={13} />
              <span className="info-label">Price:</span>
              <span className="info-value" style={badgeStyle(badgeColors.get(`price:${price.currency}`), 0.06, 0.1)}>
                {price.amount.toLocaleString()} {price.currency === 'gold' ? 'Gold' : 'Tokens'}
              </span>
            </div>
          )}
          {variant.bundleName && (
            <div className="info-row">
              <Package size={13} />
              <span className="info-label">Bundle:</span>
              <span className="info-value" style={badgeStyle(badgeColors.get('bundle'), 0.06, 0.1)}>
                {variant.bundleName}
              </span>
            </div>
          )}
        </div>
      </div>

      {menu && (
        <CardContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={closeMenu} />
      )}
    </div>
  );
}
