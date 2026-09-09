> **Moved.** This GitHub copy is an archive. Use the Forgejo repository.
>
> **Canonical repository:** https://git.simonharms.com/thesimonharms/jrg-client

# jrg-client

**TypeScript library for accessing Jaringan (JRG) pages** — in the browser, Node.js, Bun, or Deno.

## Features

- **3 transports** — HTTP gateway (browser-friendly), raw TCP (native JRG protocol), local filesystem
- **Full JRG protocol parsing** — status codes, headers, body extraction, link/tag parsing
- **First-class TypeScript** — full type declarations, clean API
- **Isomorphic** — HTTP transport works in any JS environment with `fetch`
- **Lightweight** — zero runtime dependencies

## Install

```bash
npm install jrg-client
# or
bun add jrg-client
```

## Usage

### HTTP Gateway Transport (Browser + Server)

Use when you have a JRG→HTTP gateway running (e.g. on port 18080). Works in any environment with `fetch` — browsers, Node 18+, Bun, Deno.

```ts
import { JrgClient } from 'jrg-client';

const client = new JrgClient({
  transport: { type: 'http', baseUrl: 'http://localhost:18080' },
});

// Fetch a page — gateway returns HTML
const html = await client.fetchHtml('wiki/welcome');
document.getElementById('content')!.innerHTML = html;

// Or get structured data (limited for HTTP transport since gateway returns rendered HTML)
const page = await client.fetchPage('wiki/welcome');
console.log(page.title); // "Jaringan Page" (title tag from HTML)
```

### Raw TCP Transport (Node/Bun/Deno)

Connects directly to a JRG server over TCP. Only works in server-side runtimes.

```ts
import { JrgClient } from 'jrg-client';

const client = new JrgClient({
  transport: { type: 'tcp', host: 'localhost', port: 7080, timeout: 3000 },
});

// Get raw JRG response
const response = await client.fetchResponse('port-map');
console.log(response.status, response.statusText); // 200 OK
console.log(response.headers['content-type']);      // text/jrg; charset=utf-8

// Get parsed page with metadata
const page = await client.fetchPage('welcome');
console.log(page.title);      // "Welcome to Your Wiki"
console.log(page.tags);       // ['getting-started']
console.log(page.links);      // [{ text: "Creating Pages", href: "jrg://wiki/creating-pages" }, ...]
console.log(page.body);       // Page body without title/header

// Full JRG URLs work too
const page2 = await client.fetchPage('jrg://localhost:7080/wiki/welcome');
```

### Local File Transport (Server)

Reads `.jrg` files directly from disk — great for testing or offline access.

```ts
import { JrgClient } from 'jrg-client';

const client = new JrgClient({
  transport: { type: 'file', root: '/home/lekmon/wiki' },
});

const page = await client.fetchPage('port-map');
console.log(page.title);
```

## API

### `JrgClient`

| Method | Returns | Description |
|--------|---------|-------------|
| `fetch(url)` | `Promise<TransportResult>` | Raw transport result (raw text) |
| `fetchResponse(url)` | `Promise<JrgResponse>` | Parsed JRG response with status, headers, body |
| `fetchPage(url)` | `Promise<JrgPage>` | Parsed page with title, tags, links, body |
| `fetchHtml(url)` | `Promise<string>` | Raw HTML from HTTP gateway (convenience) |
| `listPages()` | `Promise<{slug, title}[]>` | List pages from wiki index |

### Transport Configuration

```ts
// HTTP gateway — works everywhere
{ type: 'http', baseUrl: string, fetch?: typeof fetch }

// Raw TCP — server-side only (Node/Bun/Deno)
{ type: 'tcp', host: string, port?: number, timeout?: number }

// Local filesystem — server-side only
{ type: 'file', root: string }
```

### Types

```ts
interface JrgResponse {
  version: string;           // JRG protocol version (e.g. "0.1")
  status: number;            // 200, 404, etc.
  statusText: string;        // "OK", "Not Found", etc.
  headers: Record<string, string>;  // Lowercased header keys
  body: string;              // Raw body content
}

interface JrgPage {
  response: JrgResponse;     // Full raw response
  title: string;             // Page title from first `#` heading
  body: string;              // Body content
  links: { text: string; href: string }[];  // All links found
  tags: string[];            // Tags from metadata block
}

interface TransportResult {
  raw: string;               // Raw protocol text
}
```

## Low-Level Usage

You can also use the individual utilities:

```ts
import { parseJrgUrl, parseJrgResponse, parseJrgPage, stripPageMetadata } from 'jrg-client';

// Parse a JRG URL
const url = parseJrgUrl('jrg://localhost:7080/welcome');
// { host: 'localhost', port: 7080, path: '/welcome', href: 'jrg://localhost:7080/welcome' }

// Parse a raw protocol response
const response = parseJrgResponse('JRG/0.1 200 OK\nContent-Type: text/jrg\n\n# Hello');

// Parse page metadata from a response
const page = parseJrgPage(response);

// Strip title heading and metadata lines from body
const clean = stripPageMetadata(page.body);
```

## Local dev

```bash
git clone https://github.com/thesimonharms/jrg-client
cd jrg-client
npm install
npm run build
node --input-type=module -e "import { JrgClient } from './dist/index.js'; console.log('OK')"
```

## License

MIT
