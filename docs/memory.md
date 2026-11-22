# Project Memory & Decision Log (`memory.md`)

## Core Architectural Decisions
- **Product Model:** Multi-tenant white-label Restaurant Dine-In SaaS with a built-in Super Admin "2-Minute Pitch Cloner" for live in-person restaurant sales demos.
- **Routing:** Path-based multi-tenancy (`/r/[slug]/t/[tableCode]`) chosen over subdomains for zero-DNS instant demo provisioning.
- **Order Safety:** Guest orders enter as `PENDING_APPROVAL` and require 1-tap Floor Staff approval before hitting KDS to prevent prank orders.
- **Staff Auth:** 4-digit PIN per restaurant (`staff_users`) instead of email/password for fast floor/kitchen tablet login.
- **Super Admin Auth:** Master passkey validated server-side setting a 7-day secure HTTP-only cookie (`dineos_super_admin=authenticated`).

## Completed Milestones
- [x] Documentation & architecture specifications finalized (`PRD.md`, `database.md`, `Architecture.md`, `design.md`, `phases.md`, `CLAUDE.md`).
- [x] Core setup: Next.js 15, Tailwind CSS, shadcn/ui base, Supabase client & server-side admin clients, strict TypeScript types (`src/types/database.ts`).
- [x] Cuisine Presets built (`src/lib/presets/cuisines.ts`): North Indian & Mughlai, Specialty Cafe & Bistro, and Fast Food / QSR with realistic images, prices, spice levels, allergens, and variants.
- [x] **Phase 1 Completed**: Super Admin Control Room & 2-Minute Pitch Cloner:
  - `src/app/super-admin/actions.ts`: Server actions for passkey verification, session cookie management, atomic demo provisioning (`cloneRestaurantDemo`), tenant status transitions (`updateTenantStatus`), and cascade deletion (`deleteTenant`).
  - `src/components/super-admin/SuperAdminLogin.tsx`: Dark-mode passkey gatekeeper.
  - `src/components/super-admin/SuperAdminDashboard.tsx`: High-contrast control room with live slug preview, color picker, preset selector, table count slider, tenant listing with live status badges, 1-click links for all 3 surfaces, and printable Table 1 QR preview modal (`qrcode.react`).
  - `src/app/super-admin/page.tsx`: Server component handling cookie verification and tenant fetching.
  - Tailwind CSS v4 & PostCSS pipeline configured (`@tailwindcss/postcss` in `postcss.config.mjs`, verified production build and live `/super-admin` styling).

## Known Issues / Pending Setup
- Supabase project SQL execution pending (run SQL blocks from `database.md` in Supabase SQL Editor).
- Razorpay test keys pending in `.env.local`.
