import { createContext } from 'react';
import type { TabDef } from '../hooks/useTabs';
import type { ListStore } from '../hooks/useListStore';
import type { UseStatusStyles } from '../hooks/useStatusStyles';
import type { UseBadgeColors } from '../hooks/useBadgeColors';

// The four pieces every VariantCard needs, unchanged, no matter which page
// rendered it (VariantsList or UnreleasedCards) - a Context instead of
// threading the same four props through both page components.
export interface CardConfig {
  listTabs: TabDef[];
  listStore: ListStore;
  statusStyles: UseStatusStyles;
  badgeColors: UseBadgeColors;
}

export const CardConfigContext = createContext<CardConfig | null>(null);
