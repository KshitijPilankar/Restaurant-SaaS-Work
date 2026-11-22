# DineOS Security Audit & Penetration Review Report

**Date**: November 22, 2026  
**Target Repository**: `Restaurant-SaaS-Work` (`./src`, `./supabase/rls_policies.sql`)  
**Audit Harness**: `cloudflare/security-audit-skill` (`v1.0.0`)  
**Scope**: Multi-Tenant SaaS Isolation, Authentication/Session Gates, Supabase RLS Policies, Payment/Cart Integrity  
**Execution Policy**: Sandboxed source analysis and local boundary verification  
**Validation Status**:  
- `coverage-ledger.json`: **PASS** (5 units valid)  
- `findings.json`: **PASS** (5 findings valid against `report-schema.json`)

---

## 1. Executive Summary

A comprehensive source-level security audit and vulnerability assessment was conducted against **DineOS**, evaluating its multi-tenant white-label restaurant dine-in architecture. The audit focused on the boundaries between anonymous guests, floor/kitchen staff, tenant owners, and the super administrator.

### Key Assessment Findings
1. **Critical Authorization Bypasses**: Staff operational server actions (`approveOrder`, `rejectOrder`, `resetTableSession`) lack session authorization checks, allowing unauthenticated remote callers to manipulate table states and cancel customer orders.
2. **Database Row-Level Security Over-Permission**: `supabase/rls_policies.sql` defines `USING (true)` for anonymous queries on `payments`, `orders`, and `cart_items`, exposing sensitive cross-tenant financial records and allowing cart tampering via direct Supabase REST requests.
3. **Price & Settlement Tampering**: `addToSharedCart` trusts client-supplied `unitPrice`, permitting arbitrary meal price manipulation (e.g. ₹0.01 per dish). Similarly, `recordTablePayment` directly marks bills as `PAID` without verifying Razorpay cryptographic signatures or matching active order totals.
4. **PIN Brute-Force Exposure**: The 4-digit staff PIN system has no server-side rate-limiting or lockout mechanism, allowing full keyspace exhaustion (10,000 combinations) in seconds. The Super Admin passkey includes an insecure default fallback.

---

## 2. Findings Matrix

| Finding ID | Fingerprint | Title | Severity | Likelihood | Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DINEOS-VULN-001** | `dineos:idor:staff-actions` | Broken Object-Level Authorization in Staff Server Actions | **Critical** | High | Critical |
| **DINEOS-VULN-002** | `dineos:rls:public-bypass` | Multi-Tenant Data Leakage via Permissive RLS Policies | **Critical** | Critical | Critical |
| **DINEOS-VULN-003** | `dineos:cart:price-tampering` | Client-Supplied Unit Price in Shared Table Cart | **Critical** | High | Critical |
| **DINEOS-VULN-004** | `dineos:payment:unverified-settlement` | Unverified Client Payment Settlement & Missing Signature Check | **Critical** | High | Critical |
| **DINEOS-VULN-005** | `dineos:auth:pin-bruteforce` | Unthrottled 4-Digit Staff PIN & Insecure Super Admin Default | **High** | High | High |

---

## 3. High-Priority Remediation Roadmap

### Phase 1: Immediate Critical Fixes (Within 24–48 Hours)
1. **Secure Staff Server Actions**:
   - In `src/app/staff/[slug]/actions.ts`, add a mandatory session validation check (`getStaffSession(slug)`) to `approveOrder`, `rejectOrder`, `updateOrderItemPrepStatus`, `bumpOrderReady`, `markOrderServed`, `resolveServiceRequest`, and `resetTableSession`.
2. **Harden Database Row-Level Security**:
   - In `supabase/rls_policies.sql`, revoke direct public `SELECT`/`INSERT`/`UPDATE`/`DELETE` on `payments`, `orders`, and `order_items` by setting `USING (false)` for `anon` and `authenticated` roles. Route all operational queries through Next.js Server Actions with `SUPABASE_SERVICE_ROLE_KEY`.
3. **Enforce Server-Side Price Resolution**:
   - In `src/app/r/[slug]/actions.ts`, remove `unitPrice` from `addToSharedCart`. Query `menu_items.base_price` from the database and calculate variant deltas server-side.

### Phase 2: Payment & Authentication Hardening (Within 7 Days)
1. **Cryptographic Payment Verification**:
   - In `src/app/r/[slug]/checkout-actions.ts`, verify the Razorpay HMAC-SHA256 signature (`expected_signature = hmac_sha256(order_id + "|" + payment_id, secret)`).
   - Ensure `totalAmount` matches the server-calculated sum of all uncancelled orders for that session before creating a `PAID` record.
2. **PIN Rate Limiting & Secret Enforcement**:
   - Add progressive delay and account lockout (e.g. 5 failed attempts locks the PIN for 15 minutes) to `verifyStaffPin`.
   - Remove the fallback string `'change_this_master_password'` in `src/app/super-admin/actions.ts` and require a minimum 16-character environment secret.
   - Use `crypto.timingSafeEqual` for passkey validation.

---

## 4. Associated Audit Artifacts

- **Run Metadata**: [run-metadata.json](run-metadata.json)
- **Architecture & Trust Map**: [architecture.md](architecture.md)
- **Coverage Ledger**: [coverage-ledger.json](coverage-ledger.json)
- **Structured Findings**: [findings.json](findings.json)
- **Technical In-Depth Analysis**: [FINDINGS-DETAIL.md](FINDINGS-DETAIL.md)
- **Needs-Validation Register**: [NEEDS-VALIDATION.md](NEEDS-VALIDATION.md)
