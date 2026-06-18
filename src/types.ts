/** A parsed JRG URL: `jrg://host:port/path` */
export interface JrgUrl {
  /** The hostname portion */
  host: string;
  /** The port number (default: 7070) */
  port: number;
  /** The path portion (leading slash stripped) */
  path: string;
  /** Original URL string */
  href: string;
}

/** JRG status code */
export type JrgStatusCode = 200 | 201 | 204 | 301 | 302 | 400 | 403 | 404 | 500 | 502 | 503 | (number & {});

/** Parsed JRG response from the server */
export interface JrgResponse {
  /** JRG protocol version (e.g. "0.1") */
  version: string;
  /** Status code */
  status: JrgStatusCode;
  /** Status text (e.g. "OK", "Not Found") */
  statusText: string;
  /** Response headers (lowercased keys) */
  headers: Record<string, string>;
  /** Raw body content */
  body: string;
}

/** A JRG page with parsed metadata */
export interface JrgPage {
  /** The full raw response */
  response: JrgResponse;
  /** Page title (from first `#` heading) */
  title: string;
  /** Body content without title/headers */
  body: string;
  /** Links found in the page (`[text](url)` or `jrg://...`) */
  links: { text: string; href: string }[];
  /** Tags if present in metadata block */
  tags: string[];
}

/** Transport-level result */
export interface TransportResult {
  /** Raw JRG protocol text */
  raw: string;
}

/** Configuration for an HTTP gateway transport */
export interface HttpTransportConfig {
  type: 'http';
  /** Base URL of the JRG→HTTP gateway (e.g. `http://localhost:18080`) */
  baseUrl: string;
  /** Optional fetch implementation (for Node <18 or custom) */
  fetch?: typeof globalThis.fetch;
}

/** Configuration for a raw TCP transport */
export interface TcpTransportConfig {
  type: 'tcp';
  /** JRG server hostname */
  host: string;
  /** JRG server port (default: 7070) */
  port?: number;
  /** Connection timeout in ms (default: 5000) */
  timeout?: number;
}

/** Configuration for a file-based transport (local filesystem) */
export interface FileTransportConfig {
  type: 'file';
  /** Root directory containing .jrg files */
  root: string;
}

export type TransportConfig = HttpTransportConfig | TcpTransportConfig | FileTransportConfig;

/** Full client configuration */
export interface ClientConfig {
  /** Transport configuration */
  transport: TransportConfig;
}

/** Transport interface — can fetch a JRG URL and return raw text */
export interface Transport {
  fetch(url: string): Promise<TransportResult>;
}
