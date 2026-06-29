// Guard for the per-instance loopback HTTP server.
//
// The canvas server binds to 127.0.0.1 only, but a malicious web page in the
// user's browser could still try to reach it (CSRF) or use DNS rebinding to
// make its own domain resolve to loopback. We defend by requiring:
//   - the Host header to be the literal loopback origin (defeats DNS rebinding,
//     which sends the attacker's hostname in Host), and
//   - any Origin/Referer present to match our own origin (defeats CSRF from a
//     cross-origin page, which the browser tags with its real Origin).
//
// Requests with no Origin and no Referer (e.g. a direct same-origin fetch) are
// allowed as long as the Host header is the expected loopback origin.
export function isTrustedLoopbackRequest({ host, origin, referer } = {}, port) {
  const allowedOrigin = `http://127.0.0.1:${port}`;
  if (host !== `127.0.0.1:${port}`) return false;
  if (origin && origin !== allowedOrigin) return false;
  if (referer && referer !== allowedOrigin && !referer.startsWith(`${allowedOrigin}/`)) return false;
  return true;
}
