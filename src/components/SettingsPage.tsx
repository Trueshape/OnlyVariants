import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import type { TabDef } from '../hooks/useTabs';
import type { UseStatusStyles } from '../hooks/useStatusStyles';
import type { UseBadgeColors } from '../hooks/useBadgeColors';
import { exportLists, importLists } from '../utils/listBackup';
import CardStyleSettings from './CardStyleSettings';
import BadgeColorSettings from './BadgeColorSettings';
import '../styles/SettingsPage.css';

interface SettingsPageProps {
  allTabs: TabDef[];
  listTabs: TabDef[];
  statusStyles: UseStatusStyles;
  badgeColors: UseBadgeColors;
}

export default function SettingsPage({ allTabs, listTabs, statusStyles, badgeColors }: SettingsPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (!window.confirm('Sostituire liste, tab e impostazioni con quelle del file?')) return;
    try {
      await importLists(file);
    } catch (err) {
      window.alert(`Import non riuscito: ${err instanceof Error ? err.message : err}`);
    }
  };

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>Backup</h2>
        <p className="settings-section-desc">
          Save your wishlist, custom lists, tabs, and these settings to a file, so they can be
          restored on another machine or after clearing browser data. Doesn't include the card
          database or your owned-cards data - those come back on their own from the game save.
        </p>
        <div className="settings-backup-actions">
          <button type="button" className="settings-btn" onClick={exportLists}>
            <Download size={16} />
            Export to file
          </button>
          <button type="button" className="settings-btn" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
            Import from file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onPickFile}
          />
        </div>
      </section>

      <section className="settings-section">
        <CardStyleSettings allTabs={allTabs} listTabs={listTabs} statusStyles={statusStyles} />
      </section>

      <section className="settings-section">
        <BadgeColorSettings badgeColors={badgeColors} />
      </section>
    </div>
  );
}
