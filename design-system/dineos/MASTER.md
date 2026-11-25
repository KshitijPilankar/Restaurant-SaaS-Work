# DineOS — Persistent Design System Master Specification (MASTER.md)

> **LOGIC & PRECEDENCE:**
> When building or modifying a specific page, first check `design-system/dineos/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the foundational rules in this Master specification.
> 
> **Repository Scope:** Next.js (App Router) + Tailwind CSS v4 + Supabase Realtime + Razorpay checkout flows.
> **Preservation Rule:** Keep all component structures, route definitions, database schemas, and checkout logic 100% intact.

---

## 1. System Vision & Design Philosophy

DineOS is a dual-paradigm hospitality operating system engineered for two complementary environments:

1. **The Guest Mobile Experience (Light Mode / Warm Culinary Elegance):**
   - **Form Factor:** Mobile Viewport (375px iPhone SE, 390px iPhone 14/15/16, 430px Max).
   - **Vibe:** Clean, premium, culinary-forward, and frictionless. Feels like a high-end Michelin guide or artisanal dining club, never a generic delivery app.
   - **Key Interactions:** Rapid visual scanning, tactile dish drawer sheets, live collaborative table cart badges, intuitive 3-way split billing (Full / Equal / Itemized), and instant zero-download interactions.

2. **The Staff Floor Dashboard & Kitchen Display System (Dark Mode / High-Contrast Ergonomics):**
   - **Form Factor:** Tablets & Desktop Monitors (768px iPad, 1024px POS display, 1440px Floor Station).
   - **Vibe:** Glare-resistant obsidian surfaces, crisp typography, unmistakable color status signaling, and zero-distraction layout.
   - **Key Interactions:** Glancable table states, audio-synced visual alerts, tactile large button bumping for cooks wearing kitchen gloves, and high-velocity order lifecycle management.

3. **Owner Admin (Light Mode / Ledger):** Owners manage menus and print QR codes in the daytime, so `/admin/*` uses the light theme. Staff Floor, KDS and Super Admin stay dark.

### Confirmed decisions (redesign kickoff)
- **Theme by surface:** Guest = light, Staff Floor + KDS = dark, Super Admin = dark, Owner Admin = light.
- **Demo PINs stay public** (Owner `1111`, Waiter `2222`, Kitchen `3333`) because the live URL is the sales-pitch demo. Present them in a subtle "Interactive Demo Credentials" card on the landing page and the staff PIN gate, never as loose inline text.
- **Brand tokens on guest routes:** use `--brand-primary`, `--brand-primary-foreground` (readable text on the brand color) and `--brand-primary-subtle` (selected tint). All three are injected by `src/lib/brand.ts` in the tenant layout.
- **Text on the default saffron (`#EA580C`) is dark `#1C1917`** (about 5:1, passes AA; white is 3.6:1 and fails). Tenant colors use the auto-computed foreground from `src/lib/brand.ts`. Never hard-code `text-white` on a brand-colored surface.
- **Design authority:** `PRODUCT.md` holds product truth; this file holds the visual spec.

---

## 2. Semantic Color Palette & Contrast Hierarchy

All text and critical interactive indicators strictly meet **WCAG 2.1 AA** contrast requirements (minimum 4.5:1 for normal text, 3:1 for large text and interactive components).

### 2.1 Foundational Neutrals

| Token | Light (Guest Experience) | Dark (Staff / KDS / Admin) | Purpose & Usage |
| :--- | :--- | :--- | :--- |
| `--background` | `#FAF9F6` (Alabaster Warm White) | `#0C0A09` (Deep Charcoal Obsidian) | Primary page background; zero harsh blue tints |
| `--foreground` | `#1C1917` (Rich Warm Black) | `#F5F5F4` (Crisp Off-White) | Primary readable body text (Contrast > 14:1) |
| `--card` | `#FFFFFF` (Pure Crisp White) | `#18181B` (Zinc Slate 900) | Surface containers, drawer bodies, elevated cards |
| `--card-foreground` | `#1C1917` | `#F5F5F4` | Card headings and primary values |
| `--muted` | `#F4F4F5` (Soft Warm Gray) | `#27272A` (Muted Zinc 800) | Inactive chip fills, disabled states, divider fills |
| `--muted-foreground` | `#71717A` (Zinc 500) | `#A1A1AA` (Zinc 400) | Secondary metadata, timestamps, diner attribution (Contrast > 4.6:1) |
| `--border` | `#E4E4E7` (Zinc 200) | `#27272A` (Zinc 800) | Card outlines, dividers, subtle table gridlines |
| `--ring` | `#EA580C` (Warm Saffron Amber) | `#FB923C` (Bright Amber) | Keyboard focus indicators & active selection rings |

### 2.2 Brand & Hospitality Accents

DineOS supports dynamic white-label brand colors injected per restaurant via `--brand-primary` (fallback: `#EA580C` Artisan Saffron).

| Role | Default Hex | Semantic Usage |
| :--- | :--- | :--- |
| **Brand Primary** | `#EA580C` | Primary action buttons, active tab indicators, table brand pill |
| **Brand Primary Hover** | `#C2410C` | Button hover and tap states |
| **Brand Primary Subtle** | `rgba(234, 88, 12, 0.08)` | Selected item badges, active category chip outlines |
| **Warm Gold / Culinary** | `#D97706` | Bestseller badges, chef specials, luxury gold accents |
| **Pure Veg Green** | `#059669` / `#10B981` | Pure Veg icon square + dot, healthy tags, positive reviews |
| **Non-Veg / Meat Ruby** | `#DC2626` / `#EF4444` | Non-veg indicators, spice warning badges, destructive actions |

### 2.3 Operational Status Color Matrix (Staff Floor & KDS)

Every floor state is instantly recognizable from 10 feet away in bustling dining room light:

| Status Code | Label | Accent Color | Surface Glow & Badge | Operational Meaning |
| :--- | :--- | :--- | :--- | :--- |
| `FREE` | Available | `#71717A` (Zinc) | `bg-zinc-900/60 border-zinc-800` | Clean & ready for walk-ins / reservations |
| `ORDERING` | Diners Seated | `#3B82F6` (Electric Blue) | `bg-blue-950/30 border-blue-600/60` | Diners currently scanning QR & adding items to cart |
| `PENDING_APPROVAL` | New Order | `#F59E0B` (Amber Flame) | `bg-amber-950/40 border-amber-500 animate-pulse` | Order sent by diners; needs waiter verification |
| `EATING` | Cooking / Served | `#10B981` (Emerald) | `bg-emerald-950/30 border-emerald-600/60` | Dishes served or in active prep; diners eating happily |
| `HELP` | Service Call | `#EF4444` (Crimson Alert) | `bg-red-950/50 border-red-500 animate-bounce` | Water, server assistance, or napkins requested |
| `BILL` | Bill Settled | `#8B5CF6` (Royal Purple) | `bg-purple-950/40 border-purple-500 shadow-purple-900/40` | Table paid via Razorpay/UPI/Cash; ready for reset |

---

## 3. Typography & Hierarchy

- **Primary Sans:** `var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Tabular Mono:** `var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace` (strictly used for currency amounts `₹`, table codes `T1`, order numbers `#12`, and elapsed prep timers `12:45`)

### Scale & Tracking

```css
/* Typography Scale */
.text-display  { font-size: 2.25rem; line-height: 2.5rem; font-weight: 800; letter-spacing: -0.03em; }
.text-h1       { font-size: 1.5rem;   line-height: 2rem;   font-weight: 700; letter-spacing: -0.025em; }
.text-h2       { font-size: 1.25rem;  line-height: 1.75rem; font-weight: 700; letter-spacing: -0.02em; }
.text-h3       { font-size: 1.0rem;   line-height: 1.5rem; font-weight: 600; letter-spacing: -0.015em; }
.text-body     { font-size: 0.875rem; line-height: 1.35rem; font-weight: 400; }
.text-caption  { font-size: 0.75rem;  line-height: 1.1rem; font-weight: 500; }
.text-micro    { font-size: 0.6875rem; line-height: 0.95rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
```

---

## 4. Surfaces, Glassmorphism & Elevation Tokens

### Elevation Layers
- **Layer 0 (Canvas):** Clean Alabaster (`#FAF9F6`) or Deep Charcoal (`#0C0A09`).
- **Layer 1 (Cards):** Pure White (`#FFFFFF`) with `1px solid rgba(0,0,0,0.06)` border and subtle soft shadow: `box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)`.
- **Layer 2 (Floating Bars & Headers):** Frosted glass: `bg-white/90 backdrop-blur-md border-b border-zinc-200/80`.
- **Layer 3 (Drawers & Modals):** Bottom sheets with tactile grab handle: `rounded-t-[28px] shadow-2xl`, with dark overlay `bg-black/60 backdrop-blur-sm`.
- **Layer 4 (Tooltips & Toasts):** Floating dark pills: `bg-zinc-900 text-white rounded-full shadow-lg`.

### Tactile Grab Handle Standard (Mobile Drawers)
Every mobile bottom drawer must include an explicit top grab bar to signal touch dismissibility:
```tsx
<div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-2 shrink-0" />
```

---

## 5. Component Batches & Specific Polishing Rules

### Batch 1: Theme Tokens & Layout Wrapper (`globals.css` & `TenantLayout`)
- Unify Tailwind theme tokens with clean OKLCH/Hex mapping.
- Add smooth transitions (`150ms-250ms ease-out`).
- Implement iOS safe area bottom padding (`pb-[env(safe-area-inset-bottom,1rem)]`) to ensure floating carts never collide with the home bar on iPhone 15/16.

### Batch 2: Guest Header & Table Identity (`GuestHeader.tsx`, `TableJoinModal.tsx`, `ServiceRequestModal.tsx`)
- High-contrast restaurant logo container with rounded square (`rounded-2xl`).
- Dynamic table code badge (`font-mono font-bold px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-900`).
- Compact tablemates count button (`👥 3 seated`) with popover/modal viewer.
- Call Server / Service button with clear tactile press (`active:scale-95`).
- Instant Wi-Fi modal with 1-click password copy & feedback checkmark.

### Batch 3: Menu Explorer & Item Cards (`MenuExplorer.tsx`, `DishDetailDrawer.tsx`)
- Smooth horizontal category sticky pill bar with hidden scrollbar and active highlight.
- Filter pill: Pure Veg toggle with emerald boundary icon and instant count update.
- Dish Card layout:
  - High-resolution dish thumbnail with subtle rounded corner (`rounded-2xl`).
  - Diet indicator (Veg green box with dot / Non-veg red box with dot) + Bestseller badge.
  - Price in bold tabular numerals with currency symbol (`₹320`).
  - Quick "ADD" / quantity stepper (`- 1 +`) button placed at bottom right for easy one-handed thumb tap.
- Dish Detail Drawer:
  - Large dish hero image with gradient scrim.
  - Radio selector for variants (Half / Full, Spicy level) with price deltas.
  - Kitchen prep notes input (`"No onions", "Extra crisp"`).
  - Prominent "Add to Table Cart • ₹450" full-width sticky bottom CTA.

### Batch 4: Collaborative Shared Cart & Split Billing (`SharedCartDrawer.tsx`, `BillCheckoutDrawer.tsx`)
- Collaborative items breakdown showing who added each dish (`"Added by Rahul"`).
- Quantity modification buttons with transition feedback.
- Upsell recommendations banner for high-margin sides / beverages.
- Bill Drawer with 3-tab segment control:
  1. **Full Bill:** Complete table subtotal, tax breakdown, tip selector (`10%`, `15%`, `₹100`, Custom), total.
  2. **Equal Split:** Number of diners stepper (`÷ 2, 3, 4, 5`) with instant recalculation per diner.
  3. **Itemized Split:** Diner selector tabs displaying only the items ordered by that guest.
- Razorpay / UPI / Cash checkout buttons with verified touch target >= 48px height.

### Batch 5: Live Order Tracker & Review Funnel (`LiveOrderTracker.tsx`, `PostPaymentReviewModal.tsx`)
- Vertical status timeline with animated pulse on current active state:
  `Order Sent` ➔ `In Kitchen` ➔ `Food Ready` ➔ `Served`.
- Review Funnel:
  - 1-5 Star interactive rating.
  - Ratings of 4 or 5 stars dynamically open the restaurant's direct Google Review URL.
  - Ratings of 1-3 stars present a private internal feedback textarea for owner attention.

### Batch 6: Staff Floor Map & Kitchen Display (`FloorDashboard.tsx`, `KdsBoard.tsx`, `StaffPinGate.tsx`)
- Bento-box table grid with responsive column layout (2 cols mobile, 3 cols tablet, 4-6 cols desktop).
- Instant glanceable table status badges with pulsing alerts on `PENDING_APPROVAL` and `HELP`.
- Synthesized Web Audio API bell chimes with mute/unmute toggle.
- KDS ticket cards with station filtering (`GRILL`, `TANDOOR`, `BEVERAGE`, `MAIN`).
- Elapsed timer escalation (matches PRD and the code in `KdsBoard.tsx`):
  - `< 8 mins`: Emerald, "On time"
  - `8 - 15 mins`: Amber, "Getting late"
  - `15+ mins`: Red, "Overdue", with a border-only beat (an overlay's opacity pulses; ticket text never fades)
  - The elapsed minutes are the largest element on a ticket; state is always icon + word + color.
- Quick item bump checkboxes and large single-tap "Mark Order Ready" CTA.

---

## 6. Pre-Delivery Verification Checklist

- [ ] **Contrast:** All text meets 4.5:1 minimum contrast on both light and dark surfaces.
- [ ] **Touch Ergonomics:** All interactive buttons, chips, and steppers have a minimum touch target of 44x44px.
- [ ] **Mobile Drawer Experience:** Drawers have visible grab bars, rounded top corners, backdrop blur, and dismiss on backdrop click or close button.
- [ ] **No Emojis as System Icons:** All icons use SVG (`lucide-react`).
- [ ] **Preserved Logic:** Supabase Realtime subscriptions, actions, database typing, and Razorpay endpoints are intact.
- [ ] **Responsive Validation:** Verified on 375px (iPhone SE), 390px (standard phone), 768px (iPad portrait), and 1440px (desktop POS monitor).
