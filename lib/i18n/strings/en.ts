// path: lib/i18n/strings/en.ts
/**
 * Central English string table (Rule 1). Foundation shells read from here;
 * feature steps add their own nested namespaces via their owned config modules.
 */

export const en = {
  app: {
    name: 'KD SOLUTION IT',
    tagline: 'Invoicing, payments, payroll and accounting in one platform.',
  },
  nav: {
    dashboard: 'Dashboard',
    admin: 'Administration',
    signIn: 'Sign in',
  },
  states: {
    loading: 'Loading',
    emptyTitle: 'Nothing here yet',
    emptyBody: 'There is no data to display for this view yet.',
    errorTitle: 'Something went wrong',
    errorBody: 'The request could not be completed. The incident has been logged.',
    retry: 'Try again',
    notFoundTitle: 'Page not found',
    notFoundBody: 'The page you requested does not exist or has been moved.',
    backHome: 'Back to home',
  },
  shell: {
    foundationNotice:
      'The platform foundation is installed. Feature modules activate here as their steps are delivered.',
    workspaceLabel: 'Workspace',
    platformLabel: 'Platform',
  },
  landing: {
    heroTitle: 'Run your entire business from one ledger.',
    heroBody:
      'Invoices, payments, client management, payroll and double-entry accounting, built for multi-tenant teams with security enforced at every layer.',
    pillars: [
      {
        title: 'Invoicing and payments',
        body: 'Professional invoices with gapless numbering, payments through pluggable gateways, and a ledger that reconciles every dollar.',
      },
      {
        title: 'Payroll and accounting',
        body: 'Pay runs, payslips, journal entries and financial reports on a double-entry core with period close and audit trails.',
      },
      {
        title: 'Security by default',
        body: 'Row-level tenant isolation, two-factor authentication, hash-chained audit logs and encrypted file storage.',
      },
    ],
  },
} as const;

export type EnStrings = typeof en;
