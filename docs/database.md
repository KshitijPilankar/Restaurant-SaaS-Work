# Database Schema & Multi-Tenant Security (`database.md`)
## Engine: Supabase (PostgreSQL 15+ with Realtime & RLS)

---

## 1. Enums & Custom Types

```sql
CREATE TYPE tenant_status AS ENUM ('DEMO', 'TRIAL', 'ACTIVE', 'PAUSED');
CREATE TYPE staff_role AS ENUM ('OWNER', 'WAITER', 'KITCHEN');
CREATE TYPE table_status AS ENUM ('FREE', 'ORDERING', 'PENDING_APPROVAL', 'EATING', 'HELP', 'BILL');
CREATE TYPE spice_level AS ENUM ('NONE', 'MILD', 'MEDIUM', 'SPICY');
CREATE TYPE order_status AS ENUM ('PENDING_APPROVAL', 'IN_KITCHEN', 'READY', 'SERVED', 'CANCELLED');
CREATE TYPE item_prep_status AS ENUM ('QUEUED', 'PREPARING', 'READY', 'SERVED');
CREATE TYPE request_type AS ENUM ('WATER', 'NAPKINS', 'WAITER', 'BILL');
CREATE TYPE request_status AS ENUM ('OPEN', 'RESOLVED');
CREATE TYPE payment_method AS ENUM ('UPI', 'CARD', 'CASH');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED');
```

---

## 2. Core Tables

### 2.1 `restaurants` (Tenants)
```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  cover_image_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#EA580C',
  cuisine_preset TEXT,
  tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  wifi_ssid TEXT,
  wifi_password TEXT,
  upi_id TEXT,
  google_review_url TEXT,
  status tenant_status NOT NULL DEFAULT 'DEMO',
  demo_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 `staff_users` (PIN-Based Floor & Kitchen Access)
```sql
CREATE TABLE staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role staff_role NOT NULL,
  pin_code VARCHAR(4) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, pin_code)
);
```

### 2.3 `kitchen_stations`
```sql
CREATE TABLE kitchen_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Tandoor', 'Main Course', 'Beverages'
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.4 `tables`
```sql
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_code TEXT NOT NULL, -- e.g., 'T1', 'T2', 'VIP1'
  display_name TEXT NOT NULL, -- e.g., 'Table 1'
  capacity INT NOT NULL DEFAULT 4,
  status table_status NOT NULL DEFAULT 'FREE',
  active_session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, table_code)
);
```

### 2.5 `menu_categories` & `menu_items`
```sql
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  station_id UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_veg BOOLEAN NOT NULL DEFAULT TRUE,
  spice spice_level NOT NULL DEFAULT 'NONE',
  allergens TEXT[] DEFAULT '{}', -- e.g., ARRAY['Dairy', 'Nuts']
  variants JSONB DEFAULT '[]'::jsonb, -- e.g., [{"name": "Half", "price_delta": 0}, {"name": "Full", "price_delta": 120}]
  prep_time_mins INT DEFAULT 15,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_bestseller BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.6 `table_sessions` & `cart_items` (Live Shared Cart)
```sql
CREATE TABLE table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  guests JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g., [{"guest_id": "uuid", "name": "Aman"}]
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  added_by_guest_id TEXT NOT NULL,
  added_by_name TEXT NOT NULL,
  variant_name TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.7 `orders` & `order_items`
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  order_number SERIAL,
  placed_by_name TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'PENDING_APPROVAL',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  approved_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  station_id UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  variant_name TEXT,
  quantity INT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  ordered_by_name TEXT NOT NULL,
  notes TEXT,
  prep_status item_prep_status NOT NULL DEFAULT 'QUEUED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.8 `service_requests`, `payments` & `reviews`
```sql
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
  type request_type NOT NULL,
  status request_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  paid_by_name TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) NOT NULL,
  tip_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'PENDING',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
  guest_name TEXT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  redirected_to_google BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Performance Indexes
```sql
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_tables_restaurant_code ON tables(restaurant_id, table_code);
CREATE INDEX idx_menu_items_restaurant_cat ON menu_items(restaurant_id, category_id);
CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX idx_order_items_station_status ON order_items(restaurant_id, station_id, prep_status);
CREATE INDEX idx_service_requests_open ON service_requests(restaurant_id, status) WHERE status = 'OPEN';
CREATE INDEX idx_cart_items_session ON cart_items(session_id);
```

---

## 4. Supabase Realtime Publication Setup
Enable Postgres Changes streaming on live operational tables:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE 
  tables,
  table_sessions,
  cart_items,
  orders,
  order_items,
  service_requests;
```

---

## 5. Multi-Tenant Row-Level Security (RLS) Strategy
- **Tenant Guard Rule:** Every query from the Next.js frontend or API routes MUST include `.eq('restaurant_id', restaurantId)`.
- **Public Guest Access:** `restaurants` (active/demo/trial only), `menu_categories`, `menu_items`, `tables` (by `slug` + `table_code`), `table_sessions`, `cart_items`, `orders`, `service_requests`, and `reviews` allow scoped read/write via `session_id` and `restaurant_id`.
- **Owner & Super Admin Mutations:** Menu CRUD, staff PIN updates, and tenant status changes (`DEMO` → `ACTIVE`) are executed via Next.js Server Actions using the `SUPABASE_SERVICE_ROLE_KEY` after verifying session/PIN authorization.