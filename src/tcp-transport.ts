import type { Transport, TransportResult, TcpTransportConfig } from './types.js';

/**
 * Raw TCP transport for JRG protocol.
 *
 * Connects directly to a JRG server over TCP and speaks the native
 * JRG protocol. Only works in Node.js, Bun, and Deno 2+ (environments
 * with `node:net` support).
 *
 * The request format is:
 * ```
 * GET /path JRG/0.1
 *
 * ```
 */
export function createTcpTransport(config: TcpTransportConfig): Transport {
  const host = config.host;
  const port = config.port ?? 7070;
  const timeout = config.timeout ?? 5000;

  return {
    async fetch(url: string): Promise<TransportResult> {
      // Parse path from URL
      let path = url;
      if (path.startsWith('jrg://')) {
        path = '/' + path.slice(6).replace(/^[^/]+/, '');
      }
      if (!path.startsWith('/')) {
        path = '/' + path;
      }

      // Dynamic import — works in Node/Bun/Deno, throws at bundle time in browser
      const net = await import('node:net');

      return new Promise<TransportResult>((resolve, reject) => {
        const socket = new net.Socket();
        let timedOut = false;
        let data = '';

        const timer = setTimeout(() => {
          timedOut = true;
          socket.destroy();
          reject(new Error(`TCP connection to ${host}:${port} timed out after ${timeout}ms`));
        }, timeout);

        socket.connect(port, host, () => {
          // Send JRG request: GET /path JRG/0.1 with Host header
          socket.write(`GET ${path} JRG/0.1\r\nHost: ${host}\r\n\r\n`);
        });

        socket.on('data', (chunk: Buffer) => {
          data += chunk.toString('utf-8');
        });

        socket.on('end', () => {
          clearTimeout(timer);
          if (!timedOut) {
            resolve({ raw: data });
          }
        });

        socket.on('error', (err: Error) => {
          clearTimeout(timer);
          if (!timedOut) {
            reject(new Error(`TCP error for ${host}:${port}: ${err.message}`));
          }
        });

        socket.on('close', () => {
          clearTimeout(timer);
        });
      });
    },
  };
}
