import { useCallback, useMemo, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import VariantsList from './components/VariantsList';
import UnreleasedCards from './components/UnreleasedCards';
import SettingsPage from './components/SettingsPage';
import { useTabs } from './hooks/useTabs';
import { useListStore } from './hooks/useListStore';
import { useStatusStyles } from './hooks/useStatusStyles';
import { useBadgeColors } from './hooks/useBadgeColors';
import { useCardColumns } from './hooks/useCardColumns';
import { useVariantsData } from './hooks/useVariantsData';
import { CardConfigProvider } from './contexts/CardConfigContext';
import { getVariantPrice } from './utils/tierPrices';
import './App.css';

function App() {
  const { allVariants, ownedIds, acquisitionDates, loading, loadError, retry } = useVariantsData();

  // Tab config (order, names, which lists exist) + the id-lists themselves.
  const tabs = useTabs();
  const listStore = useListStore(tabs.listKeys);
  const statusStyles = useStatusStyles();
  const badgeColors = useBadgeColors();
  // Lifted out of VariantsList so the nav logo ("VARIANTS" -> Wishlist) can
  // set it directly, regardless of which route is currently mounted.
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('marvelSnapListView') || '{}');
      return saved.activeTabId ?? 'wishlist';
    } catch {
      return 'wishlist';
    }
  });

  // Delete a tab and, if it was a list, drop its stored data too.
  const deleteTab = useCallback(
    (id: string) => {
      const tab = tabs.tabs.find((t) => t.id === id);
      tabs.remove(id);
      if (tab?.listKey) listStore.destroy(tab.listKey);
    },
    [tabs, listStore]
  );

  const wishlistKey = useMemo(
    () => tabs.tabs.find((t) => t.kind === 'wishlist')?.listKey,
    [tabs.tabs]
  );
  const wishlistCount = wishlistKey ? listStore.list(wishlistKey).size : 0;
  const wishlistIds = wishlistKey ? listStore.list(wishlistKey).ids : undefined;
  const listTabs = useMemo(() => tabs.tabs.filter((t) => t.kind !== 'view'), [tabs.tabs]);

  // Owned and wishlisted are mutually exclusive: adding an owned card to the
  // wishlist is already blocked (VariantCard's context menu), but a card can
  // still cross over on its own - it was wishlisted before you got it, and a
  // fresh collection import (aggiorna-dati.bat) now marks it owned. Drop it
  // from the wishlist the moment that happens.
  useEffect(() => {
    if (!wishlistKey || !wishlistIds) return;
    const wishlist = listStore.list(wishlistKey);
    for (const id of wishlistIds) {
      if (ownedIds.has(id)) wishlist.remove(id);
    }
  }, [ownedIds, wishlistKey, wishlistIds, listStore]);

  // Total gold/tokens to buy every wishlisted card - confirmed price where
  // known, otherwise its rarity/vault tier's fixed price; cards with
  // neither (unreleased, or a real-money-only source) don't contribute.
  const wishlistCost = useMemo(() => {
    if (!wishlistIds || wishlistIds.length === 0) return { gold: 0, token: 0 };
    const set = new Set(wishlistIds);
    let gold = 0;
    let token = 0;
    for (const variant of allVariants) {
      if (!set.has(variant.id)) continue;
      const price = getVariantPrice(variant);
      if (!price) continue;
      if (price.currency === 'gold') gold += price.amount;
      else token += price.amount;
    }
    return { gold, token };
  }, [allVariants, wishlistIds]);

  // Global toggle (Navigation) to hide the lower part of every card (name,
  // badge, info) across all pages, not just a single card.
  const [hideCardDetails, setHideCardDetails] = useState(() => {
    return localStorage.getItem('marvelSnapHideCardDetails') === '1';
  });
  // Held here (not in a page component) so the grid column count stays
  // applied on both routes; only the All Cards page renders its control.
  const cardColumns = useCardColumns(hideCardDetails);

  useEffect(() => {
    localStorage.setItem('marvelSnapHideCardDetails', hideCardDetails ? '1' : '0');
  }, [hideCardDetails]);

  const missingCount = allVariants.length - ownedIds.size;

  return (
    <Router>
      <div className={`app ${hideCardDetails ? 'hide-card-details' : ''}`}>
        <Navigation
          stats={
            loading || loadError
              ? undefined
              : {
                  wishlist: wishlistCount,
                  missing: missingCount,
                  owned: ownedIds.size,
                  wishlistCost,
                }
          }
          hideCardDetails={hideCardDetails}
          onToggleHideCardDetails={() => setHideCardDetails((v) => !v)}
          onRequestTab={setActiveTabId}
          badgeColors={badgeColors}
        />
        {loadError ? (
          <div className="loading load-error">
            <p>Non è stato possibile caricare i dati delle carte.</p>
            <p className="load-error-hint">
              Controlla la connessione, oppure lancia <code>aggiorna-dati.bat</code>.
            </p>
            <button onClick={retry}>Riprova</button>
          </div>
        ) : loading ? (
          <div className="loading">Loading cards...</div>
        ) : (
          <CardConfigProvider value={{ listTabs, listStore, statusStyles, badgeColors }}>
            <Routes>
              <Route
                path="/"
                element={
                  <VariantsList
                    allVariants={allVariants}
                    ownedIds={ownedIds}
                    acquisitionDates={acquisitionDates}
                    tabs={tabs}
                    onDeleteTab={deleteTab}
                    cardColumns={cardColumns}
                    activeTabId={activeTabId}
                    setActiveTabId={setActiveTabId}
                  />
                }
              />
              <Route
                path="/unreleased"
                element={<UnreleasedCards allVariants={allVariants} ownedIds={ownedIds} />}
              />
              <Route
                path="/settings"
                element={
                  <SettingsPage
                    allTabs={tabs.tabs}
                    listTabs={listTabs}
                    statusStyles={statusStyles}
                    badgeColors={badgeColors}
                  />
                }
              />
            </Routes>
          </CardConfigProvider>
        )}
      </div>
    </Router>
  );
}

export default App;
