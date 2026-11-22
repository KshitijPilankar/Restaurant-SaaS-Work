# DineOS Comprehensive Security Audit — Blocked & Needs-Validation Register

This register details security mechanisms and environment-dependent hypotheses that cannot be conclusively confirmed purely through source-level analysis in this repository and require live runtime or infrastructural validation.

---

### Item 1: Upstream WAF / Edge Rate Limiting on Server Action Routes
- **Candidate ID**: `dineos:needs-val:waf-throttling`
- **Subsystem**: Authentication (`verifyStaffPin`, `verifySuperAdminPasskey`)
- **Hypothesis**: The application depends on an edge proxy (e.g. Cloudflare, AWS CloudFront, Vercel Edge Firewall) to prevent brute-force attacks against the 4-digit PIN keyspace.
- **Unresolved Source Fact**: The repository contains no infrastructure-as-code or edge middleware implementing IP rate limiting.
- **Verification Plan**:
  1. Inspect the production hosting platform's security dashboard.
  2. Perform an authorized test issuing 10 consecutive requests in 5 seconds to `/staff/[slug]/actions` from a test IP to confirm if HTTP 429 Too Many Requests is returned.

---

### Item 2: Production Realtime Stream Scoping
- **Candidate ID**: `dineos:needs-val:realtime-filtering`
- **Subsystem**: Supabase Realtime Publication
- **Hypothesis**: The Supabase Realtime WebSocket stream may broadcast new order and service request events to all connected clients regardless of `restaurant_id`.
- **Unresolved Source Fact**: `supabase/rls_policies.sql` adds tables to `supabase_realtime` via `ALTER PUBLICATION supabase_realtime ADD TABLE tables, orders, service_requests;` without row-level publication filters.
- **Verification Plan**:
  1. Connect two distinct browser sessions subscribed to `orders` (one on Tenant A, one on Tenant B).
  2. Create an order on Tenant A and verify whether Tenant B receives the WebSocket payload.

---

### Item 3: Asynchronous Razorpay Webhook Endpoint
- **Candidate ID**: `dineos:needs-val:razorpay-webhooks`
- **Subsystem**: Billing & Payment Reconciliation
- **Hypothesis**: Guest mobile devices may lose connectivity immediately after payment on the Razorpay gateway, preventing the client from completing `recordTablePayment`.
- **Unresolved Source Fact**: The repository currently implements client-driven settlement without a dedicated `/api/webhooks/razorpay` route handler.
- **Verification Plan**:
  1. Review production webhook configuration in the Razorpay Merchant Dashboard.
  2. Deploy an asynchronous webhook listener validating `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET` to reconcile payments independently of client network conditions.
