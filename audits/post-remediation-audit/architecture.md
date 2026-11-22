# DineOS System Architecture & Security Posture Summary

## 1. Product & Tenancy Model
DineOS is a multi-tenant white-label Restaurant Dine-In SaaS built with Next.js 16 (App Router, Turbopack) and Supabase PostgreSQL.
The system provides zero-DNS instant tenant provisioning using path-based tenant isolation (`/r/[slug]` for guests, `/staff/[slug]` for floor captain & KDS stations, and `/admin/[slug]` for the restaurant owner).

## 2. Core Principals & Trust Boundaries
- **Anonymous Guest (Lowest Trust):** Accesses `/r/[slug]/t/[tableCode]`. Can join an active table session, browse menus, and append items to a shared table cart. Cannot modify menu pricing, cannot approve orders to kitchen, and cannot read payments or private reviews.
- **Floor Staff & Kitchen (Semi-Trusted):** Accesses `/staff/[slug]/floor` and `/staff/[slug]/kds`. Authenticates via 4-digit numeric PIN verified server-side with in-memory lockout. Sessions are persisted in HTTP-only `dineos_staff_<slug>` cookies. Can approve orders to kitchen, advance prep tickets, mark served, and reset tables. Cannot access other tenant records.
- **Restaurant Owner (Tenant Admin):** Accesses `/admin/[slug]`. Authenticates with `OWNER` role PIN. Can manage menu stock (86'd), update pricing, view private customer feedback, and configure restaurant branding. Scoped strictly to `restaurant_id`.
- **Platform Super Admin (Platform Operator):** Accesses `/super-admin`. Authenticated via master passkey ($ge 16$ characters) using constant-time equality check (`crypto.timingSafeEqual`) and HMAC-SHA256 signed session cookie. Can provision demo tenants and update tenant lifecycle statuses.

## 3. Technology Stack & Defenses
- **Frontend / Fullstack:** Next.js 16.4.6, React 19, Tailwind CSS v4.
- **Database / Realtime:** Supabase PostgreSQL with Row-Level Security (RLS) on all 13 core tables.
- **Server Execution:** Next.js Server Actions execute with `supabaseAdmin` (`service_role` key) behind strict authorization guards (`requireStaffAuth`, `verifyOwnerSession`, `isSuperAdminAuthenticated`).
- **Payment Gateway:** Razorpay App Router endpoint with seamless fallback to offline demo simulation when placeholder test credentials are used.

## 4. Verification & Hardening Results
All 7 previously identified attack surfaces have been evaluated independently from scratch:
1. Operational Staff mutations strictly require `requireStaffAuth` with tenant match.
2. Direct client writes and financial reads are denied in RLS policies.
3. Cart item insertion computes authoritative prices server-side from `menu_items`.
4. Payment recording validates order totals against non-cancelled orders and verifies Razorpay HMAC signatures.
5. PIN entry enforces 5-attempt rate-limiting lockout; passkey checks use constant-time comparison and HMAC cookies.
6. External Google review redirects enforce `https://` protocol validation.
7. Next.js image proxying restricts remote patterns to trusted CDNs with wildcard hosts removed.
