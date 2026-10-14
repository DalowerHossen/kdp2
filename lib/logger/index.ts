// path: lib/logger/index.ts
export type { Logger, LogFields } from '@/lib/contracts/logger';
export { createLogger, logger } from '@/lib/logger/logger';
export {
  createCorrelationId,
  getCurrentCorrelationId,
  resolveCorrelationId,
  withCorrelationId,
} from '@/lib/logger/correlation';
export { scrubLogFields, scrubSensitiveText } from '@/lib/logger/pii-scrubber';
