# Project Memory & Decision Log (`memory.md`)

## Core Architectural Decisions
- **Product Model:** Multi-tenant white-label Restaurant Dine-In SaaS with a built-in Super Admin "2-Minute Pitch Cloner" for live in-person restaurant sales demos.
- **Routing:** Path-based multi-tenancy (`/r/[slug]/t/[tableCode]`) chosen over subdomains for zero-DNS instant demo provisioning.
- **Order Safety:** Guest orders enter as `PENDING_APPROVAL` and require 1-tap Floor Staff approval before hitting KDS to prevent prank orders.
- **Staff Auth:** 4-digit PIN per restaurant (`staff_users`) instead of email/password for fast floor/kitchen tablet login.
- **Super Admin Auth:** Master passkey validated server-side setting a 7-day secure HTTP-only cookie (`dineos_super_admin=authenticated`).
- **Dynamic White-Label Tokens:** `--brand-primary` injected at `/r/[slug]` layout level from `restaurants.primary_color`, guaranteeing zero hardcoded colors on Guest surfaces.

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
- [x] **Phase 2 Completed**: Guest Mobile Web App, Dynamic White-Label Branding & Realtime Shared Table Cart:
  - `src/app/r/[slug]/layout.tsx`: Dynamic `--brand-primary` CSS variable wrapper + tenant status guard (`PAUSED`, demo expiration).
  - `src/app/r/[slug]/t/[tableCode]/page.tsx`: Table validator, category/menu item loader, active session & order loader.
  - `src/app/r/[slug]/actions.ts`: Multi-tenant scoped server actions (`joinOrCreateTableSession`, `addToSharedCart`, `updateCartItemQuantity`, `placeSharedOrder`, `createServiceRequest`).
  - `src/components/guest/*`: Mobile-first 375px components:
    - `GuestAppShell.tsx`: Supabase Realtime channel subscription, local identity sync, sticky cart/tracker bottom bar.
    - `TableJoinModal.tsx`: Branded welcome bottom-sheet with existing tablemates list and guest name onboarding.
    - `GuestHeader.tsx`: Restaurant branding, table badge, active diners counter, Wi-Fi popover with 1-click password copy, service call button.
    - `ServiceRequestModal.tsx`: 1-tap presets for Water, Napkins, Call Waiter, Request Bill.
    - `MenuExplorer.tsx`: Search, Pure Veg filter, category scroll bar, and rich dish cards.
    - `DishDetailDrawer.tsx`: Variant selection, spice badges, allergen tags, special instructions notes, quantity stepper.
    - `SharedCartDrawer.tsx`: Shared live table cart showing who added which dish, quantity controls, GST breakdown, "Pairs Well With" upsells, and "Place Table Order" action.
    - `LiveOrderTracker.tsx`: Live order status stepper (`Sent to Staff` → `In Kitchen` → `Food Ready` → `Served`) + running bill summary modal.
- [x] **Phase 3 Completed**: Staff Operations, PIN Gate, Waiter Floor Map & Station-Routed KDS:
  - `src/app/staff/[slug]/actions.ts`: 4-digit PIN verification (`verifyStaffPin`), HTTP-only 12-hour session cookies (`dineos_staff_<slug>`), order approval (`approveOrder`), rejection (`rejectOrder`), item prep updates (`updateOrderItemPrepStatus`), order ready bump (`bumpOrderReady`), order served (`markOrderServed`), service request resolver (`resolveServiceRequest`), and table reset (`resetTableSession`).
  - `src/components/staff/StaffPinGate.tsx`: Dark-mode 4-digit numeric keypad with touch targets, PIN dots, and quick demo presets (1111 Manager, 2222 Waiter, 3333 Kitchen).
  - `src/app/staff/[slug]/floor/page.tsx` & `src/components/staff/FloorDashboard.tsx`: High-contrast dark operational floor map subscribing to Supabase Realtime (`tables`, `orders`, `service_requests`, `table_sessions`), live color-coded table tiles (FREE, ORDERING, PENDING_APPROVAL, EATING, HELP, BILL), incoming order approval queue with 1-tap Send to Kitchen, live service request alert bar with 1-tap Resolve, synthesised Web Audio chimes, and table detail drawer.
  - `src/app/staff/[slug]/kds/page.tsx` & `src/components/staff/KdsBoard.tsx`: Station-routed Kitchen Display System with dynamic station filter tabs (Tandoor, Main Course, Beverages & Desserts), elapsed timers with color-coded tickets (emerald <8m, amber 8-15m, red >15m), item-level status advancement (QUEUED -> PREPARING -> READY), and 1-tap "Bump Entire Order Ready" button.
- [x] **Phase 4 Completed**: Smart Bill & Split Engine, Razorpay/UPI Checkout & Smart Google Review Funnel:
  - `src/app/r/[slug]/checkout-actions.ts`: Server actions scoped by `restaurant_id` (`recordTablePayment`, `submitGuestReview`) inserting `PAID` payments records, transitioning table status to `'BILL'`, creating service notifications, and persisting guest feedback.
  - `src/app/api/payments/razorpay/route.ts`: App Router POST endpoint creating Razorpay orders with automatic fallback to `{ demoMode: true }` when test placeholders are present, preventing live demo crashes.
  - `src/components/guest/BillCheckoutDrawer.tsx`: Multi-mode checkout drawer supporting Full Bill, Equal Split (stepper for 2-10 diners), and Itemized By Person split (with proportional GST allocation), Tip chips (₹0, ₹20, ₹50, 10%), dynamic payment selection (Instant UPI, Card/Razorpay, Cash to Staff), and order settlement trigger.
  - `src/components/guest/PostPaymentReviewModal.tsx`: Post-checkout star review funnel intercepting ratings (4–5 stars redirects to Google Review URL or Google Maps search; 1–3 stars routes feedback privately to the internal owner reviews database).
  - Connected `LiveOrderTracker.tsx` and `GuestAppShell.tsx` to launch the unified bill and review flow.
  - Updated `FloorDashboard.tsx` with a distinct `BILL PAID` emerald/violet badge on floor map tiles and in the table drawer.
- [x] **Phase 5 Completed**: Restaurant Owner Admin Portal, Branded SaaS Landing Page & Production RLS Security:
  - `src/app/admin/[slug]/page.tsx`: Server component protected by `StaffPinGate` enforcing `OWNER` role (`1111` PIN), loading real-time revenue, tables, categories, menu items, stations, orders, payments, and reviews in parallel.
  - `src/app/admin/[slug]/actions.ts`: Multi-tenant scoped server actions (`toggleMenuItemAvailability`, `updateMenuItemPrice`, `createMenuItem`, `deleteMenuItem`, `updateRestaurantSettings`, `logoutOwner`).
  - `src/components/admin/OwnerAdminDashboard.tsx`: High-contrast SaaS owner control room with 4 tabs:
    - **Overview & Revenue**: KPI cards (Today's Revenue, Total Paid Bills, Total Orders, Average Rating), recent payments ledger table, and private feedback inbox highlighting 1–3★ private feedback vs 4–5★ Google redirects.
    - **Menu & Live Stock Manager**: Category & Veg filtering, live search, 1-tap 86'd stock toggle (`is_available`), inline price editor, dish deletion, and full "Add New Dish" modal.
    - **QR Standees & Tables**: Grid of all tables (`T1..Tn`) with `QRCodeSVG` cards, live URLs, 1-click copy, and "Print All Table QRs" print-friendly view (`@media print` formatted for table tent cards).
    - **Restaurant Settings**: Live configuration form for name, primary brand color (hex + picker), tax percentage, Wi-Fi SSID & password, UPI ID, and Google Review URL.
  - `src/app/page.tsx`: Sleek, modern DineOS showcase landing page highlighting the 4 core pillars, live interactive demo switcher for tenant `garnish-annex`, architecture breakdown, and zero-DNS multi-tenancy highlights.
  - `supabase/rls_policies.sql`: Production PostgreSQL script enabling Row-Level Security across all 13 tables (`restaurants`, `staff_users`, `kitchen_stations`, `tables`, `menu_categories`, `menu_items`, `table_sessions`, `cart_items`, `orders`, `order_items`, `service_requests`, `payments`, `reviews`) with scoped policies for public anonymous guests and service role bypass.

## Known Issues / Pending Setup
- Supabase project SQL execution pending (run SQL blocks from `database.md` in Supabase SQL Editor).
- Razorpay test keys pending in `.env.local`.
