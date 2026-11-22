# DineOS Security Audit — Blocked & Needs-Validation Items

This document records architectural hypotheses and deployment-specific security properties that cannot be decisively established purely from static source inspection in this repository and require runtime verification on live target infrastructure.

---

### Item 1: Upstream WAF / Edge Rate-Limiting Protection
- **Candidate ID**: `dineos:needs-val:waf-throttling`
- **Component**: Next.js Server Actions (`verifyStaffPin`, `verifySuperAdminPasskey`)
- **Claimed Risk**: Brute-force discovery of 4-digit numeric PINs (10,000 combinations) and Super Admin master passkeys.
- **Unresolved Runtime Fact**: Does the production hosting provider (e.g. Vercel, Cloudflare, AWS CloudFront) enforce edge rate-limiting rules (e.g. 5 requests/minute per client IP) on POST requests to Server Action routes?
- **Owner Verification Plan**:
  1. Inspect production edge firewall / WAF rules.
  2. Perform an authorized test issuing 10 consecutive requests in 5 seconds to `verifyStaffPin` from a non-whitelisted IP to observe if HTTP 429 Too Many Requests is triggered.

---

### Item 2: Production Supabase Realtime Stream Filtering
- **Candidate ID**: `dineos:needs-val:realtime-filtering`
- **Component**: `supabase_realtime` publication on `orders`, `service_requests`, and `tables`
- **Claimed Risk**: Broadcast of order contents and guest names across tenants to WebSocket listeners.
- **Unresolved Runtime Fact**: In production Supabase configuration, are Postgres Realtime publications configured with row-level filtering (`ALTER PUBLICATION supabase_realtime ADD TABLE orders (restaurant_id)`) or is the entire table stream broadcast to all active socket channels?
- **Owner Verification Plan**:
  1. Inspect the Supabase dashboard under Database -> Publications -> `supabase_realtime`.
  2. Connect a WebSocket client using `anon_key` subscribed to `postgres_changes` on `orders` without filters to confirm whether events for Tenant B are received by Tenant A's connection.

---

### Item 3: Live Razorpay Webhook Signatures & Secret Rotation
- **Candidate ID**: `dineos:needs-val:razorpay-webhooks`
- **Component**: `/api/payments/razorpay/route.ts` & Payment Settlement
- **Claimed Risk**: Incomplete capture of server-side payment webhooks if clients drop connection during checkout.
- **Unresolved Runtime Fact**: Is a dedicated Razorpay Webhook endpoint (`/api/webhooks/razorpay`) deployed in production to receive asynchronous `payment.captured` and `order.paid` events directly from Razorpay servers?
- **Owner Verification Plan**:
  1. Review Razorpay Dashboard -> Webhooks configuration.
  2. Implement an asynchronous webhook route that validates `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET` to guarantee payment status integrity even when guest mobile browsers disconnect prematurely.
