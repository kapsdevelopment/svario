export function getLiveSurveyVoterKey(sessionId: string) {
  const storageKey = `svario-live-voter:${sessionId.toLowerCase()}`;
  const key = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved && /^[a-f0-9]{32}$/.test(saved)) {
      return saved;
    }
    localStorage.setItem(storageKey, key);
  } catch {
    // The current page can still accept votes when browser storage is unavailable.
  }
  return key;
}
