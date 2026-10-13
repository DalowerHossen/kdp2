// path: lib/validation/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export type SanitizationFailureReason =
  | 'invalid_length'
  | 'control_character'
  | 'invisible_character'
  | 'active_content'
  | 'markup_in_plain_text';

export type SanitizationResult<TValue> =
  | { readonly accepted: true; readonly value: TValue }
  | { readonly accepted: false; readonly reason: SanitizationFailureReason };

const INVISIBLE_CHARACTER_PATTERN = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/u;
const ACTIVE_CONTENT_PATTERN =
  /<\s*(?:script|iframe|object|embed|applet|svg|math)\b|\bon[a-z]+\s*=|\b(?:javascript|data|vbscript)\s*:|expression\s*\(|@import|url\s*\(/i;
const HTML_ELEMENT_PATTERN = /<\/?[A-Za-z][^>]*>/;
const ALLOWED_TAGS = [
  'a',
  'b',
  'blockquote',
  'br',
  'em',
  'h1',
  'h2',
  'h3',
  'i',
  'li',
  'ol',
  'p',
  'strong',
  'ul',
];
const ALLOWED_ATTRIBUTES = ['href', 'title', 'rel'];
const SAFE_HREF_PATTERN = /^https:\/\//i;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

function validateInput(input: string, maxLength: number): SanitizationResult<string> {
  if (input.length > maxLength) {
    return { accepted: false, reason: 'invalid_length' };
  }
  const normalized = input.normalize('NFC').trim();
  if (hasControlCharacter(normalized)) {
    return { accepted: false, reason: 'control_character' };
  }
  if (INVISIBLE_CHARACTER_PATTERN.test(normalized)) {
    return { accepted: false, reason: 'invisible_character' };
  }
  if (ACTIVE_CONTENT_PATTERN.test(normalized)) {
    return { accepted: false, reason: 'active_content' };
  }
  return { accepted: true, value: normalized };
}

export function sanitizePlainText(input: string, maxLength = 5000): SanitizationResult<string> {
  const result = validateInput(input, maxLength);
  if (!result.accepted) {
    return result;
  }
  if (HTML_ELEMENT_PATTERN.test(result.value)) {
    return { accepted: false, reason: 'markup_in_plain_text' };
  }
  return result;
}

export function sanitizeRichText(input: string, maxLength = 50000): SanitizationResult<string> {
  const result = validateInput(input, maxLength);
  if (!result.accepted) {
    return result;
  }
  const sanitized = DOMPurify.sanitize(result.value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
    ALLOWED_URI_REGEXP: SAFE_HREF_PATTERN,
    FORBID_TAGS: ['iframe', 'object', 'embed', 'applet', 'svg', 'math', 'script'],
    FORBID_ATTR: ['style'],
    SAFE_FOR_TEMPLATES: true,
  });
  return { accepted: true, value: sanitized };
}
