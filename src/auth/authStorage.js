export const ALUMNI_STORAGE_KEY = 'alumni-network-accounts';
export const JOBS_STORAGE_KEY = 'alumni-network-jobs';
export const AUTH_USER_STORAGE_KEY = 'alumni-auth-user';

export function loadStoredCollection(key, fallback) {
  const stored = localStorage.getItem(key);

  if (!stored) {
    return fallback;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return fallback;
  }
}

export function saveStoredCollection(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
