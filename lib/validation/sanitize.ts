// path: lib/validation/sanitize.ts
/**
 * Input sanitization (CONTRACTS.md section 11, runs after Zod parse):
 *  - strings are trimmed
 *  - ASCII control characters are stripped (except tab/newline in rich text)
 *  - HTML is removed unless the field is explicitly rich text
 *  - rich text passes a tag/attribute allowlist sanitizer
 *
 * Render-side: never inject with innerHTML / dangerouslySetInnerHTML without
 * passing through sanitizeRichText first.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;
const CONTROL_CHARS_KEEP_WS = /[\u0000-\u0008\u000b\u000e-\u001f\u007f-\u009f]/g;

export function stripControlChars(input: string): string {
  return input.replace(CONTROL_CHARS, '');
}

export function sanitizePlainText(input: string): string {
  return stripControlChars(input).trim();
}

const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'hr', 'span',
]);
const URI_ATTRS: ReadonlySet<string> = new Set(['href', 'src']);
const ALLOWED_ATTRS: ReadonlySet<string> = new Set(['href', 'title']);
const SAFE_URI = /^(https?:|mailto:)/i;

function sanitizeTag(rawTag: string): string {
  const m = /^<\s*(\/?)\s*([a-zA-Z0-9]+)((?:\s+[^<>]*?)?)\s*(\/?)>$/.exec(rawTag);
  if (!m) return '';
  const closing = m[1] === '/';
  const tag = (m[2] ?? '').toLowerCase();
  const rawAttrs = m[3] ?? '';
  if (!ALLOWED_TAGS.has(tag)) return '';
  if (closing) return `</${tag}>`;

  let attrs = '';
  const attrRe = /([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/g;
  let am: RegExpExecArray | null;
  while ((am = attrRe.exec(rawAttrs)) !== null) {
    const name = am[1]?.toLowerCase() ?? '';
    let value = am[3] ?? am[4] ?? am[0] ?? '';
    if (!ALLOWED_ATTRS.has(name)) continue;
    if (name.startsWith('on')) continue;
    value = stripControlChars(value).trim();
    if (URI_ATTRS.has(name) && !SAFE_URI.test(value)) continue;
    attrs += ` ${name}="${escapeAttr(value)}"`;
  }
  const selfClose = m[4] === '/' || tag === 'br' || tag === 'hr' ? (tag === 'br' ? '' : ' /') : '';
  return `<${tag}${attrs}${selfClose}>`;
}

function escapeAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/**
 * Allowlist sanitizer for rich text. Only whitelisted tags/attributes survive;
 * everything else is removed (tags) or escaped (text). Event handlers and
 * non-http(s)/mailto URIs never survive.
 */
export function sanitizeRichText(input: string): string {
  const cleaned = input.replace(CONTROL_CHARS_KEEP_WS, '');
  const tokens = cleaned.split(/(<[^<>]+>)/g);
  let out = '';
  for (const token of tokens) {
    if (token.startsWith('<') && token.endsWith('>')) {
      out += sanitizeTag(token);
    } else {
      out += escapeText(token);
    }
  }
  return out;
}

/** Removes all HTML (input-side). For text fields only. */
export function stripHtml(input: string): string {
  return sanitizePlainText(input.replace(/<[^<>]*>/g, ''));
}

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** Deep plain-text sanitization of parsed input payloads (strings only). */
export function deepSanitize<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizePlainText(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => deepSanitize(v)) as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, Json> = {};
    for (const [k, v] of Object.entries(value as Record<string, Json>)) {
      out[k] = deepSanitize(v);
    }
    return out as T;
  }
  return value;
}
