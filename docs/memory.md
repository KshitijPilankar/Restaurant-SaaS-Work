# Project Memory & Decision Log (`memory.md`)

## Core Architectural Decisions
- **Product Model:** Multi-tenant white-label Restaurant Dine-In SaaS with a built-in Super Admin "2-Minute Pitch Cloner" for live in-person restaurant sales demos.
- **Routing:** Path-based multi-tenancy (`/r/[slug]/t/[tableCode]`) chosen over subdomains for zero-DNS instant demo provisioning.
- **Order Safety:** Guest orders enter as `PENDING_APPROVAL` and require 1-tap Floor Staff approval before hitting KDS to prevent prank orders.
- **Staff Auth:** 4-digit PIN per restaurant (`staff_users`) instead of email/password for fast floor/kitchen tablet login.

## Completed Milestones
- [x] `PRD.md`, `database.md`, `Architecture.md`, `design.md`, `rules.md`, `phases.md` finalized.

## Known Issues / Pending Setup
- Supabase project SQL execution pending (run SQL blocks from `database.md` in Supabase SQL Editor).
- Razorpay test keys pending in `.env.local`.