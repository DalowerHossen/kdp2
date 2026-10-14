// path: lib/contracts/entitlement.ts
/**
 * Entitlement contract: plan/usage gates surfaced to every step. The concrete
 * implementation is assembled from plans, plan_limits, subscriptions and
 * entitlements (migrations/0005_plans.sql) by the foundation; STEP_04 extends
 * the domain surface.
 */
export interface EntitlementService {
  /** True when the company currently has the feature key enabled. */
  hasFeature(companyId: string, featureKey: string): Promise<boolean>;
  /** Numeric limit for a metered feature, or null when unlimited/absent. */
  limitFor(companyId: string, featureKey: string): Promise<string | null>;
  /** Current usage for a metered feature in the active period. */
  usageFor(companyId: string, featureKey: string): Promise<string>;
  /** True when usageFor() is strictly below limitFor(). Unlimited => true. */
  canConsume(companyId: string, featureKey: string): Promise<boolean>;
}
