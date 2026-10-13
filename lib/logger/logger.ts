// path: lib/logger/logger.ts
import type { Logger, LogFields } from '@/lib/contracts/logger';
import {
  createCorrelationId,
  getCurrentCorrelationId,
  resolveCorrelationId,
} from '@/lib/logger/correlation';
import { scrubLogFields, scrubSensitiveText } from '@/lib/logger/pii-scrubber';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function readString(value: LogFields[string] | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readDuration(value: LogFields[string] | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function readRoute(value: LogFields[string] | undefined): string {
  if (typeof value !== 'string') {
    return 'unknown';
  }
  const queryIndex = value.indexOf('?');
  const route = queryIndex === -1 ? value : value.slice(0, queryIndex);
  return scrubSensitiveText(route).slice(0, 512) || 'unknown';
}

class StructuredJsonLogger implements Logger {
  private readonly bindings: LogFields;

  constructor(bindings: LogFields = {}) {
    this.bindings = Object.freeze({ ...bindings });
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

  child(bindings: LogFields): Logger {
    return new StructuredJsonLogger({ ...this.bindings, ...bindings });
  }

  private write(level: LogLevel, msg: string, fields?: LogFields): void {
    const safeFields = scrubLogFields({ ...this.bindings, ...fields });
    const suppliedCorrelationId = readString(safeFields.correlation_id);
    const activeCorrelationId = suppliedCorrelationId ?? getCurrentCorrelationId();
    const correlationId =
      activeCorrelationId === null
        ? createCorrelationId()
        : resolveCorrelationId(activeCorrelationId);
    const event: LogFields = Object.freeze({
      ...safeFields,
      timestamp: new Date().toISOString(),
      level,
      message: scrubSensitiveText(msg),
      correlation_id: correlationId,
      actor_id: readString(safeFields.actor_id),
      company_id: readString(safeFields.company_id),
      route: readRoute(safeFields.route),
      duration_ms: readDuration(safeFields.duration_ms),
    });
    process.stdout.write(`${JSON.stringify(event)}\n`);
  }
}

export function createLogger(bindings: LogFields = {}): Logger {
  return new StructuredJsonLogger(bindings);
}

export const logger: Logger = createLogger();
