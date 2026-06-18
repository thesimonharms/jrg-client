import type { JrgResponse, JrgStatusCode, JrgPage } from './types.js';

/**
 * Parse a raw JRG protocol response string.
 *
 * Format:
 * ```
 * JRG/0.1 200 OK
 * Content-Type: text/jrg; charset=utf-8
 *
 * # Page Body...
 * ```
 */
export function parseJrgResponse(raw: string): JrgResponse {
  const lines = raw.split('\n');

  // Parse status line: "JRG/0.1 200 OK"
  const statusLine = lines[0]?.trim() ?? '';
  const statusMatch = statusLine.match(/^JRG\/(\S+)\s+(\d+)\s+(.+)$/);
  if (!statusMatch) {
    throw new Error(`Invalid JRG response: missing or malformed status line: ${statusLine.slice(0, 80)}`);
  }

  const version = statusMatch[1];
  const status = Number(statusMatch[2]) as JrgStatusCode;
  const statusText = statusMatch[3].trim();

  // Parse headers (lines until first blank line)
  let i = 1;
  const headers: Record<string, string> = {};
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      i++; // skip blank line
      break;
    }
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).toLowerCase().trim();
      const value = line.slice(colonIdx + 1).trim();
      headers[key] = value;
    }
  }

  // Body is everything after headers
  const body = lines.slice(i).join('\n').trim();

  return { version, status, statusText, headers, body };
}

/**
 * Extract metadata from a JRG page body.
 */
export function parseJrgPage(response: JrgResponse): JrgPage {
  const body = response.body;

  // Extract title (first `# ` heading)
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? 'Untitled';

  // Extract tags from metadata block: `> Tags: ...`
  const tagsMatch = body.match(/^>\s*Tags:\s*(.+)$/m);
  const tags = tagsMatch
    ? tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean)
    : [];

  // Extract links: `[text](url)`
  const links: { text: string; href: string }[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(body)) !== null) {
    links.push({ text: match[1], href: match[2] });
  }

  // Extract jrg:// links too
  const jrgLinkRegex = /jrg:\/\/([^\s)\]]+)/g;
  while ((match = jrgLinkRegex.exec(body)) !== null) {
    const href = `jrg://${match[1]}`;
    if (!links.some(l => l.href === href)) {
      links.push({ text: match[1].split('/').pop() ?? '', href });
    }
  }

  return { response, title, body, links, tags };
}

/**
 * Get the body content without the title line and metadata block.
 */
export function stripPageMetadata(body: string): string {
  return body
    .replace(/^# .+\n?/, '')          // remove title heading
    .replace(/^> .+\n?/gm, '')        // remove metadata lines (> ...)
    .replace(/\n{3,}/g, '\n\n')       // collapse excessive whitespace
    .trim();
}
