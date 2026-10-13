# ১৬টি চ্যাটের জন্য প্রস্তুত নির্দেশনা (কপি-পেস্ট করুন)

এই ফাইলটি শুধু আপনার ব্যবহারের জন্য — অ্যাপ্লিকেশনের কোড, UI, কমেন্ট বা ডকুমেন্টেশন নয়।
তাই এটি বাংলায় লেখা। প্রজেক্টের ভেতরের সব ফাইল ইংরেজিতেই থাকবে (Rule 1)।

---

## এক নজরে ক্রম

| ক্রম | চ্যাট | কী বানাবে | ফিচার | কখন শুরু করবেন |
| --- | --- | --- | --- | --- |
| ১ | চ্যাট ১ | STEP_00 ফাউন্ডেশন | — | এখনই, একা |
| ২ | চ্যাট ২ | STEP_01 ডিজাইন সিস্টেম | 450 | STEP_00 মার্জের পর |
| ৩ | চ্যাট ৩ | STEP_02 অথেনটিকেশন | 40 | STEP_01 মার্জের পর |
| ৪ | চ্যাট ৪ | STEP_03 SMTP + অনবোর্ডিং | 133 | STEP_02 মার্জের পর |
| ৫ | চ্যাট ৫ | STEP_04 টিম + KYC + প্ল্যান | 109 | STEP_03 মার্জের পর |
| ৬ | চ্যাট ৬ | STEP_05 ইনভয়েস কোর | 145 | STEP_04 মার্জের পর |
| ৭–১৬ | চ্যাট ৭ থেকে ১৬ | STEP_06 থেকে STEP_15 | 3310 | **একসাথে, সমান্তরালে** |

মোট ৪১৮৭ ফিচার। চ্যাট ৭–১৬ একসাথে চালানো যাবে, কারণ তাদের ফাইল-মালিকানা আলাদা।

---

## শুরু করার আগে (অবস্থা: প্রস্তুত)

`integration` ব্রাঞ্চ GitHub-এ **তৈরি হয়ে গেছে** — `origin/integration`,
শা `6ee7cbf` (main-এর সমান)। আর কিছু করতে হবে না।
প্রতিটি স্টেপের PR যাবে `integration`-এ, `main`-এ নয়।

শুধু একটি কাজ বাকি: পরিকল্পনার ফাইলগুলো (IMPLEMENTATION_PLAN.md,
SPEC_CONFLICTS.md, docs/execution/**, CHAT_PROMPTS.md) `integration`-এ
পৌঁছাতে হবে, নাহলে নতুন চ্যাটগুলো সেগুলো পড়তে পাবে না। এর জন্য একটি PR খোলা
আছে:

```
gh pr list --repo DalowerHossen/kdp2 --base integration
gh pr view 1 --repo DalowerHossen/kdp2
```

PR-টি মার্জ করুন (অথবা Arena-তে বলুন "PR মার্জ করো"), তারপর চ্যাট ১ শুরু করুন।

STEP_00 মার্জ হওয়ার পর ট্যাগ দিন:

```
git fetch origin
git tag foundation-v1 origin/integration
git push origin foundation-v1
```

STEP_05 মার্জ হওয়ার পর আবার ট্যাগ দিন:

```
git fetch origin
git tag foundation-v2 origin/integration
git push origin foundation-v2
```

> নোট: Arena-তে প্রতিটি নতুন চ্যাটের জন্য সিস্টেম নিজে একটি করে ব্রাঞ্চ বরাদ্দ করে
> (`arena/...` নামে)। তাই এজেন্টকে `kd/step-NN-slug` নামের ব্রাঞ্চ বানাতে বলবেন না —
> নিজের বরাদ্দ করা ব্রাঞ্চেই কাজ করতে বলুন, আর PR দিন `integration`-এ।

---

## চ্যাট ১ — STEP_00 (ফাউন্ডেশন)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ১।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_00_foundation.md

আমার স্টেপ: STEP_00 — Foundation and Governance
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো, অন্য কোনো ব্রাঞ্চে নয়
PR টার্গেট: integration

শুধু STEP_00_foundation.md-এ লেখা স্কোপ বাস্তবায়ন করো। অন্য কোনো স্টেপের
কাজ করো না — বিশেষ করে ইনভয়েস, পেমেন্ট বা ডিজাইন সিস্টেমের কোনো ফিচার নয়।
তোমার কাজ হলো বাকি ১৫টি স্টেপ যেসব জিনিস ব্যবহার করবে সেগুলো তৈরি করা:
টুলচেইন, ১৫টি গার্ড স্ক্রিপ্ট, lib/contracts, lib/money, lib/logger, lib/errors,
lib/http, lib/validation, lib/db, lib/supabase, ৫টি মাইগ্রেশন, শেয়ার্ড লেআউট,
এবং PGlite ভেরিফিকেশন হার্নেস।

কঠোর নিয়ম: সব কোড, কমেন্ট, ফাইলনাম, UI টেক্সট ও ডকুমেন্টেশন ইংরেজিতে।
টাকা শুধু USD, numeric(18,4), কখনো JavaScript Number নয়।
কোনো TODO, FIXME, "Coming Soon", placeholder বা টেস্ট ফাইল নয়।
কোনো any টাইপ নয়, কোনো console.log নয়।
প্রতিটি ফাইলের প্রথম লাইনে path কমেন্ট দাও।

শেষে এই কমান্ডগুলো চালাও এবং পুরো আউটপুট দেখাও:
npm install
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run verify-rls
node scripts/build-feature-manifest.mjs

প্রমাণ করো যে docs/feature-manifest.json-এ ঠিক ৪১৮৭টি রেকর্ড আছে,
এবং প্রতি স্টেপের সংখ্যা 450, 40, 133, 109, 145, 499, 390, 325, 323, 499,
264, 273, 158, 158, 421 — যোগফল ৪১৮৭।

এরপর STEP_00_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো,
এবং integration ব্রাঞ্চে PR খোলো।
```

---

## চ্যাট ২ — STEP_01 (ব্র্যান্ড ও ডিজাইন সিস্টেম, ৪৫০ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ২।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_01_design-system.md

আমার স্টেপ: STEP_01 — Brand and Design System
ফিচার: ৪৫০টি (FEATURE_LIST.md লাইন ১–৫৫২, ফিচার আইডি ১–৪৫০)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

শুধু STEP_01_design-system.md-এর স্কোপ বাস্তবায়ন করো, ৭টি ব্যাচে, ব্যাচ শেষে
এগজিট গেট সবুজ হলে তবেই পরের ব্যাচ।

তোমার মালিকানাধীন পাথ: components/ui/**, components/layout/**,
components/shared/**, components/marketing/**, components/charts/**,
app/(public)/**, config/nav/01-design.nav.ts,
config/permissions/01-design.ts, migrations/0100-0199,
integrator/requests/step-01.json

এগুলোর একটিও এডিট করো না: package.json, tsconfig.json, tailwind.config.ts,
next.config.mjs, middleware.ts, app/globals.css, app/layout.tsx,
config/nav-map.ts, lib/contracts/**, scripts/**, অন্য স্টেপের ফোল্ডার,
এবং FEATURE_LIST.md। শেয়ার্ড ফাইলে পরিবর্তন লাগলে
integrator/requests/step-01.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। শুধু USD, numeric(18,4)। কোনো TODO/FIXME/
"Coming Soon"/placeholder/টেস্ট ফাইল নয়। কোনো any নয়, কোনো console.log নয়।
প্রতিটি ফাইলের প্রথম লাইনে path কমেন্ট। প্রতিটি পেজে লোডিং, এরর, এম্পটি ও
সাকসেস — চারটি স্টেট। ৩২০px-এ কাজ করবে। কীবোর্ড অ্যাক্সেসিবল। ডার্ক মোড।
কোনো লোরাম ইপসাম নয় — প্রতিটি পেজে আসল ইংরেজি কপি।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 01

এরপর STEP_01_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## চ্যাট ৩ — STEP_02 (অথেনটিকেশন, ৪০ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ৩।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_02_auth.md

আমার স্টেপ: STEP_02 — Authentication
ফিচার: ৪০টি (FEATURE_LIST.md লাইন ৫৫৩–৬১৮, ফিচার আইডি ৪৫১–৪৯০)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

শুধু STEP_02_auth.md-এর স্কোপ বাস্তবায়ন করো: Supabase Auth, OAuth, TOTP 2FA,
সেশন ম্যানেজমেন্ট, লগইন সিকিউরিটি।

তোমার মালিকানাধীন পাথ: lib/auth/**, app/(auth)/**, app/api/auth/**,
components/auth/**, config/permissions/02-auth.ts, migrations/0200-0299,
integrator/requests/step-02.json

শেয়ার্ড ফাইল বা অন্য স্টেপের ফোল্ডার এডিট করো না। দরকার হলে
integrator/requests/step-02.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। কোনো TODO/FIXME/"Coming Soon"/placeholder/
টেস্ট ফাইল নয়। কোনো any নয়, কোনো console.log নয়। প্রতিটি ফাইলের প্রথম
লাইনে path কমেন্ট। প্রতিটি টেবিলে id (UUID v7), company_id, created_at,
updated_at, deleted_at, version, RLS enabled, default-deny পলিসি ও অডিট ট্রিগার।
প্রতিটি রাউট defineRoute দিয়ে, প্রতিটি মিউটেশন defineMutation দিয়ে।
2FA সিক্রেট AES-256-GCM এনক্রিপ্টেড, রিকভারি কোড হ্যাশড।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 02

এরপর STEP_02_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## চ্যাট ৪ — STEP_03 (SMTP, অনবোর্ডিং, সেটিংস — ১৩৩ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ৪।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_03_smtp-onboarding.md

আমার স্টেপ: STEP_03 — Universal SMTP, Onboarding and Settings
ফিচার: ১৩৩টি (FEATURE_LIST.md লাইন ৬১৯–৭৮১, ফিচার আইডি ৪৯১–৬২৩)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

শুধু STEP_03_smtp-onboarding.md-এর স্কোপ বাস্তবায়ন করো: ৬টি ইমেইল অ্যাডাপ্টার
(resend, sendgrid, ses, mailgun, postmark, generic SMTP), ডাটাবেস-কিউ
(FOR UPDATE SKIP LOCKED), টেমপ্লেট ইঞ্জিন, ডেলিভারেবিলিটি, সাইনআপ ফ্লো,
কোম্পানি অনবোর্ডিং উইজার্ড, ইন্ডাস্ট্রি প্রিসেট, কোম্পানি প্রোফাইল ও সেটিংস।

তোমার মালিকানাধীন পাথ: lib/email/**, lib/onboarding/**,
services/smtp-service.ts, services/onboarding-service.ts,
services/settings-service.ts, app/(dashboard)/settings/**,
app/(dashboard)/onboarding/**, app/api/email/**, app/api/settings/**,
components/onboarding/**, components/settings/**, components/email/**,
config/permissions/03-settings.ts, migrations/0300-0399,
integrator/requests/step-03.json

শেয়ার্ড ফাইল বা অন্য স্টেপের ফোল্ডার এডিট করো না। দরকার হলে
integrator/requests/step-03.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। শুধু USD। কোনো TODO/FIXME/"Coming Soon"/
placeholder/টেস্ট ফাইল নয়। কোনো any নয়, কোনো console.log নয়। প্রতিটি
ফাইলের প্রথম লাইনে path কমেন্ট। প্রতিটি টেবিলে বেস শেপ + RLS + deny পলিসি +
অডিট ট্রিগার। SMTP ক্রেডেনশিয়াল AES-256-GCM এনক্রিপ্টেড, ক্লায়েন্টে প্লেইনটেক্সটে
কখনো রিটার্ন করবে না। ইমেইল সবসময় কিউয়ের মাধ্যমে, ইনলাইন নয়।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 03

এরপর STEP_03_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## চ্যাট ৫ — STEP_04 (টিম, KYC, নোটিফিকেশন, প্ল্যান — ১০৯ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ৫।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_04_team-kyc-plans.md

আমার স্টেপ: STEP_04 — Team, KYC, Notifications and Plans
ফিচার: ১০৯টি (FEATURE_LIST.md লাইন ৭৮২–৯০৯, ফিচার আইডি ৬২৪–৭৩২)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

শুধু STEP_04_team-kyc-plans.md-এর স্কোপ বাস্তবায়ন করো: স্টাফ ইনভাইট ও
পারমিশন, স্টাফ অ্যাক্টিভিটি, KYC আপলোড ও রিভিউ, নোটিফিকেশন সেন্টার, প্ল্যান,
সাবস্ক্রিপশন, কুপন, এনটাইটেলমেন্ট ইঞ্জিন।

তোমার মালিকানাধীন পাথ: services/team-service.ts, services/kyc-service.ts,
services/notification-service.ts, services/plan-service.ts,
app/(dashboard)/team/**, app/(dashboard)/notifications/**,
app/(dashboard)/billing/**, app/api/team/**, app/api/kyc/**,
app/api/notifications/**, app/api/subscriptions/**, components/team/**,
components/kyc/**, components/notifications/**,
config/permissions/04-team.ts, migrations/0400-0499,
integrator/requests/step-04.json

শেয়ার্ড ফাইল বা অন্য স্টেপের ফোল্ডার এডিট করো না। দরকার হলে
integrator/requests/step-04.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। শুধু USD, numeric(18,4)। কোনো TODO/FIXME/
"Coming Soon"/placeholder/টেস্ট ফাইল নয়। কোনো any নয়, কোনো console.log নয়।
প্রতিটি ফাইলের প্রথম লাইনে path কমেন্ট। প্রতিটি টেবিলে বেস শেপ + RLS + deny
পলিসি + অডিট ট্রিগার। KYC ডকুমেন্ট এনক্রিপ্টেড, প্রতিটি পড়ার ঘটনা অডিট হবে।
রিভিউ অ্যাকশনে kyc_reviewer সাব-রোল ও অ্যাপ্রুভাল লেভেল লাগবে।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 04

এরপর STEP_04_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## চ্যাট ৬ — STEP_05 (গেটওয়ে সেটিংস ও ইনভয়েস কোর — ১৪৫ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ৬।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_05_invoice-core.md

আমার স্টেপ: STEP_05 — Gateway Settings and Invoice Core
ফিচার: ১৪৫টি (FEATURE_LIST.md লাইন ৯১০–১০৭৬, ফিচার আইডি ৭৩৩–৮৭৭)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

শুধু STEP_05_invoice-core.md-এর স্কোপ বাস্তবায়ন করো: টেন্যান্ট গেটওয়ে কনফিগ,
টেন্যান্ট সিকিউরিটি পলিসি, ইনভয়েস CRUD, ডায়নামিক লাইন আইটেম, gapless
ইনভয়েস নাম্বারিং (pg_advisory_xact_lock), স্ট্যাটাস ওয়ার্কফ্লো, ডুপ্লিকেট
ডিটেকশন।

তোমার মালিকানাধীন পাথ: services/invoice-service.ts,
services/numbering-service.ts, services/gateway-settings-service.ts,
app/(dashboard)/invoices/**, app/api/invoices/**,
app/api/gateways/settings/**, components/invoice/**,
components/forms/invoice/**, config/permissions/05-invoice.ts,
migrations/0500-0599, integrator/requests/step-05.json

শেয়ার্ড ফাইল বা অন্য স্টেপের ফোল্ডার এডিট করো না। দরকার হলে
integrator/requests/step-05.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। ইনভয়েসের সব অঙ্ক শুধু Money টাইপ দিয়ে —
কখনো JavaScript Number নয়, ডাটাবেসে numeric(18,4)। কোনো TODO/FIXME/
"Coming Soon"/placeholder/টেস্ট ফাইল নয়। কোনো any নয়, কোনো console.log নয়।
প্রতিটি ফাইলের প্রথম লাইনে path কমেন্ট। প্রতিটি টেবিলে বেস শেপ + RLS + deny
পলিসি + অডিট ট্রিগার। নাম্বারিং টেন্যান্ট ও ডকুমেন্ট টাইপ অনুযায়ী লক হবে,
গ্লোবাল লক নয়। এডিটে optimistic locking (version) বাধ্যতামূলক।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 05

এরপর STEP_05_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

> **STEP_05 মার্জ হওয়ার পর** `foundation-v2` ট্যাগ দিন। এরপরই চ্যাট ৭–১৬ একসাথে শুরু করুন।

---

## চ্যাট ৭ — STEP_06 (CRM ও ইনভেন্টরি — ৪৯৯ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ৭।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_06_crm-inventory.md

আমার স্টেপ: STEP_06 — Invoicing Extensions, CRM and Inventory
ফিচার: ৪৯৯টি (FEATURE_LIST.md লাইন ১০৭৭–১৬৬৬, ফিচার আইডি ৮৭৮–১৩৭৬)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

এটি সমান্তরাল ওয়েভ। অন্য ৯টি স্টেপ এখন একই সময়ে চলছে। তাই শুধু নিজের
পাথে লেখো। STEP_06_crm-inventory.md-এর ৮টি ব্যাচ অনুসরণ করো।

তোমার মালিকানাধীন পাথ: services/client-service.ts,
services/product-service.ts, services/inventory-service.ts,
services/supplier-service.ts, services/purchase-order-service.ts,
services/estimate-service.ts, services/project-service.ts,
services/report-service.ts, app/(dashboard)/clients|products|inventory|
suppliers|estimates|projects|expenses|reports/**,
app/api/clients|products|inventory|suppliers|estimates|projects|expenses|reports/**,
components/tables/**, components/pdf/**, config/permissions/06-crm.ts,
config/nav/06-crm.nav.ts, migrations/0600-0699,
integrator/requests/step-06.json

অন্য স্টেপের services বা lib ফোল্ডার থেকে ইমপোর্ট করো না — শুধু
lib/contracts এবং STEP_00–05-এর তৈরি lib ব্যবহার করো। শেয়ার্ড ফাইল এডিট
করো না; দরকার হলে integrator/requests/step-06.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। শুধু USD, numeric(18,4), Money টাইপ। কোনো
TODO/FIXME/"Coming Soon"/placeholder/টেস্ট ফাইল নয়। কোনো any নয়, কোনো
console.log নয়। path কমেন্ট বাধ্যতামূলক। স্টক কমানো SELECT ... FOR UPDATE ছাড়া
করবে না। ক্লায়েন্ট ও প্রোডাক্ট ডুপ্লিকেট ডিটেকশন বাধ্যতামূলক। প্রতিটি টেবিলে
বেস শেপ + RLS + deny পলিসি + অডিট ট্রিগার।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 06

এরপর STEP_06_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## চ্যাট ৮ — STEP_07 (পেমেন্ট, MoR, ডিসপিউট — ৩৯০ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ৮।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_07_payments.md

আমার স্টেপ: STEP_07 — Payments, MoR, Wallet and Disputes
ফিচার: ৩৯০টি (FEATURE_LIST.md লাইন ১৬৬৭–২১২৪, ফিচার আইডি ১৩৭৭–১৭৬৬)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

এটি সমান্তরাল ওয়েভ। শুধু নিজের পাথে লেখো। STEP_07_payments.md-এর ৯টি ব্যাচ
অনুসরণ করো: ৭টি গেটওয়ে অ্যাডাপ্টার + ফিক্সচার অ্যাডাপ্টার, রাউটিং, MoR ইঞ্জিন,
ফি ক্যালকুলেটর, পেমেন্ট সার্ভিস, ওয়ালেট, পেআউট, ডিসপিউট, ৭টি ওয়েবহুক,
অ্যাডমিন ও ড্যাশবোর্ড UI।

তোমার মালিকানাধীন পাথ: lib/payment/**, services/payment-service.ts,
services/payout-service.ts, services/wallet-service.ts,
services/dispute-service.ts, services/mor-service.ts,
app/(dashboard)/payments/**, app/(dashboard)/wallet/**, app/api/payments/**,
app/api/wallet/**, app/api/webhooks/stripe|paypal|paddle|nmi|rapyd|adyen/**,
app/(admin)/gateways/**, app/(admin)/payouts/**, app/(admin)/disputes/**,
components/payment/**, config/permissions/07-payments.ts,
config/nav/07-payments.nav.ts, migrations/0700-0799,
integrator/requests/step-07.json

শেয়ার্ড ফাইল বা অন্য স্টেপের ফোল্ডার এডিট করো না। দরকার হলে
integrator/requests/step-07.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। Rule 18 পরম — bKash, Nagad, GCash, UPI, Alipay
ইত্যাদি কোনো ব্র্যান্ড নাম কোড, ডাটাবেস, UI বা কপিতে ব্যবহার করবে না; শুধু
"Global Payout Partners" এবং "Local Payment Methods via Licensed Partners"।
সব অঙ্ক Money টাইপে, numeric(18,4)। ওয়ালেট ব্যালান্স SERIALIZABLE। প্রতিটি
পেমেন্টে idempotency key — রিপ্লেতে দ্বিতীয়বার চার্জ হবে না। ওয়েবহুকে আগে
সিগনেচার ভেরিফাই, তারপর ডাটাবেস। কোনো TODO/FIXME/"Coming Soon"/টেস্ট ফাইল নয়।
কোনো any নয়, কোনো console.log নয়। path কমেন্ট বাধ্যতামূলক।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 07

এরপর STEP_07_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## চ্যাট ৯ — STEP_08 (ক্লায়েন্ট এক্সপেরিয়েন্স — ৩২৫ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ৯।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_08_client-experience.md

আমার স্টেপ: STEP_08 — Client Experience
ফিচার: ৩২৫টি (FEATURE_LIST.md লাইন ২১২৫–২৫০৮, ফিচার আইডি ১৭৬৭–২০৯১)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

এটি সমান্তরাল ওয়েভ। শুধু নিজের পাথে লেখো। STEP_08_client-experience.md-এর
৭টি ব্যাচ অনুসরণ করো: HMAC টোকেন, ক্লায়েন্ট পোর্টালের ৫টি পেজ, মেয়াদোত্তীর্ণ
টোকেন পেজ, ইমেইল জার্নি, টেন্যান্ট ব্র্যান্ডিং ও হোয়াইট-লেবেল, ডকুমেন্ট ইন্টিগ্রিটি,
ই-সিগন এভিডেন্স।

তোমার মালিকানাধীন পাথ: lib/portal/**, services/client-portal-service.ts,
services/branding-service.ts, services/email-journey-service.ts,
app/(client-portal)/**, app/api/portal/**, components/client/**,
config/permissions/08-portal.ts, migrations/0800-0899,
integrator/requests/step-08.json

শেয়ার্ড ফাইল বা অন্য স্টেপের ফোল্ডার এডিট করো না। দরকার হলে
integrator/requests/step-08.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। শুধু USD। ক্লায়েন্টের কোনো রোল নেই, কোনো
লগইন নেই — শুধু HMAC টোকেন, যা ডকুমেন্টের সাথে বাঁধা, মেয়াদসীমা আছে, রিভোক
করা যায়। টোকেন তুলনা constant-time। প্রতিটি টোকেন অ্যাক্সেস IP verdict সহ লগ
হবে। কোনো TODO/FIXME/"Coming Soon"/placeholder/টেস্ট ফাইল নয়। কোনো any নয়,
কোনো console.log নয়। path কমেন্ট বাধ্যতামূলক।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 08

এরপর STEP_08_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## চ্যাট ১০ — STEP_09 (ইন্টিগ্রেশন ও পাবলিক API — ৩২৩ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ১০।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_09_integrations.md

আমার স্টেপ: STEP_09 — Integrations and Public API
ফিচার: ৩২৩টি (FEATURE_LIST.md লাইন ২৫০৯–২৮৭৯, ফিচার আইডি ২০৯২–২৪১৪)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

এটি সমান্তরাল ওয়েভ। শুধু নিজের পাথে লেখো। STEP_09_integrations.md-এর ৮টি ব্যাচ
অনুসরণ করো: WhatsApp (Meta Cloud API), ৭টি সোশ্যাল অ্যাডাপ্টার, পাবলিক REST API v1,
আউটবাউন্ড ওয়েবহুক, ব্যাংক ফিড, রসিদ OCR, ই-সিগনেচার, মাল্টি-চ্যানেল মেসেজিং।

তোমার মালিকানাধীন পাথ: lib/whatsapp/**, lib/social/**, lib/ocr/**,
lib/bank-feed/**, lib/esignature/**, services/integration-service.ts,
services/webhook-service.ts, services/messaging-service.ts, app/api/public/**,
app/api/whatsapp/**, app/api/webhooks/shopify|woocommerce|whatsapp|outbound/**,
app/(dashboard)/integrations|messages|contracts/**,
components/integrations/**, config/permissions/09-integrations.ts,
config/nav/09-integrations.nav.ts, migrations/0900-0999,
integrator/requests/step-09.json

শেয়ার্ড ফাইল বা অন্য স্টেপের ফোল্ডার এডিট করো না। দরকার হলে
integrator/requests/step-09.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। প্রতিটি ইন্টিগ্রেশন ক্রেডেনশিয়াল AES-256-GCM
এনক্রিপ্টেড। পাবলিক API key হ্যাশ করে রাখতে হবে, প্লেইনটেক্সট একবারই দেখাবে।
আউটবাউন্ড ওয়েবহুক HMAC সাইনড ও টাইমস্ট্যাম্প উইন্ডো দিয়ে রিপ্লে-প্রুফ।
প্রতিটি অ্যাডাপ্টারের একটি ফিক্সচার অ্যাডাপ্টার থাকবে যেন অফলাইনেও কোডপাথ চলে।
কোনো TODO/FIXME/"Coming Soon"/টেস্ট ফাইল নয়। কোনো any নয়, কোনো
console.log নয়। path কমেন্ট বাধ্যতামূলক।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 09

এরপর STEP_09_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## চ্যাট ১১ — STEP_10 (অ্যাডমিন, CMS, SEO — ৪৯৯ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ১১।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_10_admin-marketing.md

আমার স্টেপ: STEP_10 — Admin, CMS, SEO and Marketing
ফিচার: ৪৯৯টি (FEATURE_LIST.md লাইন ২৮৮০–৩৪৫২, ফিচার আইডি ২৪১৫–২৯১৩)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

এটি সমান্তরাল ওয়েভ। শুধু নিজের পাথে লেখো। STEP_10_admin-marketing.md-এর ৮টি
ব্যাচ অনুসরণ করো: অ্যাডমিন ড্যাশবোর্ড, ইউজার ও টেন্যান্ট ম্যানেজমেন্ট,
ইমপারসোনেশন, অ্যাপ্রুভাল কিউ, CMS, ব্লগ, ইমেইল টেমপ্লেট ম্যানেজার, SEO ও ৮টি
JSON-LD, অ্যানালিটিক্স ও পিক্সেল, কনভারশন ও মার্কেটিং অটোমেশন।

তোমার মালিকানাধীন পাথ: lib/cms/**, lib/seo/**, lib/analytics/**,
lib/marketing/**, services/admin-service.ts, services/cms-service.ts,
services/blog-service.ts, services/seo-service.ts, app/(admin)/**,
app/api/admin/**, app/api/cms/**, app/api/blog/**, app/api/seo/**,
components/admin/**, config/permissions/10-admin.ts,
config/nav/10-admin.nav.ts, migrations/1000-1099,
integrator/requests/step-10.json

গুরুত্বপূর্ণ: app/(admin)/gateways, app/(admin)/payouts এবং
app/(admin)/disputes — এই তিনটি STEP_07-এর, তোমার নয়। এগুলোতে লেখো না।

শেয়ার্ড ফাইল এডিট করো না; দরকার হলে integrator/requests/step-10.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। রিচ টেক্সট লেখার সময় ও রেন্ডারের সময় দুবারই
DOMPurify দিয়ে স্যানিটাইজ। ইমপারসোনেশন সবসময় অডিট হবে এবং সময়সীমা থাকবে।
কোনো TODO/FIXME/"Coming Soon"/placeholder/টেস্ট ফাইল নয়। কোনো any নয়,
কোনো console.log নয়। path কমেন্ট বাধ্যতামূলক।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 10

এরপর STEP_10_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## চ্যাট ১২ — STEP_11 (পেরোল ও অ্যাকাউন্টিং — ২৬৪ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ১২।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_11_payroll-accounting.md

আমার স্টেপ: STEP_11 — Payroll, HR and Accounting
ফিচার: ২৬৪টি (FEATURE_LIST.md লাইন ৩৪৫৩–৩৭৬৯, ফিচার আইডি ২৯১৪–৩১৭৭)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

এটি সমান্তরাল ওয়েভ। শুধু নিজের পাথে লেখো। STEP_11_payroll-accounting.md-এর
১০টি ব্যাচ অনুসরণ করো: পেরোল, সেলফ-সার্ভিস পোর্টাল, HR, চার্ট অব অ্যাকাউন্টস,
জার্নাল এন্ট্রি, ফিন্যান্সিয়াল স্টেটমেন্ট, ব্যাংক রিকনসিলিয়েশন, ফিক্সড অ্যাসেট,
বাজেট, মাল্টি-বুক, পিরিয়ড ক্লোজ, ট্যাক্স।

তোমার মালিকানাধীন পাথ: lib/accounting/**, lib/payroll/**,
services/payroll-service.ts, services/hr-service.ts, services/ledger-service.ts,
services/journal-service.ts, services/statement-service.ts,
services/reconciliation-service.ts, services/asset-service.ts,
services/budget-service.ts, services/tax-service.ts,
app/(dashboard)/payroll|hr|accounting/**, app/api/payroll/**,
app/api/accounting/**, components/accounting/**, components/payroll/**,
config/permissions/11-accounting.ts, config/nav/11-accounting.nav.ts,
migrations/1100-1199, integrator/requests/step-11.json

শেয়ার্ড ফাইল বা অন্য স্টেপের ফোল্ডার এডিট করো না। দরকার হলে
integrator/requests/step-11.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। সব অঙ্ক Money টাইপে, numeric(18,4) — কখনো
JavaScript Number নয়। যে জার্নাল এন্ট্রি ব্যালান্স করে না তাকে রাউন্ড করে
মেলানো যাবে না — রিজেক্ট করতে হবে। পিরিয়ড ক্লোজের পর এন্ট্রি অপরিবর্তনীয়।
পেরোলে employee + period ডুপ্লিকেট ডিটেকশন বাধ্যতামূলক। কোনো TODO/FIXME/
"Coming Soon"/টেস্ট ফাইল নয়। কোনো any নয়, কোনো console.log নয়।
path কমেন্ট বাধ্যতামূলক।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 11

এরপর STEP_11_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## চ্যাট ১৩ — STEP_12 (সিকিউরিটি ফাউন্ডেশন — ২৭৩ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ১৩।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_12_security-core.md

আমার স্টেপ: STEP_12 — Security Foundation
ফিচার: ২৭৩টি (FEATURE_LIST.md লাইন ৩৭৭০–৪০৯৪, ফিচার আইডি ৩১৭৮–৩৪৫০)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

এটি সমান্তরাল ওয়েভ। শুধু নিজের পাথে লেখো। STEP_12_security-core.md-এর ১০টি
ব্যাচ অনুসরণ করো: RLS আইসোলেশন প্রমাণ, সিক্রেট ম্যানেজমেন্ট, ইনজেকশন ও XSS
প্রতিরোধ, বট ডিফেন্স, আপলোড গার্ড, লিংক গার্ড, GDPR/CCPA/PDPA, সাপ্লাই চেইন,
ওয়েবহুক সিকিউরিটি, কনকারেন্সি কন্ট্রোল।

তোমার মালিকানাধীন পাথ: lib/security/**, services/security-service.ts,
services/fraud-service.ts, app/api/security/**, app/(admin)/compliance/**,
config/permissions/12-security.ts, migrations/1200-1299,
integrator/requests/step-12.json

শেয়ার্ড ফাইল বা অন্য স্টেপের ফোল্ডার এডিট করো না। দরকার হলে
integrator/requests/step-12.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। SQL সবসময় প্যারামিটারাইজড — স্ট্রিং কনক্যাটেনেশন
নয়। কোনো eval() বা Function() নয়। innerHTML বা dangerouslySetInnerHTML
স্যানিটাইজ ছাড়া নয়। প্রতিটি রেজেক্স ReDoS চেক করা। সিক্রেট এনভেলপ
এনক্রিপশনে, লগে কখনো প্লেইনটেক্সট নয়। Zero Trust — ভেতর থেকে আসা রিকোয়েস্টও
বিশ্বাস করবে না। কোনো TODO/FIXME/"Coming Soon"/টেস্ট ফাইল নয়। কোনো any নয়,
কোনো console.log নয়। path কমেন্ট বাধ্যতামূলক।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 12

এরপর STEP_12_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## চ্যাট ১৪ — STEP_13 (স্টোরেজ, মিডিয়া, এজ কেস — ১৫৮ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ১৪।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_13_storage-media.md

আমার স্টেপ: STEP_13 — Storage, Media and Edge Cases
ফিচার: ১৫৮টি (FEATURE_LIST.md লাইন ৪০৯৫–৪২৭৬, ফিচার আইডি ৩৪৫১–৩৬০৮)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

এটি সমান্তরাল ওয়েভ। শুধু নিজের পাথে লেখো। STEP_13_storage-media.md-এর ৮টি ব্যাচ
অনুসরণ করো: Google Drive অ্যাডাপ্টার, Supabase ফলব্যাক, AES-256-GCM এনক্রিপশন,
resumable আপলোড, কোটা, ফাইল লাইফসাইকল, মিডিয়া অপটিমাইজেশন, এশিয়া-কেন্দ্রিক ও
B2B ফিচার, এজ কেস।

তোমার মালিকানাধীন পাথ: lib/storage/**, lib/media/**,
services/storage-service.ts, services/quota-service.ts, app/api/storage/**,
app/api/pdf/**, app/(dashboard)/files/**, components/storage/**,
config/permissions/13-storage.ts, migrations/1300-1399,
integrator/requests/step-13.json

শেয়ার্ড ফাইল বা অন্য স্টেপের ফোল্ডার এডিট করো না। দরকার হলে
integrator/requests/step-13.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। ফাইলের প্রাথমিক স্টোরেজ Google Drive, ফলব্যাক
Supabase Storage — প্রতিটি ফাইল রো-তে storage_provider লিপিবদ্ধ হবে। প্রতিটি
ফাইল আপলোডের আগে AES-256-GCM এনক্রিপ্টেড, কী টেন্যান্ট থেকে ডিরাইভড, কখনো
প্লেইনটেক্সটে সংরক্ষিত নয়। মেটাডাটা সবসময় Supabase-এ, বাইট শুধু Drive-এ।
Netlify-র ৬MB সীমার কারণে বড় আপলোড ব্রাউজার থেকে সরাসরি Drive-এ যাবে।
EXIF/GPS স্ট্রিপ বাধ্যতামূলক। কোনো TODO/FIXME/"Coming Soon"/টেস্ট ফাইল নয়।
কোনো any নয়, কোনো console.log নয়। path কমেন্ট বাধ্যতামূলক।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 13

এরপর STEP_13_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## চ্যাট ১৫ — STEP_14 (ডিপ্লয়, ক্রন, CI, ডকস — ১৫৮ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ১৫।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_14_deploy-cron.md

আমার স্টেপ: STEP_14 — Deploy, Cron, CI and Documentation
ফিচার: ১৫৮টি (FEATURE_LIST.md লাইন ৪২৭৭–৪৪৪৫)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

এটি সমান্তরাল ওয়েভ। শুধু নিজের পাথে লেখো। STEP_14_deploy-cron.md-এর ৯টি ব্যাচ
অনুসরণ করো: netlify.toml ও ফাংশন, Docker/VPS, ২০টি ক্রন জব, CI কোয়ালিটি গেট,
ডকুমেন্টেশন, অবজারভেবিলিটি, ডোমেইন ও ইমেইল ইনফ্রাস্ট্রাকচার, কাস্টমার
লাইফসাইকল, রিলিজ ও কস্ট অপস, ফাইনাল পলিশ।

তোমার মালিকানাধীন পাথ: lib/cron/**, services/cron-service.ts,
app/api/cron/**, app/api/health/**, netlify/functions/**, scripts/cron/**,
docs/adr/**, docs/ERD.md, README.md, CONTRIBUTING.md, SECURITY.md,
config/cron/**, config/permissions/14-ops.ts, migrations/1400-1499,
integrator/requests/step-14.json

লক্ষ্য করো: scripts/** ইন্টিগ্রেটরের, শুধু scripts/cron/ তোমার। শেয়ার্ড ফাইল
এডিট করো না; দরকার হলে integrator/requests/step-14.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। Netlify-র সীমা মানতে হবে — সিঙ্ক ১০ সেকেন্ড,
ব্যাকগ্রাউন্ড ২৬ সেকেন্ড, পে-লোড ৬MB। এর চেয়ে বড় কাজ ডাটাবেস-কিউ ও
ব্যাকগ্রাউন্ড ফাংশনে যাবে। প্রতিটি ক্রন জবে লিডার লক (pg_advisory_lock),
টাইমআউট, idempotency window ও ফেইলিউর অ্যালার্ট। কোনো TODO/FIXME/
"Coming Soon"/টেস্ট ফাইল নয়। কোনো any নয়, কোনো console.log নয়।
path কমেন্ট বাধ্যতামূলক।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 14

এরপর STEP_14_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## চ্যাট ১৬ — STEP_15 (জিরো ট্রাস্ট ও এনহান্সড সিকিউরিটি — ৪২১ ফিচার)

```
আমি KD SOLUTION IT বানাচ্ছি। এটি আমার ধাপ ১৬, সর্বশেষ ধাপ।

এই ক্রমে ফাইলগুলো পড়ো:
MASTER_PROMPT.md, IMPLEMENTATION_PLAN.md, SPEC_CONFLICTS.md,
docs/execution/README.md, docs/execution/CONTRACTS.md,
docs/execution/FILE_OWNERSHIP.md, docs/execution/STEP_FEATURES.md,
docs/execution/STEP_15_zero-trust.md

আমার স্টেপ: STEP_15 — Enhanced Security and Zero Trust
ফিচার: ৪২১টি (FEATURE_LIST.md লাইন ৪৪৪৬–৪৯১২, ফিচার আইডি ৩৬০৯–৪০২৯)
ব্রাঞ্চ: তোমার বরাদ্দ করা ব্রাঞ্চেই কাজ করো
PR টার্গেট: integration

এটি সমান্তরাল ওয়েভ। শুধু নিজের পাথে লেখো। STEP_15_zero-trust.md-এর ৯টি ব্যাচ
অনুসরণ করো: ইমিউটেবল অডিট লগ ও হ্যাশ চেইন, SIEM এক্সপোর্ট, ফ্রড ইঞ্জিন ও UBA,
জিরো ট্রাস্ট পলিসি, VPN/প্রক্সি/Tor ডিটেকশন ও ব্লক, ইনপুট সিকিউরিটি, চার্জব্যাক
এভিডেন্স প্যাক, ইউজার ট্র্যাকিং, এবং সম্পূর্ণ কনফ্লিকট ও ডুপ্লিকেট প্রতিরোধ।

তোমার মালিকানাধীন পাথ: lib/zerotrust/**, lib/audit/**, lib/siem/**,
lib/antifraud/**, services/audit-service.ts, services/siem-service.ts,
services/chargeback-evidence-service.ts, services/tracking-service.ts,
app/(admin)/audit/**, app/(admin)/fraud/**, app/api/audit/**,
config/permissions/15-zerotrust.ts, migrations/1500-1599,
integrator/requests/step-15.json

শেয়ার্ড ফাইল বা অন্য স্টেপের ফোল্ডার এডিট করো না। দরকার হলে
integrator/requests/step-15.json-এ লেখো।

কঠোর নিয়ম: সব কিছু ইংরেজিতে। অডিট লগ ডাটাবেস লেভেলেই append-only — UPDATE ও
DELETE revoke করা। হ্যাশ চেইন দিয়ে নীরব এডিট শনাক্ত হবে। Zero Tolerance মানে
লঙ্ঘন ধরা পড়লে অ্যাকশন ব্লক হবে, শুধু লগ হবে না। VPN/প্রক্সি/Tor ব্লক হবে
সাইনআপ, পেমেন্ট, KYC ও প্রতিটি অ্যাডমিন রুটে; ফিড না থাকলেও যেন ডিসিশন পাথ
চলে সেজন্য ফিক্সচার ফিড রাখো। প্রতিটি editable টেবিলে version কলাম ও
কনফ্লিক্ট UI। কোনো TODO/FIXME/"Coming Soon"/টেস্ট ফাইল নয়। কোনো any নয়,
কোনো console.log নয়। path কমেন্ট বাধ্যতামূলক।

শেষে এগুলো চালাও এবং আউটপুট দেখাও:
npm run typecheck
npm run lint
npm run build
npm run verify
npm run verify-db
npm run check-boundaries -- --step 15

এরপর STEP_15_COMPLETED.md তৈরি করো, কমিট করো, পুশ করো, PR খোলো।
```

---

## সব চ্যাট শেষ হওয়ার পর (ইন্টিগ্রেটর)

১৬টি PR যখন খোলা থাকবে, তখন একটি চ্যাটে এই নির্দেশনা দিন:

```
তুমি ইন্টিগ্রেটর। integration ব্রাঞ্চে STEP_06 থেকে STEP_15-এর PR আছে।
docs/execution/README.md সেকশন ৫ অনুযায়ী কাজ করো:

১। PR গুলো সংখ্যার ক্রমে (06, 07, 08 ... 15) একটি একটি করে মার্জ করো।
২। প্রতিটি মার্জের পরে চালাও: npm run verify, npm run verify-db, npm run build।
   কোনোটি লাল হলে থামো, পরেরটি মার্জ করো না।
৩। integrator/requests/step-*.json ফাইলগুলো ধাপের ক্রমে অ্যাপ্লাই করো —
   ডিপেন্ডেন্সি, ENV, enum, nav, permissions, cron, CSP।
৪। কোনো কনফ্লিক্ট হলে হাত দিয়ে অন্য স্টেপের ফাইল এডিট করো না;
   ব্রাঞ্চ ঠিক করতে বলো।
৫। শেষে docs/feature-coverage.md জেনারেট করো এবং দেখাও ৪১৮৭/৪১৮৭।
৬। সবুজ হলে integration থেকে main-এ PR খোলো।
```
