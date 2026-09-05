// Name helpers for the variant scraper. Kept in their own module so they can
// be unit-tested without running the whole scrape.

/**
 * Convert PascalCase to kebab-case.
 * e.g. "RedHulkFracturedFrontier" -> "red-hulk-fractured-frontier"
 */
export function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Insert spaces before capital letters for display names.
 * e.g. "RedHulkFracturedFrontier" -> "Red Hulk Fractured Frontier"
 */
export function toDisplayName(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}
