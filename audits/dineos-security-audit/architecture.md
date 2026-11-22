# DineOS Architecture & Trust Boundary Map

## 1. System Overview

DineOS is a multi-tenant, white-label QR smart dine-in operating system designed for restaurants. It provides four distinct web interfaces served via a single Next.js 16 App Router application backed by Supabase (PostgreSQL + Realtime):

1. **Super Admin Control Room (`/super-admin`)**: Global multi-tenant administration and 2-minute pitch demo cloner.
2. **Guest Mobile Web App (`/r/[slug]/t/[tableCode]`)**: Browser-based digital ordering, real-time shared table cart, and bill checkout.
3. **Staff Operations (`/staff/[slug]/floor` & `/staff/[slug]/kds`)**: Waiter floor map and station-routed kitchen display system with PIN-based access.
4. **Restaurant Owner Portal (`/admin/[slug]`)**: Managerial dashboard for menu pricing, 86'd stock management, table QR generation, and revenue metrics.

---

## 2. Trust Boundaries & Roles

```
               +-------------------------------------------------------+
               |                 Super Admin Boundary                  |
               | Passkey Gate -> HTTP-only 'dineos_super_admin' Cookie |
               +-------------------------------------------------------+
                                          |
                                          v
+----------------------------------------------------------------------------------+
|                              Tenant Trust Boundary                               |
|                         Scoped by 'restaurants.id' / slug                        |
|                                                                                  |
|  +------------------------------+             +-------------------------------+  |
|  |     Owner Admin Boundary     |             |      Staff Floor/KDS          |  |
|  | 4-digit PIN (1111) -> Cookie |             | 4-digit PIN (2222/3333)       |  |
|  +------------------------------+             +-------------------------------+  |
|                 |                                             |                  |
|                 +---------------------+-----------------------+                  |
|                                       v                                          |
|                       +-------------------------------+                          |
|                       |  Guest Dine-In Trust Boundary  |                          |
|                       | Seated at Table (Session ID)  |                          |
|                       +-------------------------------+                          |
+----------------------------------------------------------------------------------+
                                          |
                                          v
               +-------------------------------------------------------+
               |                  Database Layer                       |
               | Supabase PostgreSQL + Row-Level Security (RLS)        |
               | - Service Role (Full bypass for Server Actions)       |
               | - Public Anon Client (Browser Realtime subscriptions) |
               +-------------------------------------------------------+
```

### 2.1 Principal Definitions
- **Super Administrator**: Master operator with authority to provision, pause, and delete tenants.
- **Restaurant Owner / Manager**: Tenant operator with authority to edit prices, 86 dishes, view full payments, and configure credentials.
- **Staff (Waiter / Kitchen)**: Floor and culinary operators authorized to approve orders, update prep timers, mark items ready/served, and resolve service calls.
- **Guest / Diner**: Unauthenticated end-consumer seated at a specific table who can join table sessions, add items to cart, place orders, and pay.
- **Anonymous Public**: Any actor on the internet with access to public endpoints and frontend bundles.

---

## 3. Data Flow & Transaction Lifecycles

### 3.1 Order Lifecycle
1. Guest scans table QR code (`/r/[slug]/t/[tableCode]`).
2. Guest joins or creates `table_sessions` row (`tables.status = 'ORDERING'`).
3. Guests add dishes to `cart_items` (synchronized via Supabase Realtime).
4. Order placed: `cart_items` atomically moved to `orders` and `order_items` (`status = 'PENDING_APPROVAL'`).
5. Waiter receives notification and calls `approveOrder`: updates `orders.status = 'IN_KITCHEN'` and `tables.status = 'EATING'`.
6. Kitchen stations advance item prep (`QUEUED` -> `PREPARING` -> `READY`).
7. Waiter serves food and marks `SERVED`.

### 3.2 Payment & Settlement Lifecycle
1. Diners request bill (`tables.status = 'BILL'`).
2. Payment recorded via `recordTablePayment` (`method`: `UPI`, `CARD`, `CASH`).
3. Table session closed and table reset via `resetTableSession` (`tables.status = 'FREE'`).

---

## 4. Key Attack Surfaces Reviewed

1. **Server Action Remote Procedure Calls (RPC)**:
   - Next.js server actions are publicly reachable POST endpoints. Any exported server action can be called directly by forging an action request header.
2. **Client vs Database Isolation**:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is shipped to browsers. The Postgres RLS policies in `supabase/rls_policies.sql` dictate what public clients can query or mutate directly without traversing Next.js server actions.
3. **Price & Payment Integrity**:
   - Cart additions and checkout calculations must strictly rely on server-side pricing data rather than client-submitted numbers.
4. **PIN Authentication**:
   - 4-digit PIN keyspace (10,000 combinations) without external throttle represents high brute-force risk.
