# UI/UX & Design System (`design.md`)

## 1. Visual Direction
- **Guest Web App (`/r/[slug]/t/[tableCode]`):**
  - Clean, appetizing, high-contrast **Mobile-First Light/Warm Surface** (`#FAFAFA` background, `#FFFFFF` cards).
  - **Dynamic White-Label Token:** Inject `--brand-primary` from `restaurants.primary_color` via inline CSS variables in `layout.tsx`. All primary CTAs ("Add", "Place Order", "Pay Bill") use `bg-[var(--brand-primary)]`.
  - Sticky bottom floating bar showing active Shared Cart count + total + "View Cart →".
  - Floating Quick-Action button for **1-Tap Call Waiter**.
- **Staff Floor & KDS (`/staff/[slug]/*`):**
  - **High-Contrast Dark Mode (`#09090B` / `#18181B`)** designed for bright kitchen lights and quick glances.
  - Large touch targets (minimum `48px` height) for wet/busy hands.
  - **KDS Timer Borders:** `0–8 mins` (`border-emerald-500`), `8–15 mins` (`border-amber-500`), `15+ mins` (`border-red-500 animate-pulse`).
- **Admin & Super Admin (`/admin/*`, `/super-admin`):**
  - Crisp SaaS dashboard aesthetic using shadcn/ui cards, data tables, and status badges.

## 2. Micro-Interactions & Audio
- Subtle Framer Motion layout transitions on cart additions and order status steps.
- Mandatory **Audio Unlock Banner** on Staff/KDS login so browser autoplay policies never block incoming order/waiter chimes.