# Product Requirements Document (PRD)
## Project: DineOS — Multi-Tenant QR Smart Dine-In & White-Label Restaurant SaaS

---

## 1. Product Vision & Business Model
DineOS is a multi-tenant, white-label B2B SaaS platform that turns any restaurant's tables into a real-time digital ordering, service, and checkout ecosystem without requiring customers to download an app.

### Go-To-Market (Sales Pitch) Engine
- **Instant White-Labeling:** Every restaurant tenant gets dynamic branding (`name`, `logo`, `primary_color`, `cover_image`, `upi_id`, `wifi_credentials`, `google_review_url`) applied automatically across the Guest Web App.
- **2-Minute Pitch Generator (Super Admin):** Allows the SaaS founder to generate a fully populated, branded demo tenant in under 2 minutes using **Cuisine Presets** (North Indian, Cafe, QSR, Lounge) before walking into a restaurant for a live demo.
- **Zero-Rework Conversion:** A `DEMO` tenant seamlessly upgrades to `TRIAL` or `ACTIVE` without re-creating data or changing QR URLs.

---

## 2. User Roles & Surfaces

| Surface | Route | Auth Method | Core Responsibility |
| :--- | :--- | :--- | :--- |
| **Guest Web App** | `/r/[slug]/t/[tableCode]` | No Login (Session + Guest Name) | Browse menu, shared table cart, live order tracking, 1-tap waiter calls, table mini-games, bill split, UPI/Card/Cash checkout, review prompt. |
| **Floor / Waiter App** | `/staff/[slug]/floor` | 4-Digit Staff PIN | Live table map, approve incoming guest orders ("Send to Kitchen"), resolve 1-tap waiter calls, manage cash bill settlements. |
| **Kitchen Display (KDS)** | `/staff/[slug]/kds` | 4-Digit Staff PIN | Station-filtered live order tickets, color-coded prep timers, 1-tap item/order "Mark Ready". |
| **Restaurant Admin** | `/admin/[slug]` | Email/Password (Supabase Auth) | Manage menu, kitchen stations, tables & printable QR codes, staff PINs, branding, and sales analytics. |
| **Super Admin (Founder)** | `/super-admin` | Master Admin Auth | Create tenants, clone cuisine presets for live pitches, manage tenant lifecycle (`DEMO`, `TRIAL`, `ACTIVE`, `PAUSED`). |

---

## 3. Core Functional Requirements (MVP — v1.0)

### 3.1 Guest Web App (`/r/[slug]/t/[tableCode]`)
1. **Frictionless Onboarding:**
   - Scanning a table QR opens the branded restaurant menu immediately.
   - Guest enters their **First Name** to join or start the table's active `table_session`.
   - Multiple guests scanning the same table QR automatically join the **same live session**.
2. **Smart Menu & Upsells:**
   - Category tabs, Veg / Non-Veg toggle, search bar.
   - Dish cards displaying image, price, prep time, spice level (`MILD`, `MEDIUM`, `SPICY`), allergen tags (`Dairy`, `Nuts`, `Gluten`), and variants (`Half` / `Full` or add-ons).
   - Cart drawer shows contextual **"Pairs Well With"** upsell suggestions.
3. **Shared Live Cart & Order Placement:**
   - Real-time cart sync across all phones on the same table (shows who added which item).
   - Placing an order submits it with status `PENDING_APPROVAL` (prevents prank/accidental kitchen firing).
4. **Live Order Tracker & Engagement Screen:**
   - Real-time progress bar: `Sent to Staff` → `Cooking in Kitchen` → `Ready to Serve` → `Served`.
   - **1-Tap Wi-Fi Copy:** Displays restaurant Wi-Fi SSID and 1-tap copy password button.
   - **Table Mini-Game (v1.5):** Real-time multiplayer Food/Spice Trivia synced across guests at the table while waiting.
5. **1-Tap Service Requests ("Call Waiter"):**
   - Floating action button with 1-tap presets: `Bring Water`, `Extra Napkins / Cutlery`, `Call Waiter`, `Ask for Bill`.
6. **Checkout, Split Bill & Review Gate:**
   - Live itemized bill with GST/tax breakdown and optional tip (`5%`, `10%`, `15%`, `Custom`).
   - **Split Bill:** Toggle between *Pay Full Bill*, *Split Equally (by N guests)*, or *Pay for My Items*.
   - **Payment Methods:** Online via **Razorpay** (UPI / Cards) or **Pay Cash at Table** (triggers `BILL` alert on Staff Floor Map).
   - **Smart Review Prompt:** Post-payment rating modal; 4–5 stars redirects directly to the restaurant's `google_review_url`, 1–3 stars captures private feedback for the owner.

### 3.2 Staff Floor App (`/staff/[slug]/floor`)
1. **Live Visual Floor Map:**
   - Grid/map of all tables color-coded by real-time status:
     - `FREE` (Slate)
     - `ORDERING` (Blue — guest browsing/cart active)
     - `PENDING_APPROVAL` (Amber pulsing — new order waiting for staff verification)
     - `EATING` (Emerald — order in kitchen or served)
     - `HELP` (Red pulsing — active waiter call)
     - `BILL` (Purple — requested cash settlement or paying)
2. **Order Gatekeeping:**
   - Incoming guest order triggers an audio chime + modal showing table number, guest name, and items.
   - Staff taps **"Approve & Send to Kitchen"** (or edits/rejects out-of-stock items).
3. **Service Request Queue:**
   - Live banner of open requests (`Table 4 • Water • 1m ago`) with a 1-tap **"Mark Resolved"** button.

### 3.3 Kitchen Display System (`/staff/[slug]/kds`)
1. **Station Filtering:**
   - Kitchen staff can view `All Stations` or lock screen to a specific station (`Tandoor`, `Main Course`, `Beverages`, `Desserts`).
   - Orders automatically split items by `station_id`.
2. **Live Prep Timers:**
   - Ticket border changes color based on elapsed minutes: `0–8m` (Green), `8–15m` (Yellow), `15m+` (Red).
3. **1-Tap Completion:**
   - Chef taps individual items or **"Order Ready"** → updates `orders.status` to `READY` and notifies Guest + Floor Staff instantly.

### 3.4 Restaurant Owner Admin (`/admin/[slug]`)
1. **Menu & Station Management:** Add/edit categories, dishes, variants, station assignments, and 1-tap `In Stock / Sold Out` toggle.
2. **Table & QR Generator:** Add tables, auto-generate branded QR codes, and export printable PNG/PDF cards.
3. **Staff Access:** Create/reset 4-digit PINs for Waiters and Kitchen staff.
4. **Branding & Settings:** Update logo, primary hex color, GST %, Wi-Fi credentials, UPI ID, and Google Review link.

### 3.5 Super Admin Control Room (`/super-admin`)
1. **2-Minute Pitch Cloner:**
   - Input: `Restaurant Name`, `Slug`, `Brand Hex Color`, `Logo URL`, `Table Count`, and `Cuisine Preset` (`North Indian`, `Cafe & Bakery`, `Fast Food / QSR`).
   - Action: Atomically creates tenant, default stations, 15–20 realistic menu items with images, tables `T1..Tn`, and default staff PIN (`1234`).
   - Output: One-click copyable links + QR modal for immediate in-person demo.
2. **Tenant Lifecycle Manager:** Switch tenant status (`DEMO`, `TRIAL`, `ACTIVE`, `PAUSED`) and view active demo expiry dates.

---

## 4. Non-Functional Requirements
- **Real-Time Latency:** Order placement, waiter calls, and KDS updates must propagate in **< 1 second** via Supabase Realtime.
- **Tenant Isolation:** Strict PostgreSQL Row-Level Security (RLS) ensuring zero cross-tenant data leakage.
- **Mobile-First Performance:** Guest Web App First Contentful Paint (FCP) < 1.5s on 4G mobile networks.