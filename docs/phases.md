# Build Execution Roadmap (`phases.md`)

## Phase 1: Project Setup, Database & Super Admin Demo Cloner
- [ ] Initialize Next.js 15 (TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Lucide, `qrcode.react`).
- [ ] Configure Supabase clients (`client.ts`, `server.ts`) and TypeScript types from `database.md`.
- [ ] Build `src/lib/presets/cuisines.ts` (North Indian, Cafe & Bakery, Fast Food/QSR seed data).
- [ ] Build `/super-admin` dashboard with **2-Minute Pitch Cloner** (creates tenant, stations, categories, menu items, tables `T1..Tn`, and default staff PINs).

## Phase 2: Guest Web App (Menu, Shared Cart & Service Calls)
- [ ] Build `/r/[slug]/t/[tableCode]` dynamic brand wrapper (`--brand-primary` + status check for `PAUSED` tenants).
- [ ] Build Guest Name onboarding modal & `table_sessions` join/create logic.
- [ ] Build Menu UI (Veg/Non-Veg filter, spice/allergen badges, variants modal, "Pairs Well With" upsells).
- [ ] Implement Supabase Realtime **Shared Table Cart** (`cart_items`) and **1-Tap Call Waiter** (`service_requests`).

## Phase 3: Staff Floor Map & Kitchen Display System (KDS)
- [ ] Build `/staff/[slug]/login` 4-digit PIN authentication + audio chime unlock.
- [ ] Build `/staff/[slug]/floor` Live Floor Map (`FREE`, `ORDERING`, `PENDING_APPROVAL`, `EATING`, `HELP`, `BILL`), Order Approval modal, and Waiter Call resolver.
- [ ] Build `/staff/[slug]/kds` Station-filtered KDS board with live color-coded prep timers and "Mark Ready" actions.

## Phase 4: Guest Tracker, Split Bill, Razorpay & Review Gate
- [ ] Build `/r/[slug]/t/[tableCode]/tracker` live order progress stepper + 1-tap Wi-Fi password copy.
- [ ] Build `/r/[slug]/t/[tableCode]/bill` with Equal Split, Item-wise Split, Tip selector, Razorpay Test Mode integration, and Cash payment request.
- [ ] Build Smart Review Gate (4–5 stars → Google Review URL; 1–3 stars → internal DB feedback).

## Phase 5: Restaurant Owner Admin Panel
- [ ] Build `/admin/[slug]` Menu CRUD, Station assignment, In-Stock toggle, Table & Printable QR Code exporter, Staff PIN manager, and Branding settings.