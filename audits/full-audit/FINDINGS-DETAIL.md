# DineOS Comprehensive Security Audit — Detailed Findings

---

### Finding 1: Broken Object-Level Authorization & Missing Auth in Staff Operations
- **ID**: `DINEOS-VULN-001`
- **Fingerprint**: `dineos:idor:staff-actions`
- **Severity**: **Critical** (Likelihood: High, Impact: Critical)
- **Target Files**: [src/app/staff/[slug]/actions.ts](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/src/app/staff/[slug]/actions.ts) (Lines 115–404)

#### Root Cause Analysis
In Next.js App Router, functions marked `'use server'` become public HTTP POST endpoints. The staff operational server actions (`approveOrder`, `rejectOrder`, `updateOrderItemPrepStatus`, `bumpOrderReady`, `markOrderServed`, `resolveServiceRequest`, `resetTableSession`) accept `restaurantId` and target resource IDs directly from client arguments without calling `getStaffSession(slug)` to verify that the request originated from an authenticated staff member.

#### Impact
An unauthenticated actor or guest seated at Table 1 can forge calls to `resetTableSession` for Table 2, Table 3, etc., immediately wiping active diner sessions and carts, or call `rejectOrder` to cancel in-flight kitchen orders.

#### Remediation
Add a mandatory authorization guard helper at the start of every staff mutation:
```typescript
const session = await getStaffSession(slug);
if (!session || session.restaurantId !== restaurantId) {
    return { success: false, error: 'Unauthorized: Staff session required.' };
}
```

---

### Finding 2: Multi-Tenant Data Leakage via Permissive `USING (true)` RLS Policies
- **ID**: `DINEOS-VULN-002`
- **Fingerprint**: `dineos:rls:public-bypass`
- **Severity**: **Critical** (Likelihood: Critical, Impact: Critical)
- **Target Files**: [supabase/rls_policies.sql](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/supabase/rls_policies.sql) (Lines 57–200)

#### Root Cause Analysis
In `supabase/rls_policies.sql`, policies for `payments`, `orders`, `order_items`, and `cart_items` grant the `anon` and `authenticated` roles global read and mutation permissions using `USING (true)` and `WITH CHECK (true)`:
```sql
CREATE POLICY payments_public_read ON payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY orders_public_read ON orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY cart_items_public_delete ON cart_items FOR DELETE TO anon, authenticated USING (true);
```
Because `NEXT_PUBLIC_SUPABASE_ANON_KEY` is embedded in the public client bundle, any user can connect directly to the Supabase PostgREST API without going through Next.js server actions.

#### Impact
Complete breach of multi-tenant database isolation. An anonymous attacker can dump financial transaction histories, diner names, and customer orders across all restaurant tenants, or delete active cart items for any table.

#### Remediation
Revoke direct public access to sensitive operational tables:
```sql
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
`addToSharedCart` accepts `unitPrice: number` as an untrusted client argument and stores it directly into `cart_items`. When `placeSharedOrder` is invoked, it calculates the order subtotal by summing `item.unit_price * item.quantity` from `cart_items` rather than checking `menu_items.base_price`.

#### Impact
A diner can intercept or forge `addToSharedCart` with `unitPrice: 0.01` or `unitPrice: 0`, resulting in expensive meals being ordered and prepared by the kitchen for free.

#### Remediation
Remove `unitPrice` from the client input interface. Look up `menu_items.base_price` and compute variant deltas strictly on the server:
```typescript
const { data: mi } = await supabaseAdmin
    .from('menu_items')
    .select('base_price, variants')
    .eq('id', input.menuItemId)
    .eq('restaurant_id', input.restaurantId)
    .single();
const unitPrice = mi ? Number(mi.base_price) : 0;
```

---

### Finding 4: Client-Dictated Payment Settlement & Missing Gateway Verification
- **ID**: `DINEOS-VULN-004`
- **Fingerprint**: `dineos:payment:unverified-settlement`
- **Severity**: **Critical** (Likelihood: High, Impact: Critical)
- **Target Files**: [src/app/r/[slug]/checkout-actions.ts](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/src/app/r/[slug]/checkout-actions.ts) (Lines 40–85)

#### Root Cause Analysis
`recordTablePayment` directly marks `status: 'PAID'` and sets `tables.status = 'BILL'` based on client-provided parameters (`totalAmount`, `subtotal`, `taxAmount`). It never verifies Razorpay's cryptographic signature (`razorpay_signature` HMAC-SHA256) or matches the settlement amount against the unpaid order total for that session.

#### Impact
Diners can call `recordTablePayment` with `totalAmount: 1` and dummy gateway IDs. The system marks the table as paid, displaying a green "BILL PAID" badge on the floor map, allowing diners to leave without paying.

#### Remediation
For online card/UPI payments, verify the HMAC signature server-side:
```typescript
const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest('hex');
if (input.method === 'CARD' && expectedSignature !== input.razorpaySignature) {
    return { success: false, error: 'Invalid payment signature.' };
}
```

---

### Finding 5: Unthrottled 4-Digit Staff PIN & Insecure Super Admin Default
- **ID**: `DINEOS-VULN-005`
- **Fingerprint**: `dineos:auth:pin-bruteforce`
- **Severity**: **High** (Likelihood: High, Impact: High)
- **Target Files**:
  - [src/app/staff/[slug]/actions.ts](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/src/app/staff/[slug]/actions.ts) (Lines 25–48)
  - [src/app/super-admin/actions.ts](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/src/app/super-admin/actions.ts) (Lines 44–60)

#### Root Cause Analysis
1. `verifyStaffPin` does not implement rate-limiting or lockout mechanisms for 4-digit PINs (10,000 combinations).
2. `verifySuperAdminPasskey` falls back to `'change_this_master_password'` if `SUPER_ADMIN_PASSKEY` is unset.
3. String comparisons use `!==` instead of constant-time `crypto.timingSafeEqual`.
4. Cookies `dineos_staff_<slug>` and `dineos_super_admin` are unsigned.

#### Impact
An attacker can iterate all 10,000 PINs in under a minute to compromise Owner, Waiter, or Kitchen access, or use default credentials to take over the Super Admin dashboard.

#### Remediation
Implement exponential backoff or lockouts after 5 failed attempts, disallow fallback secrets, use `crypto.timingSafeEqual`, and sign all session cookies with HMAC-SHA256.

---

### Finding 6: Unvalidated External URL Scheme in Google Review Redirection
- **ID**: `DINEOS-VULN-006`
- **Fingerprint**: `dineos:xss:unvalidated-redirect-url`
- **Severity**: **Medium** (Likelihood: Medium, Impact: Medium)
- **Target Files**:
  - [src/components/guest/PostPaymentReviewModal.tsx](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/src/components/guest/PostPaymentReviewModal.tsx) (Lines 33–46)
  - [src/app/admin/[slug]/actions.ts](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/src/app/admin/[slug]/actions.ts) (Lines 180–205)

#### Root Cause Analysis
`PostPaymentReviewModal` executes `window.open(googleUrl, '_blank', 'noopener,noreferrer')` using the restaurant's configured `google_review_url`. The settings update action does not enforce that `google_review_url` begins with `https://`.

#### Impact
A rogue or compromised restaurant owner could configure a `javascript:` URI scheme, which triggers arbitrary JavaScript execution in the browser of guests who leave a 4- or 5-star review.

#### Remediation
Sanitize the URL before opening:
```typescript
const isSafeUrl = typeof googleUrl === 'string' && (googleUrl.startsWith('https://') || googleUrl.startsWith('http://'));
if (isSafeUrl) {
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
}
```

---

### Finding 7: Unbounded Wildcard Hostname in Next.js Image Remote Patterns
- **ID**: `DINEOS-VULN-007`
- **Fingerprint**: `dineos:ssrf:unbounded-next-image-patterns`
- **Severity**: **Low** (Likelihood: Medium, Impact: Low)
- **Target Files**: [next.config.ts](file:///c:/Antigravity%20Work/Restaurant%20SaaS%20Work/next.config.ts) (Lines 5–10)

#### Root Cause Analysis
`next.config.ts` configures `remotePatterns` with `hostname: "**"`, allowing the Next.js image optimization endpoint (`/_next/image`) to fetch and resize images from arbitrary external HTTPS hosts.

#### Impact
External users can use the server's image optimization service as an open proxy or amplification reflector.

#### Remediation
Restrict `remotePatterns` to explicit image hosts:
```typescript
remotePatterns: [
    { protocol: 'https', hostname: 'images.unsplash.com' },
    { protocol: 'https', hostname: '**.supabase.co' },
]
```
