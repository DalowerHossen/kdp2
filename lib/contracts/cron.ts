// path: lib/contracts/cron.ts
/**
 * Cron module contract (CONTRACTS.md section 14). leaderLock takes
 * pg_advisory_lock so overlapping runs cannot execute twice.
 */
export interface CronJob {
  readonly id: string;
  readonly schedule: string; // cron expression, UTC
  readonly handler: string; // route path under app/api/cron
  readonly leaderLock: boolean;
  readonly timeoutSeconds: number;
  readonly idempotencyWindowHours: number;
}
