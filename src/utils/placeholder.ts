// Inline card-shaped placeholder for missing or broken variant art.
// (The old https://via.placeholder.com host is dead, so this is a data URI
// with the same ~3:3.3 aspect ratio - no network request, never errors.)
export const CARD_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 331">' +
      '<rect width="300" height="331" fill="#1c1f26"/>' +
      '<g fill="#3a3f4b">' +
      '<circle cx="120" cy="140" r="20"/>' +
      '<path d="M70 232l52-60 34 40 30-32 44 52z"/>' +
      '</g>' +
      '</svg>'
  );
