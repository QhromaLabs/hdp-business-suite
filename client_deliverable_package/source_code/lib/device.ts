const STORAGE_KEY = 'client_device_id';

function randomId() {
  if (typeof window === 'undefined') return 'unknown';
  if (crypto?.randomUUID) return crypto.randomUUID();
  // Fallback: timestamp + random chunk
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getClientDeviceId() {
  if (typeof window === 'undefined') return 'unknown';
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const generated = randomId();
  localStorage.setItem(STORAGE_KEY, generated);
  return generated;
}
