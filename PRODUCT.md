# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase: Next.js (App Router) + Tailwind CSS v4 + Supabase (Auth, Realtime, RLS) + Razorpay/UPI. Deployed on Vercel. Mobile web only for guests (no native app, no app download).

## Users

DineOS has five audiences with very different situations:

- **Dining guests** (end customers): scan a table QR on their own phone (375–430px) in a restaurant, often in dim light, often one-handed, often as a group of 2–6 people sharing one table cart. Job: browse, order together, track the food, split and pay the bill. No login, only a first name.
- **Floor staff / waiters**: tablet or phone on the floor, busy hands. Job: approve incoming guest orders before they reach the kitchen, resolve service calls, settle cash bills. 4-digit PIN.
- **Kitchen staff**: wall- or counter-mounted screen, glare, gloves, wet hands, read from a distance. Job: work station-filtered tickets against prep timers and mark items or orders ready. 4-digit PIN.
- **Restaurant owners**: laptop or phone, mostly in the daytime. Job: manage menu, stations, tables, printable QR codes, staff PINs, branding and sales analytics. Email/password.
- **The founder (Super Admin)**: sells DineOS by walking into restaurants and generating a branded live demo tenant in about two minutes. Also manages the tenant lifecycle (DEMO, TRIAL, ACTIVE, PAUSED).

## Product Purpose

DineOS is a multi-tenant, white-label B2B SaaS that turns every restaurant table into a shared, real-time ordering, service and checkout surface with no app download. Success: guests order and pay without waiting for staff, the kitchen runs on live tickets and timers, and owners can be onboarded from a pitch demo without rework.

## Positioning

- Order approval gate: guest orders enter as `PENDING_APPROVAL` and a waiter verifies the table in one tap before the kitchen sees them, which stops prank and accidental orders.
- Shared live table cart across every phone at the table, with attribution of who added what.
- Station-routed KDS with elapsed-time escalation.
- Split billing (full, equal, by person) and a review funnel that sends 4-5 star ratings to Google and keeps 1-3 star ratings private.
- Zero-DNS white-labelling: a tenant is live instantly at `/r/[slug]` with its own brand color.

## Operating Context

- The live URL doubles as the sales demo environment. The 2-Minute Pitch Cloner seeds stations, menu items, tables and staff PINs for a new tenant.
- Guest screens are viewed on phones; on desktop they appear in a centered phone-width frame.
- Staff and KDS screens run on tablets and monitors from 768px to 1440px.
- The owner QR tab is printed.
- Staff and KDS rely on audio chimes, so a browser audio-unlock step is required.
- Demo PINs are intentionally public on the landing page and PIN gate: Owner 1111, Waiter 2222, Kitchen 3333.

## Capabilities and Constraints

- Routes: `/` landing, `/r/[slug]/t/[tableCode]` guest, `/staff/[slug]/floor` and `/staff/[slug]/kds` staff, `/admin/[slug]` owner, `/super-admin` founder.
- Table states: FREE, ORDERING, PENDING_APPROVAL, EATING, HELP, BILL.
- Hard rules (see `CLAUDE.md`): every query filters by `restaurant_id`; guest routes use `var(--brand-primary)` and never hard-coded brand colors; schema names follow `docs/database.md`; business logic (tax, split math, preset seeding) lives in `src/lib/`.
- Frozen for any UI work: server actions, Supabase Realtime subscriptions, RLS policies, and the Razorpay/UPI payment and HMAC verification flow.
- Currency is INR (₹); tax is GST.
- Guests must see zero horizontal overflow at 375px.
- Undecided: whether the table mini-game (PRD v1.5) ships.

## Brand Commitments

- Product name: DineOS.
- Tenant brand color comes from `restaurants.primary_color` and is injected as `--brand-primary`. Fallback is saffron `#EA580C`.
- Theme by surface (user-confirmed): Guest = light and warm; Staff Floor and KDS = dark; Super Admin = dark; Owner Admin = light (owners print QR codes and work in the daytime).

## Evidence on Hand

- Live demo tenant `garnish-annex` at https://restaurant-saas-work.vercel.app/ .
- Security audit reports in `audits/`.
- A Playwright e2e spec in `tests/dineos-e2e.spec.ts`.
- No customer testimonials, case studies, pricing or benchmarks exist. Future work must not invent them.

## Product Principles

1. Read at a glance: a state that matters (new order, overdue ticket, service call) must be recognizable without reading small text.
2. The tenant's brand leads on guest screens; DineOS stays in the background.
3. Touch comfort scales with the user's hands: 48px or larger for guests, 56px or larger for the kitchen.
4. Motion carries meaning (a new order, a state change), never ambient decoration, and respects reduced-motion.
5. Presentation changes never touch behavior: logic, data access and payment flows stay as they are.

## Accessibility & Inclusion

- Target WCAG 2.1 AA contrast (per `design-system/dineos/MASTER.md`), including text on a tenant's arbitrary brand color.
- Status is never conveyed by color alone.
- Interactive elements use real buttons/links with keyboard and focus support, and drawers behave as proper dialogs.
- Respect `prefers-reduced-motion`.
