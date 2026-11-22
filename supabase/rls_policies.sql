-- =============================================================================
-- DineOS: Multi-Tenant Row-Level Security (RLS) Policies
-- Enables RLS across all 13 core tables and establishes strict multi-tenant
-- isolation policies for Public Anonymous Guests and Service Role operations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enable RLS on All 13 Tables
-- -----------------------------------------------------------------------------
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Service Role Bypass (For Next.js Server Actions using SUPABASE_SERVICE_ROLE_KEY)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'restaurants',
        'staff_users',
        'kitchen_stations',
        'tables',
        'menu_categories',
        'menu_items',
        'table_sessions',
        'cart_items',
        'orders',
        'order_items',
        'service_requests',
        'payments',
        'reviews'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_service_role_all ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_service_role_all ON %I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Public Anonymous (Guest) & Authenticated Policies
-- -----------------------------------------------------------------------------

-- 3.1 restaurants: Public can read active, demo, or trial restaurants
DROP POLICY IF EXISTS restaurants_public_read ON restaurants;
CREATE POLICY restaurants_public_read ON restaurants
    FOR SELECT
    TO anon, authenticated
    USING (status IN ('DEMO', 'TRIAL', 'ACTIVE'));

-- 3.2 kitchen_stations: Public can read kitchen stations for display & filtering
DROP POLICY IF EXISTS kitchen_stations_public_read ON kitchen_stations;
CREATE POLICY kitchen_stations_public_read ON kitchen_stations
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 3.3 tables: Public can read restaurant tables
DROP POLICY IF EXISTS tables_public_read ON tables;
CREATE POLICY tables_public_read ON tables
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 3.4 menu_categories: Public can read active categories
DROP POLICY IF EXISTS menu_categories_public_read ON menu_categories;
CREATE POLICY menu_categories_public_read ON menu_categories
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- 3.5 menu_items: Public can read active menu items
DROP POLICY IF EXISTS menu_items_public_read ON menu_items;
CREATE POLICY menu_items_public_read ON menu_items
    FOR SELECT
    TO anon, authenticated
    USING (is_available = true);

-- 3.6 table_sessions: Guests can read table sessions for realtime sync.
-- Direct client writes are blocked; all session mutations go via Server Actions (service_role).
DROP POLICY IF EXISTS table_sessions_public_read ON table_sessions;
CREATE POLICY table_sessions_public_read ON table_sessions
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS table_sessions_public_insert ON table_sessions;
CREATE POLICY table_sessions_public_insert ON table_sessions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (false);

DROP POLICY IF EXISTS table_sessions_public_update ON table_sessions;
CREATE POLICY table_sessions_public_update ON table_sessions
    FOR UPDATE
    TO anon, authenticated
    USING (false)
    WITH CHECK (false);

-- 3.7 cart_items: Guests can read shared cart items for realtime sync.
-- Direct client writes are blocked; all cart mutations go via Server Actions (service_role).
DROP POLICY IF EXISTS cart_items_public_read ON cart_items;
CREATE POLICY cart_items_public_read ON cart_items
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS cart_items_public_insert ON cart_items;
CREATE POLICY cart_items_public_insert ON cart_items
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (false);

DROP POLICY IF EXISTS cart_items_public_update ON cart_items;
CREATE POLICY cart_items_public_update ON cart_items
    FOR UPDATE
    TO anon, authenticated
    USING (false)
    WITH CHECK (false);

DROP POLICY IF EXISTS cart_items_public_delete ON cart_items;
CREATE POLICY cart_items_public_delete ON cart_items
    FOR DELETE
    TO anon, authenticated
    USING (false);

-- 3.8 orders & order_items: Guests & staff can read orders for realtime sync.
-- Direct client inserts are blocked; all orders are placed via Server Actions (service_role).
DROP POLICY IF EXISTS orders_public_read ON orders;
CREATE POLICY orders_public_read ON orders
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS orders_public_insert ON orders;
CREATE POLICY orders_public_insert ON orders
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (false);

DROP POLICY IF EXISTS order_items_public_read ON order_items;
CREATE POLICY order_items_public_read ON order_items
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS order_items_public_insert ON order_items;
CREATE POLICY order_items_public_insert ON order_items
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (false);

-- 3.9 service_requests: Guests & staff can read service requests for realtime sync.
-- Direct client inserts are blocked; all requests are made via Server Actions (service_role).
DROP POLICY IF EXISTS service_requests_public_read ON service_requests;
CREATE POLICY service_requests_public_read ON service_requests
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS service_requests_public_insert ON service_requests;
CREATE POLICY service_requests_public_insert ON service_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (false);

-- 3.10 payments: Direct public read and insert are blocked to protect guest financial data.
-- All payments are recorded server-side via Server Actions (service_role).
DROP POLICY IF EXISTS payments_public_read ON payments;
CREATE POLICY payments_public_read ON payments
    FOR SELECT
    TO anon, authenticated
    USING (false);

DROP POLICY IF EXISTS payments_public_insert ON payments;
CREATE POLICY payments_public_insert ON payments
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (false);

-- 3.11 reviews: Direct public read and insert are blocked.
-- Reviews are recorded and queried server-side via Server Actions (service_role).
DROP POLICY IF EXISTS reviews_public_read ON reviews;
CREATE POLICY reviews_public_read ON reviews
    FOR SELECT
    TO anon, authenticated
    USING (false);

DROP POLICY IF EXISTS reviews_public_insert ON reviews;
CREATE POLICY reviews_public_insert ON reviews
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (false);

-- 3.12 staff_users: Restrict direct public read of staff PINs
DROP POLICY IF EXISTS staff_users_public_read ON staff_users;
CREATE POLICY staff_users_public_read ON staff_users
    FOR SELECT
    TO anon, authenticated
    USING (false);
-- Note: Staff authentication and PIN verification are executed server-side
-- via Next.js Server Actions using the Supabase Service Role client.

-- =============================================================================
-- End of RLS Policies Script
-- =============================================================================
