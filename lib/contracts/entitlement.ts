// path: lib/contracts/entitlement.ts
export type HasEntitlement = (companyId: string, key: string) => Promise<boolean>;

export interface EntitlementService {
  hasEntitlement: HasEntitlement;
}
