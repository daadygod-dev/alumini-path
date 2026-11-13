import { clearAuthToken, loadAuthToken } from '../auth/authStorage';

function resolveApiBase() {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE.replace(/\/+$/, '');
  }

  if (import.meta.env.DEV) {
    return '/api';
  }

  if (typeof window !== 'undefined' && window.location.pathname.includes('/dist')) {
    return '../api';
  }

  return './api';
}

export function resolveApiAssetUrl(relativePath = '') {
  if (!relativePath) {
    return '';
  }

  if (relativePath.startsWith('http://') || relativePath.startsWith('https://') || relativePath.startsWith('blob:')) {
    return relativePath;
  }

  const base = resolveApiBase();
  const cleaned = relativePath.replace(/^\/+/, '').replace(/^api\//, '');
  return `${base}/${cleaned}`;
}

export function buildApiUrl(route, query = {}) {
  const params = new URLSearchParams();
  params.set('route', route);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  return `${resolveApiBase()}/index.php?${params.toString()}`;
}

export async function apiRequest(route, options = {}) {
  const {
    method = 'GET',
    body = null,
    query = {},
    token = loadAuthToken(),
    skipAuthClear = false,
  } = options;

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let payload = undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== null && body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(buildApiUrl(route, query), {
    method,
    headers,
    body: payload,
  });

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok || !json || json.success === false) {
    if (response.status === 401 && !skipAuthClear) {
      clearAuthToken();
    }

    const message =
      (json && json.message) ||
      (response.status === 401
        ? 'Your session has expired. Please sign in again.'
        : 'Unable to reach the server. Please verify the API and database are running.');

    const error = new Error(message);
    error.status = response.status;
    error.fieldErrors = (json && json.errors) || {};
    throw error;
  }

  return json.data;
}

export async function fetchProtectedBlobUrl(relativePath) {
  if (!relativePath) {
    return '';
  }

  if (relativePath.startsWith('blob:') || relativePath.startsWith('data:')) {
    return relativePath;
  }

  const token = loadAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const url = resolveApiAssetUrl(relativePath);

  const response = await fetch(url, { headers });
  if (!response.ok) {
    return '';
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function downloadProtectedFile(relativePath, fallbackName = 'document') {
  const token = loadAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const url = relativePath.startsWith('index.php') || relativePath.includes('?route=')
    ? `${resolveApiBase()}/${relativePath}`
    : resolveApiAssetUrl(relativePath);

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error('Could not download the requested file.');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fallbackName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}
