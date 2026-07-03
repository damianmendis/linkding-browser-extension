/**
 * Validates and normalizes a Linkding server URL.
 * Returns normalized URL (trailing slash removed) or throws descriptive error.
 */
export function validateServerUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Server URL is required.');

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Server URL is not a valid URL. Example: https://links.example.com');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Server URL must use http or https.');
  }

  // In production, require HTTPS unless explicitly in dev mode
  if (url.protocol === 'http:' && !isDev()) {
    throw new Error('Server URL must use HTTPS for security.');
  }

  // Normalize: remove trailing slash
  return trimmed.replace(/\/$/, '');
}

export function validateApiToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) throw new Error('API token is required.');
  return trimmed;
}

export function isDev(): boolean {
  // Vite replaces import.meta.env.DEV at build time
  try {
    return (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;
  } catch {
    return false;
  }
}

/**
 * Sanitize a string for safe insertion into the DOM as text content.
 * Using textContent assignment is safe, but for cases where we set innerHTML
 * or dangerouslySetInnerHTML this ensures entities are escaped.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
