import type { JrgUrl } from './types.js';

/**
 * Parse a JRG URL into its components.
 *
 * Accepts:
 *   `jrg://host:port/path`
 *   `jrg://host/path`
 *   `/path` (relative, uses defaults)
 *   `path` (relative, uses defaults)
 */
export function parseJrgUrl(url: string, defaultHost = 'localhost', defaultPort = 7070): JrgUrl {
  // Handle jrg:// scheme
  if (url.startsWith('jrg://')) {
    const withoutScheme = url.slice(6);
    const slashIdx = withoutScheme.indexOf('/');
    const authority = slashIdx >= 0 ? withoutScheme.slice(0, slashIdx) : withoutScheme;
    const path = slashIdx >= 0 ? withoutScheme.slice(slashIdx) : '/';

    const colonIdx = authority.lastIndexOf(':');
    if (colonIdx >= 0) {
      // has explicit port
      return {
        host: authority.slice(0, colonIdx),
        port: Number(authority.slice(colonIdx + 1)) || defaultPort,
        path: path || '/',
        href: url,
      };
    }
    return {
      host: authority || defaultHost,
      port: defaultPort,
      path: path || '/',
      href: url,
    };
  }

  // Relative path — use defaults
  let path = url.startsWith('/') ? url : `/${url}`;
  return {
    host: defaultHost,
    port: defaultPort,
    path,
    href: url,
  };
}

/**
 * Validate a JRG URL string.
 */
export function isValidJrgUrl(url: string): boolean {
  if (url.startsWith('jrg://')) return true;
  if (url.startsWith('/')) return true;
  // Simple path
  return /^[a-zA-Z0-9_\-./]+$/.test(url);
}
