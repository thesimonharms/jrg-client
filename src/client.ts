import type {
  ClientConfig,
  JrgResponse,
  JrgPage,
  Transport,
  TransportResult,
} from './types.js';
import { parseJrgUrl } from './url.js';
import { parseJrgResponse, parseJrgPage } from './protocol.js';
import { createHttpTransport } from './http-transport.js';
import { createTcpTransport } from './tcp-transport.js';
import { createFileTransport } from './file-transport.js';

/**
 * High-level JRG client.
 *
 * Supports HTTP gateway transport (browser + server), raw TCP transport
 * (Node/Bun/Deno), and local filesystem transport (server).
 *
 * @example
 * ```ts
 * // HTTP gateway (browser-friendly)
 * const client = new JrgClient({
 *   transport: { type: 'http', baseUrl: 'http://localhost:18080' }
 * });
 * const page = await client.fetchPage('welcome');
 * console.log(page.title, page.body);
 * ```
 */
export class JrgClient {
  private transport: Transport;

  constructor(config: ClientConfig) {
    switch (config.transport.type) {
      case 'http':
        this.transport = createHttpTransport(config.transport);
        break;
      case 'tcp':
        this.transport = createTcpTransport(config.transport);
        break;
      case 'file':
        this.transport = createFileTransport(config.transport);
        break;
      default:
        throw new Error(
          `Unknown transport type: ${(config.transport as any).type}. ` +
          'Supported: "http", "tcp", "file"'
        );
    }
  }

  /**
   * Fetch a page and return the raw JRG response.
   *
   * @param url - JRG URL or path (e.g. "jrg://wiki/welcome", "welcome", "/welcome")
   */
  async fetch(url: string): Promise<TransportResult> {
    const parsed = parseJrgUrl(url);
    return this.transport.fetch(parsed.href);
  }

  /**
   * Fetch and parse a JRG response.
   */
  async fetchResponse(url: string): Promise<JrgResponse> {
    const result = await this.fetch(url);

    // HTTP transport returns HTML, not raw JRG protocol.
    // Wrap it in a synthetic JRG response for API consistency.
    if (result.raw.startsWith('<!DOCTYPE') || result.raw.startsWith('<html')) {
      return {
        version: '0.1',
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: result.raw,
      };
    }

    return parseJrgResponse(result.raw);
  }

  /**
   * Fetch a page and parse it into a structured JrgPage.
   *
   * For HTTP transport, the page body is the raw HTML since the
   * gateway converts JRG→HTML. For TCP transport, the body is
   * the raw JRG content.
   */
  async fetchPage(url: string): Promise<JrgPage> {
    const response = await this.fetchResponse(url);

    // For HTTP transport, build a minimal page from the HTML.
    if (response.headers['content-type']?.includes('text/html')) {
      const titleMatch = response.body.match(/<title>([^<]*)<\/title>/i);
      return {
        response,
        title: titleMatch?.[1] ?? 'Jaringan Page',
        body: response.body,
        links: [],
        tags: [],
      };
    }

    return parseJrgPage(response);
  }

  /**
   * Fetch the raw HTML from an HTTP gateway (convenience for browser usage).
   * Throws if the client isn't using HTTP transport.
   */
  async fetchHtml(url: string): Promise<string> {
    if (this.transport.constructor.name === 'HttpTransport' || await this.isHttpTransport()) {
      const result = await this.fetch(url);
      return result.raw;
    }
    // For non-HTTP transports, fetch and return the page body directly
    const page = await this.fetchPage(url);
    return page.body;
  }

  private async isHttpTransport(): Promise<boolean> {
    // Best-effort heuristic: TCP transports return raw JRG protocol starting with "JRG/"
    const result = await this.fetch('');
    return !result.raw.startsWith('JRG/');
  }

  /**
   * List available pages (uses the wiki index).
   */
  async listPages(): Promise<{ slug: string; title: string }[]> {
    const page = await this.fetchPage('index');
    const links = page.links.filter(l => l.href.includes('://'));
    return links.map(l => ({
      slug: l.href.split('/').pop() ?? l.text,
      title: l.text,
    }));
  }
}
