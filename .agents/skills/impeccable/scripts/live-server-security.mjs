const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function isLoopbackUrl(value) {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isAllowedLocalOrigin(origin) {
  return !origin || origin === 'null' || isLoopbackUrl(origin);
}

export function isAllowedLiveScriptRequest(headers) {
  const fetchSite = String(headers['sec-fetch-site'] || '').toLowerCase();
  if (fetchSite === 'cross-site') return false;

  const referer = headers.referer;
  if (!referer) return true;
  if (referer.startsWith('file:')) return true;
  return isLoopbackUrl(referer);
}
