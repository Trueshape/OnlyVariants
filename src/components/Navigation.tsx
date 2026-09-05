import { Link, useLocation } from 'react-router-dom';
import { Heart, Clock, EyeOff, Eye, Settings } from 'lucide-react';
import type { UseBadgeColors } from '../hooks/useBadgeColors';
import '../styles/Navigation.css';

interface NavigationProps {
  stats?: {
    wishlist: number;
    missing: number;
    owned: number;
    wishlistCost: { gold: number; token: number };
  };
  hideCardDetails: boolean;
  onToggleHideCardDetails: () => void;
  /** Jump to a specific tab on the main list page (used by the "VARIANTS" logo -> Wishlist). */
  onRequestTab: (tabId: string) => void;
  badgeColors: UseBadgeColors;
}

export default function Navigation({ stats, hideCardDetails, onToggleHideCardDetails, onRequestTab, badgeColors }: NavigationProps) {
  const location = useLocation();

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-title">
          <button
            type="button"
            className={`logo-badge ${hideCardDetails ? '' : 'logo-badge-hidden'}`}
            onClick={onToggleHideCardDetails}
            title={hideCardDetails ? 'Show card details' : 'Hide card details'}
          >
            ONLY
          </button>
          <Link
            to="/"
            className="logo-text"
            onClick={() => onRequestTab('wishlist')}
            title="Back to Wishlist"
          >
            VARIANTS
          </Link>
          <span className="logo-dot" />
        </div>

        {stats && (
          <div className="nav-stats">
            <span className="nav-stat nav-stat-wishlist">Wishlist: <strong>{stats.wishlist}</strong></span>
            <span className="nav-stat nav-stat-missing">Missing: <strong>{stats.missing}</strong></span>
            <span className="nav-stat nav-stat-owned">Owned: <strong>{stats.owned}</strong></span>
            {(stats.wishlistCost.gold > 0 || stats.wishlistCost.token > 0) && (
              <>
                <span className="nav-stat-separator" aria-hidden="true" />
                <span
                  className="nav-stat nav-stat-cost"
                  title="Total gold/tokens to buy every wishlisted card (confirmed price where known, otherwise its rarity/vault tier's price)"
                >
                  Wishlist:{' '}
                  {stats.wishlistCost.gold > 0 && (
                    <strong style={{ color: badgeColors.get('price:gold') }}>
                      {stats.wishlistCost.gold.toLocaleString()} Gold
                    </strong>
                  )}
                  {stats.wishlistCost.gold > 0 && stats.wishlistCost.token > 0 && ' + '}
                  {stats.wishlistCost.token > 0 && (
                    <strong style={{ color: badgeColors.get('price:token') }}>
                      {stats.wishlistCost.token.toLocaleString()} Tokens
                    </strong>
                  )}
                </span>
              </>
            )}
          </div>
        )}

        <ul className="nav-links">
          <li>
            <button
              className="nav-link nav-toggle-btn"
              onClick={onToggleHideCardDetails}
              title={hideCardDetails ? 'Show card details' : 'Hide card details'}
            >
              {hideCardDetails ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </li>
          <li>
            <Link
              to="/settings"
              className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
              title="Settings"
            >
              <Settings size={18} />
            </Link>
          </li>
          <li>
            <Link
              to="/unreleased"
              className={`nav-link ${location.pathname === '/unreleased' ? 'active' : ''}`}
            >
              <Clock size={18} />
              <span>Unreleased</span>
            </Link>
          </li>
          <li>
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              <Heart size={18} />
              <span>All Cards</span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
