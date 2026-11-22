# Strict Engineering & AI Coding Rules (`rules.md`)

1. **Multi-Tenant Isolation (CRITICAL):**
   - NEVER write a Supabase query without filtering by `restaurant_id` (except initial tenant lookup by unique `slug`).
   - All server mutations in `/admin` and `/super-admin` must validate authorization before calling `supabaseAdmin` (service role).
2. **Dynamic Branding Only on Guest Routes:**
   - Never hardcode brand colors (like `bg-orange-600`) inside `/components/guest/*` or `/app/r/*`. Always use `var(--brand-primary)`.
3. **Database Schema Fidelity:**
   - Strictly match exact table, column, and enum names defined in `database.md`. Do not invent columns.
4. **Mobile-First & Touch-Safe:**
   - Every Guest route must look native at `375px` mobile viewport width with zero horizontal overflow.
5. **TypeScript & Clean Code:**
   - Use strict TypeScript interfaces (`src/types/database.ts`). Avoid `any`.
   - Keep business logic (tax calculation, split bill math, preset seeding) inside `src/lib/` utilities/actions, not bloated UI components.