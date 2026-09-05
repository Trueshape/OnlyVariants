import { useEffect, useMemo, useState } from 'react';
import { Search, Heart } from 'lucide-react';
import type { Variant } from '../types/variant';
import type { TabDef } from '../hooks/useTabs';
import type { ListStore } from '../hooks/useListStore';
import type { UseStatusStyles } from '../hooks/useStatusStyles';
import type { UseBadgeColors } from '../hooks/useBadgeColors';
import { snapCompleteService } from '../services/snapCompleteService';
import VariantCard from './VariantCard';
import CardLightbox from './CardLightbox';
import '../styles/UnreleasedCards.css';

interface UnreleasedCardsProps {
  allVariants: Variant[];
  listTabs: TabDef[];
  listStore: ListStore;
  statusStyles: UseStatusStyles;
  badgeColors: UseBadgeColors;
  ownedIds: Set<string>;
}

// Stable empty array so the "no wishlist tab" case doesn't churn memo deps.
const EMPTY_IDS: string[] = [];

export default function UnreleasedCards({
  allVariants,
  listTabs,
  listStore,
  statusStyles,
  badgeColors,
  ownedIds,
}: UnreleasedCardsProps) {
  const wishlistKey = listTabs.find((t) => t.kind === 'wishlist')?.listKey;
  const wishlistIds = wishlistKey ? listStore.list(wishlistKey).ids : EMPTY_IDS;
  const [searchQuery, setSearchQuery] = useState('');
  const [lightbox, setLightbox] = useState<{ variants: Variant[]; index: number } | null>(null);
  // Persist the last chosen state across sessions. If nothing is stored yet
  // (or storage is unreadable), default to off.
  const [wishlistOnly, setWishlistOnly] = useState(() => {
    try {
      return localStorage.getItem('marvelSnapUnreleasedWishlistOnly') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        'marvelSnapUnreleasedWishlistOnly',
        wishlistOnly ? '1' : '0'
      );
    } catch {
      // ignore storage write failures (quota / privacy mode)
    }
  }, [wishlistOnly]);

  const unreleasedVariants = useMemo(() => {
    let variants = snapCompleteService.getUnreleasedVariants(allVariants);

    if (wishlistOnly) {
      const set = new Set(wishlistIds);
      variants = variants.filter((v) => set.has(v.id));
    }

    if (searchQuery) {
      variants = snapCompleteService.searchVariants(variants, searchQuery);
    }

    return variants;
  }, [allVariants, wishlistOnly, wishlistIds, searchQuery]);

  // Group consecutive variants by release month/year (one timeline marker
  // per month), then further split each month into per-day sub-groups (one
  // smaller label + card grid per day), instead of one flat grid per month.
  const monthGroups = useMemo(() => {
    const groups: { label: string; days: { label: string; variants: Variant[] }[] }[] = [];
    for (const variant of unreleasedVariants) {
      const date = new Date(variant.releaseDate || '');
      const hasDate = !isNaN(date.getTime());
      const monthLabel = hasDate
        ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Unknown date';
      const dayLabel = hasDate
        ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        : 'Unknown date';

      let monthGroup = groups[groups.length - 1];
      if (!monthGroup || monthGroup.label !== monthLabel) {
        monthGroup = { label: monthLabel, days: [] };
        groups.push(monthGroup);
      }

      let dayGroup = monthGroup.days[monthGroup.days.length - 1];
      if (!dayGroup || dayGroup.label !== dayLabel) {
        dayGroup = { label: dayLabel, variants: [] };
        monthGroup.days.push(dayGroup);
      }

      dayGroup.variants.push(variant);
    }
    return groups;
  }, [unreleasedVariants]);

  // id -> position in the flat unreleased list, for lightbox navigation.
  const flatIndex = useMemo(
    () => new Map(unreleasedVariants.map((v, i) => [v.id, i])),
    [unreleasedVariants]
  );

  return (
    <div className="unreleased-container">
      <div className="unreleased-controls">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search unreleased variants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <button
          className={`wishlist-only-toggle ${wishlistOnly ? 'active' : ''}`}
          onClick={() => setWishlistOnly((v) => !v)}
          title={wishlistOnly ? 'Show all unreleased variants' : 'Show only wishlisted variants'}
        >
          <Heart size={16} fill={wishlistOnly ? 'currentColor' : 'none'} />
          Wishlist only
        </button>
      </div>

      <div className="timeline">
        {monthGroups.length > 0 ? (
          monthGroups.map((group, groupIndex) => (
            <div key={group.label + groupIndex}>
              <div className="timeline-item">
                <div className="timeline-marker">
                  <div className="marker-dot"></div>
                </div>
                <h2 className="timeline-month-label">{group.label}</h2>
                {group.days.map((day, dayIndex) => (
                  <div key={day.label + dayIndex} className="timeline-day-group">
                    {day.label !== group.label && (
                      <h3 className="timeline-day-label">{day.label}</h3>
                    )}
                    <div className="timeline-cards-grid">
                      {day.variants.map((variant) => (
                        <VariantCard
                          key={variant.id}
                          variant={variant}
                          isOwned={ownedIds.has(variant.id)}
                          listTabs={listTabs}
                          listStore={listStore}
                          statusStyles={statusStyles}
                          badgeColors={badgeColors}
                          activeViewId="unreleased"
                          onZoom={() =>
                            setLightbox({
                              variants: unreleasedVariants,
                              index: flatIndex.get(variant.id) ?? 0,
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {groupIndex < monthGroups.length - 1 && <div className="timeline-divider"></div>}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Search size={48} />
            <p>No unreleased variants found</p>
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
