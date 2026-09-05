// Export / import of the user-curated state (lists, tabs, view settings).
// The owned-cards cache and the bulk variants cache are deliberately left
// out - those are regenerated locally, not personal choices.

const FIXED_KEYS = [
  'marvelSnapTabs',
  'marvelSnapWishlist',
  'marvelSnapCustomList',
  'marvelSnapFavorites',
  'marvelSnapDisliked',
  'marvelSnapListView',
  'marvelSnapCardColumns',
  'marvelSnapHideCardDetails',
  'marvelSnapUnreleasedWishlistOnly',
  'marvelSnapStatusStyles',
  'marvelSnapBadgeColors',
];

const isBackupKey = (k: string) => FIXED_KEYS.includes(k) || k.startsWith('marvelSnapList:');

interface BackupFile {
  app: 'OnlyVariants';
  kind: 'lists-backup';
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
}

export function exportLists(): void {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isBackupKey(key)) {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    }
  }

  const file: BackupFile = {
    app: 'OnlyVariants',
    kind: 'lists-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };

  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `onlyvariants-lists-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Replace all curated state with the contents of a backup file, then reload.
 * Throws if the file isn't a valid OnlyVariants backup.
 */
export async function importLists(file: File): Promise<void> {
  const parsed: unknown = JSON.parse(await file.text());
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as BackupFile).app !== 'OnlyVariants' ||
    typeof (parsed as BackupFile).data !== 'object'
  ) {
    throw new Error('Non sembra un backup di OnlyVariants.');
  }
  const data = (parsed as BackupFile).data;

  // wipe current curated keys
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && isBackupKey(key)) localStorage.removeItem(key);
  }
  // write the imported ones
  for (const [key, value] of Object.entries(data)) {
    if (isBackupKey(key) && typeof value === 'string') {
      localStorage.setItem(key, value);
    }
  }

  location.reload();
}
