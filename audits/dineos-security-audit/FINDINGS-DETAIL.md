# DineOS Security Audit — Detailed Technical Findings

---

### Finding 1: Broken Object-Level Authorization & Missing Authentication in Staff Operations
- **ID**: `DINEOS-VULN-001`
- **Fingerprint**: `dineos:idor:staff-actions`
- **Severity**: **Critical** (Likelihood: High, Impact: Critical)
- **Target Files**: [src/app/staff/[slug]/actions.ts](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/src/app/staff/[slug]/actions.ts) (Lines 115–404)

#### Root Cause Analysis
In Next.js 15/16 App Router, any function declared with `'use server'` is exposed as an HTTP POST endpoint addressable by clients. While `src/app/staff/[slug]/floor/page.tsx` renders `<StaffPinGate />` in the browser when unauthenticated, the underlying server actions in `src/app/staff/[slug]/actions.ts`:
- `approveOrder(restaurantId, orderId)`
- `rejectOrder(restaurantId, orderId)`
- `updateOrderItemPrepStatus(restaurantId, itemId, prepStatus)`
- `bumpOrderReady(restaurantId, orderId)`
- `markOrderServed(restaurantId, orderId)`
- `resolveServiceRequest(restaurantId, requestId)`
- `resetTableSession(restaurantId, tableId, sessionId)`

do not call `getStaffSession(slug)` or verify authorization. They accept the target IDs directly from the request arguments and query `supabaseAdmin` directly, bypassing all role checks.

#### Conceptual Attack Flow
1. An attacker (or seated guest at Table 1) extracts the Server Action ID from the client bundle or network traffic.
2. The attacker directly sends a POST request calling `resetTableSession` targeting Table 2, Table 3, etc.
3. The server executes the database update, closing other tables' sessions, deleting active carts, and resetting table statuses to `FREE`.
4. Similarly, an attacker can invoke `rejectOrder` to cancel in-flight kitchen orders for other tables.

#### Remediation Plan
Introduce an authorization check at the top of every staff mutation:
```typescript
async function requireStaffAuth(slug: string, restaurantId: string, allowedRoles?: StaffRole[]) {
    const session = await getStaffSession(slug);
    if (!session || session.restaurantId !== restaurantId) {
        throw new Error('Unauthorized: Valid staff session required.');
    }
    if (allowedRoles && !allowedRoles.includes(session.role) && session.role !== 'OWNER') {
        throw new Error(`Unauthorized: Role ${session.role} not permitted.`);
    }
    return session;
}
```

---

### Finding 2: Multi-Tenant Data Leakage via Permissive `USING (true)` RLS Policies
- **ID**: `DINEOS-VULN-002`
- **Fingerprint**: `dineos:rls:public-bypass`
- **Severity**: **Critical** (Likelihood: Critical, Impact: Critical)
- **Target Files**: [supabase/rls_policies.sql](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/supabase/rls_policies.sql) (Lines 57–200)

#### Root Cause Analysis
In `supabase/rls_policies.sql`, Row-Level Security is enabled, but the policies grant public anonymous (`anon`) and `authenticated` roles broad read/write access:
```sql
CREATE POLICY payments_public_read ON payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY orders_public_read ON orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY cart_items_public_delete ON cart_items FOR DELETE TO anon, authenticated USING (true);
```
Because the Supabase project URL and anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) are intentionally public in browser applications, any external actor can connect directly to the Supabase PostgREST API without going through Next.js server actions.

#### Conceptual Attack Flow
1. An attacker reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from browser scripts.
2. The attacker performs a direct REST query `GET https://<project>.supabase.co/rest/v1/payments?select=*`.
3. The database returns all payment records, customer names, billing amounts, and transaction IDs across **all** restaurant tenants.
4. An attacker executes `DELETE /rest/v1/cart_items?restaurant_id=neq.0`, emptying carts across all dining tables.

#### Remediation Plan
Operational data must not be exposed to the `anon` role directly. Revoke public direct access on sensitive operational tables:
```sql
-- Restrict direct anon access; all operational access flows through service_role in Server Actions
CREATE POLICY payments_public_read ON payments FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY orders_public_read ON orders FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY order_items_public_read ON order_items FOR SELECT TO anon, authenticated USING (false);
```

---

### Finding 3: Client-Supplied Unit Price in Shared Table Cart
- **ID**: `DINEOS-VULN-003`
- **Fingerprint**: `dineos:cart:price-tampering`
- **Severity**: **Critical** (Likelihood: High, Impact: Critical)
- **Target Files**: [src/app/r/[slug]/actions.ts](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/src/app/r/[slug]/actions.ts) (Lines 156–229, 301–320)

#### Root Cause Analysis
`addToSharedCart` takes `unitPrice: number` as an untrusted client input argument:
```typescript
export async function addToSharedCart(input: {
    restaurantId: string;
    sessionId: string;
    menuItemId: string;
    unitPrice: number; // Untrusted client input!
    ...
}) {
    await supabaseAdmin.from('cart_items').insert({
        ...,
        unit_price: input.unitPrice,
    });
}
```
When `placeSharedOrder` executes:
```typescript
const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.unit_price) * item.quantity,
    0
);
```
The server calculates the subtotal strictly using the `cart_items.unit_price` value that was provided by the client.

#### Conceptual Attack Flow
1. A seated guest adds high-value dishes (e.g. ₹600 platters) to the cart.
2. Intercepting the Server Action payload, the guest overrides `unitPrice` to `0.01`.
3. The server persists the item in `cart_items` with `unit_price = 0.01`.
4. When `placeSharedOrder` is called, the order is created with a near-zero subtotal and sent to the kitchen.

#### Remediation Plan
Remove `unitPrice` from the client input interface. Resolve the base price directly from the database inside `addToSharedCart`:
```typescript
// Query authoritative price from menu_items
const { data: menuItem } = await supabaseAdmin
    .from('menu_items')
    .select('base_price, variants')
    .eq('id', input.menuItemId)
    .eq('restaurant_id', input.restaurantId)
    .single();

if (!menuItem) throw new Error('Menu item not found.');

let calculatedPrice = Number(menuItem.base_price);
if (input.variantName && Array.isArray(menuItem.variants)) {
    const variant = (menuItem.variants as DishVariant[]).find(v => v.name === input.variantName);
    if (variant) calculatedPrice += Number(variant.price_delta || 0);
}
```

---

### Finding 4: Client-Dictated Payment Settlement & Missing Gateway Verification
- **ID**: `DINEOS-VULN-004`
- **Fingerprint**: `dineos:payment:unverified-settlement`
- **Severity**: **Critical** (Likelihood: High, Impact: Critical)
- **Target Files**: [src/app/r/[slug]/checkout-actions.ts](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/src/app/r/[slug]/checkout-actions.ts) (Lines 40–85)

#### Root Cause Analysis
`recordTablePayment` directly marks `status: 'PAID'` and transitions `tables.status = 'BILL'` based on client parameters:
```typescript
export async function recordTablePayment(input: RecordPaymentInput) {
    const { data: payment } = await supabaseAdmin
        .from('payments')
        .insert({
            restaurant_id: input.restaurantId,
            session_id: input.sessionId,
            subtotal: input.subtotal,
            total_amount: input.totalAmount, // Client provided!
            status: 'PAID',                 // Directly marked PAID!
            ...
        });
    await supabaseAdmin.from('tables').update({ status: 'BILL' });
}
```
There is no server-side cryptographic verification of Razorpay signatures (`razorpay_signature` HMAC-SHA256), nor any verification that the settled amount equals the sum of orders for that table session.

#### Conceptual Attack Flow
1. A diner completes a meal with an accumulated bill of ₹3,000.
2. The diner invokes `recordTablePayment` with `totalAmount: 1`, `method: 'CARD'`, and arbitrary IDs.
3. The server inserts a `PAID` record and transitions the table status to `BILL`.
4. The waiter floor map displays "BILL PAID", allowing the diners to depart without actual settlement.

#### Remediation Plan
1. For digital payments, require `razorpayPaymentId`, `razorpayOrderId`, and `razorpaySignature`.
2. Compute the expected HMAC-SHA256 signature server-side using `RAZORPAY_KEY_SECRET`.
3. Compute the session balance dynamically from `orders` and ensure `paidAmount >= billTotal`.

---

### Finding 5: Unthrottled 4-Digit Staff PIN & Super Admin Insecure Default
- **ID**: `DINEOS-VULN-005`
- **Fingerprint**: `dineos:auth:pin-bruteforce`
- **Severity**: **High** (Likelihood: High, Impact: High)
- **Target Files**:
  - [src/app/staff/[slug]/actions.ts](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/src/app/staff/[slug]/actions.ts) (Lines 25–48)
  - [src/app/super-admin/actions.ts](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/src/app/super-admin/actions.ts) (Lines 44–60)

#### Root Cause Analysis
1. `verifyStaffPin` tests 4-digit PINs against `staff_users` without recording failed attempts, imposing cooldowns, or tracking IP/session request rates.
2. `verifySuperAdminPasskey` uses a hardcoded fallback:
   ```typescript
   const masterPasskey = process.env.SUPER_ADMIN_PASSKEY || 'change_this_master_password';
   ```
   If the environment variable is not explicitly populated, the master administrative door is open with a known default password.
3. Passkey comparison uses `passkey.trim() !== masterPasskey.trim()` which is susceptible to timing side-channels.
4. Cookies `dineos_super_admin=authenticated` and `dineos_staff_<slug>` are unhashed and unsigned.

#### Remediation Plan
1. Enforce rate limiting (e.g. 5 failed attempts per 10 minutes per IP/slug).
2. Fail fast during startup if `SUPER_ADMIN_PASSKEY` is unset or less than 16 characters.
3. Compare passkeys using `crypto.timingSafeEqual(Buffer.from(passkey), Buffer.from(masterPasskey))`.
4. Sign session cookies with an HMAC secret.
