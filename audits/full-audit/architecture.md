# DineOS Comprehensive Architecture & Security Boundary Map

## 1. System Architecture Overview

DineOS is an event-driven, multi-tenant digital operating system for dine-in restaurants. The application is built on Next.js 16 (React 19, Turbopack) and Supabase (PostgreSQL with Row-Level Security and Realtime WebSocket streaming).

```
                                  [ User Browsers ]
                                          |
                +-------------------------+-------------------------+
                |                         |                         |
                v                         v                         v
     [ Guest Mobile Web ]         [ Staff Floor / KDS ]     [ Owner Admin / Super Admin ]
   /r/[slug]/t/[tableCode]         /staff/[slug]/*               /admin/[slug]
                                                                 /super-admin
                |                         |                         |
                +-------------------------+-------------------------+
                                          |
                                          v
                            [ Next.js 16 App Router ]
                     Server Actions & Route Handlers (Edge/Node)
                                          |
                        +-----------------+-----------------+
                        |                                   |
                        v                                   v
             [ Supabase PostgreSQL ]              [ Razorpay Payment Gateway ]
          13 Tables with Row-Level Security       REST Orders & Webhook Signatures
          Realtime WebSocket Stream
```

---

## 2. Core Subsystems & Surfaces

| Subsystem | Primary Routes & Files | Primary Responsibilities |
| :--- | :--- | :--- |
| **Super Admin** | `src/app/super-admin/*` | Tenant provisioning (2-min cloner), status transitions (`DEMO`, `ACTIVE`, `PAUSED`), deletion. |
| **Owner Admin** | `src/app/admin/[slug]/*` | Menu management, pricing updates, 86'd stock toggle, QR code exports, revenue tracking. |
| **Staff Floor & KDS** | `src/app/staff/[slug]/*` | 4-digit PIN authentication, order approval queue, KDS station tickets, table reset. |
| **Guest Web App** | `src/app/r/[slug]/*` | Dynamic white-label branding, digital menu, shared table cart, service requests. |
| **Billing & Payments** | `src/app/r/[slug]/checkout-actions.ts`, `/api/payments/razorpay` | Split bill calculation, Razorpay order creation, payment recording, review funnel. |
| **Database & Security** | `supabase/rls_policies.sql`, `src/lib/supabase/*` | 13 multi-tenant tables, Row-Level Security policies, Realtime changes publication. |

---

## 3. Trust Boundaries & Privileged Identities

1. **Super Administrator Boundary**:
   - Master credential authenticated against `process.env.SUPER_ADMIN_PASSKEY`.
   - Grants global cross-tenant visibility and management.
2. **Tenant Owner Boundary**:
   - 4-digit PIN authenticated against `staff_users` with `role = 'OWNER'`.
   - Controls menu items, pricing, business branding, and financial ledgers for that single tenant.
3. **Staff Floor / Kitchen Boundary**:
   - 4-digit PIN authenticated against `staff_users` with `role = 'WAITER'` or `role = 'KITCHEN'`.
   - Permitted to approve orders, bump KDS tickets, serve food, and resolve call-waiter requests.
4. **Guest Diner Boundary**:
   - Seated diner assigned a randomized `guest_id` inside `table_sessions.guests`.
   - Permitted to add items to the shared cart and trigger table orders.
5. **Anonymous Public**:
   - External internet users accessing public URLs and browser bundles containing `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## 4. Multi-Tenant Data Isolation Strategy

- **Path-Based Multi-Tenancy**: Tenants are partitioned by `/r/[slug]` and `/staff/[slug]`.
- **Database Tenant Guarding**: Every database table features a foreign key `restaurant_id REFERENCES restaurants(id) ON DELETE CASCADE`.
- **Dual Supabase Clients**:
  - `createBrowserClient` (using `NEXT_PUBLIC_SUPABASE_ANON_KEY`): Used for client-side Supabase Realtime WebSocket subscriptions.
  - `supabaseAdmin` (using `SUPABASE_SERVICE_ROLE_KEY`): Used exclusively inside server actions for administrative database mutations.
