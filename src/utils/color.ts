// #rgb / #rrggbb -> rgba(...) string at the given opacity (0-1). Malformed
// input falls back to opaque black rather than throwing.
export function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace('#', '').trim();
  const expanded =
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean;
  const value = parseInt(expanded, 16);
  if (expanded.length !== 6 || Number.isNaN(value)) return `rgba(0, 0, 0, ${opacity})`;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// A badge/chip's background+border+text, all derived from one base color -
// picking one color re-themes the whole pill consistently. bgAlpha/
// borderAlpha default to the ratio the card's badges have always used.
export function badgeStyle(color: string, bgAlpha = 0.18, borderAlpha = 0.4) {
  return {
    background: hexToRgba(color, bgAlpha),
    borderColor: hexToRgba(color, borderAlpha),
    color,
  };
}
