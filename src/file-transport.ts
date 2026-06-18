import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Transport, TransportResult, FileTransportConfig } from './types.js';

/**
 * Local filesystem transport.
 *
 * Reads `.jrg` files directly from a local directory.
 * Only works in Node/Bun/Deno (server-side).
 * Perfect for testing or offline access.
 */
export function createFileTransport(config: FileTransportConfig): Transport {
  const root = config.root;

  return {
    async fetch(url: string): Promise<TransportResult> {
      // Parse slug from URL
      let slug = url;
      if (slug.startsWith('jrg://')) {
        slug = slug.slice(6).replace(/^[^/]+/, ''); // strip host
      }
      slug = slug.replace(/^\//, ''); // strip leading slash
      if (!slug || slug === '') {
        slug = 'welcome'; // default page
      }

      const filePath = join(root, `${slug}.jrg`);

      if (!existsSync(filePath)) {
        return {
          raw: `JRG/0.1 404 Not Found\nContent-Type: text/jrg; charset=utf-8\n\n# Not Found\n\nNo page found at \`${slug}\`.`,
        };
      }

      const body = readFileSync(filePath, 'utf-8');
      return {
        raw: `JRG/0.1 200 OK\nContent-Type: text/jrg; charset=utf-8\n\n${body}`,
      };
    },
  };
}
