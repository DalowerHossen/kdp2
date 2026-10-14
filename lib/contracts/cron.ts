// path: lib/contracts/cron.ts
export interface CronJob {
  readonly id: string;
  readonly schedule: string;
  readonly handler: string;
  readonly leaderLock: boolean;
  readonly timeoutSeconds: number;
  readonly idempotencyWindowHours: number;
}

export interface CronRegistry {
  getJobs(): readonly CronJob[];
}
