// path: lib/logger/pii-scrubber.ts
import type { LogFields } from '@/lib/contracts/logger';

const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'accountnumber',
  'address',
  'apikey',
  'auth',
  'body',
  'city',
  'credentials',
  'credential',
  'authorization',
  'bankaccount',
  'birthdate',
  'cardnumber',
  'clientip',
  'clientsecret',
  'cookie',
  'cvv',
  'dateofbirth',
  'devicefingerprint',
  'email',
  'emailaddress',
  'firstname',
  'fullname',
  'governmentid',
  'iban',
  'ip',
  'ipaddress',
  'latitude',
  'lastname',
  'location',
  'longitude',
  'mobile',
  'mobilenumber',
  'name',
  'nationalid',
  'password',
  'passport',
  'postalcode',
  'privatekey',
  'payload',
  'phone',
  'phonenumber',
  'query',
  'rawrequest',
  'rawresponse',
  'refreshcookie',
  'refreshtoken',
  'routingnumber',
  'secret',
  'secretkey',
  'setcookie',
  'socialsecuritynumber',
  'ssn',
  'street',
  'taxid',
  'token',
  'useragent',
  'username',
  'userid',
  'zipcode',
]);
const SENSITIVE_KEY_FRAGMENTS = [
  'email',
  'phone',
  'mobile',
  'name',
  'address',
  'token',
  'password',
  'secret',
  'credential',
  'apikey',
  'privatekey',
  'cookie',
  'socialsecurity',
  'governmentid',
  'nationalid',
  'passport',
  'cardnumber',
  'accountnumber',
  'bankaccount',
  'routingnumber',
  'iban',
  'fingerprint',
  'useragent',
  'birthdate',
  'dateofbirth',
  'location',
  'latitude',
  'longitude',
  'postalcode',
  'zipcode',
] as const;
const EMAIL_PATTERN = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Z0-9._~+/-]+=*/giu;
const JWT_PATTERN = /\beyJ[A-Z0-9_-]{8,}\.[A-Z0-9_-]{8,}\.[A-Z0-9_-]{8,}\b/giu;
const SSN_PATTERN = /\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/gu;
const PHONE_PATTERN =
  /(?<![\w-])(?:\+[0-9]{1,3}[ .-]?)?(?:\([0-9]{2,5}\)|[0-9]{2,5})[ .-][0-9]{3,6}(?:[ .-][0-9]{2,4})?(?![\w])/giu;

function normalizeKey(key: string): string {
  return key.replace(/[^a-z0-9]/giu, '').toLowerCase();
}

function hasSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return (
    SENSITIVE_KEYS.has(normalized) ||
    SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment)) ||
    normalized.endsWith('ip') ||
    normalized.endsWith('body') ||
    normalized.endsWith('query') ||
    normalized.endsWith('payload')
  );
}

export function scrubSensitiveText(value: string): string {
  return value
    .replace(EMAIL_PATTERN, REDACTED_VALUE)
    .replace(BEARER_TOKEN_PATTERN, `Bearer ${REDACTED_VALUE}`)
    .replace(JWT_PATTERN, REDACTED_VALUE)
    .replace(SSN_PATTERN, REDACTED_VALUE)
    .replace(PHONE_PATTERN, REDACTED_VALUE);
}

export function scrubLogFields(fields: LogFields): LogFields {
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (hasSensitiveKey(key)) {
      sanitized[key] = REDACTED_VALUE;
    } else if (typeof value === 'string') {
      sanitized[key] = scrubSensitiveText(value);
    } else if (typeof value === 'number') {
      sanitized[key] = Number.isFinite(value) ? value : null;
    } else {
      sanitized[key] = value;
    }
  }
  return Object.freeze(sanitized);
}
