import { useState } from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import {
  BADGE_KEYS,
  BADGE_LABELS,
  RARITY_TIERS,
  RARITY_TIER_LABELS,
  PRICE_CURRENCIES,
  PRICE_CURRENCY_LABELS,
  type BadgeKey,
  type UseBadgeColors,
} from '../hooks/useBadgeColors';
import { badgeStyle } from '../utils/color';
import '../styles/BadgeColorSettings.css';

interface BadgeColorSettingsProps {
  badgeColors: UseBadgeColors;
}

const RARITY_KEYS: BadgeKey[] = RARITY_TIERS.map((t): BadgeKey => `rarity:${t}`);
const PRICE_KEYS: BadgeKey[] = PRICE_CURRENCIES.map((c): BadgeKey => `price:${c}`);
const GROUPED_KEYS = new Set([...RARITY_KEYS, ...PRICE_KEYS]);

// Everything not part of a group, in their original BADGE_KEYS order, split
// at the point each group's header row goes (right after 'source', right
// after 'vaultQuality') so Rarity/Price still land where their tiers used to.
const OTHER_KEYS = BADGE_KEYS.filter((k) => !GROUPED_KEYS.has(k));
const sourceIndex = OTHER_KEYS.indexOf('source');
const vaultQualityIndex = OTHER_KEYS.indexOf('vaultQuality');
const BEFORE_RARITY = OTHER_KEYS.slice(0, sourceIndex + 1);
const BETWEEN = OTHER_KEYS.slice(sourceIndex + 1, vaultQualityIndex + 1);
const AFTER_PRICE = OTHER_KEYS.slice(vaultQualityIndex + 1);

export default function BadgeColorSettings({ badgeColors }: BadgeColorSettingsProps) {
  return (
    <div className="badge-color-settings">
      <h2>Badge colors</h2>
      <p className="bcs-desc">
        Pick a color for each badge a card can show. Changes apply immediately and are saved on
        this device.
      </p>

      <div className="bcs-table">
        <div className="bcs-row bcs-row-head">
          <span>Badge</span>
          <span>Color</span>
          <span>Preview</span>
        </div>

        {BEFORE_RARITY.map((key) => (
          <BadgeColorRow key={key} badgeKey={key} badgeColors={badgeColors} />
        ))}

        <BadgeGroup
          groupLabel="Rarity"
          keys={RARITY_TIERS}
          keyFor={(t) => `rarity:${t}`}
          labelFor={(t) => RARITY_TIER_LABELS[t]}
          badgeColors={badgeColors}
        />

        {BETWEEN.map((key) => (
          <BadgeColorRow key={key} badgeKey={key} badgeColors={badgeColors} />
        ))}

        <BadgeGroup
          groupLabel="Price"
          keys={PRICE_CURRENCIES}
          keyFor={(c) => `price:${c}`}
          labelFor={(c) => PRICE_CURRENCY_LABELS[c]}
          badgeColors={badgeColors}
        />

        {AFTER_PRICE.map((key) => (
          <BadgeColorRow key={key} badgeKey={key} badgeColors={badgeColors} />
        ))}
      </div>
    </div>
  );
}

interface BadgeGroupProps<T extends string> {
  groupLabel: string;
  keys: T[];
  keyFor: (item: T) => BadgeKey;
  labelFor: (item: T) => string;
  badgeColors: UseBadgeColors;
}

// A collapsed single row standing in for several related badges (e.g. one
// per rarity tier, or per price currency) - a dot per item previews its
// current color, and clicking the row expands it into individual rows.
function BadgeGroup<T extends string>({ groupLabel, keys, keyFor, labelFor, badgeColors }: BadgeGroupProps<T>) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        type="button"
        className="bcs-row bcs-group-row"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="bcs-label bcs-group-label">
          {groupLabel}
          <span className="bcs-group-toggle">
            {expanded ? <Minus size={14} /> : <Plus size={14} />}
          </span>
        </span>
        <span />
        <span className="bcs-group-dots">
          {keys.map((item) => (
            <span
              key={item}
              className="bcs-group-dot"
              style={{ background: badgeColors.get(keyFor(item)) }}
              title={labelFor(item)}
            />
          ))}
        </span>
      </button>

      {expanded &&
        keys.map((item) => (
          <BadgeColorRow
            key={item}
            badgeKey={keyFor(item)}
            label={labelFor(item)}
            badgeColors={badgeColors}
            indented
          />
        ))}
    </>
  );
}

interface BadgeColorRowProps {
  badgeKey: BadgeKey;
  badgeColors: UseBadgeColors;
  /** Overrides the full BADGE_LABELS lookup - used inside a group, where the
      group header above already says "Rarity"/"Price". */
  label?: string;
  indented?: boolean;
}

function BadgeColorRow({ badgeKey, badgeColors, label: labelOverride, indented = false }: BadgeColorRowProps) {
  const color = badgeColors.get(badgeKey);
  const customized = badgeColors.isCustomized(badgeKey);
  const label = labelOverride ?? BADGE_LABELS[badgeKey];

  return (
    <div className={`bcs-row ${indented ? 'bcs-row-indented' : ''}`}>
      <span className="bcs-label">{label}</span>

      <input
        type="color"
        className="bcs-color-input"
        value={color}
        onChange={(e) => badgeColors.set(badgeKey, e.target.value)}
        aria-label={`${label} color`}
      />

      <div className="bcs-preview-cell">
        <span className="bcs-preview-chip" style={badgeStyle(color)}>
          {label}
        </span>
        <button
          type="button"
          className="bcs-reset-btn"
          onClick={() => badgeColors.reset(badgeKey)}
          disabled={!customized}
          title="Reset to default"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
