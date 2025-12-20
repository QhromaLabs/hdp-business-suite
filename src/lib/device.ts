const STORAGE_KEY = 'client_device_id';

function buildRawFingerprint() {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent || 'na';
  const lang = navigator.language || 'na';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'na';
  const screenSize = window.screen ? `${window.screen.width}x${window.screen.height}` : 'na';
  return `${ua}|${lang}|${tz}|${screenSize}`;
}

function encodeFingerprint(raw: string) {
  try {
    return btoa(raw).replace(/=/g, '').slice(0, 32);
  } catch (e) {
    return raw;
  }
}

export function getClientDeviceId() {
  if (typeof window === 'undefined') return 'unknown';

  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const raw = buildRawFingerprint();
  const encoded = encodeFingerprint(raw);
  localStorage.setItem(STORAGE_KEY, encoded);
  return encoded;
}
