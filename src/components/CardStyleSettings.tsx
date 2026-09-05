import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import type { TabDef } from '../hooks/useTabs';
import type { IndicatorStyle, StatusStyle, UseStatusStyles } from '../hooks/useStatusStyles';
import { hexToRgba } from '../utils/color';
import '../styles/CardStyleSettings.css';

interface CardStyleSettingsProps {
  /** Every tab (view + list), for the "hide on" checklist. */
  allTabs: TabDef[];
  listTabs: TabDef[];
  statusStyles: UseStatusStyles;
}

export default function CardStyleSettings({ allTabs, listTabs, statusStyles }: CardStyleSettingsProps) {
  const rows = useMemo(
    () => [
      { key: 'owned', label: 'Owned' },
      { key: 'unowned', label: 'Unowned' },
      { key: 'unreleased', label: 'Unreleased' },
      ...listTabs.map((t) => ({ key: t.id, label: t.name })),
    ],
    [listTabs]
  );

  return (
    <div className="card-style-settings">
      <div className="css-header">
        <h2>Card styles</h2>
        <p>
          Choose how each status marks a card: a border color, and/or a ribbon or bar with its
          own color and transparency. Nothing is on by default - turn on what you want here. A
          card matching more than one status shows just one border and one indicator - list-based
          ones take priority over Owned/Unowned. "Hide on" lets you suppress a status while
          browsing specific tabs (e.g. hide Owned's border while viewing the Owned tab, since
          every card there already matches it). Changes apply immediately and are saved on this
          device.
        </p>
      </div>

      <div className="css-table">
        <div className="css-row css-row-head">
          <span>Status</span>
          <span>Border</span>
          <span>Indicator</span>
          <span>Hide on</span>
          <span>Preview</span>
        </div>
        {rows.map((row) => (
          <StatusRowEditor
            key={row.key}
            rowKey={row.key}
            label={row.label}
            allTabs={allTabs}
            statusStyles={statusStyles}
          />
        ))}
      </div>
    </div>
  );
}

interface StatusRowEditorProps {
  rowKey: string;
  label: string;
  allTabs: TabDef[];
  statusStyles: UseStatusStyles;
}

function StatusRowEditor({ rowKey, label, allTabs, statusStyles }: StatusRowEditorProps) {
  const style = statusStyles.get(rowKey);
  const customized = statusStyles.isCustomized(rowKey);

  const update = (patch: Partial<StatusStyle>) => {
    statusStyles.set(rowKey, { ...style, ...patch });
  };

  return (
    <div className="css-row">
      <span className="css-label">{label}</span>

      <div className="css-cell css-border-cell">
        <label className="css-checkbox">
          <input
            type="checkbox"
            checked={style.border.enabled}
            onChange={(e) => update({ border: { ...style.border, enabled: e.target.checked } })}
          />
          Border
        </label>
        <input
          type="color"
          className="css-color-input"
          value={style.border.color}
          disabled={!style.border.enabled}
          onChange={(e) => update({ border: { ...style.border, color: e.target.value } })}
          aria-label={`${label} border color`}
        />
      </div>

      <div className="css-cell css-indicator-cell">
        <select
          className="css-style-select"
          value={style.indicator.style}
          onChange={(e) =>
            update({ indicator: { ...style.indicator, style: e.target.value as IndicatorStyle } })
          }
          aria-label={`${label} indicator style`}
        >
          <option value="none">None</option>
          <option value="ribbon">Ribbon</option>
          <option value="bar">Bar</option>
        </select>
        <input
          type="color"
          className="css-color-input"
          value={style.indicator.color}
          disabled={style.indicator.style === 'none'}
          onChange={(e) => update({ indicator: { ...style.indicator, color: e.target.value } })}
          aria-label={`${label} indicator color`}
        />
        <input
          type="range"
          className="css-opacity-slider"
          min={0}
          max={1}
          step={0.05}
          value={style.indicator.opacity}
          disabled={style.indicator.style === 'none'}
          onChange={(e) => update({ indicator: { ...style.indicator, opacity: Number(e.target.value) } })}
          aria-label={`${label} indicator opacity`}
        />
        <span className="css-opacity-value">{Math.round(style.indicator.opacity * 100)}%</span>
      </div>

      <div className="css-cell css-hide-cell">
        <details className="css-hide-details">
          <summary>Hidden on ({style.hiddenOnTabs.length})</summary>
          <div className="css-hide-options">
            {allTabs.map((tab) => (
              <label key={tab.id} className="css-hide-option">
                <input
                  type="checkbox"
                  checked={style.hiddenOnTabs.includes(tab.id)}
                  onChange={(e) =>
                    update({
                      hiddenOnTabs: e.target.checked
                        ? [...style.hiddenOnTabs, tab.id]
                        : style.hiddenOnTabs.filter((id) => id !== tab.id),
                    })
                  }
                />
                {tab.name}
              </label>
            ))}
          </div>
        </details>
      </div>

      <div className="css-cell css-preview-cell">
        <div className="css-preview-swatch" style={{ borderColor: style.border.enabled ? style.border.color : '#2a2e37' }}>
          {style.indicator.style !== 'none' && (
            <div
              className={style.indicator.style === 'ribbon' ? 'css-preview-ribbon' : 'css-preview-bar'}
              style={{ background: hexToRgba(style.indicator.color, style.indicator.opacity) }}
            />
          )}
        </div>
        <button
          type="button"
          className="css-reset-btn"
          onClick={() => statusStyles.reset(rowKey)}
          disabled={!customized}
          title="Reset to default"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
