/**
 * Validate and sanitize a `next` redirect parameter to prevent open redirect
 * attacks. Only same-origin paths are accepted; anything else falls back to
 * `defaultPath`.
 */
export function sanitizeNext(
  next: string | null | undefined,
  defaultPath = '/dashboard',
): string {
  if (!next) return defaultPath;
  // Reject protocol-relative and absolute URLs
  if (next.startsWith('//') || /^[a-z][a-z\d+\-.]*:/i.test(next) || next === '') {
    return defaultPath;
  }
  try {
    // Anchor to a fake origin so the URL parser can validate the path
    const url = new URL(next, 'http://__internal__');
    if (url.hostname !== '__internal__') return defaultPath;
    return url.pathname + (url.search || '') + (url.hash || '');
  } catch {
    return defaultPath;
  }
}
