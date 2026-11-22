# System Architecture & Realtime State Machine (`Architecture.md`)

## 1. Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript, Server Actions)
- **Styling & UI:** Tailwind CSS + shadcn/ui + Lucide Icons + Framer Motion
- **Backend & Realtime:** Supabase (PostgreSQL, Realtime Channels, Auth, Storage)
- **Payments:** Razorpay Node SDK + Checkout JS
- **QR & Audio:** `qrcode.react` + HTML5 Audio API (`/public/sounds/*.mp3`)

---

## 2. Folder Structure
```text
src/
├── app/
│   ├── (marketing)/page.tsx                # SaaS Landing Page
│   ├── super-admin/page.tsx                # Founder Control Room & 2-Min Demo Cloner
│   ├── r/[slug]/t/[tableCode]/
│   │   ├── layout.tsx                      # Dynamic Restaurant Theme & Tenant Loader
│   │   ├── page.tsx                        # Guest Name Onboarding + Live Menu
│   │   ├── cart/page.tsx                   # Shared Table Cart & Upsells
│   │   ├── tracker/page.tsx                # Live Order Status, Wi-Fi Copy & Mini-Game
│   │   └── bill/page.tsx                   # Split Bill, Tip, Razorpay/Cash & Review Gate
│   ├── staff/[slug]/
│   │   ├── login/page.tsx                  # 4-Digit Staff PIN Pad
│   │   ├── floor/page.tsx                  # Live Floor Map, Order Approval & Waiter Alerts
│   │   └── kds/page.tsx                    # Station-Filtered Kitchen Display System
│   └── admin/[slug]/
│       ├── page.tsx                        # Owner Analytics & Live Overview
│       ├── menu/page.tsx                   # Categories, Items & Station Mapping
│       ├── tables/page.tsx                 # Table CRUD & Printable QR Generator
│       ├── staff/page.tsx                  # Staff PIN Management
│       └── settings/page.tsx               # Branding, Wi-Fi, UPI, GST & Review URL
├── components/
│   ├── guest/                              # MenuCard, SharedCartDrawer, WaiterCallFab, SplitBillModal
│   ├── staff/                              # FloorTableTile, OrderApprovalModal, KdsTicketCard
│   └── shared/                             # BrandProvider, QrCodeCard, SoundPlayer
├── lib/
│   ├── supabase/client.ts                  # Browser Supabase client
│   ├── supabase/server.ts                  # Server & Service-Role Supabase clients
│   ├── presets/cuisines.ts                 # Pre-built menu templates for 2-Min Demo Cloner
│   └── utils/billing.ts                    # Tax, Tip, Equal & Item-wise Split calculators
└── types/database.ts                       # Generated Supabase TypeScript types
```

---

## 3. Core Realtime State Machines

### 3.1 Table Status Lifecycle (`tables.status`)
1. `FREE` → Guest scans QR & enters name → `ORDERING`
2. `ORDERING` → Guest submits cart → `PENDING_APPROVAL`
3. `PENDING_APPROVAL` → Waiter taps "Send to Kitchen" → `EATING`
4. `EATING` → Guest taps "Call Waiter / Water / Napkins" → `HELP` (reverts to `EATING` on resolve)
5. `EATING` → Guest opens Bill / requests Cash payment → `BILL`
6. `BILL` → Payment marked `PAID` & session closed → `FREE`

### 3.2 Order & KDS Flow (`orders.status`)
- `PENDING_APPROVAL`: Visible only on Staff Floor App with audio alert.
- `IN_KITCHEN`: Appears on KDS columns filtered by `order_items.station_id`.
- `READY`: Chef marks ready → Guest Tracker updates + Staff Floor gets pickup alert.
- `SERVED`: Waiter delivers food to table.

---

## 4. Supabase Realtime Channels
- `room:tenant:{restaurant_id}:ops` → Listens to `tables`, `orders`, `order_items`, and `service_requests` for Floor & KDS screens.
- `room:session:{session_id}` → Listens to `cart_items`, `orders`, and `table_sessions` for all guests sharing a table.