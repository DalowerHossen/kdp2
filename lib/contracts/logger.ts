// path: lib/contracts/logger.ts
/**
 * Structured logging contract (CONTRACTS.md section 10). JSON output, one line
 * per event, always carrying correlation_id, actor_id, company_id, route and
 * duration_ms where known. PII keys are scrubbed before write.
 */
export type LogFields = Readonly<Record<string, string | number | boolean | null>>;

export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}
