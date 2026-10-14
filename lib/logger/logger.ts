// path: lib/logger/logger.ts
import type { Logger, LogFields } from '@/lib/contracts/logger';

/**
 * Structured JSON logger (CONTRACTS.md section 10). One JSON line per event on
 * stdout. PII/secret keys are scrubbed before write. This module is the ONLY
 * place allowed to write to a transport; ESLint bans console everywhere else.
 */

const SCRUB_KEYS: ReadonlySet<string> = new Set([
  'password',
  'password_hash',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'secret_key',
  'service_role_key',
  'authorization',
  'cookie',
  'set-cookie',
  'card_number',
  'pan',
  'cvv',
  'cvc',
  'otp',
  'totp',
  'totp_secret',
  'encryption_key',
  'master_key',
  'private_key',
  'email',
  'phone',
  'ssn',
]);

const LEVEL_ORDER: Readonly<Record<string, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const;

type Level = 'debug' | 'info' | 'warn' | 'error';

function minLevel(): number {
  const raw = (typeof process !== 'undefined' ? process.env.LOG_LEVEL : undefined) ?? 'info';
  return LEVEL_ORDER[raw.toLowerCase()] ?? LEVEL_ORDER['info'] ?? 20;
}

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  if (SCRUB_KEYS.has(k)) return true;
  return /(secret|token|password|api[-_]?key|cvv|cvc|card|otp|credential)/i.test(k);
}

export function scrubValue(key: string, value: unknown): string | number | boolean | null {
  if (value === null) return null;
  if (isSensitiveKey(key)) return '[redacted]';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return '[complex]';
}

function scrubFields(fields: LogFields | undefined): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!fields) return out;
  for (const [k, v] of Object.entries(fields)) {
    out[k] = scrubValue(k, v);
  }
  return out;
}

class JsonLogger implements Logger {
  constructor(private readonly bindings: LogFields = {}) {}

  child(bindings: LogFields): Logger {
    return new JsonLogger({ ...this.bindings, ...scrubFields(bindings) });
  }

  debug(msg: string, fields?: LogFields): void {
    this.write('debug', msg, fields);
  }
  info(msg: string, fields?: LogFields): void {
    this.write('info', msg, fields);
  }
  warn(msg: string, fields?: LogFields): void {
    this.write('warn', msg, fields);
  }
  error(msg: string, fields?: LogFields): void {
    this.write('error', msg, fields);
  }

  private write(level: Level, msg: string, fields?: LogFields): void {
    const order = LEVEL_ORDER[level] ?? 20;
    if (order < minLevel()) return;
    const line = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...scrubFields(this.bindings),
      ...scrubFields(fields),
    };
    // eslint-disable-next-line no-console -- logger is the only allowed transport
    (level === 'error' ? process.stderr : process.stdout).write(`${JSON.stringify(line)}\n`);
  }
}

const root: Logger = new JsonLogger();

export function getLogger(): Logger {
  return root;
}

export function createLogger(bindings: LogFields): Logger {
  return root.child(bindings);
}
