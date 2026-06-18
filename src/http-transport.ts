import type { Transport, TransportResult, HttpTransportConfig } from './types.js';

/**
 * HTTP gateway transport.
 *
 * Talks to a JRG→HTTP gateway running on a standard HTTP server.
 * Works in browsers, Node, Bun, and Deno — any environment with `fetch`.
 */
export function createHttpTransport(config: HttpTransportConfig): Transport {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const fetchImpl = config.fetch ?? globalThis.fetch;

  return {
    async fetch(url: string): Promise<TransportResult> {
      // Strip jrg:// scheme and convert to HTTP path
      let path = url;
      if (path.startsWith('jrg://')) {
        path = '/' + path.slice(6).replace(/^[^/]+/, ''); // strip host:port
      }
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      const httpUrl = `${baseUrl}${path}`;

      const res = await fetchImpl(httpUrl);
      const text = await res.text();

      // The gateway returns HTML, not raw JRG protocol.
      // Return the HTML as-is.
      return { raw: text };
    },
  };
}
